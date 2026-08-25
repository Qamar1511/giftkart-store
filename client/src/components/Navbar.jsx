import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getSession, clearSession } from "../services/authService";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import "../styles/Layout.css";

const NAV_LINKS = [
  { label: "Gaming", categorySlug: "gaming" },
  { label: "Shopping", categorySlug: "shopping" },
  { label: "Entertainment", categorySlug: "entertainment" },
  { label: "Food", categorySlug: "food" },
  { label: "My Orders", to: "/orders", authOnly: true },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [session, setSession] = useState(getSession());
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef(null);

  // Re-check session whenever the route changes (e.g. right after login)
  useEffect(() => {
    setSession(getSession());
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Close the profile dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setMenuOpen(false);
    navigate("/login");
  };

  const handleCategoryClick = (e, categorySlug) => {
    e.preventDefault();
    setMobileNavOpen(false);
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
        >
          <span />
          <span />
          <span />
        </button>

        <Link to="/" className="navbar-logo">
          GIFT<span className="navbar-logo-accent">KART</span>
        </Link>

        <nav className={`navbar-links ${mobileNavOpen ? "is-open" : ""}`}>
          {NAV_LINKS.filter((link) => !link.authOnly || session).map((link) =>
            link.categorySlug ? (
              <a
                key={link.categorySlug}
                href={`#cat-${link.categorySlug}`}
                className="navbar-link"
                onClick={(e) => handleCategoryClick(e, link.categorySlug)}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                className={`navbar-link ${location.pathname === link.to ? "is-active" : ""}`}
              >
                {link.label}
              </Link>
            )
          )}

          <div className="navbar-mobile-theme-row">
            <span>Dark mode</span>
            <button
              type="button"
              className="navbar-switch"
              role="switch"
              aria-checked={theme === "dark"}
              aria-label="Toggle dark mode"
              onClick={toggleTheme}
            >
              <span className="navbar-switch-thumb" />
            </button>
          </div>
        </nav>

        <div className="navbar-actions">
          <button
            type="button"
            className="navbar-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <Link to="/cart" className="navbar-cart-link" aria-label="Cart">
            🛒
            {totalItems > 0 && <span className="navbar-cart-badge">{totalItems}</span>}
          </Link>

          {session ? (
            <div className="navbar-profile" ref={menuRef}>
              <button
                className="navbar-avatar"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                {initials}
              </button>
              {menuOpen && (
                <div className="navbar-dropdown">
                  <p className="navbar-dropdown-name">{session.user.fullName}</p>
                  <p className="navbar-dropdown-email">{session.user.email}</p>
                  <hr />
                  {session.user.role === "admin" && (
                    <Link to="/admin" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                      Admin panel
                    </Link>
                  )}
                  <Link to="/orders" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
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
    </header>
  );
};

export default Navbar;
