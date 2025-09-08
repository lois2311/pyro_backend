const Order = require('../models/Order');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Endpoint para recibir eventos (webhooks) de Wompi con verificación de firma
exports.wompiWebhook = async (req, res) => {
    try {
        const signatureHeader = req.get('X-Webhook-Signature') || '';
        const parts = Object.fromEntries(signatureHeader.split(',').map(kv => {
            const [k, v] = kv.trim().split('=');
            return [k, v];
        }));
        const timestamp = parts.t;
        const signature = parts.v1;

        if (!timestamp || !signature) {
            return res.status(400).json({ message: 'Firma de webhook ausente o inválida.' });
        }

        const secret = process.env.WOMPI_EVENTS_SECRET;
        if (!secret) {
            return res.status(500).json({ message: 'WOMPI_EVENTS_SECRET no configurado.' });
        }

        // req.body es Buffer por express.raw en la ruta específica
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
        const payloadToSign = `${timestamp}.${rawBody.toString('utf8')}`;
        const computed = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

        const valid = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
        if (!valid) {
            return res.status(400).json({ message: 'Firma de webhook inválida.' });
        }

        const event = JSON.parse(rawBody.toString('utf8'));

        const tx = event?.data?.transaction;
        const wompiTransactionId = tx?.id;
        if (!wompiTransactionId) {
            return res.status(400).json({ message: 'Evento inválido: falta transaction.id' });
        }

        const order = await Order.findOne({ wompiTransactionId });
        if (!order) return res.status(404).json({ message: 'Pedido no encontrado para el evento Wompi.' });

        order.wompiStatus = tx.status;
        order.wompiEvents.push(event);

        // Mapeo opcional de estados de pago a estado del pedido
        if (process.env.WOMPI_AUTO_MARK_DELIVERED === 'true' && tx.status === 'APPROVED') {
            // Si habilitado por ENV, marcar como 'entregado' al aprobar pago
            order.status = 'entregado';
        }

        await order.save();

        logger.event('wompi_webhook_received', { event: event?.event, wompiTransactionId, status: tx.status, orderId: order._id });
        res.status(200).json({ message: 'Evento procesado correctamente.' });
    } catch (error) {
        logger.error('wompi_webhook_error', { error: logger.serializeError(error) });
        res.status(400).json({ message: error.message });
    }
};

const axios = require('axios');

// Endpoint para iniciar pago con Wompi
exports.createWompiPayment = async (req, res) => {
    try {
        const { orderId, paymentMethodType, paymentSource, customerEmail } = req.body;
        const log = (req && req.log) ? req.log : logger.child({ handler: 'createWompiPayment' });
        if (!orderId || !paymentMethodType || !paymentSource || !customerEmail) {
            return res.status(400).json({ message: 'Faltan campos requeridos: orderId, paymentMethodType, paymentSource, customerEmail' });
        }
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Pedido no encontrado.' });

        // Construir el payload para Wompi
        const paymentData = {
            amount_in_cents: Math.round(order.total * 100), // Wompi espera centavos
            currency: order.currency || 'COP',
            customer_email: customerEmail,
            payment_method_type: paymentMethodType, // Ej: 'CARD', 'NEQUI', etc.
            payment_source_id: paymentSource, // Ej: token de tarjeta
            reference: order._id.toString(),
        };

        // Llamar a la API de Wompi
        const baseUrl = process.env.WOMPI_BASE_URL || 'https://sandbox.wompi.co';
        const idempotencyKey = req.body.idempotencyKey || `order-${order._id}`;
        const wompiResponse = await axios.post(
            `${baseUrl}/v1/transactions`,
            paymentData,
            {
                headers: {
                    Authorization: `Bearer ${process.env.WOMPI_PRIVATE_KEY}`,
                    'Content-Type': 'application/json',
                    'Idempotency-Key': idempotencyKey
                },
                timeout: 15000,
            }
        );

        const transaction = wompiResponse.data.data;
        order.wompiTransactionId = transaction.id;
        order.wompiStatus = transaction.status;
        await order.save();
        log.event('wompi_payment_created', { orderId: order._id, wompiTransactionId: transaction.id, status: transaction.status });
        res.json({ order, transaction });
    } catch (error) {
        if (req && req.log) req.log.error('wompi_create_payment_error', { error: logger.serializeError(error), details: error.response?.data });
        res.status(400).json({ message: error.message, details: error.response?.data });
    }
};
