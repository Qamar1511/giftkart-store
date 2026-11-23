import React from "react";
import { Link } from "react-router-dom";
import "../styles/Layout.css";

const PAYMENT_METHODS = ["Razorpay", "UPI", "Visa", "Mastercard", "PayPal", "USDT"];

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-col footer-brand">
          <Link to="/" className="navbar-logo">
            GIFT<span className="navbar-logo-accent">KART</span>
          </Link>
          <p className="footer-blurb">
            Digital gift cards and wallet top-ups for all your favourite brands,
            delivered to your account instantly after payment. No physical
            shipping, no waiting.
          </p>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Quick Links</h4>
          <Link to="/" className="footer-link">Home</Link>
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
