import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCatalog } from "../services/productService";
import BrandBadge from "../components/BrandBadge";
import "../styles/Shop.css";

const HERO_SLIDES = [
  {
    eyebrow: "GIFTKART · India's Gift Card Store",
    title: "One store. Every brand.",
    sub: "Amazon, Steam, Netflix, PlayStation and more — instant digital codes, delivered to your account in seconds.",
    accent: "linear-gradient(120deg, #3b7bf6 0%, #8a5cf6 100%)",
  },
  {
    eyebrow: "GIFTKART · Gaming Top-ups",
    title: "Level up, your way.",
    sub: "PlayStation, Steam and Xbox wallet top-ups at every denomination you need — no waiting for restocks.",
    accent: "linear-gradient(120deg, #107c10 0%, #29e6ff 100%)",
    image: "/images/hero-banner.png",
  },
  {
    eyebrow: "GIFTKART · Pay Any Way",
    title: "Cards, UPI, PayPal or crypto.",
    sub: "Pick whatever's easiest at checkout — every method is secure and your details never touch our servers.",
    accent: "linear-gradient(120deg, #e50914 0%, #8a5cf6 100%)",
  },
];

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

const BrandTile = ({ brand }) => (
  <Link to={`/brand/${brand.slug}`} className="brand-tile">
    <BrandBadge name={brand.name} color={brand.color} size="md" />
    <div>
      <p className="brand-tile-name">{brand.name}</p>
      <p className="brand-tile-meta">{brand.inStock ? "Instant code" : "Out of stock"}</p>
    </div>
  </Link>
);

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
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
        setError("Couldn't load gift cards right now. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-rotate the hero carousel every 5s
  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const scrollToCategory = (e, categorySlug) => {
    e.preventDefault();
    document.getElementById(`cat-${categorySlug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const featuredBrands = brands.slice(0, 8);
  const activeSlide = HERO_SLIDES[slide];

  return (
    <div>
      {/* ---------- Hero carousel ---------- */}
      <section className="hero-carousel" style={{ background: activeSlide.accent }}>
        {activeSlide.image && <img src={activeSlide.image} alt="" className="hero-carousel-img" />}
        <div className="hero-carousel-overlay" />
        <div className="hero-carousel-content">
          <span className="auth-eyebrow">{activeSlide.eyebrow}</span>
          <h1 className="hero-banner-title">{activeSlide.title}</h1>
          <p className="hero-banner-sub">{activeSlide.sub}</p>
          <div className="hero-banner-actions">
            <a
              href="#catalog"
              className="giftcard-card-btn hero-banner-cta"
              onClick={(e) => scrollToCategory(e, categories[0]?.slug)}
            >
              Shop gift cards
            </a>
          </div>
        </div>
        <div className="hero-carousel-dots">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.title}
              className={`hero-carousel-dot ${i === slide ? "is-active" : ""}`}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ---------- Category quick-nav ---------- */}
      <nav className="category-nav">
        {categories.map((cat) => (
          <a key={cat.slug} href={`#cat-${cat.slug}`} className="category-nav-pill" onClick={(e) => scrollToCategory(e, cat.slug)}>
            {cat.label}
          </a>
        ))}
      </nav>

      {loading && (
        <p className="shop-status" style={{ textAlign: "center", padding: "2rem" }}>
          Loading gift cards…
        </p>
      )}
      {error && (
        <p className="shop-status shop-status-error" style={{ textAlign: "center", padding: "2rem" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
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
          <section className="how-it-works">
            {HOW_IT_WORKS.map((item) => (
              <div className="how-step" key={item.step}>
                <span className="how-step-num">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
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
        </>
      )}

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
