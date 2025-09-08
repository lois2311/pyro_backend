const Contact = require('../models/Contact');
const { Resend } = require('resend');
const logger = require('../utils/logger');

// Configuración del cliente Resend
const resend = new Resend(process.env.RESEND_API_KEY);

exports.createContact = async (req, res) => {
  const newContact = new Contact(req.body);
  try {
    await newContact.save();
    await sendEmail(newContact);
    if (req && req.log) req.log.event('contact_created', { contactId: newContact._id });
    res.status(201).json(newContact);
  } catch (error) {
    if (req && req.log) req.log.error('error_creating_contact', { error: logger.serializeError(error) });
    res.status(400).json({ message: error.message });
  }
};

const sendEmail = async (contact) => {
  const mailOptions = {
    from: 'notificaciones@canonpirotecnia.com', 
    to: process.env.EMPRESA_CORREO,
    subject: 'Nuevo contacto recibido',
    text: `Nombre: ${contact.name}\nEmail: ${contact.email}\nMensaje: ${contact.message}`,
    html: `
      <h1>Nuevo contacto</h1>
      <p><b>Nombre:</b> ${contact.name}</p>
      <p><b>Email:</b> ${contact.email}</p>
      <p><b>Mensaje:</b> ${contact.message}</p>
    `
  };

  // Enviar el correo con Resend
  try {
    await resend.emails.send(mailOptions);
  } catch (error) {
    // Loguear pero no romper el flujo superior si ya se maneja allí
    logger.error('error_sending_contact_email', { error: logger.serializeError(error) });
    throw error;
  }
};
