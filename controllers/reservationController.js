require('dotenv/config');
const { Resend } = require('resend');
const Reservation = require('../models/Reservation');
const logger = require('../utils/logger');

// Configuración del cliente Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Controlador para crear una reserva y enviar correos
exports.createReservation = async (req, res) => {
  const newReservation = new Reservation(req.body);
  try {
    await newReservation.save();

    // Datos de la reservación
    const { customerName, contactInfo, eventType, date, details } = req.body;

    // Configurar el correo para el cliente
    const clientEmail = {
      from: 'notificaciones@canonpirotecnia.com',
      to: contactInfo,
      subject: 'Confirmación de Reserva - Cañón Pirotécnicos',
      html: `
        <!DOCTYPE html>
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Confirmación de Reserva - Cañón Pirotécnicos</title>
              <style>
                  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
                  body {
                      font-family: 'Poppins', Arial, sans-serif;
                      line-height: 1.6;
                      color: #333;
                      background-color: #f4f4f4;
                      margin: 0;
                      padding: 0;
                  }
                  .container {
                      max-width: 600px;
                      margin: 20px auto;
                      background-color: #ffffff;
                      border-radius: 8px;
                      overflow: hidden;
                      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
                  }
                  .header {
                      background-color: #1d3557;
                      color: #ffffff;
                      text-align: center;
                      padding: 20px;
                  }
                  .logo {
                      max-width: 200px;
                      display: block;
                      margin: 0 auto 20px;
                  }
                  .content {
                      padding: 30px;
                  }
                  h1 {
                      color: #e63946;
                      font-size: 28px;
                      margin-bottom: 20px;
                      text-align: center;
                  }
                  .event-details {
                      background-color: #f1faee;
                      border-radius: 8px;
                      padding: 20px;
                      margin-bottom: 20px;
                  }
                  .event-type {
                      font-size: 24px;
                      color: #1d3557;
                      text-align: center;
                      margin: 10px 0;
                  }
                  .detail-row {
                      display: flex;
                      justify-content: space-between;
                      margin-bottom: 10px;
                  }
                  .detail-label {
                      font-weight: 600;
                      color: #457b9d;
                  }
                  .cta-button {
                      display: block;
                      width: 200px;
                      margin: 30px auto;
                      padding: 12px 20px;
                      background-color: #e63946;
                      color: #ffffff;
                      text-align: center;
                      text-decoration: none;
                      font-weight: 600;
                      border-radius: 5px;
                      transition: background-color 0.3s ease;
                  }
                  .cta-button:hover {
                      background-color: #c1121f;
                  }
                  .footer {
                      background-color: #1d3557;
                      color: #ffffff;
                      text-align: center;
                      padding: 20px;
                      font-size: 14px;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <img src="https://canonbucketimgs.s3.us-east-2.amazonaws.com/logonegrosinfondo.PNG" alt="Cañón Pirotécnicos Logo" class="logo">
                  </div>
                  <div class="content">
                      <h1>¡Gracias por su reserva, ${customerName}!</h1>
                      <div class="event-details">
                          <p>Hemos recibido su solicitud para el evento:</p>
                          <h2 class="event-type">${eventType}</h2>
                          <div class="detail-row">
                              <span class="detail-label">Fecha:</span>
                              <span>${new Date(date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                          ${details ? `
                          <div class="detail-row">
                              <span class="detail-label">Detalles:</span>
                              <span>${details}</span>
                          </div>
                          ` : ''}
                      </div>
                      <p>Nos pondremos en contacto con usted pronto para confirmar los detalles y responder a cualquier pregunta que pueda tener.</p>
                      <a href="https://canonpirotecnia.com/contacto" class="cta-button">Contáctenos</a>
                      <p style="text-align: center; font-style: italic; color: #777;">Si tiene alguna pregunta, no dude en contactarnos respondiendo a este correo electrónico.</p>
                  </div>
                  <div class="footer">
                      <p>Atentamente,</p>
                      <p style="font-size: 18px; font-weight: bold;">Equipo de Cañón Pirotécnicos</p>
                  </div>
              </div>
          </body>
          </html>
      `,
      text: `Gracias por su reserva, ${customerName}. Hemos recibido su solicitud para el evento ${eventType} programado para el ${new Date(date).toLocaleDateString()}. Nos pondremos en contacto con usted pronto. Atentamente, Cañón Pirotécnicos`
    };

   // Configurar el correo para la empresa
    const companyEmail = {
      from: 'notificaciones@canonpirotecnia.com',
      to: process.env.EMPRESA_CORREO,
      subject: 'Nueva Reserva Creada - Cañón Pirotecnia',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nueva Reserva - Cañón Pirotecnia</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8f8; border-radius: 5px; overflow: hidden;">
            <tr>
              <td style="padding: 20px;">
                <img src="https://canonbucketimgs.s3.us-east-2.amazonaws.com/logonegrosinfondo.PNG" alt="Cañón Pirotecnia Logo" style="display: block; margin: 0 auto; max-width: 200px;">
                <h1 style="color: #e63946; text-align: center; margin-top: 20px;">Nueva Reserva Creada</h1>
                <div style="background-color: #ffffff; border-radius: 5px; padding: 20px; margin-top: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                  <h2 style="color: #1d3557; text-align: center; font-size: 24px; margin: 15px 0;">${eventType}</h2>
                  <table width="100%" style="border-collapse: collapse; margin-top: 20px;">
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: #457b9d;">Cliente:</td>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${customerName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: #457b9d;">Correo:</td>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${contactInfo}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: #457b9d;">Fecha:</td>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    </tr>
                    ${details ? `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: #457b9d;">Detalles:</td>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${details}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <p style="font-size: 14px; color: #555;">Esta reserva requiere su atención. Por favor, revise los detalles y contacte al cliente para confirmar la reserva.</p>
                  <a href="${process.env.ADMIN_DASHBOARD_URL}" style="display: inline-block; padding: 10px 20px; background-color: #e63946; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Ir al Panel de Administración</a>
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
        Nueva Reserva Creada

        Tipo de Evento: ${eventType}
        Cliente: ${customerName}
        Correo: ${contactInfo}
        Fecha: ${new Date(date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        ${details ? `Detalles: ${details}` : ''}

        Por favor, revise los detalles y contacte al cliente para confirmar la reserva.
        Para gestionar esta reserva, visite el panel de administración: ${process.env.ADMIN_DASHBOARD_URL}
      `
    };

    // Enviar correos
    try {
      await resend.emails.send(clientEmail);
      await resend.emails.send(companyEmail);
    } catch (emailError) {
      // Log de falla de email pero continuar con 201 si la reserva se creó bien
      if (req && req.log) req.log.error('error_sending_reservation_emails', { error: logger.serializeError(emailError) });
    }
    if (req && req.log) req.log.event('reservation_created', { reservationId: newReservation._id, eventType });
    res.status(201).json({ message: 'Reservación creada y correos enviados correctamente.', reservation: newReservation });
  } catch (error) {
    if (req && req.log) req.log.error('error_creating_reservation', { error: logger.serializeError(error) });
    res.status(500).json({ message: 'Error al crear la reservación.', error: error.message });
  }
};
