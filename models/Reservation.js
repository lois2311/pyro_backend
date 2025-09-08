const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    eventType: { type: String, required: true },
    date: { 
        type: Date, 
        required: true, 
        validate: {
            validator: async function(v) {
                
                const existingReservation = await mongoose.models.Reservation.findOne({
                    eventType: this.eventType,
                    date: v
                });
                return !existingReservation;
            },
            message: 'Ya existe una reserva para este evento en el horario especificado.'
        }
    },
    customerName: { type: String, required: true },
    contactInfo: { 
        type: String, 
        required: true, 
        validate: {
            validator: function(v) {
                // Valida correo o número telefónico
                return /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4}|(\+\d{1,3})? ?\d{7,15})$/.test(v);
            },
            message: props => `${props.value} no es un email o teléfono válido`
        }
    },
    details: { type: String },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Reservation', reservationSchema);
