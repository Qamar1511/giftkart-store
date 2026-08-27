import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginUser, saveSession } from "../services/authService";
import { useCurrency } from "../context/CurrencyContext";
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

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { syncFromUser } = useCurrency();
  const redirectTo = location.state?.from?.pathname || "/";
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUnverifiedEmail("");

    if (!form.email || !form.password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(form);
      saveSession(data);
      syncFromUser(data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message || "Couldn't log you in. Please try again.";
      setError(message);
      if (err.response?.data?.requiresVerification) {
        setUnverifiedEmail(err.response.data.email || form.email);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <Seo title="Login — GIFTKART" description="Log in to your GIFTKART account." path="/login" noindex />
      <AuthBackdrop />

      <div className="auth-card auth-card--accent-right">
        {/* Form side (left) */}
        <div className="auth-card-form">
          <div className="auth-form-scroll">
            <h2 className="auth-form-title">Login</h2>
            <p className="auth-form-sub">Log in to your GIFTKART account.</p>

            {error && <div className="auth-error" role="alert">{error}</div>}
            {unverifiedEmail && (
              <p className="auth-form-sub" style={{ marginTop: "-0.75rem", marginBottom: "1.25rem" }}>
                <Link to="/signup" state={{ verifyEmail: unverifiedEmail }} className="auth-link">
                  Verify your email now
                </Link>
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate>
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
                <div className="auth-field-row">
                  <span>Password</span>
                  <Link to="/forgot-password" className="auth-link auth-forgot-link">
                    Forgot password?
                  </Link>
                </div>
                <div className="auth-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
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

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Logging in…" : "Login"}
              </button>
            </form>
          </div>
        </div>

        {/* Accent side (right) */}
        <div className="auth-card-accent">
          <div className="auth-accent-body">
            <span className="auth-accent-eyebrow">GIFTKART</span>
            <h1 className="auth-accent-title">Welcome back!</h1>
            <p className="auth-accent-sub">
              To keep buying your favourite gift cards, log in with your personal info.
            </p>
            <Link to="/signup" className="auth-accent-cta">Sign Up</Link>
          </div>
          <div className="auth-accent-trust">
            <span>⚡ Instant delivery</span>
            <span>🔒 Secure checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
