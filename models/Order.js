const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true }, // Nombre del cliente
    phone: { type: String, required: true }, // Teléfono del cliente (Colombia)
    address: { type: String, required: function () { return this.deliveryMethod === 'domicilio'; } }, 
    deliveryMethod: { type: String, enum: ['domicilio', 'recoger'], required: true }, 
    paymentMethod: { 
        type: String, 
        enum: ['transferencia bancaria', 'efectivo'], 
        required: true,
        validate: {
            validator: function (v) {
                if (this.deliveryMethod === 'recoger') {
                    return v === 'efectivo';
                }
                return true;
            },
            message: 'El pago en efectivo solo está permitido si el método de entrega es "recoger".'
        }
    },
    products: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true },
            unitPrice: { type: Number, required: true }, // Precio unitario al momento de la compra (snapshot)
            subtotal: { type: Number, required: true },   // quantity * unitPrice (snapshot)
        }
    ],
    notes: { type: String }, // Notas adicionales del pedido
    discount: { type: Number, default: 0 }, // Descuento aplicado (COP)
    tax: { type: Number, default: 0 }, // Impuesto aplicado (COP)
    currency: { type: String, default: 'COP' }, // Moneda local
    total: { type: Number, required: true }, 
    status: { type: String, enum: ['pendiente', 'entregado', 'finalizado'], default: 'pendiente' },
    wompiTransactionId: { type: String }, // ID de transacción de Wompi
    wompiStatus: { type: String }, // Estado del pago en Wompi
    wompiEvents: [{ type: Object }], // Historial de eventos recibidos desde Wompi
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
