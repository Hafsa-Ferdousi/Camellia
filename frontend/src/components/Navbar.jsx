import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const close = () => setOpen(false);
  const handleLogout = () => { logout(); navigate("/"); close(); };

  const isActive = (path) => location.pathname === path;

  const navLink = (to, label) => (
    <Link
      to={to}
      className="navbar-link"
      onClick={close}
      style={{ fontWeight: isActive(to) ? 600 : undefined, color: isActive(to) ? "var(--gold-light)" : undefined }}
    >
      {label}
    </Link>
  );

  // Scrolls to an in-page section; if not on the homepage, navigates home first.
  const scrollToSection = (id) => (e) => {
    close();
    if (location.pathname === "/") {
      e.preventDefault();
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);
    } else {
      // let the <a href="/#id"> handle navigation, then scroll once loaded
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 300);
    }
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo" onClick={close}>Camellia</Link>

          <nav className="navbar-links">
            {navLink("/", "Home")}
            {navLink("/products", "Products")}
            <a href="/#categories-section" className="navbar-link" onClick={scrollToSection("categories-section")}>
              Categories
            </a>
            {navLink("/about", "About")}
            {/* FIX: "/contact" had no matching route in App.jsx and 404'd.
                There's no dedicated Contact page, so this now scrolls to the
                footer, which has the phone number / contact details. */}
            <a href="/#site-footer" className="navbar-link" onClick={scrollToSection("site-footer")}>
              Contact
            </a>
          </nav>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (q.trim()) { navigate(`/products?search=${encodeURIComponent(q.trim())}`); close(); }
            }}
            style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,160,23,0.3)", borderRadius: 30, padding: "4px 6px 4px 12px", flex: "0 1 220px" }}
          >
            <input
              type="text"
              placeholder="Search products…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#E8D9C0", fontSize: 13, padding: "6px 4px" }}
            />
            <button type="submit" style={{ background: "var(--gold)", border: "none", borderRadius: 20, color: "#1C0A0F", fontSize: 11, fontWeight: 600, padding: "5px 12px", cursor: "pointer" }}>
              🔍
            </button>
          </form>
          <div className="navbar-actions">
            {user ? (
              <>
                {user.role === "admin" && <Link to="/admin" className="navbar-btn-login" onClick={close}>Admin</Link>}
                <Link to="/orders" className="navbar-link" onClick={close}>My Orders</Link>
                <span style={{ color: "rgba(232,217,192,0.5)", fontSize: 12 }}>
                  Hi, {user.name?.split(" ")[0] || user.username}
                </span>
                <button className="navbar-btn-login" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="navbar-btn-login" onClick={close}>Login</Link>
                <Link to="/register" className="navbar-btn-signin" onClick={close}>Register</Link>
              </>
            )}
            <Link to="/cart" className="navbar-cart" onClick={close} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              🛍
              {count > 0 ? (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "var(--gold)", color: "#1C0A0F", borderRadius: "50%",
                  fontSize: 10, fontWeight: 700, width: 17, height: 17, lineHeight: 1,
                }}>
                  {count > 9 ? "9+" : count}
                </span>
              ) : (
                <span>Cart</span>
              )}
            </Link>
          </div>

          <button className="navbar-burger" onClick={() => setOpen(o => !o)} aria-label="Menu">
            {open ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {open && (
        <div className="navbar-mobile-drawer" onClick={e => e.stopPropagation()}>
          <Link to="/" className="mobile-nav-link" onClick={close}>Home</Link>
          <Link to="/products" className="mobile-nav-link" onClick={close}>Products</Link>
          <a href="/#categories-section" className="mobile-nav-link" onClick={scrollToSection("categories-section")}>
            Categories
          </a>
          <Link to="/about" className="mobile-nav-link" onClick={close}>About</Link>
          <a href="/#site-footer" className="mobile-nav-link" onClick={scrollToSection("site-footer")}>
            Contact
          </a>
          <div className="mobile-nav-divider" />
          {user ? (
            <>
              <Link to="/orders" className="mobile-nav-link" onClick={close}>My Orders</Link>
              {user.role === "admin" && <Link to="/admin" className="mobile-nav-link" onClick={close}>Admin Panel</Link>}
              <button className="mobile-nav-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-nav-link" onClick={close}>Login</Link>
              <Link to="/register" className="mobile-nav-btn" onClick={close}>Register</Link>
            </>
          )}
          <Link to="/cart" className="mobile-nav-link" onClick={close}>
            🛍 Cart {count > 0 && `(${count})`}
          </Link>
        </div>
      )}
    </>
  );
}