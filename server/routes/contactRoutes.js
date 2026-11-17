const express = require("express");
const multer = require("multer");
const {
  submitContactForm,
  getContactSubmissions,
  updateContactStatus,
} = require("../controllers/contactController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Memory storage — the file is only ever forwarded as an email attachment,
// never written to disk. 5MB cap keeps things reasonable.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Contact form kill switch.
// Closed by default. To reopen set CONTACT_FORM_OPEN=true in the server env
// (Render -> Environment) and redeploy. Admin inbox routes are unaffected.
const contactOpen = (req, res, next) => {
  if (String(process.env.CONTACT_FORM_OPEN || "").toLowerCase() === "true") return next();
  return res.status(403).json({
    message: "The contact form is temporarily unavailable. Please try again later.",
  });
};

router.post("/", contactOpen, upload.single("attachment"), submitContactForm);
router.get("/", protect, adminOnly, getContactSubmissions);
router.patch("/:id", protect, adminOnly, updateContactStatus);

module.exports = router;