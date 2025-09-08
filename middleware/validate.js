// Middleware para validar códigos de descuento con regex
exports.validateDiscountCode = (req, res, next) => {
    const { code } = req.body;
    // Ejemplo: solo letras, números y guiones, mínimo 4 caracteres
    const regex = /^[A-Za-z0-9-]{4,}$/;
    if (!code || !regex.test(code)) {
        return res.status(400).json({ message: 'Código de descuento inválido.' });
    }
    next();
};
