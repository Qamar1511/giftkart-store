import React from "react";
import { Link, useLocation } from "react-router-dom";
import Seo from "../components/Seo";
import { BRANDS } from "../data/catalog";
import "../styles/Shop.css";

// Shown for any URL that matches no route. It replaces the old inline
// "Coming soon" block, which was a dead end in two ways: a shopper who landed
// on a stale link (blog posts still point at /steam-gift-cards style URLs) got
// no way forward, and Google saw a normal 200 page with "index, follow" on
// every junk URL — a soft 404, which wastes crawl budget on a site that is
// still fighting to get its real pages indexed.
//
// noindex keeps those URLs out of the index, and the links below give both
// shoppers and crawlers a route back into the real catalogue. A true HTTP 404
// status isn't possible here: Vercel serves the CRA SPA fallback (index.html)
// for unmatched paths, so the response code is always 200 and the robots meta
// is what does the work.

const QUICK_LINKS = [
  { to: "/", label: "🏠 Home" },
  { to: "/blog", label: "📖 Blog" },
  { to: "/orders", label: "📦 My Orders" },
  { to: "/cart", label: "🛒 Cart" },
  { to: "/contact", label: "✉️ Contact Us" },
];

const NotFound = () => {
  const { pathname } = useLocation();

  return (
    <div className="shop-page legal-page">
      <Seo
        title="Page Not Found — GIFTKART"
        description="This page doesn't exist on GIFTKART. Browse instant gift cards for PlayStation, Steam, Xbox, Amazon, Netflix and more."
        path={pathname}
        noindex
      />

      <section className="legal-hero">
        <div
          className="checkout-bg-decor legal-bg-decor"
          style={{ backgroundImage: "url(/images/hero-secure.webp)" }}
          aria-hidden="true"
        />
        <span className="notfound-badge">404 — page not found</span>
        <h1 className="legal-hero-title">This page doesn't exist</h1>
        <p className="legal-hero-sub">
          The link is probably outdated or mistyped. Nothing is lost — every gift card we
          sell is one click away below.
        </p>
      </section>

      <div className="legal-content">
        <p className="notfound-path">
          You tried to open <code>{pathname}</code>
        </p>

        <h2>Popular pages</h2>
        <nav className="notfound-links" aria-label="Popular pages">
          {QUICK_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="category-nav-pill">
              {link.label}
            </Link>
          ))}
        </nav>

        <h2>Shop by brand</h2>
        <nav className="notfound-links" aria-label="Gift card brands">
          {BRANDS.map((brand) => (
            <Link key={brand.slug} to={`/brand/${brand.slug}`} className="category-nav-pill">
              {brand.name}
            </Link>
          ))}
        </nav>

        <h2>Think this is our mistake?</h2>
        <p>
          If a link on GIFTKART brought you here, <Link to="/contact">tell us which page it
          was on</Link> and we'll fix it. Order-related questions are answered from the same
          place.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
