const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');

// Crear un nuevo pedido
router.post('/', orderController.createOrder);

// Obtener todos los pedidos
router.get('/', authenticateToken ,orderController.getOrders);

// Actualizar el estado de un pedido
router.put('/:id', orderController.updateOrderStatus);

module.exports = router;
