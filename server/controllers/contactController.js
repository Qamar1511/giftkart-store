const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../utils/sendEmail");
const Contact = require("../models/Contact");
const { escapeHtml, isValidName, isValidEmail, isValidPhone, detectUploadType } = require("../utils/security");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "contacts");

// @route  POST /api/contact
// @access Public
// Accepts multipart/form-data: fullName, email, phone, message, and an
// optional single file field named "attachment" (parsed by multer in
// contactRoutes.js, kept in memory). The file is written to disk here so
// it can be opened later from the admin panel — not just emailed once and
// then lost.
// Every submission is saved to the database first, so it's never lost even
// if email delivery isn't configured or fails.
exports.submitContactForm = async (req, res) => {
  try {
    // multipart fields can arrive as non-strings (e.g. `fullName[x]=y` is
    // parsed into an object), so only accept plain strings and normalise.
    const asText = (v) => (typeof v === "string" ? v.trim() : "");
    const fullName = asText(req.body.fullName);
    const email = asText(req.body.email).toLowerCase();
    const phone = asText(req.body.phone);
    const message = asText(req.body.message);

    if (!fullName || !email || !message) {
      return res.status(400).json({ message: "Name, email and query are required." });
    }
    if (!isValidName(fullName)) {
      return res.status(400).json({ message: "Please enter your name using letters only." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ message: "Please enter a valid phone number." });
    }
    if (message.length < 10 || message.length > 2000) {
      return res.status(400).json({ message: "Please describe your query in 10 to 2000 characters." });
    }

    // Work out what the attachment REALLY is from its contents. The filename
    // and Content-Type are chosen by the sender, so a .txt/.html/.svg/.exe
    // renamed to look harmless would sail through a check on either. Only
    // PDF and common image formats are accepted — these are payment
    // screenshots/receipts, nothing else is needed.
    let fileType = null;
    if (req.file) {
      fileType = detectUploadType(req.file.buffer);
      if (!fileType) {
        return res.status(400).json({ message: "Only PDF, PNG, JPG or WebP files can be attached." });
      }
    }

    // One open query per person at a time. This form is public (no login),
    // so the email is the only identity we have to go on. "Open" means
    // anything not yet marked resolved — both "new" and "read" count, since
    // an admin merely opening a query doesn't mean it's been dealt with.
    // Checked before the attachment is saved or the support inbox is emailed,
    // so a blocked duplicate leaves no trace at all (no stray file, no email).
    const openQuery = await Contact.findOne({
      email,
      status: { $ne: "resolved" },
    });
    if (openQuery) {
      return res.status(409).json({
        message:
          "You already have a query open with us. We'll get back to you soon — you can send a new one once it's been resolved.",
        openQueryExists: true,
      });
    }

    let attachmentName;
    let attachmentUrl;
    const attachments = [];

    if (req.file) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      // The stored extension comes from the detected file type, never from
      // the uploaded filename, so nothing like `.html` or `.php` can ever
      // end up on disk. The name shown to admins is stripped to harmless
      // characters for the same reason.
      const storedFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileType.ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, storedFilename), req.file.buffer);

      const displayName =
        path.basename(req.file.originalname).replace(/[^\w.\- ]/g, "_").slice(0, 80) || `attachment${fileType.ext}`;
      attachmentName = displayName;
      attachmentUrl = `/uploads/contacts/${storedFilename}`;

      attachments.push({
        filename: displayName,
        content: req.file.buffer,
        contentType: fileType.mime,
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
          // Everything below is visitor-supplied, so it's HTML-escaped —
          // otherwise a message containing markup renders as live HTML in
          // the support inbox (fake buttons, phishing links, tracking pixels).
          html: `
            <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phone) || "—"}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
            ${attachmentName ? `<p><em>Attachment: ${escapeHtml(attachmentName)}</em></p>` : ""}
          `,
          attachments,
        });
      } catch (mailError) {
        console.error("Failed to send contact form email:", mailError);
      }
    }

    // Save regardless of email outcome — this is the permanent record an
    // admin can always check, even without email configured.
    await Contact.create({
      fullName,
      email,
      phone,
      message,
      attachmentName,
      attachmentUrl,
      emailSent,
    });

    res.status(200).json({
      message: "Your query has been submitted! We'll get back to you soon.",
    });

    if (!emailSent) {
      // Deliberately not logging the visitor's text: it's attacker-controlled
      // (log flooding) and personal data. The full record is in the database.
      console.log(`Contact form submission saved (email not sent) from ${email}`);
    }
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// @route  GET /api/contact
// @access Admin
// Lists every stored contact-form submission, newest first.
exports.getContactSubmissions = async (req, res) => {
  try {
    const submissions = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ submissions });
  } catch (error) {
    console.error("Get contact submissions error:", error);
    res.status(500).json({ message: "Couldn't load queries." });
  }
};

// @route  PATCH /api/contact/:id
// @access Admin
// body: { status: "new" | "read" | "resolved" }
exports.updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["new", "read", "resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }
    const submission = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!submission) return res.status(404).json({ message: "Query not found." });
    res.status(200).json({ submission });
  } catch (error) {
    console.error("Update contact status error:", error);
    res.status(500).json({ message: "Couldn't update this query." });
  }
};
