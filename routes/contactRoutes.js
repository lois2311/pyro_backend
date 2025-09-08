const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

router.post('/', contactController.createContact);

// Otras rutas pueden ser añadidas aquí

module.exports = router;