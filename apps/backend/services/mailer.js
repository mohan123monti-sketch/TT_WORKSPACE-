const nodemailer = require('nodemailer');
require('dotenv').config();

const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@techturf.local';

function createTransport() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = createTransport();

async function sendMail({ to, subject, text, html }) {
  if (!to) return { skipped: true };
  try {
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject: subject || 'Tech Turf Notification',
      text: text || '',
      html: html || undefined
    });
    return { sent: true, info };
  } catch (err) {
    console.error('[MAILER ERROR]', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = {
  sendMail,
  MAIL_FROM
};
