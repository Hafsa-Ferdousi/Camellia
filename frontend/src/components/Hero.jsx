import { useState, useRef } from "react";

export default function Hero({ onSearch }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const scrollTo = (id) =>
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);

  return (
    <section className="hero">
      <div className="container" style={{ position: "relative" }}>
        <span className="hero-eyebrow">✦ Est. 2019 · Cox's Bazar, Bangladesh ✦</span>

        <h1>
          Camellia<span className="hero-accent"> — </span>Jewelry<br />
          <span style={{ fontWeight: 400 }}>&amp; Wedding Accessories</span>
        </h1>

        <div className="hero-ornament">✦</div>
        <p className="hero-sub">Kalira · Chura · Diamond Cut · Wedding Sets</p>


        {/* ── CTA buttons ── */}
        <div className="hero-btns">
          <button
            className="hero-btn-primary"
            onClick={() => scrollTo("products-section")}
          >
            Shop Now
          </button>
          <button
            className="hero-btn-outline"
            onClick={() => scrollTo("categories-section")}
          >
            View Categories
          </button>
        </div>

        {/* Trust badges */}
        <div style={s.trustRow}>
          {["✦ Handcrafted Quality", "✦ Free Delivery", "✦ Bridal Specialists", "✦ 500+ Happy Brides"].map(t => (
            <span key={t} style={s.trust}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

const s = {
  searchWrap: {
    display: "flex", alignItems: "center",
    maxWidth: 560, margin: "28px auto 0",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(212,160,23,0.45)",
    borderRadius: 50, padding: "0 6px 0 18px",
    backdropFilter: "blur(6px)",
  },
  searchIcon: { fontSize: 14, opacity: 0.55, flexShrink: 0 },
  searchInput: {
    flex: 1, background: "transparent", border: "none", outline: "none",
    color: "#E8D9C0", fontSize: 14, padding: "13px 10px",
    fontFamily: "var(--font-body)", letterSpacing: "0.02em",
  },
  clear: {
    background: "none", border: "none", color: "rgba(232,217,192,0.45)",
    cursor: "pointer", fontSize: 13, padding: "4px 8px", flexShrink: 0,
  },
  searchBtn: {
    background: "var(--gold)", border: "none", borderRadius: 40,
    color: "#1C0A0F", fontFamily: "var(--font-body)", fontWeight: 600,
    fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "9px 20px", cursor: "pointer", flexShrink: 0,
  },
  trustRow: {
    display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap",
    marginTop: 40, paddingTop: 28,
    borderTop: "1px solid rgba(212,160,23,0.2)",
  },
  trust: {
    fontSize: 12, color: "rgba(232,217,192,0.55)",
    letterSpacing: "0.1em", textTransform: "uppercase",
    fontFamily: "var(--font-body)",
  },
};