import { useState } from "react";

export default function SearchFilterBar({
  search, setSearch,
  minPrice, maxPrice, setMinPrice, setMaxPrice,
  color, setColor,
}) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: showFilters ? 12 : 0 }}>
        <input
          className="input"
          type="text"
          placeholder="Search jewelry by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 380 }}
        />
        <button
          onClick={() => setShowFilters(s => !s)}
          style={{
            padding: "8px 14px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: showFilters ? "var(--navy)" : "#fff",
            color: showFilters ? "#fff" : "var(--text-muted)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}
        >
          Filters {showFilters ? "▲" : "▼"}
        </button>
      </div>

      {showFilters && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label className="form-label">
            Min Price (৳)
            <input className="input" type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          </label>
          <label className="form-label">
            Max Price (৳)
            <input className="input" type="number" placeholder="50000" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </label>
          <label className="form-label">
            Color
            <input className="input" type="text" placeholder="e.g. gold, silver" value={color} onChange={e => setColor(e.target.value)} />
          </label>
        </div>
      )}
    </div>
  );
}
