const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

router.post('/', reservationController.createReservation);

// // Otras rutas pueden ser añadidas aquí

module.exports = router;