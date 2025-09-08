const Discount = require('../models/Discount');
const Order = require('../models/Order');
const logger = require('../utils/logger');

// Crear un descuento
exports.createDiscount = async (req, res) => {
    try {
        const discount = new Discount(req.body);
        await discount.save();
        if (req && req.log) req.log.event('discount_created', { discountId: discount._id, code: discount.code });
        res.status(201).json(discount);
    } catch (error) {
        if (req && req.log) req.log.error('error_creating_discount', { error: logger.serializeError(error) });
        res.status(400).json({ message: error.message });
    }
};

// Obtener todos los descuentos
exports.getDiscounts = async (req, res) => {
    try {
        const discounts = await Discount.find();
        res.json(discounts);
    } catch (error) {
        if (req && req.log) req.log.error('error_listing_discounts', { error: logger.serializeError(error) });
        res.status(500).json({ message: error.message });
    }
};

// Aplicar un descuento a un pedido (por código)
exports.applyDiscountToOrder = async (req, res) => {
    try {
        const { orderId, code } = req.body;
        if (req && req.log) req.log.info('discount_apply_attempt', { orderId, code });
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Pedido no encontrado.' });

        const discount = await Discount.findOne({ code, active: true });
        if (!discount) return res.status(404).json({ message: 'Descuento no válido o inactivo.' });

        // Validaciones de fechas y monto mínimo
        const now = new Date();
        if (discount.startDate && now < discount.startDate) return res.status(400).json({ message: 'El descuento aún no está disponible.' });
        if (discount.endDate && now > discount.endDate) return res.status(400).json({ message: 'El descuento ha expirado.' });
        if (order.total < discount.minOrderTotal) return res.status(400).json({ message: 'El pedido no cumple el monto mínimo.' });
        if (discount.maxUses && discount.usedCount >= discount.maxUses) return res.status(400).json({ message: 'El descuento ha alcanzado el máximo de usos.' });

        // Calcular descuento
        let discountValue = 0;
        if (discount.type === 'porcentaje') {
            discountValue = order.total * (discount.value / 100);
        } else {
            discountValue = discount.value;
        }
        // No permitir que el descuento supere el total
        if (discountValue > order.total) discountValue = order.total;

        // Actualizar pedido y descuento
        order.discount = discountValue;
        order.total = order.total - discountValue;
        await order.save();
        discount.usedCount += 1;
        await discount.save();

        if (req && req.log) req.log.event('discount_applied', { orderId, code, discountValue });
        res.json({ order, discount });
    } catch (error) {
        if (req && req.log) req.log.error('error_applying_discount', { error: logger.serializeError(error) });
        res.status(400).json({ message: error.message });
    }
};

// ...puedes agregar más endpoints para actualizar, eliminar, etc.
