const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');

// Login de administrador
router.post('/login', adminController.loginAdmin);

// Crear un nuevo administrador (opcional, solo para setup inicial)
router.post('/register', adminController.createAdmin);

// Estadísticas (protegidas)
router.get('/stats/sales', authenticateToken, adminController.getSalesStats);
router.get('/stats/top-products', authenticateToken, adminController.getTopProducts);
router.get('/stats/sales-by-customer', authenticateToken, adminController.getSalesByCustomer);
router.get('/stats/reservations-by-type', authenticateToken, adminController.getReservationsByType);

module.exports = router;
