import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { getWishlist, removeFromWishlist, clearWishlist } from "../api/wishlist";

export default function WishlistPage() {
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
      .catch(() => setError("Could not load your wishlist."))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  const handleRemove = async (productId) => {
    setRemoving(productId);
    try {
      await removeFromWishlist(productId);
      setItems(prev => prev.filter(i => i.product._id !== productId));
    } catch {
      setError("Failed to remove item.");
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
      setError("Failed to add to cart.");
    } finally {
      setAddingToCart(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear your wishlist?")) return;
    try {
      await clearWishlist();
      setItems([]);
    } catch {
      setError("Failed to clear wishlist.");
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        Loading your wishlist…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 64px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <span className="eyebrow">Your Account</span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", marginTop: 4 }}>
            Wishlist
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
            Clear All
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
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.25 }}>🤍</div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--charcoal)", marginBottom: 8 }}>
            Your wishlist is empty
          </p>
          <p style={{ fontSize: 14, marginBottom: 28 }}>
            Save items you love and come back to them anytime!
          </p>
          <Link to="/products" className="btn">Browse Products</Link>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
            {items.length} {items.length === 1 ? "item" : "items"} saved
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
                      ? <img src={product.images[0]} alt={product.name?.en} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 36, opacity: 0.2 }}>💍</span>}
                  </div>
                </Link>
                <div style={{ padding: "12px 14px 14px" }}>
                  <Link to={`/products/${product._id}`} style={{ textDecoration: "none" }}>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--charcoal)", marginBottom: 4 }}>
                      {product.name?.en}
                    </p>
                  </Link>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--gold-text)", marginBottom: 4 }}>
                    ৳ {product.basePrice?.toLocaleString()}
                  </p>
                  <p style={{ fontSize: 11, marginBottom: 12 }}>
                    {product.totalStock > 0
                      ? <span style={{ color: "#065F46" }}>In Stock</span>
                      : <span style={{ color: "#991B1B" }}>Out of Stock</span>}
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
                    {addingToCart === product._id ? "Adding..." : product.totalStock ? "Move to Cart" : "Out of Stock"}
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
                    {removing === product._id ? "Removing..." : "Remove"}
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