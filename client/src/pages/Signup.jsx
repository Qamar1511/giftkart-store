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
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [otp, setOtp] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [resending, setResending] = useState(false);

  // Arrived here via Login's "Verify your email now" link — skip straight
  // to the OTP step and send a fresh code for that address.
  useEffect(() => {
    const verifyEmail = location.state?.verifyEmail;
    if (!verifyEmail) return;
    setForm((f) => ({ ...f, email: verifyEmail }));
    setStep("otp");
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

  const handleSubmit = async (e) => {
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
        setStep("otp");
        setOtpNotice(data.message || "We've emailed you a 6-digit code.");
      } else {
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
          {step === "form" ? (
            <>
              <h2 className="auth-form-title">Create account</h2>
              <p className="auth-form-sub">
                Already have one?{" "}
                <Link to="/login" className="auth-link">
                  Log in
                </Link>
              </p>

              {error && <div className="auth-error" role="alert">{error}</div>}

              <form onSubmit={handleSubmit} noValidate>
                <label className="auth-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Rohan Sharma"
                    autoComplete="name"
                  />
                </label>

                <label className="auth-field">
                  <span>Email address</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>

                <label className="auth-field">
                  <span>Phone number</span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="98765 43210"
                    autoComplete="tel"
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
                  />
                </label>

                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="auth-form-title">Verify your email</h2>
              <p className="auth-form-sub">
                Enter the 6-digit code we sent to <strong>{form.email}</strong>
              </p>

              {error && <div className="auth-error" role="alert">{error}</div>}
              {!error && otpNotice && <div className="auth-success" role="status">{otpNotice}</div>}

              <form onSubmit={handleVerify} noValidate>
                <label className="auth-field">
                  <span>Verification code</span>
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
                    style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: "1.2rem" }}
                  />
                </label>

                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Verifying…" : "Verify account"}
                </button>
              </form>

              <p className="auth-form-sub" style={{ marginTop: "1rem" }}>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
