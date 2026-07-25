import { useState, useEffect, useRef } from "react"; // 👈 Added useRef, useEffect
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

  // 👇 NEW: Autocomplete states
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  // 👇 NEW: Click outside closes dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 👇 NEW: Debounced fetch suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (q.trim().length >= 1) {
        fetchSuggestions(q.trim());
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  const fetchSuggestions = async (query) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (product) => {
    const name = product.name?.en || product.name?.bn || "Product";
    setQ(name);
    setShowSuggestions(false);
    navigate(`/products/${product._id}`);
    close();
  };

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

  const scrollToId = (id, attemptsLeft = 20) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else if (attemptsLeft > 0) {
      setTimeout(() => scrollToId(id, attemptsLeft - 1), 100);
    }
  };

  const goToCategories = () => {
    close();
    if (location.pathname === "/") {
      scrollToId("categories-section");
    } else {
      navigate("/", { state: { scrollTo: "categories-section" } });
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
            <button type="button" className="navbar-link navbar-link-btn" onClick={goToCategories}>
              Categories
            </button>
            {navLink("/about", "About")}
            {navLink("/contact", "Contact")}
          </nav>

          {/* 🔍 SEARCH BAR – ONLY WRAPPER AND DROPDOWN ADDED */}
          <div ref={wrapperRef} style={{ flex: "0 1 220px", position: "relative" }}>
            <form
              className="navbar-search-form"
              onSubmit={e => {
                e.preventDefault();
                if (q.trim()) {
                  setShowSuggestions(false);
                  navigate(`/products?search=${encodeURIComponent(q.trim())}`);
                  close();
                }
              }}
              style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,160,23,0.3)", borderRadius: 30, padding: "4px 6px 4px 12px" }}
            >
              <input
                type="text"
                placeholder="Search products…"
                value={q}
                onChange={e => setQ(e.target.value)}
                onFocus={() => q.trim().length >= 1 && setShowSuggestions(true)}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#E8D9C0", fontSize: 13, padding: "6px 4px" }}
              />
              <button type="submit" style={{ background: "var(--gold)", border: "none", borderRadius: 20, color: "#1C0A0F", fontSize: 11, fontWeight: 600, padding: "5px 12px", cursor: "pointer" }}>
                🔍
              </button>
            </form>

            {/* 👇 NEW: DROPDOWN SUGGESTIONS */}
            {showSuggestions && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "8px",
                maxHeight: "280px",
                overflowY: "auto",
                zIndex: 999,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}>
                {loading ? (
                  <div style={{ padding: "12px", textAlign: "center", color: "#888" }}>Loading…</div>
                ) : (
                  suggestions.map((product) => {
                    const name = product.name?.en || product.name?.bn || "Product";
                    const image = product.images?.[0];
                    return (
                      <div
                        key={product._id}
                        onClick={() => handleSelectSuggestion(product)}
                        style={{
                          padding: "8px 14px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          borderBottom: "1px solid #f0f0f0",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f5f0")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                      >
                        {image ? (
                          <img src={image} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} />
                        ) : (
                          <span style={{ fontSize: 20 }}>💍</span>
                        )}
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{name}</div>
                          <div style={{ fontSize: 12, color: "#c9a84c" }}>
                            ৳ {product.basePrice?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="navbar-actions">
            {user ? (
              <>
                {user.role === "admin" && <Link to="/admin" className="navbar-btn-login" onClick={close}>Admin</Link>}
                <Link to="/orders" className="navbar-link" onClick={close}>My Orders</Link>
                <Link to="/wishlist" className="navbar-link" onClick={close}>Wishlist 🤍</Link>
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
          <form
            className="mobile-search-form"
            onSubmit={e => {
              e.preventDefault();
              if (q.trim()) { navigate(`/products?search=${encodeURIComponent(q.trim())}`); close(); }
            }}
            style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,160,23,0.3)", borderRadius: 30, padding: "4px 6px 4px 14px", marginBottom: 8 }}
          >
            <input
              type="text"
              placeholder="Search products…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#E8D9C0", fontSize: 14, padding: "8px 4px" }}
            />
            <button type="submit" style={{ background: "var(--gold)", border: "none", borderRadius: 20, color: "#1C0A0F", fontSize: 11, fontWeight: 600, padding: "6px 14px", cursor: "pointer" }}>
              🔍
            </button>
          </form>
          <Link to="/" className="mobile-nav-link" onClick={close}>Home</Link>
          <Link to="/products" className="mobile-nav-link" onClick={close}>Products</Link>
          <button type="button" className="mobile-nav-link navbar-link-btn" onClick={goToCategories}>
            Categories
          </button>
          <Link to="/about" className="mobile-nav-link" onClick={close}>About</Link>
          <Link to="/contact" className="mobile-nav-link" onClick={close}>Contact</Link>
          <div className="mobile-nav-divider" />
          {user ? (
            <>
              <Link to="/orders" className="mobile-nav-link" onClick={close}>My Orders</Link>
              <Link to="/wishlist" className="mobile-nav-link" onClick={close}>Wishlist 🤍</Link>
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