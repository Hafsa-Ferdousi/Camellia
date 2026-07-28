import { useState, useEffect, useRef } from "react"; // 👈 Added useRef, useEffect
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, ShoppingCart, Menu, X, User, Gem } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { formatPrice } from "../utils/formatPrice";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { t } = useTranslation(["nav", "common"]);
  const { language, setLanguage } = useLanguage();
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

  // Account menu — one icon button that opens a small dropdown anchored
  // under it (Language / My Orders / Wishlist / Admin / Logout, or
  // Login / Register), the same pattern commercial sites use for
  // "Account" in the top bar rather than a full sidebar/drawer.
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const closeAccount = () => setAccountOpen(false);

  // 👇 NEW: Click outside closes dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
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
    const name = (language === "bn" ? product.name?.bn : product.name?.en) || t("common:productFallback");
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
          <Link to="/" className="navbar-logo" onClick={close}>{t("common:brand")}</Link>

          <nav className="navbar-links">
            {navLink("/", t("nav:home"))}
            {navLink("/products", t("nav:products"))}
            <button type="button" className="navbar-link navbar-link-btn" onClick={goToCategories}>
              {t("nav:categories")}
            </button>
            {navLink("/about", t("nav:about"))}
            {navLink("/contact", t("nav:contact"))}
          </nav>
          <div ref={wrapperRef} className="navbar-search-wrapper" style={{ flex: "0 1 220px", position: "relative" }}>
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
              style={{ alignItems: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,160,23,0.3)", borderRadius: 30, padding: "4px 6px 4px 12px" }}
            >
              <input
                type="text"
                placeholder={t("common:search")}
                value={q}
                onChange={e => setQ(e.target.value)}
                onFocus={() => q.trim().length >= 1 && setShowSuggestions(true)}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#E8D9C0", fontSize: 13, padding: "6px 4px" }}
              />
              <button type="submit" style={{ background: "var(--gold)", border: "none", borderRadius: 20, color: "#1C0A0F", display: "inline-flex", alignItems: "center", padding: "5px 8px", cursor: "pointer", flexShrink: 0 }}>
                <Search size={14} strokeWidth={2.5} />
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
                  <div style={{ padding: "12px", textAlign: "center", color: "#888" }}>{t("common:loading")}</div>
                ) : (
                  suggestions.map((product) => {
                    const name = (language === "bn" ? product.name?.bn : product.name?.en) || t("common:productFallback");
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
                          <span style={{ color: "#c9a84c", display: "inline-flex" }}><Gem size={20} strokeWidth={1.5} /></span>
                        )}
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{name}</div>
                          <div style={{ fontSize: 12, color: "#c9a84c" }}>
                            ৳ {formatPrice(product.basePrice, language)}
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
            <Link to="/cart" className="navbar-cart" onClick={close} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ShoppingCart size={16} />
              {count > 0 ? (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "var(--gold)", color: "#1C0A0F", borderRadius: "50%",
                  fontSize: 10, fontWeight: 700, width: 17, height: 17, lineHeight: 1,
                }}>
                  {count > 9 ? "9+" : count}
                </span>
              ) : (
                <span>{t("common:cart")}</span>
              )}
            </Link>
            <div ref={accountRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="navbar-account-btn"
                onClick={() => setAccountOpen(o => !o)}
                aria-expanded={accountOpen}
                aria-label={t("nav:account")}
              >
                <User size={15} />
                <span className="navbar-account-label">{user ? (user.role === "admin" ? t("nav:admin") : (user.name?.split(" ")[0] || user.username)) : t("nav:account")}</span>
              </button>
              {accountOpen && (
                <div className="navbar-account-dropdown">
                  <button
                    type="button"
                    onClick={() => { setLanguage(language === "en" ? "bn" : "en"); }}
                  >
                    {t("nav:language")}: {language === "en" ? "বাংলা" : "English"}
                  </button>
                  <div className="navbar-account-dropdown-divider" />
                  {user ? (
                    <>
                      {user.role === "admin" ? (
                        <>
                          <Link to="/admin" onClick={() => { closeAccount(); close(); }}>{t("nav:adminPanel")}</Link>
                          <Link to="/security" onClick={() => { closeAccount(); close(); }}>{t("nav:security")}</Link>
                        </>
                      ) : (
                        <>
                          <Link to="/orders" onClick={() => { closeAccount(); close(); }}>{t("nav:myOrders")}</Link>
                          <Link to="/wishlist" onClick={() => { closeAccount(); close(); }}>{t("nav:wishlist")}</Link>
                          <Link to="/security" onClick={() => { closeAccount(); close(); }}>{t("nav:security")}</Link>
                        </>
                      )}
                      <button type="button" onClick={() => { closeAccount(); handleLogout(); }}>{t("nav:logout")}</button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => { closeAccount(); close(); }}>{t("nav:login")}</Link>
                      <Link to="/register" onClick={() => { closeAccount(); close(); }}>{t("nav:register")}</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <button className="navbar-burger" onClick={() => setOpen(o => !o)} aria-label={t("nav:menu")}>
            {open ? <X size={20} /> : <Menu size={20} />}
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
              placeholder={t("common:search")}
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#E8D9C0", fontSize: 14, padding: "8px 4px" }}
            />
            <button type="submit" style={{ background: "var(--gold)", border: "none", borderRadius: 20, color: "#1C0A0F", display: "inline-flex", alignItems: "center", padding: "7px 10px", cursor: "pointer" }}>
              <Search size={15} strokeWidth={2.5} />
            </button>
          </form>
          <Link to="/" className="mobile-nav-link" onClick={close}>{t("nav:home")}</Link>
          <Link to="/products" className="mobile-nav-link" onClick={close}>{t("nav:products")}</Link>
          <button type="button" className="mobile-nav-link navbar-link-btn" onClick={goToCategories}>
            {t("nav:categories")}
          </button>
          <Link to="/about" className="mobile-nav-link" onClick={close}>{t("nav:about")}</Link>
          <Link to="/contact" className="mobile-nav-link" onClick={close}>{t("nav:contact")}</Link>
        </div>
      )}
    </>
  );
}