const CATEGORY_ICONS = {
  kalira: "💛",
  chura: "🔴",
  bangles: "✨",
  necklace: "📿",
  "diamond-cut": "💎",
  "wedding-accessories": "👑",
  jhumka: "✨",
  "wedding-sets": "👑",
};

export default function CategorySection({ categories, onSelect }) {
  if (!categories || categories.length === 0) return null;

  return (
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
              onClick={() => onSelect(cat)}
              title={`Browse ${cat.name?.en}`}
            >
              <span className="category-tile-icon">{CATEGORY_ICONS[cat.slug] || "💍"}</span>
              <span className="category-tile-name">{cat.name?.en}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
