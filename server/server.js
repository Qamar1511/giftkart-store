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

const app = express();

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
app.use(express.json());

// Contact form attachments, saved to disk in contactController.js
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
