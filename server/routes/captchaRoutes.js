const express = require("express");
const { createChallenge } = require("../utils/captcha");
const { captchaLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// @route  GET /api/captcha
// @access Public
// Returns { captchaId, image } — the image is a data: URI the page shows in an
// <img>. The answer stays on the server. Never cached, since every captcha is
// single-use.
router.get("/", captchaLimiter, (req, res) => {
  const { id, image } = createChallenge();
  res.set("Cache-Control", "no-store");
  res.status(200).json({ captchaId: id, image });
});

module.exports = router;
