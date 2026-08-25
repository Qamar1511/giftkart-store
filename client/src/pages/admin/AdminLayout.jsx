import React from "react";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../../services/authService";
import "../../styles/Admin.css";
import Seo from "../../components/Seo";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "📊", end: true },
  { to: "/admin/orders", label: "Orders", icon: "📦" },
  { to: "/admin/stock", label: "Gift Card Stock", icon: "🎟️" },
  { to: "/admin/queries", label: "Contact Queries", icon: "💬" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const session = getSession();

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="admin-shell">
      <Seo title="Admin — GIFTKART" path="/admin" noindex />
      <aside className="admin-sidebar">
        <Link to="/" className="admin-logo">
          GIFT<span className="admin-logo-accent">KART</span>
          <span className="admin-logo-tag">Admin</span>
        </Link>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? "is-active" : ""}`}
            >
              <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">🏠</span>
            Back to store
          </Link>
          <button type="button" className="admin-nav-link admin-logout-btn" onClick={handleLogout}>
            <span className="admin-nav-icon" aria-hidden="true">🚪</span>
            Log out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-topbar-title">Admin panel</span>
          <span className="admin-topbar-user">{session?.user?.fullName}</span>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
