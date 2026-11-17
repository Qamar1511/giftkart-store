const express = require("express");
const multer = require("multer");
const {
  submitContactForm,
  getContactSubmissions,
  updateContactStatus,
} = require("../controllers/contactController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { contactLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Memory storage — the file is held in memory while the controller checks
// what it really is (submitContactForm → detectUploadType) and only then
// writes it to disk. Limits keep a flood of junk cheap: 5MB, one file, and
// a handful of text fields.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6, fieldSize: 10 * 1024 },
});

// contactLimiter runs first so a flood is turned away before any file
// parsing or database work happens.
router.post("/", contactLimiter, upload.single("attachment"), submitContactForm);
router.get("/", protect, adminOnly, getContactSubmissions);
router.patch("/:id", protect, adminOnly, updateContactStatus);

module.exports = router;
