import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";

export default function Hero({ onSearch }) {
  const { t } = useTranslation(["home", "common"]);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const scrollTo = (id) =>
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);

  const trustBadges = ["trustHandcrafted", "trustDelivery", "trustBridal", "trustBrides"];

  return (
    <section className="hero">
      <div className="container" style={{ position: "relative" }}>
        <span className="hero-eyebrow">{t("heroEyebrow")}</span>

        <h1>
          {t("common:brand")}<span className="hero-accent"> — </span>{t("heroTitleMain")}<br />
          <span style={{ fontWeight: 400 }}>{t("heroTitleSub")}</span>
        </h1>

        <div className="hero-ornament">✦</div>
        <p className="hero-sub">{t("heroSub")}</p>


        {/* ── CTA buttons ── */}
        <div className="hero-btns">
          <button
            className="hero-btn-primary"
            onClick={() => scrollTo("products-section")}
          >
            {t("shopNow")}
          </button>
          <button
            className="hero-btn-outline"
            onClick={() => scrollTo("categories-section")}
          >
            {t("viewCategories")}
          </button>
        </div>

        {/* Trust badges */}
        <div style={s.trustRow}>
          {trustBadges.map(key => (
            <span key={key} style={s.trust}>{t(key)}</span>
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