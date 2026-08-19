import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Gem } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { localized } from "../utils/localized";
import { formatPrice } from "../utils/formatPrice";
import { cldUrl } from "../utils/cloudinaryImage";
import Seo from "../components/Seo";

export default function Cart() {
  const { t } = useTranslation("cart");
  const { language } = useLanguage();
  const { items, updateQty, removeItem, mergeDroppedCount, dismissMergeNotice } = useCart();
  const navigate = useNavigate();

  const getPrice = item => {
    if (item.variantSku && item.product?.variants) {
      const v = item.product.variants.find(v => v.sku === item.variantSku);
      if (v) return v.price;
    }
    return item.product?.basePrice || 0;
  };

  const getStock = item => {
    if (item.variantSku && item.product?.variants) {
      const v = item.product.variants.find(v => v.sku === item.variantSku);
      if (v) return v.stock;
    }
    return item.product?.totalStock || 99;
  };

  const handleQty = (item, qty, maxStock) => {
    if (qty < 1) {
      removeItem(item.productId, item.variantSku);
      return;
    }
    if (qty > maxStock) return;
    updateQty(item.productId, qty);
  };

  const subtotal = items.reduce((s, i) => s + getPrice(i) * i.quantity, 0);
  const DELIVERY = 80;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "36px 24px 64px" }}>
      <Seo title={t("yourCart")} noindex />
      <span className="eyebrow">{t("shopping")}</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", marginTop: 4 }}>
        {t("yourCart")}
        {items.length > 0 && (
          <span style={{ fontSize: 17, fontStyle: "normal", color: "var(--muted)", marginLeft: 10, fontFamily: "var(--font-body)" }}>
            ({items.length} {t(items.length === 1 ? "item_one" : "item_other")})
          </span>
        )}
      </h1>
      <div className="divider-gold">✦</div>

      {mergeDroppedCount > 0 && (
        <div style={{
          background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A",
          borderRadius: "var(--radius-sm)", padding: "10px 14px",
          marginBottom: 20, fontSize: 13, display: "flex",
          justifyContent: "space-between", alignItems: "center", gap: 12,
        }}>
          <span>{t(mergeDroppedCount === 1 ? "mergeNotice_one" : "mergeNotice_other", { count: mergeDroppedCount })}</span>
          <button
            onClick={dismissMergeNotice}
            style={{ background: "none", border: "none", color: "#92400E", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
          >
            {t("dismiss")}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ marginBottom: 16, opacity: 0.25, display: "flex", justifyContent: "center" }}><ShoppingCart size={56} /></div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--charcoal)", marginBottom: 8 }}>
            {t("empty")}
          </p>
          <p style={{ fontSize: 14, marginBottom: 32 }}>{t("emptySub")}</p>
          <Link to="/" className="btn">{t("continueShopping")}</Link>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            {items.map(item => {
              const price = getPrice(item);
              const stock = getStock(item);
              const productName = localized(item.product?.name, language);
              return (
                <div className="cart-item" key={`${item.productId}_${item.variantSku || ""}`}>
                  <Link to={`/products/${item.productId}`} style={{ flexShrink: 0 }}>
                    <div className="cart-thumb">
                      {item.product?.images?.[0]
                        ? <img src={cldUrl(item.product.images[0], 200)} alt={productName} loading="lazy" />
                        : <Gem size={22} style={{ opacity: 0.3 }} />}
                    </div>
                  </Link>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {productName}
                    </p>
                    {item.variantSku && (
                      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{t("variant", { sku: item.variantSku })}</p>
                    )}
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--gold-text)", fontWeight: 600, marginBottom: 10 }}>
                      ৳ {formatPrice(price, language)}
                    </p>
                    <div className="qty-stepper">
                      <button className="qty-btn" onClick={() => handleQty(item, item.quantity - 1, stock)} aria-label={t(item.quantity <= 1 ? "removeItem" : "decreaseQuantity", { defaultValue: item.quantity <= 1 ? "Remove item" : "Decrease quantity" })}>−</button>
                      <span style={{ fontSize: 14, minWidth: 32, textAlign: "center", fontWeight: 500 }}>{item.quantity}</span>
                      <button className="qty-btn" onClick={() => handleQty(item, item.quantity + 1, stock)} disabled={item.quantity >= stock} aria-label={t("increaseQuantity", { defaultValue: "Increase quantity" })}>+</button>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--charcoal)", marginBottom: 10 }}>
                      ৳ {formatPrice(price * item.quantity, language)}
                    </p>
                    <button className="remove-btn" onClick={() => removeItem(item.productId, item.variantSku)}>{t("remove")}</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="panel" style={{ marginBottom: 16 }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{t("orderSummary")}</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14, color: "var(--muted)" }}>
              <span>{t("subtotal", { count: items.length, label: t(items.length === 1 ? "item_one" : "item_other") })}</span>
              <span>৳ {formatPrice(subtotal, language)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 14, color: "var(--muted)" }}>
              <span>{t("deliveryCod")}</span>
              <span style={{ color: "var(--ink)", fontWeight: 600 }}>৳ {formatPrice(DELIVERY, language)}</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600 }}>{t("estimatedTotal")}</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--gold-text)" }}>
                ৳ {formatPrice(subtotal + DELIVERY, language)}
              </span>
            </div>
          </div>

          <button
            className="btn btn-gold"
            style={{ width: "100%", padding: 14, fontSize: 14, letterSpacing: "0.1em", marginBottom: 12 }}
            onClick={() => navigate("/checkout")}
          >
            {t("proceedToCheckout")}
          </button>

          <p style={{ textAlign: "center" }}>
            <Link to="/" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "underline" }}>{t("continueShopping")}</Link>
          </p>
        </>
      )}
    </div>
  );
}