const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    stock: { type: Number, required: true },
    image: { type: String, required: true },
    effects: { type: [String], default: [] },
    duration: { type: Number, default: 0 },
    videoUrl: { type: String, default: '' },
    instructions: { type: [String], default: [] },
    relatedProducts: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] }
});

// Middleware para generar productos relacionados automáticamente
productSchema.pre('save', async function (next) {
    if (!this.relatedProducts || this.relatedProducts.length === 0) {
        // Buscar hasta 3 productos existentes de la misma categoría
        const relatedProducts = await mongoose.model('Product').find(
            { category: this.category, _id: { $ne: this._id } } // Excluir el producto actual
        )
        .limit(3) // Limitar a 3 productos
        .select('_id'); // Obtener solo los IDs

        // Asignar los IDs de los productos relacionados
        this.relatedProducts = relatedProducts.map(product => product._id);
    }

    next();
});

module.exports = mongoose.model('Product', productSchema);
