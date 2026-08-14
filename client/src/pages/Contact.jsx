import React, { useState } from "react";
import { submitContactForm } from "../services/contactService";
import "../styles/Shop.css";

const MAX_FILE_MB = 5;

const initialForm = { fullName: "", email: "", phone: "", message: "" };

const Contact = () => {
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    if (selected && selected.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is too large — please attach something under ${MAX_FILE_MB}MB.`);
      e.target.value = "";
      setFile(null);
      return;
    }
    if (error) setError("");
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.fullName || !form.email || !form.message) {
      setError("Please fill in your name, email and query.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await submitContactForm({ ...form, file });
      setSuccessMessage(data.message || "Thanks — we've received your message.");
      setForm(initialForm);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="shop-page contact-page">
      <h1 className="section-heading">Contact us</h1>
      <p className="contact-page-sub">
        Have a question about an order, a gift card, or anything else? Send us a message and
        we'll get back to you as soon as we can.
      </p>

      <div className="buy-form-card contact-form-card">
        {successMessage ? (
          <div className="auth-success" role="status">
            <p>{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && <div className="auth-error" role="alert">{error}</div>}

            <div className="address-grid">
              <label className="auth-field">
                <span>Full name</span>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>

              <label className="auth-field">
                <span>Phone (optional)</span>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  autoComplete="tel"
                />
              </label>

              <label className="auth-field address-full-width">
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

              <label className="auth-field address-full-width">
                <span>Your query</span>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us what's going on…"
                  rows={5}
                />
              </label>

              <label className="auth-field address-full-width">
                <span>Attach a file (optional)</span>
                <div className="contact-file-input">
                  <input
                    type="file"
                    id="contact-attachment"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <label htmlFor="contact-attachment" className="contact-file-btn">
                    📎 {file ? "Change file" : "Choose file"}
                  </label>
                  {file && (
                    <span className="contact-file-name">
                      {file.name}
                      <button
                        type="button"
                        className="contact-file-remove"
                        onClick={() => setFile(null)}
                        aria-label="Remove attached file"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              </label>
            </div>

            <button type="submit" className="auth-submit" disabled={submitting} style={{ marginTop: "1rem" }}>
              {submitting ? "Sending…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Contact;
