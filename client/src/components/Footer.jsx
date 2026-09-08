import React from "react";
import { Link } from "react-router-dom";
import "../styles/Layout.css";

const PAYMENT_METHODS = ["Razorpay", "UPI", "Visa", "Mastercard", "PayPal", "USDT"];

const SOCIAL_LINKS = [
  {
    name: "Instagram",
    url: "https://www.instagram.com/giftkartstore.in/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/share/1ET1dZx57R/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
];

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-col footer-brand">
          <Link to="/" className="navbar-logo">
            <img src="/images/logo.png" alt="GIFTKART" className="navbar-logo-img" />
          </Link>
          <p className="footer-blurb">
            Digital gift cards and wallet top-ups for all your favourite brands,
            delivered to your account instantly after payment. No physical
            shipping, no waiting.
          </p>
          <div className="footer-social-links">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-icon"
                aria-label={social.name}
                title={social.name}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Quick Links</h4>
          <Link to="/" className="footer-link">Home</Link>
          <Link to="/blog" className="footer-link">Blog</Link>
          <Link to="/orders" className="footer-link">My Orders</Link>
          <Link to="/cart" className="footer-link">Cart</Link>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Support</h4>
          <Link to="/contact" className="footer-link">Contact Us</Link>
          <Link to="/refund-policy" className="footer-link">Refund Policy</Link>
          <Link to="/terms" className="footer-link">Terms of Service</Link>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Payment Methods</h4>
          <div className="footer-payment-badges">
            {PAYMENT_METHODS.map((method) => (
              <span className="footer-payment-badge" key={method}>
                {method}
              </span>
            ))}
          </div>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Legal Info</h4>
          <p className="footer-legal-line footer-legal-name">GIFTKART STORE</p>
          <p className="footer-legal-line">GSTIN: 01NDVPS8840D1ZX</p>
          <p className="footer-legal-line">Udyam Reg. No: UDYAM-JK-14-0011191</p>
          <p className="footer-legal-line">
            40, Galhuta Road, Near Raza Nagar Masjid, Eidgah, Galhuta, Poonch,
            Jammu &amp; Kashmir – 185211
          </p>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>&copy; {new Date().getFullYear()} GIFTKART. All rights reserved.</span>
        <span className="footer-disclaimer">
          GIFTKART is an independent reseller and is not affiliated with the brands listed on this site.
        </span>
      </div>
    </footer>
  );
};

export default Footer;
