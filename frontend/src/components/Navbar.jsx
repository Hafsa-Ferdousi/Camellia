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

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo" onClick={close}>Camellia</Link>

          <nav className="navbar-links">
            {navLink("/", "Home")}
            {navLink("/products", "Products")}
            <a href="/#categories-section" className="navbar-link" onClick={e => {
              close();
              if (location.pathname === "/") {
                e.preventDefault();
                setTimeout(() => document.getElementById("categories-section")?.scrollIntoView({ behavior: "smooth" }), 60);
              }
            }}>Categories</a>
            <a href="/" className="navbar-link" onClick={close}>Contact</a>
          </nav>

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
          <Link to="/" className="mobile-nav-link" onClick={close}>Categories</Link>
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
