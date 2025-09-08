const Order = require('../models/Order');
const Product = require('../models/Product');
const logger = require('../utils/logger');

// Crear un nuevo pedido
exports.createOrder = async (req, res) => {
    try {
    const { customerName, phone, address, deliveryMethod, paymentMethod, products, notes, discount = 0, tax = 0, currency = 'COP' } = req.body;
    const log = (req && req.log) ? req.log : logger.child({ handler: 'createOrder' });

        // Construir items embebidos con snapshot de precio y calcular total
        let total = 0;
        const items = [];
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Producto con ID ${item.productId} no encontrado.` });
            }
            const unitPrice = product.price;
            const subtotal = unitPrice * item.quantity;
            total += subtotal;
            items.push({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice,
                subtotal,
            });
        }

        // Crear el pedido
        const newOrder = new Order({
            customerName,
            phone,
            address,
            deliveryMethod,
            paymentMethod,
            products: items,
            notes,
            discount,
            tax,
            currency,
            total,
        });

        await newOrder.save();
        log.event('order_created', { orderId: newOrder._id, total, currency });
        res.status(201).json(newOrder);
    } catch (error) {
        const log = (req && req.log) ? req.log : logger;
        log.error('error_creating_order', { error: logger.serializeError(error) });
        res.status(400).json({ message: error.message });
    }
};

// Obtener todos los pedidos
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('products.productId');
        res.json(orders);
    } catch (error) {
        if (req && req.log) req.log.error('error_listing_orders', { error: logger.serializeError(error) });
        res.status(500).json({ message: error.message });
    }
};

// Actualizar estado de un pedido
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['entregado', 'finalizado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Estado no válido. Use "entregado" o "finalizado".' });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }
        if (req && req.log) req.log.event('order_status_updated', { orderId: id, status });
        res.json(updatedOrder);
    } catch (error) {
        if (req && req.log) req.log.error('error_updating_order_status', { error: logger.serializeError(error) });
        res.status(400).json({ message: error.message });
    }
};
