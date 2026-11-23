const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../utils/sendEmail");
const Contact = require("../models/Contact");

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
    const { fullName, email, phone, message } = req.body;

    if (!fullName || !email || !message) {
      return res.status(400).json({ message: "Name, email and query are required." });
    }

    let attachmentName;
    let attachmentUrl;
    const attachments = [];

    if (req.file) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const safeExt = path.extname(req.file.originalname).slice(0, 10);
      const storedFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, storedFilename), req.file.buffer);

      attachmentName = req.file.originalname;
      attachmentUrl = `/uploads/contacts/${storedFilename}`;

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
      console.log("Contact form submission:", { fullName, email, phone, message });
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
