const express = require('express');
const router = express.Router();
const wompiController = require('../controllers/wompiController');

// Endpoint para recibir eventos (webhooks) de Wompi
router.post('/webhook', wompiController.wompiWebhook);

// Endpoint para iniciar pago con Wompi
router.post('/create-payment', wompiController.createWompiPayment);

module.exports = router;
