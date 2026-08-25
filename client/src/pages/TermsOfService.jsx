import React from "react";
import { Link } from "react-router-dom";
import "../styles/Shop.css";

const TermsOfService = () => {
  return (
    <div className="shop-page legal-page">
      <section className="legal-hero">
        <div
          className="checkout-bg-decor legal-bg-decor"
          style={{ backgroundImage: "url(/images/hero-brands.png)" }}
          aria-hidden="true"
        />
        <span className="hero-trust-pill">📄 Plain-language, no fine-print tricks</span>
        <h1 className="legal-hero-title">Terms of Service</h1>
        <p className="legal-hero-sub">
          The rules for using GIFTKART — kept as short and clear as we could make them.
        </p>
      </section>

      <div className="legal-content">
        <p className="legal-updated">Last updated: August 2026</p>

        <nav className="legal-toc" aria-label="Table of contents">
          <a href="#account">1. Your account</a>
          <a href="#orders">2. Orders &amp; payment</a>
          <a href="#delivery">3. Digital delivery</a>
          <a href="#pricing">4. Pricing &amp; availability</a>
          <a href="#use">5. Acceptable use</a>
          <a href="#liability">6. Limitation of liability</a>
          <a href="#brands">7. Third-party brands</a>
          <a href="#changes">8. Changes to these terms</a>
          <a href="#contact-terms">9. Contact</a>
        </nav>

        <h2 id="account">1. Your account</h2>
        <p>
          You need an account to buy gift cards on GIFTKART. You're responsible for keeping your
          login details secure and for all activity under your account. Let us know right away
          if you think someone else has accessed it.
        </p>

        <h2 id="orders">2. Orders &amp; payment</h2>
        <p>
          When you place an order, you're agreeing to pay the exact amount shown at checkout in
          the currency shown (INR for Razorpay and manual UPI, USD for PayPal and USDT). We
          accept Razorpay (cards, UPI, netbanking), PayPal, USDT, and direct manual UPI transfer.
          For manual UPI, a human verifies your payment before your code is released — see our{" "}
          <Link to="/refund-policy">Refund Policy</Link> for details.
        </p>

        <h2 id="delivery">3. Digital delivery</h2>
        <p>
          Gift cards are delivered as a digital code, shown on your order confirmation page and
          in your order history, the moment payment is confirmed. There's no physical shipping.
          You're responsible for redeeming your code correctly on the relevant brand's official
          platform — we can't be held responsible for codes redeemed on the wrong account or
          entered incorrectly once they've been revealed to you.
        </p>

        <h2 id="pricing">4. Pricing &amp; availability</h2>
        <p>
          Denominations and stock shown on the site reflect what we can currently deliver — we
          limit how many of one denomination you can buy in a single order to keep things fair
          and to match live stock. Prices are set by us and may change at any time before you
          complete checkout; the price shown at checkout is what's final.
        </p>

        <h2 id="use">5. Acceptable use</h2>
        <ul>
          <li>Don't use stolen payment methods or attempt fraudulent chargebacks.</li>
          <li>Don't try to buy more than the per-order quantity limit through multiple accounts.</li>
          <li>Don't resell codes in a way that violates the issuing brand's own terms.</li>
          <li>Don't attempt to interfere with or reverse-engineer the platform.</li>
        </ul>
        <p>We reserve the right to cancel orders or suspend accounts that violate these rules.</p>

        <h2 id="liability">6. Limitation of liability</h2>
        <p>
          GIFTKART is provided "as is". We work hard to keep checkout, delivery, and support
          reliable, but we aren't liable for indirect losses arising from delays, third-party
          payment gateway outages, or issues on the redeeming brand's own platform once a valid
          code has been delivered to you.
        </p>

        <h2 id="brands">7. Third-party brands</h2>
        <p>
          GIFTKART is an independent reseller of digital gift cards. We are not affiliated with,
          endorsed by, or sponsored by Sony, Microsoft, Valve, Amazon, Netflix, Flipkart, Google,
          Swiggy, Domino's, or PayPal. All logos and trademarks belong to their respective owners.
        </p>

        <h2 id="changes">8. Changes to these terms</h2>
        <p>
          We may update these terms as the platform grows. We'll update the "last updated" date
          above when we do — continuing to use GIFTKART after a change means you accept the
          updated terms.
        </p>

        <h2 id="contact-terms">9. Contact</h2>
        <p>
          Questions about these terms? Reach out via our <Link to="/contact">Contact page</Link>{" "}
          any time.
        </p>
      </div>
    </div>
  );
};

export default TermsOfService;
