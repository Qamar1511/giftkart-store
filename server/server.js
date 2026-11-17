require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");
const blogRoutes = require("./routes/blogRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const { generateSitemap } = require("./utils/generateSitemap");
const { cancelAbandonedOrders } = require("./utils/stockReservation");
const { hydratePricing } = require("./utils/pricing");
const { apiLimiter } = require("./middleware/rateLimiter");
const { rejectUnsafeInput } = require("./utils/security");

const app = express();

// This server runs behind Render's proxy. Without this, req.ip is the
// PROXY's address for every visitor, so every rate limiter (login, OTP,
// contact…) would count the whole internet as one single user — one attacker
// could lock everyone out, or the limits would be meaningless. With it, req.ip
// is the real visitor address from X-Forwarded-For. (If a CDN such as
// Cloudflare is ever put in front of Render as well, this number becomes 2.)
app.set("trust proxy", 1);

// A leaked or guessable JWT_SECRET lets anyone forge login tokens. Loudly
// flag a missing/short/placeholder one at startup instead of running silently.
const jwtSecret = process.env.JWT_SECRET || "";
if (jwtSecret.length < 32 || /change-me|your[_-]?secret|^secret$|^password$|12345/i.test(jwtSecret)) {
  console.error(
    "⚠️  SECURITY WARNING: JWT_SECRET is missing, shorter than 32 characters, or looks like a placeholder. " +
      "Set a long random value (e.g. `node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"`)."
  );
}

// Connect to MongoDB
connectDB();

// Load the admin-configured price multipliers (Admin → Pricing) into the
// in-memory cache that config/catalog.js priceFor() reads. Falls back to the
// hardcoded defaults if nothing is saved yet.
hydratePricing();

// Standard security headers (HSTS, X-Frame-Options, X-Content-Type-Options,
// etc.). contentSecurityPolicy is off because this server never renders its
// own HTML pages — helmet's default CSP is meant for that and has no benefit
// here. crossOriginResourcePolicy is relaxed because /uploads and /images
// are fetched cross-origin from the separate frontend domain (giftkartstore.in
// calling api.giftkartstore.in) — helmet's default would otherwise block the
// browser from loading those images/PDFs.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Only the site's own frontend(s) may call this API from a browser — an
// open `cors()` let literally any website make authenticated requests here
// on a visitor's behalf. Requests with no Origin header (server-to-server
// calls, curl, Postman, mobile apps) are still allowed through.
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://giftkartstore.in",
  "https://www.giftkartstore.in",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
  })
);
// Safety net over every API call, per visitor IP — before any body parsing, so
// a flood is turned away as cheaply as possible.
app.use("/api", apiLimiter);

app.use(express.json({ limit: "100kb" }));

// Reject request bodies/queries carrying MongoDB operators ($gt, $ne, …) or
// prototype-pollution keys — see utils/security.js.
app.use(rejectUnsafeInput);

// Contact form attachments + blog images, saved to disk by the controllers.
// dotfiles are refused outright (a stray .env must never be downloadable),
// directory listings are off, and browsers are told not to guess a file's
// type. Customer attachments are also forced to DOWNLOAD instead of opening
// in the browser, so even a hostile file can never run as a page on our own
// domain.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    dotfiles: "deny",
    index: false,
    setHeaders: (res, filePath) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (filePath.includes(`${path.sep}contacts${path.sep}`)) {
        res.setHeader("Content-Disposition", "attachment");
      }
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/reviews", reviewRoutes);

// Not under /api — this is what giftkartstore.in/sitemap.xml proxies to
// (see client/vercel.json). Regenerated fresh on every request from the DB.
app.get("/sitemap.xml", generateSitemap);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "PS Gift Card Store API is running" });
});

// Basic error handler (fallback)
app.use((err, req, res, next) => {
  // Junk sent by scanners/attackers (broken JSON, oversized bodies, bad
  // uploads, foreign origins) is a client error, not a server fault — answer
  // it as such and don't fill the logs with a stack trace for each one.
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid request." });
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Request is too large." });
  if (err.name === "MulterError") {
    return res.status(400).json({
      message: err.code === "LIMIT_FILE_SIZE" ? "That file is too large (max 5MB)." : "Invalid upload.",
    });
  }
  if (err.message === "Not allowed by CORS") return res.status(403).json({ message: "Origin not allowed." });

  console.error(err.stack);
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Auto-cancel orders nobody ever paid for, so stock doesn't stay locked
// away forever. Runs once on boot, then every 2 minutes.
cancelAbandonedOrders().catch((err) =>
  console.error("Abandoned order cleanup failed:", err)
);
setInterval(() => {
  cancelAbandonedOrders().catch((err) =>
    console.error("Abandoned order cleanup failed:", err)
  );
}, 2 * 60 * 1000);
