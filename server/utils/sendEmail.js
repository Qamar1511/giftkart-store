const axios = require("axios");

// Sends email via the Resend API (https://resend.com) over HTTPS (port 443).
// We switched away from Gmail SMTP (port 587/465) because most free-tier
// hosts (Render included) block or silently drop outbound SMTP connections,
// which made signup/reset requests hang forever instead of failing fast.
//
// Required env vars:
//   RESEND_API_KEY  - from Resend dashboard -> API Keys
//   EMAIL_FROM      - e.g. "GIFTKART <onboarding@resend.dev>" (no domain
//                     verified yet) or "GIFTKART <noreply@yourdomain.com>"
//                     once you verify your own domain on Resend.

const isEmailConfigured = () => Boolean(process.env.RESEND_API_KEY);

// sendEmail({ to, subject, html, attachments, replyTo }) -> true if sent, false if Resend isn't configured
const sendEmail = async ({ to, subject, html, attachments, replyTo }) => {
  if (!isEmailConfigured()) return false;

  const payload = {
    from: process.env.EMAIL_FROM || "GIFTKART <onboarding@resend.dev>",
    to,
    subject,
    html,
  };

  if (replyTo) payload.reply_to = replyTo;

  if (attachments && attachments.length > 0) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
    }));
  }

  await axios.post("https://api.resend.com/emails", payload, {
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 10000, // fail fast (10s) instead of hanging, same fix as before
  });

  return true;
};

module.exports = { sendEmail, isEmailConfigured };
