const { sendEmail, isEmailConfigured } = require("../utils/sendEmail");

// @route  POST /api/contact
// @access Public
// Accepts multipart/form-data: fullName, email, phone, message, and an
// optional single file field named "attachment" (parsed by multer in
// contactRoutes.js, kept in memory — never written to disk).
exports.submitContactForm = async (req, res) => {
  try {
    const { fullName, email, phone, message } = req.body;

    if (!fullName || !email || !message) {
      return res.status(400).json({ message: "Name, email and query are required." });
    }

    const attachments = [];
    if (req.file) {
      attachments.push({
        filename: req.file.originalname,
        content: req.file.buffer,
        contentType: req.file.mimetype,
      });
    }

    const supportInbox = process.env.CONTACT_INBOX || process.env.EMAIL_USER;

    let emailSent = false;
    if (supportInbox) {
      try {
        emailSent = await sendEmail({
          to: supportInbox,
          replyTo: email,
          subject: `New contact form message from ${fullName}`,
          html: `
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || "—"}</p>
            <p><strong>Message:</strong></p>
            <p>${String(message).replace(/\n/g, "<br/>")}</p>
            ${req.file ? `<p><em>Attachment: ${req.file.originalname}</em></p>` : ""}
          `,
          attachments,
        });
      } catch (mailError) {
        console.error("Failed to send contact form email:", mailError);
      }
    }

    res.status(200).json({
      message: emailSent
        ? "Thanks — we've received your message and will get back to you soon."
        : isEmailConfigured()
        ? "Thanks — we've received your message, but delivery to our team couldn't be confirmed. We'll still follow up."
        : "Thanks — we've received your message. (Email isn't configured on this server yet, so it wasn't forwarded, but your submission was logged.)",
    });

    if (!emailSent) {
      // Always log to the server console so nothing is silently lost
      // while email delivery isn't configured.
      console.log("Contact form submission:", { fullName, email, phone, message });
    }
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};
