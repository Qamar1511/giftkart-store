import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getSession, clearSession } from "../services/authService";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { BRANDS, CATEGORIES } from "../data/catalog";
import "../styles/Layout.css";

// Quick brand lookup so the menu config below can reference brands by slug.
const brandBySlug = Object.fromEntries(BRANDS.map((b) => [b.slug, b]));
const pickBrands = (slugs) => slugs.map((s) => brandBySlug[s]).filter(Boolean);
const categoryLabel = (slug) =>
  CATEGORIES.find((c) => c.slug === slug)?.label || slug || "";

// ---------------------------------------------------------------------------
// Top-level nav menus (Woohoo-style). Edit labels / grouping here freely.
//  - "categories" pulls straight from CATEGORIES (scrolls to the home sections)
//  - "brands" lists the given brands, each linking to /brand/:slug
//  - a plain `to` makes it a simple link with no dropdown (like "Offers")
// ---------------------------------------------------------------------------
const MENU = [
  { key: "explore", label: "Explore!", kind: "categories" },
  {
    key: "specials",
    label: "Specials",
    kind: "brands",
    brands: pickBrands(["amazon", "steam", "psn", "netflix", "google-play"]),
  },
  {
    key: "gifting",
    label: "Gifting",
    kind: "brands",
    brands: pickBrands(["xbox", "flipkart", "swiggy", "dominos", "paypal"]),
  },
  // No dedicated offers page yet — points at home for now. Repoint `to` when ready.
  { key: "offers", label: "Offers", to: "/" },
];

// Small brand thumbnail that falls back to a coloured initial if the image
// is missing or fails to load.
const BrandThumb = ({ brand, className }) => {
  const [broken, setBroken] = useState(false);
  if (broken || !brand.image) {
    return (
      <span
        className={`${className} navbar-search-thumb-fallback`}
        style={{ background: brand.color || "var(--accent-blue)" }}
        aria-hidden="true"
      >
        {brand.name.charAt(0)}
      </span>
    );
  }
  return (
    <img
      className={className}
      src={brand.image}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
};

const SearchIcon = () => (
  <svg
    className="navbar-search-icon"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const Chevron = () => (
  <svg
    className="navbar-menu-chevron"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const BagIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems } = useCart();
  const { currency, setCurrency, currencies, currencyCodes } = useCurrency();
  const [session, setSession] = useState(getSession());
  const [profileOpen, setProfileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [switchingCurrency, setSwitchingCurrency] = useState(false);
  const [openDrawerSection, setOpenDrawerSection] = useState("account");

  const toggleDrawerSection = (id) =>
    setOpenDrawerSection((cur) => (cur === id ? null : id));

  // Search state
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  // Grace timer for the hover dropdowns: closing is delayed a beat so the
  // pointer has time to travel from the trigger down onto a panel link
  // without the menu snapping shut mid-move.
  const menuCloseTimer = useRef(null);

  const openMenuNow = (key) => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    }
    setOpenMenu(key);
  };

  const scheduleMenuClose = () => {
    if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current);
    menuCloseTimer.current = setTimeout(() => setOpenMenu(null), 280);
  };

  // Clear the pending close timer if the component unmounts mid-hover.
  useEffect(() => () => clearTimeout(menuCloseTimer.current), []);

  // Re-check session + close everything whenever the route changes.
  useEffect(() => {
    setSession(getSession());
    setMobileNavOpen(false);
    setOpenMenu(null);
    setSearchOpen(false);
    setProfileOpen(false);
    setQuery("");
  }, [location.pathname]);

  // Close any open popover when clicking outside of it.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live brand search — matches name, code/slug, tagline, and category.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return BRANDS.filter((b) => {
      const cat = categoryLabel(b.category).toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        b.slug.replace(/-/g, " ").includes(q) ||
        (b.tagline || "").toLowerCase().includes(q) ||
        cat.includes(q)
      );
    }).slice(0, 6);
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const closeAll = () => {
    setMobileNavOpen(false);
    setOpenMenu(null);
    setSearchOpen(false);
    setProfileOpen(false);
  };

  const goToBrand = (slug) => {
    setQuery("");
    closeAll();
    navigate(`/brand/${slug}`);
  };

  const handleSearchKeyDown = (e) => {
    if (!searchResults.length) {
      if (e.key === "Escape") setSearchOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const brand = searchResults[activeIndex] || searchResults[0];
      if (brand) goToBrand(brand.slug);
    } else if (e.key === "Escape") {
      setSearchOpen(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setProfileOpen(false);
    navigate("/login");
  };

  const handleCurrencyChange = async (code) => {
    if (code === currency || switchingCurrency) return;
    setSwitchingCurrency(true);
    const result = await setCurrency(code); // persists to the backend + local session
    setSwitchingCurrency(false);

    // If the backend save failed, setCurrency silently rolls the UI back to
    // the previous currency — which looks exactly like "it changed, then
    // reverted on its own". Surface the real reason instead of staying quiet.
    if (!result?.ok) {
      const reason =
        result?.error?.response?.data?.message ||
        result?.error?.message ||
        "Please try again.";
      console.error("Currency update failed:", result?.error);
      alert(`Couldn't switch currency: ${reason}`);
    }
  };

  const handleCategoryClick = (e, categorySlug) => {
    e.preventDefault();
    closeAll();
    const elementId = `cat-${categorySlug}`;
    if (location.pathname === "/") {
      document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate(`/#${elementId}`);
    }
  };

  const initials = session?.user?.fullName
    ? session.user.fullName
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <button
          className="navbar-hamburger"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileNavOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <Link
          to="/"
          className="navbar-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <img src="/images/logo.png" alt="GIFTKART" className="navbar-logo-img" />
        </Link>

        {/* ---------- Search ---------- */}
        <div className="navbar-search" ref={searchRef}>
          <div className="navbar-search-box">
            <SearchIcon />
            <input
              type="text"
              className="navbar-search-input"
              placeholder="Search for Brands and Categories"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              aria-label="Search for brands and categories"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                className="navbar-search-clear"
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {searchOpen && query.trim() && (
            <div className="navbar-search-results" role="listbox">
              {searchResults.length ? (
                searchResults.map((brand, i) => (
                  <button
                    key={brand.slug}
                    type="button"
                    role="option"
                    aria-selected={i === activeIndex}
                    className={`navbar-search-item ${i === activeIndex ? "is-active" : ""}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => goToBrand(brand.slug)}
                  >
                    <BrandThumb brand={brand} className="navbar-search-thumb" />
                    <span className="navbar-search-item-text">
                      <span className="navbar-search-item-name">{brand.name}</span>
                      <span className="navbar-search-item-sub">
                        {brand.tagline || categoryLabel(brand.category)}
                      </span>
                    </span>
                    <span className="navbar-search-item-go">↵</span>
                  </button>
                ))
              ) : (
                <p className="navbar-search-empty">
                  No brands found for “{query.trim()}”
                </p>
              )}
            </div>
          )}
        </div>

        {/* ---------- Desktop dropdown menus ---------- */}
        <nav className="navbar-menu" ref={menuRef}>
          {MENU.map((group) =>
            group.to ? (
              <Link key={group.key} to={group.to} className="navbar-menu-link">
                {group.label}
              </Link>
            ) : (
              <div
                key={group.key}
                className="navbar-menu-item"
                onMouseEnter={() => openMenuNow(group.key)}
                onMouseLeave={scheduleMenuClose}
              >
                <button
                  type="button"
                  className="navbar-menu-trigger"
                  onClick={() =>
                    setOpenMenu((cur) => (cur === group.key ? null : group.key))
                  }
                  aria-expanded={openMenu === group.key}
                  aria-haspopup="true"
                >
                  {group.label}
                  <Chevron />
                </button>

                {openMenu === group.key && (
                  <div className="navbar-menu-panel">
                    {group.kind === "categories" ? (
                      <>
                        {CATEGORIES.map((cat) => (
                          <a
                            key={cat.slug}
                            href={`#cat-${cat.slug}`}
                            className="navbar-menu-panel-link"
                            onClick={(e) => handleCategoryClick(e, cat.slug)}
                          >
                            {cat.label}
                          </a>
                        ))}
                        <div className="navbar-menu-panel-divider" />
                        <Link
                          to="/blog"
                          className="navbar-menu-panel-link"
                          onClick={() => setOpenMenu(null)}
                        >
                          Blog
                        </Link>
                      </>
                    ) : (
                      group.brands.map((brand) => (
                        <Link
                          key={brand.slug}
                          to={`/brand/${brand.slug}`}
                          className="navbar-menu-panel-link"
                          onClick={() => setOpenMenu(null)}
                        >
                          <BrandThumb brand={brand} className="navbar-menu-panel-thumb" />
                          {brand.name}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </nav>

        {/* ---------- Actions ---------- */}
        <div className="navbar-actions">
          {session && (
            <div
              className="navbar-currency"
              role="group"
              aria-label="Buying currency"
              title="Switch your buying currency"
            >
              {currencyCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`navbar-currency-option ${currency === code ? "is-active" : ""}`}
                  onClick={() => handleCurrencyChange(code)}
                  disabled={switchingCurrency}
                  aria-pressed={currency === code}
                >
                  <span className="navbar-currency-symbol">{currencies[code].symbol}</span>
                  {currencies[code].short || code}
                </button>
              ))}
            </div>
          )}

          <Link to="/cart" className="navbar-cart-link" aria-label="Cart">
            <BagIcon />
            {totalItems > 0 && <span className="navbar-cart-badge">{totalItems}</span>}
          </Link>

          {session ? (
            <div className="navbar-profile" ref={profileRef}>
              <button
                className="navbar-avatar"
                onClick={() => setProfileOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={profileOpen}
              >
                {initials}
              </button>
              {profileOpen && (
                <div className="navbar-dropdown">
                  <p className="navbar-dropdown-name">{session.user.fullName}</p>
                  <p className="navbar-dropdown-email">{session.user.email}</p>
                  <hr />
                  {session.user.role === "admin" && (
                    <Link to="/admin" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)}>
                      Admin panel
                    </Link>
                  )}
                  <Link to="/orders" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)}>
                    My Orders
                  </Link>
                  <button className="navbar-dropdown-item is-danger" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-auth-buttons">
              <Link to="/login" className="navbar-btn navbar-btn-ghost">
                Log in
              </Link>
              <Link to="/signup" className="navbar-btn navbar-btn-solid">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Mobile drawer (menus collapse in here, accordion-style) ---------- */}
      <div className={`navbar-drawer ${mobileNavOpen ? "is-open" : ""}`}>
        {session && (
          <div className="navbar-drawer-section">
            <button
              type="button"
              className="navbar-drawer-section-header"
              onClick={() => toggleDrawerSection("account")}
              aria-expanded={openDrawerSection === "account"}
            >
              My Account
              <span className={`navbar-drawer-arrow ${openDrawerSection === "account" ? "is-open" : ""}`}>▾</span>
            </button>
            {openDrawerSection === "account" && (
              <div className="navbar-drawer-section-body">
                <p className="navbar-drawer-account-name">{session.user.fullName}</p>
                <p className="navbar-drawer-account-email">{session.user.email}</p>
                {session.user.role === "admin" && (
                  <Link to="/admin" className="navbar-drawer-link" onClick={closeAll}>
                    Admin panel
                  </Link>
                )}
                <Link to="/orders" className="navbar-drawer-link" onClick={closeAll}>
                  My Orders
                </Link>
                <button className="navbar-drawer-link is-danger" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        )}

        <div className="navbar-drawer-section">
          <button
            type="button"
            className="navbar-drawer-section-header"
            onClick={() => toggleDrawerSection("currency")}
            aria-expanded={openDrawerSection === "currency"}
          >
            Currency
            <span className={`navbar-drawer-arrow ${openDrawerSection === "currency" ? "is-open" : ""}`}>▾</span>
          </button>
          {openDrawerSection === "currency" && (
            <div className="navbar-drawer-section-body navbar-drawer-currency" role="group" aria-label="Buying currency">
              {currencyCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`navbar-currency-option ${currency === code ? "is-active" : ""}`}
                  onClick={() => handleCurrencyChange(code)}
                  disabled={switchingCurrency}
                  aria-pressed={currency === code}
                >
                  {currencies[code].short || code}
                </button>
              ))}
            </div>
          )}
        </div>

        {MENU.map((group) =>
          group.to ? (
            <Link
              key={group.key}
              to={group.to}
              className="navbar-drawer-link navbar-drawer-solo"
              onClick={closeAll}
            >
              {group.label}
            </Link>
          ) : (
            <div className="navbar-drawer-section" key={group.key}>
              <button
                type="button"
                className="navbar-drawer-section-header"
                onClick={() => toggleDrawerSection(group.key)}
                aria-expanded={openDrawerSection === group.key}
              >
                {group.label}
                <span className={`navbar-drawer-arrow ${openDrawerSection === group.key ? "is-open" : ""}`}>▾</span>
              </button>
              {openDrawerSection === group.key && (
                <div className="navbar-drawer-section-body">
                  {group.kind === "categories" ? (
                    <>
                      {CATEGORIES.map((cat) => (
                        <a
                          key={cat.slug}
                          href={`#cat-${cat.slug}`}
                          className="navbar-drawer-link"
                          onClick={(e) => handleCategoryClick(e, cat.slug)}
                        >
                          {cat.label}
                        </a>
                      ))}
                      <Link to="/blog" className="navbar-drawer-link" onClick={closeAll}>
                        Blog
                      </Link>
                    </>
                  ) : (
                    group.brands.map((brand) => (
                      <Link
                        key={brand.slug}
                        to={`/brand/${brand.slug}`}
                        className="navbar-drawer-link"
                        onClick={closeAll}
                      >
                        <BrandThumb brand={brand} className="navbar-menu-panel-thumb" />
                        {brand.name}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </header>
  );
};

export default Navbar;
