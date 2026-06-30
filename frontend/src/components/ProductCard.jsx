import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product }) {
  const image = product.images?.[0] || null;
  const outOfStock = (product.totalStock ?? 0) <= 0;
  const isLowStock = !outOfStock && (product.totalStock ?? 0) <= 5;
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;

    // Products with variants need colour selection → go to detail page
    if (product.variants?.length > 0) {
      navigate(`/products/${product._id}`);
      return;
    }

    addItem(product, 1, null); // no login required
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="product-card">
      <Link to={`/products/${product._id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div className="product-img-wrap">
          {image
            ? <img src={image} alt={product.name?.en} />
            : <div className="product-img-placeholder">💍</div>
          }
          {isLowStock && (
            <span className="product-stock-badge" style={{ background: "rgba(184,134,11,0.15)", color: "var(--gold-text)", fontSize: "10.5px", fontWeight: 600, padding: "3px 9px", borderRadius: 20, position: "absolute", top: 10, right: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Only {product.totalStock} left
            </span>
          )}
          {!outOfStock && !isLowStock && (
            <span className="product-stock-badge badge-instock">In stock</span>
          )}
          {outOfStock && (
            <span className="product-stock-badge badge-outstock">Out of stock</span>
          )}
          <div className="product-overlay">
            <span className="product-overlay-text">View Details</span>
          </div>
        </div>
        <div className="product-info">
          <p className="product-name">{product.name?.en}</p>
          {product.variants?.length > 0 && (
            <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>
              {product.variants.length} colours available
            </p>
          )}
          <p className="product-price">৳ {product.basePrice?.toLocaleString()}</p>
        </div>
      </Link>

      {outOfStock ? (
        <button disabled className="product-add-btn">Out of Stock</button>
      ) : (
        <button
          className={`product-add-btn${added ? " added" : ""}`}
          onClick={handleAddToCart}
        >
          {added ? "✓ Added!"
            : product.variants?.length > 0 ? "Select Options →"
            : "Add to Cart"}
        </button>
      )}
    </div>
  );
}
