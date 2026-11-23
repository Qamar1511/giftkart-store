const axios = require("axios");

// Sends email via the Brevo API (https://brevo.com, formerly Sendinblue)
// over HTTPS (port 443). We use Brevo instead of Resend because Brevo only
// requires verifying a single sender EMAIL ADDRESS (click a confirmation
// link) — it doesn't require owning and DNS-verifying a domain, which
// Resend needs before it'll let you email anyone other than yourself.
//
// Required env vars:
//   BREVO_API_KEY   - from Brevo dashboard -> SMTP & API -> API Keys
//   EMAIL_FROM      - the sender email you verified in Brevo, e.g.
//                     "information151121@gmail.com"
//   EMAIL_FROM_NAME - display name, e.g. "GIFTKART" (optional, defaults below)

const isEmailConfigured = () => Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);

// sendEmail({ to, subject, html, attachments, replyTo }) -> true if sent, false if Brevo isn't configured
const sendEmail = async ({ to, subject, html, attachments, replyTo }) => {
  if (!isEmailConfigured()) return false;

  const payload = {
    sender: {
      email: process.env.EMAIL_FROM,
      name: process.env.EMAIL_FROM_NAME || "GIFTKART",
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (replyTo) payload.replyTo = { email: replyTo };

  if (attachments && attachments.length > 0) {
    payload.attachment = attachments.map((a) => ({
      name: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
    }));
  }

  await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    timeout: 10000, // fail fast (10s) instead of hanging
  });

  return true;
};

module.exports = { sendEmail, isEmailConfigured };
