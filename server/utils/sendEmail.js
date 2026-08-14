const nodemailer = require("nodemailer");

// Returns null if SMTP isn't configured yet, so callers can fall back
// gracefully (e.g. dev mode) instead of throwing.
const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

let cachedTransporter = null;

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for port 465, false for 587/25
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return cachedTransporter;
};

// sendEmail({ to, subject, html, attachments, replyTo }) -> true if sent, false if SMTP isn't configured
const sendEmail = async ({ to, subject, html, attachments, replyTo }) => {
  const transporter = getTransporter();
  if (!transporter) return false;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"GIFTKART" <${process.env.EMAIL_USER}>`,
    to,
    replyTo,
    subject,
    html,
    attachments, // [{ filename, content: Buffer, contentType }]
  });

  return true;
};

module.exports = { sendEmail, isEmailConfigured };
