import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signupUser, verifyOtp, resendOtp, saveSession } from "../services/authService";
import { BRANDS } from "../data/catalog";
import "../styles/Auth.css";

const FEATURED_BRANDS = BRANDS.slice(0, 5);

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false); // once true, email field locks and the OTP box appears right under it
  const [otp, setOtp] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [resending, setResending] = useState(false);

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
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) {
      return "Enter a valid 10-digit phone number.";
    }
    return "";
  };

  // Triggered by the "Verify" button next to the Email field. Creates the
  // account (all fields must be valid already) and sends the OTP — the
  // code box then appears right under Email, in the same form.
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await signupUser(form);
      if (data.requiresVerification) {
        setOtpSent(true);
        setOtpNotice(data.message || "We've emailed you a 6-digit code.");
      } else {
        // Email sending isn't configured on the server — account is
        // already fully verified and logged in, nothing more to do.
        saveSession(data);
        navigate("/");
      }
    } catch (err) {
      const message =
        err.response?.data?.message || "Couldn't create your account. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await verifyOtp(form.email, otp);
      saveSession(data);
      navigate("/");
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't verify that code. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setOtpNotice("");
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
  // already gone out — unlocks the form again; submitting it re-sends a
  // fresh code to whatever email is now in the box.
  const handleEditDetails = () => {
    setOtpSent(false);
    setOtp("");
    setOtpNotice("");
    setError("");
  };

  // One form throughout — Enter key (or the matching button) does whichever
  // step is currently active: send the OTP, or verify the code.
  const handleFormSubmit = (e) => (otpSent ? handleVerify(e) : handleSendOtp(e));

  return (
    <div className="auth-screen">
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <span className="auth-eyebrow">GIFTKART · India's Gift Card Store</span>
          <h1 className="auth-brand-title">
            One account.
            <br />
            Every brand.
          </h1>
          <p className="auth-brand-sub">
            Track every order, download invoices, and reorder your favourite
            brand and amount in one tap.
          </p>
          <div className="auth-chip-stack">
            {FEATURED_BRANDS.map((brand, i) => (
              <div className="auth-chip" key={brand.slug} style={{ "--i": i }}>
                <span className="auth-chip-label">{brand.name}</span>
                <span className="auth-chip-tag" style={{ color: brand.color }}>Gift Card</span>
              </div>
            ))}
          </div>
          <div className="auth-trust-strip">
            <span>⚡ Instant delivery</span>
            <span>🔒 Secure checkout</span>
            <span>💬 24/7 support</span>
          </div>
        </div>
        <img
          className="auth-brand-visual"
          src="/images/auth-brand-visual.png"
          alt=""
          aria-hidden="true"
        />
        <div className="auth-brand-glow" aria-hidden="true" />
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <h2 className="auth-form-title">Create account</h2>
          <p className="auth-form-sub">
            Already have one?{" "}
            <Link to="/login" className="auth-link">
              Log in
            </Link>
          </p>

          {error && <div className="auth-error" role="alert">{error}</div>}
          {!error && otpSent && otpNotice && (
            <div className="auth-success" role="status">{otpNotice}</div>
          )}

          <form onSubmit={handleFormSubmit} noValidate>
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
                <button
                  type="submit"
                  className="auth-inline-verify-btn"
                  disabled={loading || otpSent}
                >
                  {otpSent ? "Sent ✓" : loading ? "Sending…" : "Verify"}
                </button>
              </div>
            </label>

            {/* OTP box appears right here, directly under Email, the moment
                the code has been sent — no separate screen. */}
            {otpSent && (
              <div className="auth-otp-inline">
                <label className="auth-field">
                  <span>
                    6-digit code sent to {form.email}
                    {" · "}
                    <button
                      type="button"
                      className="auth-link"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                      onClick={handleEditDetails}
                    >
                      Wrong email? Edit details
                    </button>
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      if (error) setError("");
                    }}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: "1.15rem" }}
                    autoFocus
                  />
                </label>
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Verifying…" : "Verify & create account"}
                </button>
                <p className="auth-form-sub" style={{ marginTop: "0.6rem", marginBottom: 0 }}>
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
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="98765 43210"
                autoComplete="tel"
                disabled={otpSent}
              />
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
                {loading ? "Sending code…" : "Create account"}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
