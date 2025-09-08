const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');

// Rutas para el manejo de productos
router.get('/', productController.getAllProducts);
router.post(
    '/',
    authenticateToken,
    upload.fields([{ name: 'image' }, { name: 'video' }]), // Manejar imágenes y videos
    productController.createProduct

);
router.get('/:id', productController.getProductById);
router.put('/:id', authenticateToken, upload.fields([{ name: 'image' }, { name: 'video' }]), productController.updateProduct);
router.delete('/:id', authenticateToken, productController.deleteProduct);

module.exports = router;
