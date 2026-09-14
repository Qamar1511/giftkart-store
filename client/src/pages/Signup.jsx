import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signupUser, verifyOtp, resendOtp, saveSession } from "../services/authService";
import { DEFAULT_CURRENCY } from "../data/catalog";
import { useCurrency } from "../context/CurrencyContext";
import OtpInput from "../components/OtpInput";
import "../styles/Auth.css";
import Seo from "../components/Seo";

// Decorative neon circuit backdrop shared by every auth screen.
const AuthBackdrop = () => (
  <div className="auth-bg" aria-hidden="true">
    <span className="auth-line l1" />
    <span className="auth-line l2" />
    <span className="auth-line l3" />
    <span className="auth-node n1" />
    <span className="auth-node n2" />
    <span className="auth-node n3" />
    <span className="auth-node n4" />
  </div>
);

const initialForm = {
  fullName: "",
  email: "",
  countryCode: "+91",
  phone: "",
  password: "",
  confirmPassword: "",
  currency: DEFAULT_CURRENCY,
};

// Common country codes for the phone field — India first/default since
// that's the large majority of our customers.
const COUNTRY_CODES = [
  { code: "+91", country: "India" },
  { code: "+1", country: "USA/Canada" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "Australia" },
  { code: "+971", country: "UAE" },
  { code: "+966", country: "Saudi Arabia" },
  { code: "+974", country: "Qatar" },
  { code: "+965", country: "Kuwait" },
  { code: "+968", country: "Oman" },
  { code: "+973", country: "Bahrain" },
  { code: "+92", country: "Pakistan" },
  { code: "+880", country: "Bangladesh" },
  { code: "+94", country: "Sri Lanka" },
  { code: "+977", country: "Nepal" },
  { code: "+975", country: "Bhutan" },
  { code: "+95", country: "Myanmar" },
  { code: "+65", country: "Singapore" },
  { code: "+60", country: "Malaysia" },
  { code: "+66", country: "Thailand" },
  { code: "+63", country: "Philippines" },
  { code: "+62", country: "Indonesia" },
  { code: "+84", country: "Vietnam" },
  { code: "+86", country: "China" },
  { code: "+81", country: "Japan" },
  { code: "+82", country: "South Korea" },
  { code: "+852", country: "Hong Kong" },
  { code: "+886", country: "Taiwan" },
  { code: "+49", country: "Germany" },
  { code: "+33", country: "France" },
  { code: "+39", country: "Italy" },
  { code: "+34", country: "Spain" },
  { code: "+31", country: "Netherlands" },
  { code: "+41", country: "Switzerland" },
  { code: "+46", country: "Sweden" },
  { code: "+47", country: "Norway" },
  { code: "+45", country: "Denmark" },
  { code: "+353", country: "Ireland" },
  { code: "+351", country: "Portugal" },
  { code: "+7", country: "Russia" },
  { code: "+90", country: "Turkey" },
  { code: "+20", country: "Egypt" },
  { code: "+27", country: "South Africa" },
  { code: "+234", country: "Nigeria" },
  { code: "+254", country: "Kenya" },
  { code: "+55", country: "Brazil" },
  { code: "+52", country: "Mexico" },
  { code: "+54", country: "Argentina" },
  { code: "+64", country: "New Zealand" },
];

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currencies, currencyCodes, syncFromUser } = useCurrency();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false); // once true, fields lock and the OTP block appears
  const [otp, setOtp] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [resending, setResending] = useState(false);
  const [isClientError, setIsClientError] = useState(false);
  const errorRef = useRef(null);

  // If the currently-shown error came from our own client-side validation
  // (not the server), re-check it as the form changes and clear it the
  // moment it's no longer true — so fixing the phone number (etc.) makes
  // the message go away immediately instead of sticking around.
  useEffect(() => {
    if (error && isClientError && !validate()) {
      setError("");
      setIsClientError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Whenever an error appears (invalid field, already-registered email/phone,
  // wrong OTP, etc.) bring it into view — the form is tall enough that the
  // message can end up off-screen, especially on mobile.
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  // Arrived here via Login's "Verify your email now" link — the account
  // already exists, so skip straight to the OTP box and send a fresh code.
  useEffect(() => {
    const verifyEmail = location.state?.verifyEmail;
    if (!verifyEmail) return;
    setForm((f) => ({ ...f, email: verifyEmail }));
    setOtpSent(true);
    resendOtp(verifyEmail)
      .then((data) => setOtpNotice(data.message || "We've sent a code to your email."))
      .catch((err) => setError(err.response?.data?.message || "Couldn't send a verification code."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const validate = () => {
    if (!form.fullName || !form.email || !form.phone || !form.password) {
      return "Please fill in every field.";
    }
    if (form.password.length < 6) {
      return "Password should be at least 6 characters.";
    }
    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      return "Enter a valid email address.";
    }
    const digitsOnly = form.phone.replace(/\D/g, "");
    if (form.countryCode === "+91") {
      if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
        return "Enter a valid 10-digit Indian mobile number.";
      }
    } else if (digitsOnly.length < 6 || digitsOnly.length > 14) {
      return "Enter a valid phone number.";
    }
    return "";
  };

  // Triggered by the "Verify" button next to the Email field. Creates the
  // pending signup (all fields must be valid already) and emails the OTP.
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setIsClientError(true);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const combinedPhone = `${form.countryCode}${form.phone.replace(/\D/g, "")}`;
      const data = await signupUser({ ...form, phone: combinedPhone });
      setOtpSent(true);
      setOtpNotice(data.message || "We've emailed you a 6-digit code.");
    } catch (err) {
      const message =
        err.response?.data?.message || "Couldn't create your account. Please try again.";
      setError(message);
      setIsClientError(false);
    } finally {
      setLoading(false);
    }
  };

  // Does the actual verify call. Shared by the button and the OTP box's
  // "auto-verify once entered" behaviour.
  const submitVerify = async (code) => {
    if (loading) return;
    if (!code || code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await verifyOtp(form.email, code);
      saveSession(data);
      syncFromUser(data.user);
      navigate("/");
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't verify that code. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    submitVerify(otp);
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setOtpNotice("");
    setOtp("");
    try {
      const data = await resendOtp(form.email);
      setOtpNotice(data.message || "A new code is on its way.");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // Lets someone fix a typo'd email (or any other field) after the OTP has
  // already gone out — unlocks the form; submitting it re-sends a fresh code.
  const handleEditDetails = () => {
    setOtpSent(false);
    setOtp("");
    setOtpNotice("");
    setError("");
  };

  // One form throughout — Enter (or the matching button) does whichever step
  // is currently active: send the OTP, or verify the code.
  const handleFormSubmit = (e) => (otpSent ? handleVerify(e) : handleSendOtp(e));

  return (
    <div className="auth-screen">
      <Seo title="Sign Up — GIFTKART" description="Create your GIFTKART account to start buying gift cards." path="/signup" noindex />
      <AuthBackdrop />

      <div className="auth-card auth-card--accent-left">
        {/* Accent side (left) */}
        <div className="auth-card-accent">
          <div className="auth-accent-body">
            <span className="auth-accent-eyebrow">GIFTKART</span>
            <h1 className="auth-accent-title">Hello, friend!</h1>
            <p className="auth-accent-sub">
              Enter your details to start your journey with us — one account for
              every brand, every order.
            </p>
            <Link to="/login" className="auth-accent-cta">Login</Link>
          </div>
          <div className="auth-accent-trust">
            <span>⚡ Instant delivery</span>
            <span>🔒 Secure checkout</span>
          </div>
        </div>

        {/* Form side (right) */}
        <div className="auth-card-form">
          <div className="auth-form-scroll">
            <h2 className="auth-form-title">Create account</h2>
            <p className="auth-form-sub">
              Already have one?{" "}
              <Link to="/login" className="auth-link">Log in</Link>
            </p>

            {error && <div className="auth-error" role="alert" ref={errorRef}>{error}</div>}
            {!error && otpSent && otpNotice && (
              <div className="auth-success" role="status">{otpNotice}</div>
            )}

            <form onSubmit={handleFormSubmit} noValidate>
              <div className="auth-field auth-currency-field">
                <span>Which currency do you want to buy in?</span>
                <div className="auth-currency-toggle" role="group" aria-label="Choose your buying currency">
                  {currencyCodes.map((code) => (
                    <button
                      type="button"
                      key={code}
                      className={`auth-currency-option ${form.currency === code ? "is-selected" : ""}`}
                      onClick={() => setForm((f) => ({ ...f, currency: code }))}
                      disabled={otpSent}
                      aria-pressed={form.currency === code}
                    >
                      <span className="auth-currency-symbol">{currencies[code].symbol}</span>
                      <span className="auth-currency-name">{currencies[code].short || code}</span>
                    </button>
                  ))}
                </div>
                <small className="auth-currency-hint">
                  {form.currency === "USDT"
                    ? "Prices show in $ and you pay with USDT (crypto)."
                    : "Prices show in ₹ and you pay via UPI."}{" "}
                  You can switch anytime after logging in.
                </small>
              </div>

              <label className="auth-field">
                <span>Full name</span>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Rohan Sharma"
                  autoComplete="name"
                  disabled={otpSent}
                />
              </label>

              <label className="auth-field">
                <span>Email address</span>
                <div className="auth-inline-verify-wrap">
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={otpSent}
                  />
                  <button type="submit" className="auth-inline-verify-btn" disabled={loading || otpSent}>
                    {otpSent ? "Sent ✓" : loading ? "Sending…" : "Verify"}
                  </button>
                </div>
              </label>

              {/* Animated OTP block appears the moment the code has been sent. */}
              {otpSent && (
                <div className="auth-otp-inline">
                  <h3 className="auth-otp-heading">Let's verify your email</h3>
                  <p className="auth-otp-caption">
                    We've emailed a 6-digit code to <strong>{form.email}</strong>. It'll
                    auto-verify once entered.{" · "}
                    <button
                      type="button"
                      className="auth-link"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                      onClick={handleEditDetails}
                    >
                      Wrong email? Edit details
                    </button>
                  </p>

                  <OtpInput
                    value={otp}
                    onChange={(v) => { setOtp(v); if (error) setError(""); }}
                    onComplete={(code) => submitVerify(code)}
                    disabled={loading}
                    autoFocus
                  />

                  <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? "Verifying…" : "Verify & create account"}
                  </button>
                  <p className="auth-form-sub" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                    Didn't get a code?{" "}
                    <button
                      type="button"
                      className="auth-link"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                      onClick={handleResend}
                      disabled={resending}
                    >
                      {resending ? "Sending…" : "Resend code"}
                    </button>
                  </p>
                </div>
              )}

              <label className="auth-field">
                <span>Phone number</span>
                <div className="auth-phone-wrap">
                  <select
                    name="countryCode"
                    value={form.countryCode}
                    onChange={handleChange}
                    className="auth-phone-code"
                    disabled={otpSent}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code + c.country} value={c.code} title={c.country}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="98765 43210"
                    autoComplete="tel"
                    disabled={otpSent}
                  />
                </div>
              </label>

              <label className="auth-field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  disabled={otpSent}
                />
              </label>

              <label className="auth-field">
                <span>Confirm password</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  disabled={otpSent}
                />
              </label>

              {!otpSent && (
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Sending code…" : "Send verification code"}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
