const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Product = require('../models/Product');
const { s3 } = require('../middleware/upload'); // Importar la instancia de S3 configurada
const logger = require('../utils/logger');

exports.createProduct = async (req, res) => {
    try {
        const log = (req && req.log) ? req.log : logger.child({ handler: 'createProduct' });
        const { name, description, price, category, stock, effects, duration, instructions } = req.body;
        let imageUrl = '';
        let videoUrl = '';

        // Función para subir un archivo a S3
        const uploadToS3 = async (file, folder) => {
            const params = {
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: `${folder}/${Date.now()}-${file.originalname}`,
                Body: file.buffer,
                ContentType: file.mimetype,
            };
            const command = new PutObjectCommand(params);
            await s3.send(command);
            return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
        };

        // Subir imagen a S3 (si se proporciona)
        if (req.files && req.files.image) {
            imageUrl = await uploadToS3(req.files.image[0], 'images');
        }

        // Subir video a S3 (si se proporciona)
        if (req.files && req.files.video) {
            videoUrl = await uploadToS3(req.files.video[0], 'videos');
        }

        // Crear el producto en la base de datos
        const newProduct = new Product({
            name,
            description,
            price,
            category,
            stock,
            effects: effects ? effects.split(',') : [],
            duration: duration || 0,
            image: imageUrl,
            videoUrl: videoUrl,
            instructions: instructions ? instructions.split(';') : [],
        });

        await newProduct.save();
        log.event('product_created', { productId: newProduct._id, name, category });
        res.status(201).json(newProduct);
    } catch (error) {
        const log = (req && req.log) ? req.log : logger;
        log.error('error_creating_product', { error: logger.serializeError(error) });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};


exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('relatedProducts');
        if (!product) {
            if (req && req.log) req.log.warn('product_not_found', { productId: req.params.id });
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        res.json(product);
    } catch (error) {
        if (req && req.log) req.log.error('error_getting_product', { error: logger.serializeError(error) });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        if (req && req.log) req.log.info('products_listed', { count: products.length });
        res.json(products);
    } catch (error) {
        if (req && req.log) req.log.error('error_listing_products', { error: logger.serializeError(error) });
        res.status(500).json({ message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedProduct) return res.status(404).json({ message: 'Producto no encontrado' });
        if (req && req.log) req.log.event('product_updated', { productId: req.params.id });
        res.json(updatedProduct);
    } catch (error) {
        if (req && req.log) req.log.error('error_updating_product', { error: logger.serializeError(error) });
        res.status(400).json({ message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ message: 'Producto no encontrado' });
        if (req && req.log) req.log.event('product_deleted', { productId: req.params.id });
        res.status(204).send();
    } catch (error) {
        if (req && req.log) req.log.error('error_deleting_product', { error: logger.serializeError(error) });
        res.status(500).json({ message: error.message });
    }
};
