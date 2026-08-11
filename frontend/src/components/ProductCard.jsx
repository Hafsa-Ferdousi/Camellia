import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Gem, Check } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { localized } from "../utils/localized";
import { formatPrice } from "../utils/formatPrice";
import { cldUrl, cldSrcSet } from "../utils/cloudinaryImage";

export default function ProductCard({ product }) {
  const { t } = useTranslation(["products", "common"]);
  const { language } = useLanguage();
  const name = localized(product.name, language);
  const image = product.images?.[0] || null;
  const outOfStock = (product.totalStock ?? 0) <= 0;
  const isLowStock = !outOfStock && (product.totalStock ?? 0) <= 5;
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;

    addItem(product, 1); // no login required
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="product-card">
      <Link to={`/products/${product._id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div className="product-img-wrap">
          {image
            ? <img
                src={cldUrl(image, 400)}
                srcSet={cldSrcSet(image, [200, 400])}
                sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 25vw"
                alt={name}
                loading="lazy"
              />
            : <div className="product-img-placeholder"><Gem size={26} /></div>
          }
          {isLowStock && (
            <span className="product-stock-badge" style={{ background: "rgba(232,163,23,0.15)", color: "var(--gold-text)", fontSize: "10.5px", fontWeight: 600, padding: "3px 9px", borderRadius: 20, position: "absolute", top: 10, right: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {t("onlyLeft", { count: product.totalStock })}
            </span>
          )}
          {!outOfStock && !isLowStock && (
            <span className="product-stock-badge badge-instock">{t("inStock")}</span>
          )}
          {outOfStock && (
            <span className="product-stock-badge badge-outstock">{t("outOfStock")}</span>
          )}
          <div className="product-overlay">
            <span className="product-overlay-text">{t("common:viewDetails")}</span>
          </div>
        </div>
        <div className="product-info">
          <p className="product-name">{name}</p>
          <p className="product-price">৳ {formatPrice(product.basePrice, language)}</p>
        </div>
      </Link>

      {outOfStock ? (
        <button disabled className="product-add-btn">{t("outOfStock")}</button>
      ) : (
        <button
          className={`product-add-btn${added ? " added" : ""}`}
          onClick={handleAddToCart}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {added ? <><Check size={14} /> {t("added")}</> : t("addToCart")}
        </button>
      )}
    </div>
  );
}
