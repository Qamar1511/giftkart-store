const { verifyCaptcha } = require("../utils/captcha");

// Put this in front of a POST that must be done by a person — login, signup,
// the contact form, creating an order and submitting payment proof. It reads
// `captchaId` and `captchaAnswer` from the request body, which the website
// sends along with the form (see client/src/components/Captcha.jsx).
//
// The captcha is spent whether the answer is right or wrong (see
// verifyCaptcha), and a failed check answers 400 with `captchaFailed: true` so
// the page knows to show a fresh one.
//
// For the multipart contact form this must come AFTER the multer upload
// middleware, since that's what fills in req.body.
exports.requireCaptcha = (req, res, next) => {
  const { captchaId, captchaAnswer } = req.body || {};
  const result = verifyCaptcha(captchaId, captchaAnswer);
  if (!result.ok) {
    return res.status(400).json({ message: result.message, captchaFailed: true });
  }
  next();
};
