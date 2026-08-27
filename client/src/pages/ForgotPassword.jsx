import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/authService";
import "../styles/Auth.css";
import Seo from "../components/Seo";

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

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  // Dev convenience only: the backend doesn't have an email service wired up
  // yet, so it hands back the raw reset link here instead of emailing it.
  const [devResetLink, setDevResetLink] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Enter your email address to continue.");
      return;
    }

    setLoading(true);
    try {
      const data = await forgotPassword(email);
      setSent(true);
      if (data.resetToken) {
        setDevResetLink(`/reset-password/${data.resetToken}`);
      }
    } catch (err) {
      const message =
        err.response?.data?.message || "Couldn't send the reset link. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <Seo title="Forgot Password — GIFTKART" description="Reset your GIFTKART account password." path="/forgot-password" noindex />
      <AuthBackdrop />

      <div className="auth-card auth-card--accent-left">
        <div className="auth-card-accent">
          <div className="auth-accent-body">
            <span className="auth-accent-eyebrow">GIFTKART</span>
            <h1 className="auth-accent-title">Forgot your password?</h1>
            <p className="auth-accent-sub">
              No worries — enter the email on your account and we'll send you a
              link to set a new one.
            </p>
            <Link to="/login" className="auth-accent-cta">Back to login</Link>
          </div>
          <div className="auth-accent-trust">
            <span>⚡ Instant delivery</span>
            <span>🔒 Secure checkout</span>
          </div>
        </div>

        <div className="auth-card-form">
          <div className="auth-form-scroll">
            <h2 className="auth-form-title">Reset password</h2>
            <p className="auth-form-sub">
              Remembered it after all?{" "}
              <Link to="/login" className="auth-link">Back to log in</Link>
            </p>

            {error && <div className="auth-error" role="alert">{error}</div>}

            {sent ? (
              <div className="auth-success" role="status">
                <p>
                  If an account exists for <strong>{email}</strong>, we've sent a
                  password reset link to that address. It expires in 1 hour.
                </p>
                {devResetLink && (
                  <p className="auth-dev-note">
                    Email isn't configured on this server yet, so here's the link directly:{" "}
                    <Link to={devResetLink} className="auth-link">open the reset link</Link>
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <label className="auth-field">
                  <span>Email address</span>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>

                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
