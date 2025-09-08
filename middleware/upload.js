const multer = require('multer');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');

// Configurar cliente de S3 con AWS SDK v3
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Configuración de multer para manejar archivos en memoria
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = /jpeg|jpg|png|gif|mp4|mov|avi/; // Formatos permitidos
        const mimeType = allowedFileTypes.test(file.mimetype);
        const extName = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimeType && extName) {
            return cb(null, true);
        }
        cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF) y videos (MP4, MOV, AVI).'));
    },
    limits: {
        fileSize: 50 * 1024 * 1024, // Tamaño máximo del archivo (50MB)
    },
});

// Exportar tanto `upload` como `s3` si ambos son necesarios
module.exports = upload;
module.exports.s3 = s3;
