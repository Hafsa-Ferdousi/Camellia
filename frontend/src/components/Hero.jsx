import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Tag, Copy, Check, Clock } from "lucide-react";
import { formatPrice } from "../utils/formatPrice";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });

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

export default function Hero({ onSearch, coupons, upcomingCoupons, copiedCode, onCopyCoupon, language }) {
  const { t } = useTranslation(["home", "common"]);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const scrollTo = (id) =>
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);

  const trustBadges = ["trustHandcrafted", "trustDelivery", "trustBridal", "trustBrides"];

  const couponLabel = (c) =>
    c.discountType === "percentage"
      ? t("couponPercentOff", { value: c.discountValue, defaultValue: `${c.discountValue}% off` })
      : t("couponFixedOff", { value: `৳ ${formatPrice(c.discountValue, language, 0)}`, defaultValue: `৳ ${formatPrice(c.discountValue, language, 0)} off` });

  const activeCoupons = coupons || [];
  const futureCoupons = upcomingCoupons || [];
  // More live coupons than fit comfortably at "hero" size — scale the
  // whole block down in tiers instead of letting it overflow or forcing
  // a scrollbar, so it still reads as one tidy block under the navbar.
  const totalCouponCount = activeCoupons.length + futureCoupons.length;
  const couponSizeTier =
    totalCouponCount <= 1 ? "" :
    totalCouponCount <= 2 ? "hero-coupon-card--compact" :
    totalCouponCount <= 4 ? "hero-coupon-card--dense" :
    "hero-coupon-card--tight";

  return (
    <section className="hero">
      {/* Live + upcoming coupons — a clean, borderless accent tucked under
          the navbar in the hero's otherwise-empty left column. No
          background fill; a thin gold rule + light text keeps it reading
          as part of the hero. Every currently-active coupon is listed here
          (not just the first), plus any admin has scheduled to start soon
          gets a live "starts in..." countdown so customers know to come
          back. Desktop only; mobile keeps the coupon band below the hero
          (see Home.jsx). Text scales down in tiers as more coupons stack
          up (see couponSizeTier) so several offers still fit without
          overflowing the hero. */}
      {(activeCoupons.length > 0 || futureCoupons.length > 0) && (
        <div className={`hero-coupon-card ${couponSizeTier}`}>
          {activeCoupons.length > 0 && (
            <>
              <span className="hero-coupon-card-eyebrow">
                <Tag size={12} /> {t("offersEyebrow", { defaultValue: "Limited Time" })}
              </span>
              {activeCoupons.map((coupon, i) => (
                <div key={coupon._id} className={`hero-coupon-entry${i > 0 ? " hero-coupon-entry--divided" : ""}`}>
                  <div className="hero-coupon-card-label">{couponLabel(coupon)}</div>
                  {coupon.minimumPurchase > 0 && (
                    <div className="hero-coupon-card-min">
                      {t("couponMinPurchase", { value: `৳ ${formatPrice(coupon.minimumPurchase, language, 0)}`, defaultValue: `min. ৳ ${formatPrice(coupon.minimumPurchase, language, 0)}` })}
                    </div>
                  )}
                  {coupon.title && <div className="hero-coupon-card-desc">{coupon.title}</div>}
                  <button
                    type="button"
                    className="hero-coupon-card-code"
                    onClick={() => onCopyCoupon?.(coupon.code)}
                    title={t("copyCode", { defaultValue: "Copy code" })}
                  >
                    {coupon.code}
                    {copiedCode === coupon.code ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  {coupon.startDate && coupon.endDate && (
                    <div className="hero-coupon-card-expiry">
                      {t("couponDateRange", {
                        start: fmtDate(coupon.startDate),
                        end: fmtDate(coupon.endDate),
                        defaultValue: `${fmtDate(coupon.startDate)} – ${fmtDate(coupon.endDate)}`,
                      })}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {futureCoupons.length > 0 && (
            <>
              <span
                className={`hero-coupon-card-eyebrow hero-coupon-card-eyebrow--upcoming${activeCoupons.length > 0 ? " hero-coupon-entry--divided" : ""}`}
              >
                <Clock size={12} /> {t("upcomingEyebrow", { defaultValue: "Coming Soon" })}
              </span>
              {futureCoupons.map((coupon) => (
                <div key={coupon._id} className="hero-coupon-entry hero-coupon-entry--upcoming">
                  <div className="hero-coupon-card-label hero-coupon-card-label--upcoming">{couponLabel(coupon)}</div>
                  {coupon.title && <div className="hero-coupon-card-desc">{coupon.title}</div>}
                  <div className="hero-coupon-card-countdown">
                    <CouponCountdown target={coupon.startDate} t={t} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

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