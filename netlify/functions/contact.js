const nodemailer = require('nodemailer');

const SERVICE_LABELS = {
  tausch: 'Scheibenaustausch',
  reparatur: 'Steinschlagreparatur',
  adas: 'ADAS-Kalibrierung',
  mobil: 'Mobile Montage',
  sonstig: 'Sonstiges',
};

const REQUIRED_ENV = ['STRATO_HOST', 'STRATO_PORT', 'STRATO_USER', 'STRATO_PASS', 'CONTACT_RECIPIENT'];

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missingEnv.length > 0) {
    console.error('[contact] Missing env vars:', missingEnv.join(', '));
    return jsonResponse(500, { error: 'Mailversand ist nicht konfiguriert. Bitte rufen Sie uns an.' });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return jsonResponse(400, { error: 'Ungültiges Format' });
  }

  const { name, phone, email, car, service, message } = body;

  if (!name || !phone || !email) {
    return jsonResponse(400, { error: 'Pflichtfelder fehlen: Name, Telefon, E-Mail' });
  }

  const sanitize = (str) => String(str || '').replace(/[\r\n]/g, ' ').trim();

  const safeName = sanitize(name).slice(0, 200);
  const safeEmail = sanitize(email).slice(0, 254);
  const safePhone = sanitize(phone).slice(0, 50);
  const safeCar = sanitize(car).slice(0, 200);
  const safeMessage = String(message || '').replace(/\r/g, '').trim().slice(0, 5000);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
    return jsonResponse(400, { error: 'Ungültige E-Mail-Adresse' });
  }

  const port = parseInt(process.env.STRATO_PORT, 10);
  if (Number.isNaN(port)) {
    console.error('[contact] STRATO_PORT is not a number:', process.env.STRATO_PORT);
    return jsonResponse(500, { error: 'Mailversand ist nicht konfiguriert. Bitte rufen Sie uns an.' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.STRATO_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: process.env.STRATO_USER,
      pass: process.env.STRATO_PASS,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  try {
    await transporter.verify();
  } catch (err) {
    console.error('[contact] SMTP verify failed:', {
      host: process.env.STRATO_HOST,
      port,
      user: process.env.STRATO_USER,
      code: err.code,
      command: err.command,
      response: err.response,
      message: err.message,
    });
    return jsonResponse(502, { error: 'Mailserver nicht erreichbar. Bitte rufen Sie uns kurz an.' });
  }

  const serviceLabel = SERVICE_LABELS[service] || sanitize(service) || 'Nicht angegeben';

  const mailOptions = {
    from: process.env.STRATO_USER,
    to: process.env.CONTACT_RECIPIENT,
    replyTo: safeEmail,
    subject: `Neue Anfrage: ${safeName} – ${serviceLabel}`,
    text: [
      'Neue Kontaktanfrage über schwarz-autoglas.de',
      '',
      `Name:     ${safeName}`,
      `Telefon:  ${safePhone}`,
      `E-Mail:   ${safeEmail}`,
      `Fahrzeug: ${safeCar || 'Nicht angegeben'}`,
      `Leistung: ${serviceLabel}`,
      '',
      'Nachricht:',
      safeMessage || '(keine Nachricht)',
    ].join('\n'),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[contact] Mail sent:', { messageId: info.messageId, response: info.response });
    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error('[contact] sendMail failed:', {
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      message: err.message,
    });
    return jsonResponse(500, { error: 'E-Mail konnte nicht gesendet werden. Bitte rufen Sie uns an.' });
  }
};
