const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { authenticateToken } = require('../middleware/auth');
const { validateDiscountCode } = require('../middleware/validate');

// Crear descuento
router.post('/', authenticateToken, discountController.createDiscount);
// Listar descuentos
router.get('/', discountController.getDiscounts);
// Aplicar descuento a pedido
router.post('/apply', validateDiscountCode, discountController.applyDiscountToOrder);

module.exports = router;
