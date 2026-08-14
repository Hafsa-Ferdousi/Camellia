import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Ticks down to `target` and renders as "Starts in Xd Yh" / "Xh Ym" / "Xm",
// re-rendering on a 30s interval — fine-grained enough for an "hours
// remaining" countdown without re-rendering every second. Exported so the
// mobile coupon band in Home.jsx can reuse the same countdown.
export function CouponCountdown({ target, t }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const diffMs = new Date(target).getTime() - now;
  if (diffMs <= 0) return <span>{t("startingSoon", { defaultValue: "Starting any moment" })}</span>;

  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return <span>{t("startsInDays", { days, hours, defaultValue: `Starts in ${days}d ${hours}h` })}</span>;
  if (hours > 0) return <span>{t("startsInHours", { hours, minutes, defaultValue: `Starts in ${hours}h ${minutes}m` })}</span>;
  return <span>{t("startsInMinutes", { minutes, defaultValue: `Starts in ${minutes}m` })}</span>;
}

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
    border: "1px solid rgba(244,196,48,0.45)",
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
    color: "#2A1206", fontFamily: "var(--font-body)", fontWeight: 600,
    fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "9px 20px", cursor: "pointer", flexShrink: 0,
  },
  trustRow: {
    display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap",
    marginTop: 40, paddingTop: 28,
    borderTop: "1px solid rgba(244,196,48,0.2)",
  },
  trust: {
    fontSize: 12, color: "rgba(232,217,192,0.55)",
    letterSpacing: "0.1em", textTransform: "uppercase",
    fontFamily: "var(--font-body)",
  },
};