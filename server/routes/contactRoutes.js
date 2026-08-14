const express = require("express");
const multer = require("multer");
const { submitContactForm } = require("../controllers/contactController");

const router = express.Router();

// Memory storage — the file is only ever forwarded as an email attachment,
// never written to disk. 5MB cap keeps things reasonable.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/", upload.single("attachment"), submitContactForm);

module.exports = router;
