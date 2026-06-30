import ProductCard from "./ProductCard";

export default function ProductGrid({ products, loading }) {
  if (loading) {
    return (
      <div className="product-grid">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="product-card" style={{ opacity: 0.55 }}>
            <div className="product-img-wrap">
              <div className="product-img-placeholder" style={{ animation: "pulse 1.4s ease-in-out infinite" }}>
                [ product image ]
              </div>
            </div>
            <div className="product-info">
              <div style={{ height: 18, background: "var(--parchment)", borderRadius: 4, marginBottom: 10, width: "75%" }} />
              <div style={{ height: 16, background: "var(--parchment)", borderRadius: 4, width: "40%" }} />
            </div>
            <div style={{ height: 38, margin: "0 16px 16px", background: "var(--parchment)", borderRadius: "var(--radius-sm)" }} />
          </div>
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div style={{ padding: "56px 0", textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>💍</div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 8, color: "var(--charcoal)" }}>
          No products found
        </p>
        <p style={{ fontSize: 14 }}>Try a different keyword or category filter.</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map(p => <ProductCard key={p._id} product={p} />)}
    </div>
  );
}
