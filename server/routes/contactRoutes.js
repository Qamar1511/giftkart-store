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

router.post("/", upload.single("attachment"), submitContactForm);
router.get("/", protect, adminOnly, getContactSubmissions);
router.patch("/:id", protect, adminOnly, updateContactStatus);

module.exports = router;
