const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      validate: {
        // Phone is stored with its country code prepended (e.g.
        // "+919149783414"). Indian numbers still get the strict
        // 10-digit-starting-6-9 check; other countries just need a
        // sane digit count.
        validator: function (value) {
          if (value.startsWith("+91")) {
            return /^[6-9]\d{9}$/.test(value.slice(3));
          }
          const digitsOnly = value.replace(/\D/g, "");
          return digitsOnly.length >= 6 && digitsOnly.length <= 14;
        },
        message: "Enter a valid phone number",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // never return password by default in queries
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    // Buying currency the customer chose at signup; switchable later from
    // the navbar. Drives which prices they see and the currency their
    // orders are charged in. INR = pay in rupees (UPI/cards), USDT = crypto.
    currency: {
      type: String,
      enum: ["INR", "USDT"],
      default: "INR",
    },
    // Default address, used to prefill the buy flow. Orders can still store
    // their own address snapshot separately.
    defaultAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "India" },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // 2Factor.in's session ID for the OTP currently in flight (signup phone
    // verification) — not the code itself, 2Factor tracks that on their
    // end. otpExpires is our own short client-side timeout on top of it.
    otpSessionId: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving, only if it was modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare login password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
