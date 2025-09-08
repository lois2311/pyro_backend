const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

const connectDB = require('./config/db'); // Importar la función de conexión a la base de datos

dotenv.config();

const productRoutes = require('./routes/productRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const contactRoutes = require('./routes/contactRoutes')
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const discountRoutes = require('./routes/discountRoutes');
const wompiRoutes = require('./routes/wompiRoutes');
const mongoose = require('mongoose');

const app = express();

// CORS: restringir si se especifica CORS_ORIGINS (lista separada por comas)
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean) : null;
if (allowedOrigins && allowedOrigins.length > 0) {
    app.use(cors({ origin: allowedOrigins, credentials: true }));
} else {
    app.use(cors());
}

// Usar body raw solo para el webhook de Wompi (necesario para verificar firma)
app.use('/api/wompi/webhook', express.raw({ type: 'application/json' }));

// JSON para el resto de rutas
app.use(bodyParser.json());

// Request-scoped logger
const { randomUUID } = require('crypto');
const logger = require('./utils/logger');
app.use((req, res, next) => {
    const makeId = () => {
        try { return randomUUID(); } catch (_) { return Math.random().toString(36).slice(2); }
    };
    const requestId = req.headers['x-request-id'] || makeId();
    req.id = requestId;
    req.log = logger.child({ requestId, method: req.method, path: req.originalUrl });
    req.log.info('request_received', { ip: req.ip });
    res.on('finish', () => {
        req.log.info('request_completed', { statusCode: res.statusCode });
    });
    next();
});

// Conectar a la base de datos
connectDB();

app.use('/api/products', productRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/wompi', wompiRoutes);

// Health check endpoints
const healthHandler = (_req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbStateIdx = typeof mongoose.connection.readyState === 'number' ? mongoose.connection.readyState : 0;
    const payload = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        db: states[dbStateIdx] || 'unknown',
    };
    res.set('Cache-Control', 'no-store');
    res.status(200).json(payload);
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
