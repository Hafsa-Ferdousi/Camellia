import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getProducts, getCategories } from "../api/products";
import Hero from "../components/Hero";
import ProductCard from "../components/ProductCard";

const CATEGORY_ICONS = {
  kalira: "💛",
  chura: "🔴",
  bangles: "✨",
  necklace: "📿",
  "diamond-cut": "💎",
  "wedding-accessories": "👑",
  // legacy slugs
  jhumka: "✨",
  "wedding-sets": "👑",
};

// Skeleton loader card
function SkeletonCard() {
  return (
    <div style={{
      background: "var(--ivory)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", overflow: "hidden",
      animation: "pulse 1.4s ease-in-out infinite",
    }}>
      <div style={{ aspectRatio: "4/3", background: "var(--parchment)" }} />
      <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 14, background: "var(--parchment)", borderRadius: 4, width: "75%" }} />
        <div style={{ height: 12, background: "var(--parchment)", borderRadius: 4, width: "45%" }} />
        <div style={{ height: 36, background: "var(--parchment)", borderRadius: 4, marginTop: 4 }} />
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [featured,    setFeatured]    = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loadingF,    setLoadingF]    = useState(true);
  const [loadingBS,   setLoadingBS]   = useState(true);

  useEffect(() => {
    getCategories().then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingF(true);
    getProducts({ limit: 4 })
      .then(r => setFeatured(r.data.slice(0, 4)))
      .catch(() => setFeatured([]))
      .finally(() => setLoadingF(false));
  }, []);

  useEffect(() => {
    setLoadingBS(true);
    getProducts({ limit: 12 })
      .then(r => setBestSellers(r.data.slice(4, 10)))
      .catch(() => setBestSellers([]))
      .finally(() => setLoadingBS(false));
  }, []);

  const goToCategory = (cat) => {
    navigate(`/products?category=${cat._id}`);
  };

  return (
    <div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .home-product-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        @media (max-width: 1024px) { .home-product-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 720px)  { .home-product-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; } }
        @media (max-width: 480px)  { .home-product-grid { grid-template-columns: repeat(1, 1fr); } }
      `}</style>

      {/* ── Hero ── */}
      <Hero onSearch={(q) => navigate(`/products?search=${encodeURIComponent(q)}`)} />

      {/* ── Category tiles ── */}
      {categories.length > 0 && (
        <section id="categories-section" className="category-showcase">
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <span className="eyebrow">Browse by Collection</span>
              <h2 className="section-heading" style={{ fontSize: 30, marginTop: 6 }}>
                Our Jewellery Collections
              </h2>
              <div className="divider-gold" style={{ justifyContent: "center" }}>✦</div>
            </div>
            <div className="category-grid">
              {categories.map(cat => (
                <button
                  key={cat._id}
                  className="category-tile"
                  onClick={() => goToCategory(cat)}
                  title={`Browse ${cat.name?.en}`}
                >
                  <span className="category-tile-icon">{CATEGORY_ICONS[cat.slug] || "💍"}</span>
                  <span className="category-tile-name">{cat.name?.en}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured picks ── */}
      <section className="container" style={{ padding: "56px 24px 44px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Handpicked for You</span>
            <h2 className="section-heading" style={{ fontSize: 28, marginTop: 4 }}>Featured Pieces</h2>
            <div className="divider-gold">✦</div>
          </div>
          <Link to="/products" style={s.viewAll}>View All Products →</Link>
        </div>
        <div className="home-product-grid">
          {loadingF
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : featured.length === 0
              ? <p style={{ color: "var(--muted)", fontSize: 14, gridColumn: "1/-1" }}>
                  No products yet — run <code>node seed.js</code> in the backend.
                </p>
              : featured.map(p => <ProductCard key={p._id} product={p} />)
          }
        </div>
      </section>

      {/* ── Best sellers ── */}
      <section style={{ background: "var(--cream-dark)", borderTop: "1px solid var(--border)", padding: "52px 0 60px" }}>
        <div className="container" style={{ padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
            <div>
              <span className="eyebrow">Most Loved</span>
              <h2 className="section-heading" style={{ marginTop: 6 }}>Best Selling Items</h2>
              <div className="divider-gold">✦</div>
            </div>
            <Link to="/products" style={s.viewAll}>Shop All →</Link>
          </div>
          <div className="home-product-grid">
            {loadingBS
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : bestSellers.length === 0
                ? null
                : bestSellers.map(p => <ProductCard key={p._id} product={p} />)
            }
          </div>
        </div>
      </section>

      {/* ── Why choose us ── */}
      <section className="why-section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-light)", fontFamily: "var(--font-body)" }}>
              Why Camellia
            </span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontStyle: "italic", color: "#FDF6EC", marginTop: 8 }}>
              The Bridal Jewellery Specialists
            </h2>
          </div>
          <div className="why-grid">
            {[
              { icon: "✦", title: "Handcrafted", desc: "Every piece crafted by master artisans using traditional techniques" },
              { icon: "🎁", title: "Gift Packaging", desc: "Beautiful gift packaging for every order, at no extra charge" },
              { icon: "🚚", title: "Free Delivery", desc: "Free home delivery across Bangladesh on all orders" },
              { icon: "💎", title: "Certified Quality", desc: "Quality certified gold and gemstones in every piece" },
            ].map(f => (
              <div key={f.title} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 14, color: "var(--gold-light)" }}>{f.icon}</div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#FDF6EC", marginBottom: 8, fontWeight: 600 }}>{f.title}</p>
                <p style={{ fontSize: 13, color: "rgba(232,217,192,0.55)", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ background: "var(--cream-dark)", borderTop: "1px solid var(--border)", padding: "52px 24px", textAlign: "center" }}>
        <span className="eyebrow">Ready to Shop?</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", margin: "10px 0 16px", color: "var(--charcoal)" }}>
          Explore the Full Collection
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
          Browse all our handcrafted bridal jewellery — search, filter by category and price, and find your perfect piece.
        </p>
        <Link to="/products" className="btn" style={{ display: "inline-block", padding: "13px 36px", fontSize: 13, letterSpacing: "0.1em", textDecoration: "none" }}>
          Browse All Products →
        </Link>
      </section>
    </div>
  );
}

const s = {
  viewAll: {
    fontSize: 13, color: "var(--maroon)", fontFamily: "var(--font-body)",
    fontWeight: 600, letterSpacing: "0.04em", textDecoration: "none",
    borderBottom: "1px solid var(--maroon)", paddingBottom: 2,
    whiteSpace: "nowrap",
  },
};
