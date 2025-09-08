const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Nombre del descuento
    description: { type: String }, // Descripción opcional
    type: { type: String, enum: ['porcentaje', 'valor'], required: true }, // Tipo de descuento
    value: { type: Number, required: true }, // Valor del descuento (porcentaje o valor fijo)
    active: { type: Boolean, default: true }, // Si el descuento está activo
    startDate: { type: Date }, // Fecha de inicio
    endDate: { type: Date }, // Fecha de fin
    minOrderTotal: { type: Number, default: 0 }, // Monto mínimo de pedido para aplicar
    maxUses: { type: Number }, // Máximo de usos permitidos
    usedCount: { type: Number, default: 0 }, // Veces usado
    code: { type: String, unique: true }, // Código de descuento para aplicar
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);
