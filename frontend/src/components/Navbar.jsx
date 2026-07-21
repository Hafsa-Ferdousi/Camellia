import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, ShoppingCart, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";

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

  // Scrolls to the categories section on the homepage. If we're not already
  // there, navigate there first (client-side, no full page reload) and pass
  // along which section to scroll to once Home has mounted and loaded data.
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
          <form
            className="navbar-search-form"
            onSubmit={e => {
              e.preventDefault();
              if (q.trim()) { navigate(`/products?search=${encodeURIComponent(q.trim())}`); close(); }
            }}
            style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,160,23,0.3)", borderRadius: 30, padding: "4px 6px 4px 12px", flex: "1 1 180px", minWidth: 0, maxWidth: 260, overflow: "hidden" }}
          >
            <input
              type="text"
              placeholder={t("common:search")}
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ flex: "1 1 auto", minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#E8D9C0", fontSize: 13, padding: "6px 4px" }}
            />
            <button type="submit" style={{ background: "var(--gold)", border: "none", borderRadius: 20, color: "#1C0A0F", display: "inline-flex", alignItems: "center", padding: "5px 8px", cursor: "pointer", flexShrink: 0 }}>
              <Search size={14} strokeWidth={2.5} />
            </button>
          </form>
          <div className="navbar-actions">
            <button
              type="button"
              className="navbar-link navbar-link-btn"
              onClick={() => setLanguage(language === "en" ? "bn" : "en")}
              style={{ fontSize: 12 }}
              aria-label="Toggle language"
            >
              {language === "en" ? "বাং" : "EN"}
            </button>
            {user ? (
              <>
                {user.role === "admin" && <Link to="/admin" className="navbar-btn-login" onClick={close}>{t("nav:admin")}</Link>}
                <Link to="/orders" className="navbar-link" onClick={close}>{t("nav:myOrders")}</Link>
                <span style={{ color: "rgba(232,217,192,0.5)", fontSize: 12 }}>
                  {t("nav:greeting", { name: user.role === "admin" ? "Admin" : (user.name?.split(" ")[0] || user.username) })}
                </span>
                <button className="navbar-btn-login" onClick={handleLogout}>{t("nav:logout")}</button>
              </>
            ) : (
              <>
                <Link to="/login" className="navbar-btn-login" onClick={close}>{t("nav:login")}</Link>
                <Link to="/register" className="navbar-btn-signin" onClick={close}>{t("nav:register")}</Link>
              </>
            )}
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
          <button
            type="button"
            className="mobile-nav-link navbar-link-btn"
            onClick={() => setLanguage(language === "en" ? "bn" : "en")}
          >
            {language === "en" ? "বাংলা" : "English"}
          </button>
          <div className="mobile-nav-divider" />
          {user ? (
            <>
              <Link to="/orders" className="mobile-nav-link" onClick={close}>{t("nav:myOrders")}</Link>
              {user.role === "admin" && <Link to="/admin" className="mobile-nav-link" onClick={close}>{t("nav:adminPanel")}</Link>}
              <button className="mobile-nav-btn" onClick={handleLogout}>{t("nav:logout")}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-nav-link" onClick={close}>{t("nav:login")}</Link>
              <Link to="/register" className="mobile-nav-btn" onClick={close}>{t("nav:register")}</Link>
            </>
          )}
          <Link to="/cart" className="mobile-nav-link" onClick={close} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ShoppingCart size={16} /> {t("common:cart")} {count > 0 && `(${count})`}
          </Link>
        </div>
      )}
    </>
  );
}