import React from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import "../styles/Shop.css";

const RefundPolicy = () => {
  return (
    <div className="shop-page legal-page">
      <Seo
        title="Refund & Cancellation Policy — GIFTKART"
        description="Read GIFTKART's refund and cancellation policy for gift card orders."
        path="/refund-policy"
      />
      <section className="legal-hero">
        <div
          className="checkout-bg-decor legal-bg-decor"
          style={{ backgroundImage: "url(/images/hero-secure.webp)" }}
          aria-hidden="true"
        />
        <span className="hero-trust-pill">🛡️ Fair, transparent, and fast</span>
        <h1 className="legal-hero-title">Refund &amp; Cancellation Policy</h1>
        <p className="legal-hero-sub">
          We want you to feel safe buying gift cards from GIFTKART. Here's exactly how
          cancellations and refunds work, for every payment method we support.
        </p>
      </section>

      <div className="legal-content">
        <p className="legal-updated">Last updated: August 2026</p>

        <nav className="legal-toc" aria-label="Table of contents">
          <a href="#cancelling">1. Cancelling an order</a>
          <a href="#eligibility">2. Refund eligibility</a>
          <a href="#methods">3. Refunds by payment method</a>
          <a href="#timelines">4. How long it takes</a>
          <a href="#wrong-amount">5. Wrong denomination or failed delivery</a>
          <a href="#contact">6. Need help?</a>
        </nav>

        <h2 id="cancelling">1. Cancelling an order</h2>
        <p>
          You can cancel an order any time <strong>before</strong> its gift card code has been
          delivered to your account. Once a code has been generated and shown to you, the order
          can no longer be cancelled — a digital code is unique and, like all digital goods,
          cannot be "returned" after it's been revealed. This is also why we deliver instantly
          only after payment is confirmed, rather than in advance.
        </p>
        <p>To cancel a still-pending order, go to your <Link to="/orders">Order History</Link> and select "Cancel &amp; refund" on the relevant order.</p>

        <h2 id="eligibility">2. Refund eligibility</h2>
        <ul>
          <li>Payment was deducted but the order failed or was never confirmed.</li>
          <li>You cancelled the order before the code was delivered.</li>
          <li>We were unable to fulfil your order due to a stock issue on our side.</li>
          <li>You received a wrongly denominated or duplicate code due to an error on our end.</li>
        </ul>
        <p>
          Refunds are <strong>not</strong> available simply for a change of mind once a gift
          card code has already been delivered and revealed to you.
        </p>

        <h2 id="methods">3. Refunds by payment method</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Payment method</th>
                <th>How the refund works</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Razorpay (Cards, UPI, Netbanking, Wallets)</td>
                <td>Refunded automatically to the original payment source when you cancel.</td>
              </tr>
              <tr>
                <td>PayPal</td>
                <td>Captured amount is refunded automatically to your PayPal balance / card.</td>
              </tr>
              <tr>
                <td>Manual UPI (QR code)</td>
                <td>
                  Since this is a direct bank transfer with no payment gateway, refunds are
                  reviewed manually and sent back to the same UPI ID you paid from.
                </td>
              </tr>
              <tr>
                <td>USDT / Crypto</td>
                <td>
                  Crypto transactions can't be auto-reversed. Eligible refunds are sent manually
                  to a wallet address you provide, after verification.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 id="timelines">4. How long it takes</h2>
        <p>
          Razorpay and PayPal refunds are initiated instantly on our side and typically reflect
          in <strong>5–7 business days</strong>, depending on your bank. Manual UPI and USDT
          refunds are reviewed within <strong>24–48 hours</strong> and, once approved, processed
          within a further <strong>2–5 business days</strong>.
        </p>

        <h2 id="wrong-amount">5. Wrong denomination or failed delivery</h2>
        <p>
          If a payment succeeded but your code wasn't delivered (rare, usually a temporary stock
          issue), your order stays marked "Paid" without a code — this is <strong>not</strong> a
          lost payment. Contact us with your order ID and we'll either deliver the correct code
          as soon as stock is available, or refund you in full, your choice.
        </p>

        <h2 id="contact">6. Need help?</h2>
        <p>
          Reach out any time from our <Link to="/contact">Contact page</Link> with your order ID
          and what happened — we read every message and aim to respond within a day.
        </p>
      </div>
    </div>
  );
};

export default RefundPolicy;
