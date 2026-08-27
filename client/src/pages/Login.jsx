import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginUser, saveSession } from "../services/authService";
import { BRANDS } from "../data/catalog";
import { useCurrency } from "../context/CurrencyContext";
import "../styles/Auth.css";
import Seo from "../components/Seo";

const FEATURED_BRANDS = BRANDS.slice(0, 5);

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
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <span className="auth-eyebrow">GIFTKART · India's Gift Card Store</span>
          <h1 className="auth-brand-title">
            One store.
            <br />
            Every brand.
          </h1>
          <p className="auth-brand-sub">
            Amazon, Steam, Netflix, PlayStation and more — instant digital codes,
            delivered to your account the moment payment clears.
          </p>
          <div className="auth-chip-stack">
            {FEATURED_BRANDS.map((brand, i) => (
              <div
                className="auth-chip"
                key={brand.slug}
                style={{ "--i": i }}
              >
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
          <h2 className="auth-form-title">Log in</h2>
          <p className="auth-form-sub">
            New here?{" "}
            <Link to="/signup" className="auth-link">
              Create an account
            </Link>
          </p>

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
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
