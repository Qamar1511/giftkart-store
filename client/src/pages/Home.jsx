import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getCatalog } from "../services/productService";
import { BRANDS as STATIC_BRANDS, CATEGORIES as STATIC_CATEGORIES } from "../data/catalog";
import BrandBadge from "../components/BrandBadge";
import Seo, { SITE_URL } from "../components/Seo";
import { useTheme } from "../context/ThemeContext";
import "../styles/Shop.css";

// Each hero carries a WebP (desktop), a smaller mobile WebP and a JPEG
// fallback — all generated from the original art at identical framing, so
// the visuals are unchanged. `<picture>` (below) serves the lightest one the
// browser + viewport can use, which is the main LCP win on the homepage.
const heroSet = (base, alt) => ({
  webp: `/images/${base}.webp`,
  mobile: `/images/${base}-mobile.webp`,
  fallback: `/images/${base}.jpg`,
  alt,
});

const HERO_IMAGES_LIGHT = [
  heroSet("hero-payments", "Pay with cards, UPI, PayPal or crypto"),
  heroSet("hero-brands", "Your favourite brands, one digital card"),
  heroSet("hero-secure", "Secure payments, complete peace of mind"),
];

const HERO_IMAGES_DARK = [
  heroSet("hero-payments-dark", "Secure payments, complete peace of mind"),
  heroSet("hero-brands-dark", "Your favourite brands, one digital card"),
  heroSet("hero-secure-dark", "Gift more, worry less, always secure"),
];

const CATEGORY_ICONS = {
  gaming: "🎮",
  shopping: "🛍️",
  entertainment: "🎬",
  food: "🍔",
  payments: "💳",
};

const HOW_IT_WORKS = [
  { step: "01", title: "Pick a brand", desc: "Amazon, Steam, Netflix, PlayStation — choose from every brand we stock." },
  { step: "02", title: "Select amount", desc: "Browse denominations and pick the value you need." },
  { step: "03", title: "Checkout", desc: "Pay by card, UPI, PayPal or crypto — takes under a minute." },
  { step: "04", title: "Get your code", desc: "Your code lands instantly on the confirmation page, ready to redeem." },
];

const FAQS = [
  {
    q: "How fast will I get my code?",
    a: "The moment your payment is confirmed, a code is assigned automatically and shown on your confirmation page — no manual wait.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "Razorpay (cards, UPI, netbanking, wallets), manual UPI with QR, PayPal and USDT. Pick whichever's easiest for you at checkout.",
  },
  {
    q: "Can I cancel an order?",
    a: "Yes — as long as it hasn't been delivered yet, you can cancel from your order history and a refund will be requested automatically.",
  },
  {
    q: "Are these official gift cards?",
    a: "Yes. You get a genuine digital code to redeem on your own account for that brand — nothing shared, nothing shady.",
  },
];

const FaqItem = ({ faq, isOpen, onToggle }) => (
  <div className={`faq-item ${isOpen ? "is-open" : ""}`}>
    <button type="button" className="faq-question" onClick={onToggle} aria-expanded={isOpen}>
      <span>{faq.q}</span>
      <span className="faq-icon">{isOpen ? "−" : "+"}</span>
    </button>
    {isOpen && <p className="faq-answer">{faq.a}</p>}
  </div>
);

// `inStock` is the only part of a tile that needs the network. Until the live
// catalog arrives it's undefined, and we show the brand's tagline in that slot
// instead of guessing — same line, same height, so nothing shifts when the
// real stock status replaces it.
const stockLabel = (brand) => {
  if (brand.inStock === undefined) return brand.tagline || "View amounts";
  return brand.inStock ? "Instant code" : "Out of stock";
};

const BrandTile = ({ brand }) => (
  <Link to={`/brand/${brand.slug}`} className="brand-tile">
    <div className="brand-tile-image-wrap">
      {brand.image ? (
        <img src={brand.image} alt={brand.name} className="brand-tile-image" loading="lazy" decoding="async" />
      ) : (
        <BrandBadge name={brand.name} color={brand.color} size="lg" />
      )}
    </div>
    <div className="brand-tile-body">
      <p className="brand-tile-name">{brand.name}</p>
      <p className="brand-tile-meta">{stockLabel(brand)}</p>
    </div>
  </Link>
);

const Home = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const heroImages = theme === "dark" ? HERO_IMAGES_DARK : HERO_IMAGES_LIGHT;
  // Seeded from the bundled catalog mirror (data/catalog.js) rather than
  // starting empty. Brand names, images, colours and categories are static
  // config — only live stock needs the network — so the grid can paint on the
  // very first render instead of holding a skeleton until /api/products
  // answers. The mirror lists brands and categories in the same order the API
  // returns them, so nothing reshuffles when the live data lands.
  const [categories, setCategories] = useState(STATIC_CATEGORIES);
  const [brands, setBrands] = useState(STATIC_BRANDS);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCatalog();
        setCategories(data.categories);
        setBrands(data.brands);
      } catch (err) {
        // The tiles are already on screen, so a failed catalog fetch is a soft
        // failure now: keep them and say stock status is unknown, instead of
        // replacing the whole page with an error.
        setError("Couldn't check live availability right now — stock labels may be out of date.");
      }
    };
    load();
  }, []);

  // React Router doesn't auto-scroll to a URL hash, so the navbar's
  // category links (e.g. /#cat-gaming, possibly clicked from another page)
  // would otherwise land here without moving anywhere. The category sections
  // render on first paint now, so the target id always exists — a small
  // timeout is still enough to let React commit before we scroll.
  // Re-runs on every hash change, including clicks made while already here.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(timer);
  }, [location.hash]);
  // Auto-rotate the hero carousel every 5s
  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % heroImages.length), 5000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  const scrollToCategory = (e, categorySlug) => {
    e.preventDefault();
    document.getElementById(`cat-${categorySlug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const featuredBrands = brands.slice(0, 8);

  return (
    <div>
      <Seo
        title="Buy Gift Cards Online in India — Amazon, Steam, PlayStation, Netflix & More | GIFTKART"
        description="Buy digital gift cards online in India for Amazon, Steam, PlayStation, Xbox, Netflix, Flipkart, Google Play, Swiggy, Domino's & PayPal. Instant delivery, UPI & USDT accepted."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "GIFTKART",
          url: SITE_URL,
          description: "India's online store for digital gift cards — Amazon, Steam, PlayStation, Netflix and more, delivered instantly.",
        }}
      />
      {/* Visually hidden but real text for search engines — the hero
          above is an image carousel, so this gives Google an actual H1
          with the primary keywords instead of relying on image alt text. */}
      <h1
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        Buy Gift Cards Online in India — Amazon, Steam, PlayStation, Xbox, Netflix, Flipkart & More
      </h1>
      {/* ---------- Hero carousel (contained card, fixed height so it
           never dominates the viewport or touches the raw page edge).
           Uses light-background art in light mode, dark-background art
           in dark mode, so it always matches the page. ---------- */}
      <div className="hero-carousel-wrap">
        <section className="hero-image-carousel">
          <a
            href="#catalog"
            onClick={(e) => scrollToCategory(e, categories[0]?.slug)}
            aria-label="Shop gift cards"
          >
            {heroImages.map((img, i) => (
              <picture key={img.webp}>
                <source media="(max-width: 768px)" srcSet={img.mobile} type="image/webp" />
                <source srcSet={img.webp} type="image/webp" />
                <img
                  src={img.fallback}
                  alt={img.alt}
                  className={i === slide ? "is-active" : ""}
                  decoding="async"
                  fetchpriority={i === 0 ? "high" : "low"}
                  loading="eager"
                />
              </picture>
            ))}
          </a>
          <div className="hero-carousel-dots">
            {heroImages.map((img, i) => (
              <button
                key={img.webp}
                className={`hero-carousel-dot ${i === slide ? "is-active" : ""}`}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </section>
      </div>

      {/* ---------- Category quick-nav ---------- */}
      <nav className="category-nav">
        {categories.map((cat, i) => (
          <a
            key={cat.slug}
            href={`#cat-${cat.slug}`}
            className="category-nav-pill"
            style={{ "--i": i }}
            onClick={(e) => scrollToCategory(e, cat.slug)}
          >
            <span className="category-nav-icon">{CATEGORY_ICONS[cat.slug] || "✨"}</span>
            {cat.label}
          </a>
        ))}
      </nav>

      {error && (
        <p className="shop-status shop-status-error" style={{ textAlign: "center", padding: "0 1rem" }}>
          {error}
        </p>
      )}

      {/* ---------- Featured brands ---------- */}
      <section className="shop-page" style={{ paddingBottom: "1rem" }} id="catalog">
        <h2 className="section-heading">Featured gift cards</h2>
        <div className="featured-row">
          {featuredBrands.map((brand) => (
            <BrandTile key={brand.slug} brand={brand} />
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="how-it-works-wrap">
        <h2 className="section-heading">How to buy gift cards</h2>
        <p className="how-it-works-sub">Brand → amount → checkout → code</p>
        <div className="how-it-works">
          {HOW_IT_WORKS.map((item) => (
            <div className="how-step" key={item.step}>
              <span className="how-step-num">{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- All gift cards, grouped by category ---------- */}
      <section className="shop-page" style={{ paddingTop: "1rem" }}>
        <h2 className="section-heading">All gift cards</h2>
        {categories.map((cat) => {
          const catBrands = brands.filter((b) => b.category === cat.slug);
          if (catBrands.length === 0) return null;
          return (
            <div className="category-block" id={`cat-${cat.slug}`} key={cat.slug}>
              <h3 className="category-block-title">{cat.label}</h3>
              <div className="brand-grid">
                {catBrands.map((brand) => (
                  <BrandTile key={brand.slug} brand={brand} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="faq-section">
        <div className="faq-inner">
          <h2 className="section-heading">Got questions?</h2>
          <div className="faq-list">
            {FAQS.map((faq, i) => (
              <FaqItem key={faq.q} faq={faq} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
