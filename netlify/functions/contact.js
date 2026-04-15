const nodemailer = require('nodemailer');

const SERVICE_LABELS = {
  tausch: 'Scheibenaustausch',
  reparatur: 'Steinschlagreparatur',
  adas: 'ADAS-Kalibrierung',
  mobil: 'Mobile Montage',
  sonstig: 'Sonstiges',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Ungültiges Format' }),
    };
  }

  const { name, phone, email, car, service, message } = body;

  if (!name || !phone || !email) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Pflichtfelder fehlen: Name, Telefon, E-Mail' }),
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.STRATO_HOST,
    port: parseInt(process.env.STRATO_PORT, 10),
    secure: false,
    auth: {
      user: process.env.STRATO_USER,
      pass: process.env.STRATO_PASS,
    },
  });

  const serviceLabel = SERVICE_LABELS[service] || service || 'Nicht angegeben';

  const mailOptions = {
    from: process.env.STRATO_USER,
    to: process.env.CONTACT_RECIPIENT,
    replyTo: email,
    subject: `Neue Anfrage: ${name} – ${serviceLabel}`,
    text: [
      'Neue Kontaktanfrage über schwarz-autoglas.de',
      '',
      `Name:     ${name}`,
      `Telefon:  ${phone}`,
      `E-Mail:   ${email}`,
      `Fahrzeug: ${car || 'Nicht angegeben'}`,
      `Leistung: ${serviceLabel}`,
      '',
      'Nachricht:',
      message || '(keine Nachricht)',
    ].join('\n'),
  };

  try {
    await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('SMTP error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'E-Mail konnte nicht gesendet werden' }),
    };
  }
};
