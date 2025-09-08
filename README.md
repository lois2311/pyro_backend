# Canon Pirotécnicos – Backend (Node/Express)

Backend REST en Express con MongoDB (Mongoose), subida de archivos a AWS S3, envío de emails con Resend y flujo de pagos con Wompi.

## Tabla de Contenido
- Descripción General
- Stack y Scripts
- Configuración y Variables de Entorno
- Estructura del Proyecto
- Modelos de Datos
- Endpoints (API)
- Subida de Archivos (S3)
- Emails (Resend)
- Pagos (Wompi)
- Seguridad y Buenas Prácticas
- Problemas Conocidos y Pendientes
- Desarrollo Local

---

## Descripción General
- API REST para catálogo de productos, pedidos, reservas, contacto y administración.
- Persistencia en MongoDB con Mongoose.
- Gestión de archivos (imágenes y videos) en AWS S3.
- Envío de correos con Resend.
- Integración de pagos con Wompi (creación de transacciones y webhook).

## Stack y Scripts
- Node.js, Express, Mongoose, JWT, Bcrypt, Multer, AWS SDK v3, Axios, Resend.
- Scripts:
  - `npm run dev` → nodemon `server.js`.
  - `npm start` → node `server.js`.

## Configuración y Variables de Entorno
Copia `.env.example` (o tu `.env`) y completa:

Requeridas
- `MONGODB_URI`: cadena de conexión a MongoDB.
- `PORT`: puerto de la API (p. ej. 5000).
- `JWT_SECRET`: secreto para firmar JWT.
- `RESEND_API_KEY`: API key para Resend.
- `EMPRESA_CORREO`: correo destino para notificaciones internas.

AWS S3
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (p. ej. `us-east-2`)
- `AWS_S3_BUCKET_NAME`

Wompi
- `WOMPI_PRIVATE_KEY`: llave privada del comercio (NUNCA en frontend).
- `WOMPI_PUBLIC_KEY`: llave pública (para frontend).
- `WOMPI_EVENTS_SECRET`: secreto para verificar firma de webhooks.
- (Opcional) `WOMPI_BASE_URL`: `https://sandbox.wompi.co` o `https://production.wompi.co`.

Otros
- `ADMIN_DASHBOARD_URL`: usado en correo de reservas para enlazar al panel.
- (Contacto) Si usas `contactController`, configura `EMPRESA_CORREO` (ver notas abajo).

Importante: No versionar `.env` con credenciales reales. Rotar claves si estuvieron expuestas.

## Estructura del Proyecto
```
controllers/
  adminController.js
  contactController.js
  discountController.js
  orderController.js
  productController.js
  reservationController.js
  wompiController.js
middleware/
  auth.js            # JWT
  upload.js          # Multer + S3 client
  validate.js        # Validación simple de descuentos
models/
  Admin.js
  Contact.js
  Discount.js
  Order.js
  OrderDetail.js
  Product.js
  Reservation.js
routes/
  adminRoutes.js
  contactRoutes.js
  discountRoutes.js
  orderRoutes.js
  productRoutes.js
  reservationRoutes.js
  wompiRoutes.js
config/
  db.js              # Conexión a MongoDB
server.js            # Registro de middlewares y rutas
```

## Modelos de Datos (resumen)
- `Product`:
  - `name`, `description`, `price`, `category`, `stock`, `image`, `videoUrl`, `effects[]`, `duration`, `instructions[]`, `relatedProducts[]` (autogenerados por categoría).
- `Order`:
  - Cliente: `customerName`, `phone`, `address` (si `deliveryMethod = domicilio`).
  - Entrega: `deliveryMethod` ('domicilio'|'recoger').
  - Pago: `paymentMethod` ('transferencia bancaria'|'efectivo', con restricción para recoger).
  - `products` (ver Nota en Problemas Conocidos), `notes`, `discount`, `tax`, `currency`, `total`, `status` ('pendiente'|'entregado'|'finalizado').
  - Wompi: `wompiTransactionId`, `wompiStatus`, `wompiEvents[]`.
- `OrderDetail`:
  - `productId`, `quantity`, `unitPrice`, `subtotal`.
- `Reservation`:
  - `eventType`, `date` (valida no duplicados por tipo y fecha), `customerName`, `contactInfo` (email o teléfono), `details`, `status`.
- `Discount`:
  - `name`, `type` ('porcentaje'|'valor'), `value`, `active`, `startDate`, `endDate`, `minOrderTotal`, `maxUses`, `usedCount`, `code`.
- `Admin`:
  - `username`, `password` (hash con bcrypt).
- `Contact`:
  - `name`, `email`, `message`.

## Endpoints (API)
Prefijo base en `server.js`:
- `/api/products`, `/api/order`, `/api/reservations`, `/api/contact`, `/api/discounts`, `/api/admin`, `/api/wompi`

Productos – `/api/products`
- GET `/` → lista productos.
- POST `/` → crea producto. Form-data con campos y archivos `image`/`video` (S3). (Actualmente público; considerar proteger con JWT.)
- GET `/:id` → detalle (incluye `relatedProducts`).
- PUT `/:id` (JWT) → actualiza.
- DELETE `/:id` (JWT) → elimina.

Pedidos – `/api/order`
- POST `/` → crea pedido con `{ customerName, phone, address?, deliveryMethod, paymentMethod, products[{productId,quantity}], ... }`.
- GET `/` (JWT) → lista pedidos (hace `populate`).
- PUT `/:id` → actualiza `status` ('entregado'|'finalizado').

Descuentos – `/api/discounts`
- POST `/` (JWT) → crea descuento.
- GET `/` → lista descuentos.
- POST `/apply` → aplica a pedido por `code` y `orderId`.

Reservas – `/api/reservations`
- POST `/` → crea reserva y envía emails (cliente y empresa).

Contacto – `/api/contact`
- POST `/` → crea contacto y envía email a la empresa.

Admin – `/api/admin`
- POST `/login` → devuelve JWT.
- POST `/register` → crea admin (para setup inicial).
- Nota: El controlador incluye endpoints de estadísticas (ventas, top productos, etc.) que no están expuestos en rutas.

Wompi – `/api/wompi`
- POST `/create-payment` → crea transacción en Wompi con `WOMPI_PRIVATE_KEY` (server-to-server).
- POST `/webhook` → recibe eventos de Wompi y actualiza la orden.

## Subida de Archivos (S3)
- `multer.memoryStorage()` + validación de tipos y tamaño (hasta 50MB).
- Carga con AWS SDK v3 (`PutObjectCommand`) y URL pública construida con bucket y región.
- Rutas de productos aceptan `image` y `video` mediante `upload.fields([{ name: 'image' }, { name: 'video' }])`.

## Emails (Resend)
- Reservas: se envían correos HTML al cliente y a la empresa (`EMPRESA_CORREO`).
- Contacto: se envía correo a la empresa (ver variable en Problemas Conocidos).
- Remitente usado: `notificaciones@canonpirotecnia.com`.

## Pagos (Wompi)
Flujo recomendado
- Frontend:
  - Usa `WOMPI_PUBLIC_KEY` para crear `payment_source_id` (tarjeta/Nequi/PSE) vía SDK/Widget.
  - Envía a backend: `orderId`, `payment_method_type`, `payment_source_id` (como `paymentSource`), `customer_email`.
- Backend:
  - POST `https://sandbox.wompi.co/v1/transactions` con `Bearer WOMPI_PRIVATE_KEY`.
  - Guarda `transaction.id` y `transaction.status` en la `Order`.
  - Webhook `/api/wompi/webhook` recibe estados definitivos y actualiza la orden.

Buenas prácticas (pendientes de implementar)
- Verificar firma del webhook: header `X-Webhook-Signature` con `WOMPI_EVENTS_SECRET` y el cuerpo crudo.
- Idempotencia al crear transacciones: header `Idempotency-Key` (p. ej. `order._id + intento`).
- Entornos: `sandbox` vs `production` por variable `WOMPI_BASE_URL`.

## Seguridad y Buenas Prácticas
- No exponer claves en el repo; usar `.env` seguros y rotar si fue expuesto.
- Limitar CORS a dominios confiables del frontend.
- Proteger creación/edición/eliminación de productos con JWT (actualmente POST `/api/products` es público).
- Validar inputs en controladores (tipos/formatos, listas permitidas, etc.).
- Webhooks: usar `express.raw` para ruta específica si se verifica firma con cuerpo crudo.

## Problemas Conocidos y Pendientes
- Ruta de contacto en `server.js`: actualmente `app.use('api/contact', ...)`. Debe ser `'/api/contact'`.
- Inconsistencia `Order` ↔ `OrderDetail`:
  - `Order.products` está definido como array embebido `{ productId, quantity }` pero el controlador guarda IDs de `OrderDetail`.
  - Solución A: mantener embebidos y eliminar `OrderDetail` del flujo.
  - Solución B: cambiar `Order.products` a `[{ type: ObjectId, ref: 'OrderDetail' }]` y ajustar consultas/agregaciones.
- Variables de entorno:
  - Falta `WOMPI_PRIVATE_KEY`, `WOMPI_PUBLIC_KEY`, `WOMPI_EVENTS_SECRET`.
  - `contactController` usa `EMAIL_USER`; alinear con `EMPRESA_CORREO`.
- Wompi:
  - Falta verificación de firma del webhook e idempotencia en creación de transacciones.
- Dependencias sin uso aparente: `googleapis`, `mailersend`, `nodemailer`, `fs`.

## Desarrollo Local
1) Instalar dependencias
```
npm install
```

2) Configurar `.env`
- Completa las variables listadas arriba.

3) Ejecutar
```
npm run dev
# o
npm start
```

4) Pruebas rápidas (ejemplos)
- Crear pedido
```
POST /api/order
{
  "customerName": "Juan",
  "phone": "+57 3000000000",
  "deliveryMethod": "domicilio",
  "paymentMethod": "transferencia bancaria",
  "products": [{ "productId": "<idProducto>", "quantity": 2 }],
  "currency": "COP",
  "notes": "Sin picante"
}
```

- Crear transacción Wompi
```
POST /api/wompi/create-payment
{
  "orderId": "<idPedido>",
  "paymentMethodType": "CARD",
  "paymentSource": "<payment_source_id>",
  "customerEmail": "cliente@correo.com"
}
```

- Webhook Wompi (configurar URL en el panel de Wompi)
```
POST https://<tu-dominio>/api/wompi/webhook
```

---

Sugerencias y mejoras son bienvenidas. Antes de producción, atender los pendientes de seguridad y consistencia de modelos.

