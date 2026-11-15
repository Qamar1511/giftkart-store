const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized. Please log in." });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }

  // The token alone can't know the account was blocked after it was issued
  // (it's valid for 7 days), so look the user up on every request. One small
  // indexed lookup, and it means blocking takes effect immediately rather
  // than whenever the customer's token happens to expire.
  try {
    const user = await User.findById(decoded.id).select("isBlocked");
    if (!user) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked. Please contact support.",
        blocked: true,
      });
    }
    req.user = decoded; // { id, role }
    next();
  } catch (error) {
    console.error("Auth lookup error:", error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// Use after `protect` on routes that only admins should access
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

module.exports = { protect, adminOnly };
