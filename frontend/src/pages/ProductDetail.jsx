import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProductById } from "../api/products";
import { addToCart } from "../api/cart";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import ImageGallery from "../components/ImageGallery";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { refresh } = useCart();
  const navigate = useNavigate();

  const [product,         setProduct]         = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity,        setQuantity]        = useState(1);
  const [msg,             setMsg]             = useState({ text: "", type: "ok" });
  const [loading,         setLoading]         = useState(true);
  const [wishlisted,      setWishlisted]      = useState(false);

  useEffect(() => {
    setLoading(true);
    getProductById(id)
      .then(r => {
        setProduct(r.data);
        if (r.data.variants?.length) setSelectedVariant(r.data.variants[0]);
      })
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) { navigate("/login"); return; }
    try {
      await addToCart(product._id, quantity, selectedVariant?.sku || null);
      refresh();
      setMsg({ text: "Added to your cart ✓", type: "ok" });
      setTimeout(() => setMsg({ text: "", type: "ok" }), 2500);
    } catch (err) {
      setMsg({ text: err.response?.data?.message || "Could not add to cart.", type: "err" });
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: "48px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          <div style={{ aspectRatio: "1/1", background: "var(--parchment)", borderRadius: "var(--radius-lg)" }} />
          <div>
            {[120, 80, 200, 160].map((w, i) => (
              <div key={i} style={{ height: 20, background: "var(--parchment)", borderRadius: 4, width: w, marginBottom: 16 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!product) return null;

  const stock      = selectedVariant ? selectedVariant.stock : product.totalStock;
  const price      = selectedVariant ? selectedVariant.price : product.basePrice;
  const outOfStock = (stock ?? 0) <= 0;

  return (
    <div className="container" style={{ padding: "28px 0 64px" }}>
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/">Products</Link>
        {product.category?.name?.en && <><span>/</span><span>{product.category.name.en}</span></>}
        <span>/</span>
        <span style={{ color: "var(--charcoal)" }}>{product.name?.en}</span>
      </nav>

      <div className="detail-grid">
        {/* Gallery */}
        <ImageGallery images={product.images || []} />

        {/* Info */}
        <div>
          {product.category?.name?.en && (
            <span className="eyebrow" style={{ marginBottom: 8, display: "block" }}>
              {product.category.name.en}
            </span>
          )}
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, marginBottom: 10 }}>
            {product.name?.en}
          </h1>

          {/* Stars */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ color: "#D4A017", fontSize: 15, letterSpacing: 2 }}>★★★★☆</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>4.2 (24 reviews)</span>
          </div>

          {/* Price */}
          <p style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--gold-text)", fontWeight: 600, marginBottom: 6, letterSpacing: "0.02em" }}>
            ৳ {price?.toLocaleString()}
          </p>

          {/* Stock */}
          <p style={{ fontSize: 13, fontWeight: 600, color: outOfStock ? "var(--red)" : "var(--green)", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: outOfStock ? "var(--red)" : "var(--green)" }} />
            {outOfStock ? "Out of stock" : `In Stock — ${stock} available`}
          </p>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border)", margin: "0 0 20px" }} />

          {/* Description */}
          {product.description?.en && (
            <div style={{ marginBottom: 22 }}>
              <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500, marginBottom: 8 }}>Description</p>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>{product.description.en}</p>
            </div>
          )}

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500, marginBottom: 10 }}>
                Color — <span style={{ color: "var(--charcoal)", fontWeight: 600 }}>{selectedVariant?.color}</span>
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.variants.map(v => (
                  <button
                    key={v.sku}
                    onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                    style={{
                      padding: "7px 18px",
                      border: `${selectedVariant?.sku === v.sku ? "2px" : "1px"} solid ${selectedVariant?.sku === v.sku ? "var(--maroon)" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                      background: selectedVariant?.sku === v.sku ? "var(--cream-dark)" : "var(--ivory)",
                      fontSize: 13,
                      cursor: "pointer",
                      color: selectedVariant?.sku === v.sku ? "var(--maroon)" : "var(--muted)",
                      fontWeight: selectedVariant?.sku === v.sku ? 600 : 400,
                      fontFamily: "var(--font-body)",
                      transition: "all 0.15s",
                    }}
                  >
                    {v.color}
                    {selectedVariant?.sku === v.sku && v.price !== product.basePrice && (
                      <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>৳{v.price?.toLocaleString()}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500, marginBottom: 10 }}>Quantity</p>
            <div className="qty-stepper">
              <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
              <span style={{ fontSize: 15, minWidth: 36, textAlign: "center", padding: "0 6px", fontWeight: 500 }}>{quantity}</span>
              <button className="qty-btn" onClick={() => setQuantity(q => Math.min(stock, q + 1))} disabled={quantity >= stock}>+</button>
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <button
              className="btn"
              disabled={outOfStock}
              onClick={handleAddToCart}
              style={{ flex: 2, fontSize: 13 }}
            >
              {outOfStock ? "Out of Stock" : "Add to Cart"}
            </button>
            <button
              onClick={() => setWishlisted(w => !w)}
              style={{
                flex: 1,
                padding: "11px 14px",
                border: `1px solid ${wishlisted ? "var(--red)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                background: wishlisted ? "#FFF5F5" : "var(--ivory)",
                fontSize: 13,
                cursor: "pointer",
                color: wishlisted ? "var(--red)" : "var(--muted)",
                fontFamily: "var(--font-body)",
                transition: "all 0.15s",
              }}
            >
              {wishlisted ? "♥ Saved" : "Wishlist ♡"}
            </button>
          </div>

          {msg.text && (
            <p style={{ fontSize: 13, color: msg.type === "ok" ? "var(--green)" : "var(--red)", marginBottom: 12, padding: "10px 14px", background: msg.type === "ok" ? "#F0FDF4" : "#FEF2F2", borderRadius: "var(--radius-sm)", border: `1px solid ${msg.type === "ok" ? "#BBF7D0" : "#FECACA"}` }}>
              {msg.text}
            </p>
          )}

          {/* Delivery info */}
          <div style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginTop: 16 }}>
            {[["🚚", "Free delivery across Bangladesh"],["🎁", "Beautiful gift packaging included"],["↩️", "Easy returns within 7 days"]].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, fontSize: 13, color: "var(--muted)" }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>

          {/* Reviews */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Customer Reviews</p>
            <p style={{ fontSize: 13, color: "var(--faint)", marginBottom: 14 }}>
              No reviews yet. Be the first to share your experience!
            </p>
            <button className="btn-outline btn" style={{ fontSize: 12, padding: "8px 20px" }}>
              Write a Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
