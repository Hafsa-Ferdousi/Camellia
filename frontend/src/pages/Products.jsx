import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getProducts, getCategories } from "../api/products";
import ProductGrid from "../components/ProductGrid";

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

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [selectedCat, setSelectedCat] = useState(searchParams.get("category") || "");
  const [search,      setSearch]      = useState(searchParams.get("search") || "");
  const [minPrice,    setMinPrice]    = useState("");
  const [maxPrice,    setMaxPrice]    = useState("");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  // Sync URL → local state when navigating from homepage category tiles
  useEffect(() => {
    const cat    = searchParams.get("category") || "";
    const srch   = searchParams.get("search")   || "";
    setSelectedCat(cat);
    setSearch(srch);
  }, [searchParams]);

  useEffect(() => {
    getCategories().then(r => setCategories(r.data)).catch(() => {});
  }, []);

  // Fetch products whenever filters change
  useEffect(() => {
    setLoading(true);
    setError("");
    const t = setTimeout(() => {
      const params = {};
      if (selectedCat) params.category = selectedCat;
      if (search)      params.search   = search;
      if (minPrice)    params.minPrice  = minPrice;
      if (maxPrice)    params.maxPrice  = maxPrice;

      getProducts(params)
        .then(r => setProducts(r.data))
        .catch(() => { setProducts([]); setError("Could not load products."); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [selectedCat, search, minPrice, maxPrice]);

  const selectCategory = useCallback((catId) => {
    setSelectedCat(catId);
    // Update URL to reflect selection (for shareable links)
    const next = {};
    if (catId) next.category = catId;
    if (search) next.search = search;
    setSearchParams(next, { replace: true });
  }, [search, setSearchParams]);

  const clearAll = () => {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedCat("");
    setSearchParams({}, { replace: true });
  };

  const hasFilters   = search || minPrice || maxPrice || selectedCat;
  const activeCat    = categories.find(c => c._id === selectedCat);
  const activeCatName = activeCat?.name?.en || "";

  return (
    <div>
      {/* ── Page header ── */}
      <div style={s.pageHeader}>
        <div className="container">
          <span className="eyebrow" style={{ color: "rgba(212,160,23,0.7)" }}>Camellia Collection</span>
          <h1 style={s.pageTitle}>
            {activeCatName ? activeCatName : "All Jewellery"}
          </h1>
          <p style={s.pageSub}>
            {activeCatName
              ? activeCat?.description?.en || "Handcrafted bridal jewellery"
              : "Handcrafted bridal jewellery — Kalira, Chura, Bangles, Necklace Sets & more"}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: "32px 24px 60px" }}>
        <div style={s.layout}>

          {/* ── LEFT: Filter sidebar ── */}
          <aside style={s.sidebar}>
            <p style={s.sidebarHead}>Filter</p>

            {/* Category */}
            <div style={s.filterGroup}>
              <p style={s.filterLabel}>Category</p>
              <button
                style={{ ...s.catBtn, ...(selectedCat === "" ? s.catBtnActive : {}) }}
                onClick={() => selectCategory("")}
              >
                💍 All Collections
              </button>
              {categories.map(c => (
                <button
                  key={c._id}
                  style={{ ...s.catBtn, ...(selectedCat === c._id ? s.catBtnActive : {}) }}
                  onClick={() => selectCategory(c._id)}
                >
                  {CATEGORY_ICONS[c.slug] || "💍"} {c.name?.en}
                </button>
              ))}
            </div>

            {/* Price range */}
            <div style={s.filterGroup}>
              <p style={s.filterLabel}>Price Range (৳)</p>
              <input
                className="input" type="number" placeholder="Min"
                value={minPrice} onChange={e => setMinPrice(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <input
                className="input" type="number" placeholder="Max"
                value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              />
            </div>

            {hasFilters && (
              <button onClick={clearAll} style={s.clearBtn}>Clear all filters ✕</button>
            )}
          </aside>

          {/* ── RIGHT: Products ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Search + result count bar */}
            <div style={s.topBar}>
              <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
                <span style={s.searchIcon}>🔍</span>
                <input
                  className="input"
                  placeholder="Search by name…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 34 }}
                />
                {search && (
                  <button style={s.clearX} onClick={() => setSearch("")}>✕</button>
                )}
              </div>
              {!loading && (
                <p style={s.count}>
                  {products.length} {products.length === 1 ? "product" : "products"}
                  {activeCatName ? ` in ${activeCatName}` : ""}
                </p>
              )}
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {search && (
                  <span style={s.chip}>
                    Search: "{search}"
                    <button style={s.chipX} onClick={() => setSearch("")}>✕</button>
                  </span>
                )}
                {activeCatName && (
                  <span style={s.chip}>
                    {activeCatName}
                    <button style={s.chipX} onClick={() => selectCategory("")}>✕</button>
                  </span>
                )}
                {minPrice && (
                  <span style={s.chip}>
                    Min ৳{minPrice}
                    <button style={s.chipX} onClick={() => setMinPrice("")}>✕</button>
                  </span>
                )}
                {maxPrice && (
                  <span style={s.chip}>
                    Max ৳{maxPrice}
                    <button style={s.chipX} onClick={() => setMaxPrice("")}>✕</button>
                  </span>
                )}
              </div>
            )}

            {error && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius)", padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "var(--red)" }}>
                {error} Make sure the backend is running and you have run <code>node seed.js</code>.
              </div>
            )}

            <ProductGrid products={products} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  pageHeader: {
    background: "var(--maroon-dark)",
    borderBottom: "1px solid rgba(212,160,23,0.2)",
    padding: "48px 0 36px",
    textAlign: "center",
  },
  pageTitle: {
    fontFamily: "var(--font-display)", fontSize: 40, fontStyle: "italic",
    color: "#FDF6EC", margin: "8px 0 10px", fontWeight: 600,
  },
  pageSub: { fontSize: 14, color: "rgba(232,217,192,0.5)", letterSpacing: "0.04em" },
  layout: { display: "flex", gap: 32, alignItems: "flex-start" },
  sidebar: {
    width: 220, flexShrink: 0,
    background: "var(--ivory)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "20px 16px",
    position: "sticky", top: 80,
  },
  sidebarHead: {
    fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600,
    marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--border)",
  },
  filterGroup: { marginBottom: 24 },
  filterLabel: {
    fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
    color: "var(--muted)", fontWeight: 500, marginBottom: 10,
  },
  catBtn: {
    display: "block", width: "100%", textAlign: "left",
    background: "none", border: "none", borderRadius: "var(--radius-sm)",
    padding: "8px 10px", fontSize: 13, cursor: "pointer",
    color: "var(--muted)", fontFamily: "var(--font-body)",
    transition: "all 0.15s", marginBottom: 2,
  },
  catBtnActive: {
    background: "var(--cream-dark)", color: "var(--maroon)",
    fontWeight: 600, borderLeft: "3px solid var(--gold)",
  },
  clearBtn: {
    width: "100%", padding: "8px", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", background: "none",
    fontSize: 12, color: "var(--muted)", cursor: "pointer",
    fontFamily: "var(--font-body)", marginTop: 4,
  },
  topBar: {
    display: "flex", gap: 16, alignItems: "center",
    marginBottom: 20, flexWrap: "wrap",
  },
  searchIcon: {
    position: "absolute", left: 12, top: "50%",
    transform: "translateY(-50%)", color: "var(--faint)", fontSize: 14, pointerEvents: "none",
  },
  clearX: {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13,
  },
  count: { fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "var(--cream-dark)", border: "1px solid var(--border)",
    borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "var(--charcoal)",
  },
  chipX: {
    background: "none", border: "none", cursor: "pointer",
    color: "var(--muted)", fontSize: 11, padding: 0, lineHeight: 1,
  },
};
