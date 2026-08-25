import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../services/authService";
import "../styles/Auth.css";
import Seo from "../components/Seo";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.password || form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, form.password);
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      const message =
        err.response?.data?.message || "This reset link is invalid or has expired.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <Seo title="Reset Password — GIFTKART" description="Set a new password for your GIFTKART account." path="/reset-password" noindex />
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <span className="auth-eyebrow">GIFTKART · India's Gift Card Store</span>
          <h1 className="auth-brand-title">
            Set a new
            <br />
            password.
          </h1>
          <p className="auth-brand-sub">
            Choose something you haven't used before. You'll be able to log in
            right after.
          </p>
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
          <h2 className="auth-form-title">New password</h2>
          <p className="auth-form-sub">
            <Link to="/login" className="auth-link">
              Back to log in
            </Link>
          </p>

          {error && <div className="auth-error" role="alert">{error}</div>}

          {done ? (
            <div className="auth-success" role="status">
              <p>Password reset successfully. Redirecting you to log in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <label className="auth-field">
                <span>New password</span>
                <div className="auth-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-toggle-visibility"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <label className="auth-field">
                <span>Confirm new password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </label>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Saving…" : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
