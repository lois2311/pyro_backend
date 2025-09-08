const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Reservation = require('../models/Reservation');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Login de administrador
exports.loginAdmin = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Verificar si el administrador existe
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(404).json({ message: 'Administrador no encontrado' });
        }

        // Comparar la contraseña
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // Generar el token JWT
        const token = jwt.sign(
            { id: admin._id, username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        if (req && req.log) req.log.event('admin_logged_in', { adminId: admin._id, username: admin.username });
        res.json({ token });
    } catch (error) {
        if (req && req.log) req.log.error('error_admin_login', { error: logger.serializeError(error) });
        res.status(500).json({ message: error.message });
    }
};

// Crear un nuevo administrador (opcional)
exports.createAdmin = async (req, res) => {
    const { username, password } = req.body;

    try {
        const newAdmin = new Admin({ username, password });
        await newAdmin.save();
        if (req && req.log) req.log.event('admin_created', { adminId: newAdmin._id, username });
        res.status(201).json({ message: 'Administrador creado exitosamente' });
    } catch (error) {
        if (req && req.log) req.log.error('error_creating_admin', { error: logger.serializeError(error) });
        res.status(400).json({ message: error.message });
    }
};

// Estadísticas: ventas totales por periodo
exports.getSalesStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const match = {};
        if (startDate) match.createdAt = { $gte: new Date(startDate) };
        if (endDate) {
            match.createdAt = match.createdAt || {};
            match.createdAt.$lte = new Date(endDate);
        }
        const stats = await Order.aggregate([
            { $match: match },
            { $group: {
                _id: null,
                totalSales: { $sum: "$total" },
                totalOrders: { $sum: 1 }
            }}
        ]);
        if (req && req.log) req.log.event('stats_sales_requested');
        res.json(stats[0] || { totalSales: 0, totalOrders: 0 });
    } catch (error) {
        if (req && req.log) req.log.error('error_getting_sales_stats', { error: logger.serializeError(error) });
        res.status(500).json({ message: error.message });
    }
};

// Estadísticas: productos más vendidos
exports.getTopProducts = async (req, res) => {
    try {
        const top = parseInt(req.query.top) || 5;
        const stats = await Order.aggregate([
            { $unwind: "$products" },
            { $group: {
                _id: "$products.productId",
                totalQuantity: { $sum: "$products.quantity" }
            }},
            { $sort: { totalQuantity: -1 } },
            { $limit: top },
            { $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }},
            { $unwind: "$product" }
        ]);
        if (req && req.log) req.log.event('stats_top_products_requested', { top });
        res.json(stats);
    } catch (error) {
        if (req && req.log) req.log.error('error_getting_top_products', { error: logger.serializeError(error) });
        res.status(500).json({ message: error.message });
    }
};

// Estadísticas: ventas por cliente
exports.getSalesByCustomer = async (req, res) => {
    try {
        const stats = await Order.aggregate([
            { $group: {
                _id: "$customerName",
                totalSales: { $sum: "$total" },
                orders: { $sum: 1 }
            }},
            { $sort: { totalSales: -1 } }
        ]);
        if (req && req.log) req.log.event('stats_sales_by_customer_requested');
        res.json(stats);
    } catch (error) {
        if (req && req.log) req.log.error('error_getting_sales_by_customer', { error: logger.serializeError(error) });
        res.status(500).json({ message: error.message });
    }
};

// Estadísticas: reservas por tipo de evento
exports.getReservationsByType = async (req, res) => {
    try {
        const stats = await Reservation.aggregate([
            { $group: {
                _id: "$eventType",
                totalReservations: { $sum: 1 }
            }},
            { $sort: { totalReservations: -1 } }
        ]);
        if (req && req.log) req.log.event('stats_reservations_by_type_requested');
        res.json(stats);
    } catch (error) {
        if (req && req.log) req.log.error('error_getting_reservations_by_type', { error: logger.serializeError(error) });
        res.status(500).json({ message: error.message });
    }
};

// ...puedes agregar más endpoints para filtrar/exportar datos, CRUD de productos, pedidos y reservas.
