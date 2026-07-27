import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, Gem, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { localized } from "../utils/localized";
import { formatPrice } from "../utils/formatPrice";
import { getWishlist, removeFromWishlist, clearWishlist } from "../api/wishlist";

export default function WishlistPage() {
  const { t } = useTranslation(["wishlist", "orders"]);
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(null);
  const [addingToCart, setAddingToCart] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login", { state: { from: "/wishlist" } }); return; }
    getWishlist()
      .then(r => setItems(r.data))
      .catch(() => setError(t("wishlist:loadError")))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  const handleRemove = async (productId) => {
    setRemoving(productId);
    try {
      await removeFromWishlist(productId);
      setItems(prev => prev.filter(i => i.product._id !== productId));
    } catch {
      setError(t("wishlist:removeError"));
    } finally {
      setRemoving(null);
    }
  };

  const handleAddToCart = async (product) => {
    setAddingToCart(product._id);
    try {
      addItem(product, 1);
      await removeFromWishlist(product._id);
      setItems(prev => prev.filter(i => i.product._id !== product._id));
    } catch {
      setError(t("wishlist:addToCartError"));
    } finally {
      setAddingToCart(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm(t("wishlist:clearConfirm"))) return;
    try {
      await clearWishlist();
      setItems([]);
    } catch {
      setError(t("wishlist:clearError"));
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
        <Loader2 size={32} strokeWidth={1.5} className="spin" style={{ marginBottom: 12 }} />
        <div>{t("wishlist:loading")}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 64px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <span className="eyebrow">{t("orders:yourAccount")}</span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", marginTop: 4 }}>
            {t("wishlist:title")}
          </h1>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              background: "none", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: "7px 16px",
              fontSize: 12, color: "var(--muted)", cursor: "pointer",
            }}
          >
            {t("wishlist:clearAll")}
          </button>
        )}
      </div>
      <div className="divider-gold">✦</div>

      {error && (
        <div style={{
          background: "#FEF2F2", color: "#991B1B",
          padding: "10px 14px", borderRadius: "var(--radius-sm)",
          marginBottom: 16, fontSize: 13, border: "1px solid #FECACA",
        }}>
          {error}
        </div>
      )}

      {items.length === 0 && !error ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <Heart size={48} strokeWidth={1.5} style={{ marginBottom: 16, opacity: 0.25 }} />
          <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--charcoal)", marginBottom: 8 }}>
            {t("wishlist:empty")}
          </p>
          <p style={{ fontSize: 14, marginBottom: 28 }}>
            {t("wishlist:emptySub")}
          </p>
          <Link to="/products" className="btn">{t("wishlist:browseProducts")}</Link>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
            {t(items.length === 1 ? "wishlist:itemCount_one" : "wishlist:itemCount_other", { count: items.length })}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {items.map(({ product }) => (
              <div key={product._id} className="panel" style={{ padding: 0, overflow: "hidden" }}>
                <Link to={`/products/${product._id}`}>
                  <div style={{
                    width: "100%", aspectRatio: "1/1",
                    background: "var(--parchment)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {product.images?.[0]
                      ? <img src={product.images[0]} alt={localized(product.name, language)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Gem size={36} strokeWidth={1.5} style={{ opacity: 0.2 }} />}
                  </div>
                </Link>
                <div style={{ padding: "12px 14px 14px" }}>
                  <Link to={`/products/${product._id}`} style={{ textDecoration: "none" }}>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--charcoal)", marginBottom: 4 }}>
                      {localized(product.name, language)}
                    </p>
                  </Link>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--gold-text)", marginBottom: 4 }}>
                    ৳ {formatPrice(product.basePrice, language)}
                  </p>
                  <p style={{ fontSize: 11, marginBottom: 12 }}>
                    {product.totalStock > 0
                      ? <span style={{ color: "#065F46" }}>{t("wishlist:inStock")}</span>
                      : <span style={{ color: "#991B1B" }}>{t("wishlist:outOfStock")}</span>}
                  </p>
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.totalStock || addingToCart === product._id}
                    style={{
                      width: "100%", padding: "9px",
                      background: product.totalStock ? "var(--charcoal)" : "var(--border)",
                      color: product.totalStock ? "#fff" : "var(--muted)",
                      border: "none", borderRadius: "var(--radius-sm)",
                      fontSize: 12, fontWeight: 600,
                      cursor: product.totalStock ? "pointer" : "not-allowed",
                      marginBottom: 8,
                    }}
                  >
                    {addingToCart === product._id ? t("wishlist:adding") : product.totalStock ? t("wishlist:moveToCart") : t("wishlist:outOfStock")}
                  </button>
                  <button
                    onClick={() => handleRemove(product._id)}
                    disabled={removing === product._id}
                    style={{
                      width: "100%", padding: "7px",
                      background: "none",
                      border: "1.5px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12, color: "var(--muted)",
                      cursor: "pointer",
                    }}
                  >
                    {removing === product._id ? t("wishlist:removing") : t("wishlist:remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
