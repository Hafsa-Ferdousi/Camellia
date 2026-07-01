import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { addToCart } from "../api/cart";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product }) {
  const image = product.images?.[0] || null;
  const outOfStock = (product.totalStock ?? 0) <= 0;
  const isLowStock = !outOfStock && (product.totalStock ?? 0) <= 5;
  const { user } = useAuth();
  const { refresh } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [added,  setAdded]  = useState(false);
  const [err,    setErr]    = useState("");

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/login"); return; }
    if (outOfStock || adding) return;

    // Products with variants need colour selection → go to detail page
    if (product.variants?.length > 0) {
      navigate(`/products/${product._id}`);
      return;
    }

    setAdding(true); setErr("");
    try {
      await addToCart(product._id, 1, null);
      refresh(); // update navbar badge
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      setErr("Failed to add. Please try again.");
      setTimeout(() => setErr(""), 2500);
    } finally {
      setAdding(false);
    }
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

      {err && <p style={{ fontSize: 11, color: "var(--red)", padding: "0 16px 4px", textAlign: "center" }}>{err}</p>}

      {outOfStock ? (
        <button disabled className="product-add-btn">Out of Stock</button>
      ) : (
        <button
          className={`product-add-btn${added ? " added" : ""}`}
          onClick={handleAddToCart}
          disabled={adding}
        >
          {added ? "✓ Added!"
            : adding ? "Adding…"
            : product.variants?.length > 0 ? "Select Options →"
            : "Add to Cart"}
        </button>
      )}
    </div>
  );
}
