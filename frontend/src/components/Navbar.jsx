import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, ShoppingCart, Menu, X, User, Gem, Globe, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { formatPrice } from "../utils/formatPrice";
import { searchProducts } from "../api/products";
import { getNotifications, markAsRead, markAllAsRead } from "../api/notifications";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { t } = useTranslation(["nav", "common", "notifications"]);
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const close = () => setOpen(false);
  const handleLogout = () => { logout(); navigate("/"); close(); };

  // ✅ SMART SEARCH STATE
  const [suggestions, setSuggestions] = useState([]);
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  // Account menu
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const closeAccount = () => setAccountOpen(false);

  // Notification bell (customers only)
  const isCustomer = !!user && user.role !== "admin";
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  const loadNotifications = () => {
    getNotifications()
      .then(({ data }) => { setNotifications(data.notifications); setUnreadCount(data.unreadCount); })
      .catch(() => {});
  };

  useEffect(() => {
    if (!isCustomer) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [isCustomer]);

  const handleBellItemClick = async (n) => {
    if (!n.read) {
      setNotifications((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try { await markAsRead(n._id); } catch { /* best-effort */ }
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await markAllAsRead(); } catch { /* best-effort */ }
  };

  // Click outside closes dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ SMART SEARCH: Debounced fetch (Products + Categories)
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setCategorySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => fetchSuggestions(trimmed, controller.signal), 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  // ✅ SMART SEARCH: Fetch products AND categories
  const fetchSuggestions = async (query, signal) => {
    setLoading(true);
    try {
      const { data } = await searchProducts(query, signal);
      setSuggestions(data.products || []);
      setCategorySuggestions(data.categories || []);
      setShowSuggestions((data.products?.length || 0) > 0 || (data.categories?.length || 0) > 0);
    } catch (err) {
      // A newer keystroke aborted this request — its own fetch will update state instead.
      if (err.code === "ERR_CANCELED") return;
      console.error("Search error:", err);
      setSuggestions([]);
      setCategorySuggestions([]);
      setShowSuggestions(false);
    } finally {
      if (!signal.aborted) setLoading(false);
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
          <button className="navbar-burger" onClick={() => setOpen(o => !o)} aria-label={t("nav:menu")}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

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

          {/* 🔍 SMART SEARCH BAR — a light, high-contrast bar with an
              attached gold button, the Amazon/Daraz pattern where search
              is the one control styled to stand out from a dark header
              instead of blending into it. */}
          <div ref={wrapperRef} className="navbar-search-wrapper" style={{ flex: "1 1 320px", maxWidth: 460, minWidth: 140, position: "relative" }}>
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
              style={{ alignItems: "center", background: "var(--parchment)", border: "1px solid rgba(244,196,48,0.5)", borderRadius: 8, padding: "2px 2px 2px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
            >
              <input
                type="text"
                placeholder={t("common:search")}
                value={q}
                onChange={e => setQ(e.target.value)}
                onFocus={() => q.trim().length >= 1 && setShowSuggestions(true)}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--charcoal)", fontSize: 14, padding: "9px 4px" }}
              />
              <button type="submit" style={{ background: "var(--gold)", border: "none", borderRadius: 6, color: "#2A1206", display: "inline-flex", alignItems: "center", padding: "9px 14px", cursor: "pointer", flexShrink: 0 }}>
                <Search size={16} strokeWidth={2.5} />
              </button>
            </form>

            {/* ✅ SMART SEARCH DROPDOWN */}
            {showSuggestions && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "var(--ivory)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                maxHeight: "320px",
                overflowY: "auto",
                zIndex: 999,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}>
                {loading ? (
                  <div style={{ padding: "12px", textAlign: "center", color: "var(--muted)" }}>{t("common:loading")}</div>
                ) : (
                  <>
                    {/* PRODUCT SUGGESTIONS */}
                    {suggestions.map((product) => {
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
                            borderBottom: "1px solid var(--border-light)",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream-dark)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ivory)")}
                        >
                          {image ? (
                            <img src={image} alt="" loading="lazy" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} />
                          ) : (
                            <span style={{ color: "var(--gold-text)", display: "inline-flex" }}><Gem size={20} strokeWidth={1.5} /></span>
                          )}
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 14 }}>{name}</div>
                            <div style={{ fontSize: 12, color: "var(--gold-text)" }}>
                              ৳ {formatPrice(product.basePrice, language)}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* ✅ CATEGORY SUGGESTIONS */}
                    {categorySuggestions.length > 0 && (
                      <div>
                        <div style={{
                          padding: "6px 14px",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          borderTop: "1px solid var(--border-light)",
                        }}>
                          {t("common:categories")}
                        </div>
                        {categorySuggestions.map((cat) => {
                          const name = (language === "bn" ? cat.name?.bn : cat.name?.en) || "Category";
                          return (
                            <div
                              key={cat._id}
                              onClick={() => {
                                setQ(name);
                                setShowSuggestions(false);
                                navigate(`/products?category=${cat._id}`);
                                close();
                              }}
                              style={{
                                padding: "8px 14px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                borderBottom: "1px solid var(--border-light)",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream-dark)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ivory)")}
                            >
                              <span style={{ fontSize: "16px" }}>📂</span>
                              <span style={{ fontWeight: 500, fontSize: "14px" }}>{name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ✅ VIEW ALL RESULTS LINK */}
                    {(suggestions.length > 0 || categorySuggestions.length > 0) && (
                      <div
                        onClick={() => {
                          setShowSuggestions(false);
                          navigate(`/products?search=${encodeURIComponent(q)}`);
                          close();
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          textAlign: "center",
                          color: "var(--gold-text)",
                          fontWeight: 600,
                          fontSize: "13px",
                          borderTop: "1px solid var(--border-light)",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream-dark)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ivory)")}
                      >
                        {t("common:viewAllResults", { query: q })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="navbar-actions">
            {/* ✅ Language switcher — standalone icon button next to cart/account,
                the placement commercial sites (Amazon, Daraz) use rather than
                burying it inside the account menu. */}
            <button
              type="button"
              className="navbar-lang-btn"
              onClick={() => setLanguage(language === "en" ? "bn" : "en")}
              aria-label={t("nav:language")}
              title={t("nav:language")}
            >
              <Globe size={15} />
              <span>{language === "en" ? "EN" : "বাং"}</span>
            </button>
            {user?.role !== "admin" && (
              <Link to="/cart" className="navbar-cart" onClick={close} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ShoppingCart size={16} />
                {count > 0 ? (
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: "var(--gold)", color: "#2A1206", borderRadius: "50%",
                    fontSize: 10, fontWeight: 700, width: 17, height: 17, lineHeight: 1,
                  }}>
                    {count > 9 ? "9+" : count}
                  </span>
                ) : (
                  <span>{t("common:cart")}</span>
                )}
              </Link>
            )}
            {isCustomer && (
              <div ref={bellRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  className="navbar-lang-btn"
                  onClick={() => setBellOpen((o) => !o)}
                  aria-expanded={bellOpen}
                  aria-label={t("nav:notifications")}
                  title={t("nav:notifications")}
                  style={{ position: "relative" }}
                >
                  <Bell size={15} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: "var(--gold)", color: "#2A1206", borderRadius: "50%",
                      fontSize: 10, fontWeight: 700, width: 16, height: 16, lineHeight: 1,
                    }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div className="navbar-account-dropdown" style={{ width: 300 }}>
                    {notifications.length === 0 ? (
                      <p style={{ padding: "10px 14px", fontSize: 13, color: "rgba(232,217,192,0.65)" }}>{t("notifications:empty")}</p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n._id}
                          onClick={() => handleBellItemClick(n)}
                          style={{ padding: "8px 14px", fontSize: 13, cursor: n.read ? "default" : "pointer", opacity: n.read ? 0.65 : 1, borderBottom: "1px solid rgba(244,196,48,0.15)" }}
                        >
                          <div style={{ fontWeight: 600, color: "var(--nav-text)" }}>{n.title}</div>
                          <div style={{ color: "rgba(232,217,192,0.65)", fontSize: 12 }}>{n.message}</div>
                        </div>
                      ))
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px" }}>
                      {unreadCount > 0 && (
                        <button type="button" onClick={handleMarkAllRead} style={{ background: "none", border: "none", color: "var(--gold-light)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                          {t("notifications:markAllRead")}
                        </button>
                      )}
                      <Link to="/notifications" onClick={() => { setBellOpen(false); close(); }} style={{ fontSize: 12, fontWeight: 600 }}>
                        {t("notifications:viewAll")}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                          <Link to="/settings" onClick={() => { closeAccount(); close(); }}>{t("nav:settings")}</Link>
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
        </div>
      </header>

      {open && (
        <div className="navbar-drawer-backdrop" onClick={close} />
      )}

      {open && (
        <div className="navbar-mobile-drawer" onClick={e => e.stopPropagation()}>
          <form
            className="mobile-search-form"
            onSubmit={e => {
              e.preventDefault();
              if (q.trim()) { navigate(`/products?search=${encodeURIComponent(q.trim())}`); close(); }
            }}
            style={{ alignItems: "center", background: "var(--parchment)", border: "1px solid rgba(244,196,48,0.5)", borderRadius: 8, padding: "2px 2px 2px 14px", marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
          >
            <input
              type="text"
              placeholder={t("common:search")}
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--charcoal)", fontSize: 14, padding: "9px 4px" }}
            />
            <button type="submit" style={{ background: "var(--gold)", border: "none", borderRadius: 6, color: "#2A1206", display: "inline-flex", alignItems: "center", padding: "9px 12px", cursor: "pointer" }}>
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