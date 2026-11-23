import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupUser, saveSession } from "../services/authService";
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
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      saveSession(data);
      navigate("/");
    } catch (err) {
      const message =
        err.response?.data?.message || "Couldn't create your account. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
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
        </div>
      </div>
    </div>
  );
};

export default Signup;
