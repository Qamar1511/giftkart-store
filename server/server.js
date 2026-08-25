require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { cancelAbandonedOrders } = require("./utils/stockReservation");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
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
