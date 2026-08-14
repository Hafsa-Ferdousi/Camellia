// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Gift, Truck, Gem, Copy, Check, Tag, Clock } from "lucide-react";
import { getProducts, getCategories, getBestSellers } from "../api/products";
import { getActiveCoupons, getUpcomingCoupons } from "../api/coupons";
import { useLanguage } from "../context/LanguageContext";
import { formatPrice } from "../utils/formatPrice";
import Hero, { CouponCountdown } from "../components/Hero";
import ProductCard from "../components/ProductCard";
import CategorySection from "../components/CategorySection";
import Seo from "../components/Seo";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });

const TESTIMONIALS = [
  { name: "Nusrat A.", role: "Bride, Chattogram", quote: "The kalira set was even more beautiful in person. Delivery was fast and the packaging felt like a gift in itself.", stars: 5 },
  { name: "Farzana R.", role: "Bride, Dhaka", quote: "Camellia did our entire bridal jewelry — chura, necklace set, everything matched perfectly for the wedding photos.", stars: 5 },
  { name: "Imran H.", role: "Groom's family, Cox's Bazar", quote: "Ordered as a gift for my sister's wedding. Quality felt premium and the team helped us pick the right size over the phone.", stars: 5 },
];

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
  const { t } = useTranslation(["home", "products"]);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [featured,    setFeatured]    = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [catError,    setCatError]    = useState(false);
  const [loadingF,    setLoadingF]    = useState(true);
  const [loadingBS,   setLoadingBS]   = useState(true);
  const [coupons,     setCoupons]     = useState([]);
  const [upcomingCoupons, setUpcomingCoupons] = useState([]);
  const [copiedCode,  setCopiedCode]  = useState("");

  useEffect(() => {
    getCategories().then(r => setCategories(r.data)).catch(() => setCatError(true));
  }, []);

  // Coupons the admin has activated are otherwise invisible to customers
  // (previously the only place a code appeared was the admin panel itself).
  // Surface any currently-usable ones here so shoppers actually see them.
  useEffect(() => {
    getActiveCoupons().then(r => setCoupons(r.data)).catch(() => setCoupons([]));
  }, []);

  // Coupons that are turned on but haven't started yet — teased on the
  // homepage with a live countdown so customers know to come back.
  useEffect(() => {
    getUpcomingCoupons().then(r => setUpcomingCoupons(r.data)).catch(() => setUpcomingCoupons([]));
  }, []);

  const copyCoupon = (code) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 1800);
  };

  // If we arrived here from the navbar's "Categories" link on another page,
  // scroll to that section once it exists. It only renders after the
  // categories API call above resolves, so retry briefly instead of a single
  // fixed-delay attempt that could fire too early and silently do nothing.
  useEffect(() => {
    const targetId = location.state?.scrollTo;
    if (!targetId) return;
    let attemptsLeft = 20;
    const tryScroll = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (attemptsLeft > 0) {
        attemptsLeft -= 1;
        setTimeout(tryScroll, 100);
      }
    };
    tryScroll();
    // Clear the state so refreshing or navigating back doesn't re-trigger it.
    navigate(".", { replace: true, state: {} });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoadingF(true);
    // BUG FIX: this used to fetch { limit: 4 } with no featured filter, so the
    // "Featured Pieces" section just showed the 4 newest products regardless
    // of the isFeatured flag admins can set. The backend already supports a
    // featured=true filter (productController.js) — use it.
    getProducts({ featured: true, limit: 4 })
      .then(r => setFeatured(r.data.slice(0, 4)))
      .catch(() => setFeatured([]))
      .finally(() => setLoadingF(false));
  }, []);

  useEffect(() => {
    setLoadingBS(true);
    // Ranked by actual units sold (backend aggregates order history) — not
    // just the newest products, so this reflects what customers are really
    // buying.
    getBestSellers(4)
      .then(r => setBestSellers(r.data))
      .catch(() => setBestSellers([]))
      .finally(() => setLoadingBS(false));
  }, []);

  const goToCategory = (cat) => {
    navigate(`/products?category=${cat._id}`);
  };

  return (
    <div>
      <Seo />
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

        /* ── Featured section ribbon ── */
        .featured-head {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 32px; flex-wrap: wrap; gap: 12px;
        }
        .featured-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--gold-pale); color: var(--gold-text);
          font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; padding: 4px 12px; border-radius: 20px;
          margin-bottom: 10px;
        }

        /* ── Testimonials ── */
        .testimonial-section {
          background: var(--cream);
          padding: 60px 0 64px;
        }
        .testimonial-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
        }
        @media (max-width: 900px) { .testimonial-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; } }
        .testimonial-card {
          background: var(--ivory); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 28px 26px;
          box-shadow: var(--shadow-sm);
          display: flex; flex-direction: column; gap: 14px;
        }
        .testimonial-stars { color: var(--gold); font-size: 14px; letter-spacing: 2px; }
        .testimonial-quote {
          font-family: var(--font-display); font-style: italic;
          font-size: 16.5px; line-height: 1.55; color: var(--charcoal);
        }
        .testimonial-author { font-size: 13px; font-weight: 600; color: var(--maroon); }
        .testimonial-role { font-size: 12px; color: var(--muted); }

        /* ── CTA banner ── */
        .cta-banner {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, var(--maroon-dark) 0%, var(--maroon) 55%, var(--maroon-dark) 100%);
          padding: 64px 24px; text-align: center;
        }
        .cta-banner::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 30% 30%, rgba(244,196,48,0.18) 0%, transparent 55%),
                      radial-gradient(ellipse at 75% 70%, rgba(244,196,48,0.12) 0%, transparent 55%);
        }
        .cta-banner > * { position: relative; }

        /* ── Active coupons banner ──
           A light band, tinted to match the page background instead of a
           loud saturated orange, directly below the hero on every screen
           size — replaces the old floating card that used to sit inside
           the hero on desktop. */
        .coupon-strip {
          position: relative; overflow: hidden;
          background: linear-gradient(120deg, var(--cream-dark) 0%, var(--gold-pale) 50%, var(--cream-dark) 100%);
          padding: 26px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .coupon-strip > * { position: relative; }
        .coupon-strip-head {
          text-align: center; margin-bottom: 18px;
        }
        .coupon-strip-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
          text-transform: uppercase; color: var(--gold-text);
        }
        .coupon-strip-title {
          font-family: var(--font-display); font-style: italic;
          font-size: 26px; color: var(--maroon-dark); margin-top: 8px;
        }
        .coupon-row {
          display: flex; gap: 16px; flex-wrap: wrap; align-items: stretch; justify-content: center;
        }
        .coupon-chip {
          display: flex; align-items: center; gap: 14px;
          background: #FDF6EC; border: 1px solid rgba(232,97,0,0.3);
          border-radius: var(--radius-lg); padding: 14px 20px;
          min-width: 260px; max-width: 340px; flex: 1 1 280px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.16);
          transition: transform 0.15s ease;
        }
        .coupon-chip:hover { transform: translateY(-2px); }
        .coupon-chip-code {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--font-body); font-weight: 700; letter-spacing: 0.04em;
          color: var(--maroon-dark); background: var(--gold-pale);
          border: 1px solid rgba(244,196,48,0.55);
          border-radius: 20px; padding: 7px 13px; font-size: 13px;
          cursor: pointer; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .coupon-chip-text { min-width: 0; }
        .coupon-chip-title { font-size: 14px; font-weight: 700; color: var(--maroon-dark); }
        .coupon-chip-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .coupon-chip-expiry { font-size: 11px; color: var(--muted); margin-top: 3px; }

        /* ── Upcoming coupons (mobile) ──
           Same band, a second row underneath, given the exact same
           eyebrow + italic-title header and card layout as the live
           offers above it — cooler/muted eyebrow color and a countdown
           pill in place of the copy-able code chip are the only things
           that mark it as "not live yet". */
        .coupon-upcoming-head { text-align: center; margin: 30px 0 18px; padding-top: 26px; border-top: 1px solid rgba(232,97,0,0.2); }
        .coupon-strip-eyebrow--upcoming { color: var(--muted); }
        .coupon-chip--upcoming { opacity: 0.92; }
        .coupon-chip-countdown {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
          font-size: 13px; font-weight: 700; letter-spacing: 0.02em;
          color: var(--maroon-dark); background: var(--gold-pale);
          border: 1px solid rgba(244,196,48,0.55);
          border-radius: 20px; padding: 7px 13px; white-space: nowrap;
        }
      `}</style>

      {/* ── Hero ── */}
      <Hero onSearch={(q) => navigate(`/products?search=${encodeURIComponent(q)}`)} />

      {/* ── Active + upcoming coupons (shown as soon as admin activates one) ──
          Sits directly below the hero on both desktop and mobile. */}
      {(coupons.length > 0 || upcomingCoupons.length > 0) && (
        <section className="coupon-strip">
          <div className="container coupon-strip-inner" style={{ padding: "0 24px" }}>
            {coupons.length > 0 && (
              <>
                <div className="coupon-strip-head">
                  <span className="coupon-strip-eyebrow">{t("home:offersEyebrow", { defaultValue: "Limited Time" })}</span>
                  <h2 className="coupon-strip-title">{t("home:offersTitle", { defaultValue: "Exclusive Offers" })}</h2>
                </div>
                <div className="coupon-row">
                  {coupons.map(c => (
                    <div key={c._id} className="coupon-chip">
                      <button
                        type="button"
                        className="coupon-chip-code"
                        onClick={() => copyCoupon(c.code)}
                        title={t("home:copyCode", { defaultValue: "Copy code" })}
                      >
                        <Tag size={13} />
                        {c.code}
                        {copiedCode === c.code ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                      <div className="coupon-chip-text">
                        <div className="coupon-chip-title">
                          {c.discountType === "percentage"
                            ? t("home:couponPercentOff", { value: c.discountValue, defaultValue: `${c.discountValue}% off` })
                            : t("home:couponFixedOff", { value: `৳ ${formatPrice(c.discountValue, language, 0)}`, defaultValue: `৳ ${formatPrice(c.discountValue, language, 0)} off` })}
                          {c.minimumPurchase > 0 &&
                            ` · ${t("home:couponMinPurchase", { value: `৳ ${formatPrice(c.minimumPurchase, language, 0)}`, defaultValue: `min. ৳ ${formatPrice(c.minimumPurchase, language, 0)}` })}`}
                        </div>
                        {c.title && <div className="coupon-chip-desc">{c.title}</div>}
                        {c.startDate && c.endDate && (
                          <div className="coupon-chip-expiry">
                            {t("home:couponDateRange", {
                              start: fmtDate(c.startDate),
                              end: fmtDate(c.endDate),
                              defaultValue: `${fmtDate(c.startDate)} – ${fmtDate(c.endDate)}`,
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {upcomingCoupons.length > 0 && (
              <>
                <div className="coupon-upcoming-head">
                  <span className="coupon-strip-eyebrow coupon-strip-eyebrow--upcoming">
                    <Clock size={12} /> {t("home:upcomingEyebrow", { defaultValue: "Coming Soon" })}
                  </span>
                  <h2 className="coupon-strip-title">{t("home:upcomingTitle", { defaultValue: "More Savings on the Way" })}</h2>
                </div>
                <div className="coupon-row">
                  {upcomingCoupons.map(c => (
                    <div key={c._id} className="coupon-chip coupon-chip--upcoming">
                      <div className="coupon-chip-countdown">
                        <Clock size={13} /> <CouponCountdown target={c.startDate} t={(k, o) => t(`home:${k}`, o)} />
                      </div>
                      <div className="coupon-chip-text">
                        <div className="coupon-chip-title">
                          {c.discountType === "percentage"
                            ? t("home:couponPercentOff", { value: c.discountValue, defaultValue: `${c.discountValue}% off` })
                            : t("home:couponFixedOff", { value: `৳ ${formatPrice(c.discountValue, language, 0)}`, defaultValue: `৳ ${formatPrice(c.discountValue, language, 0)} off` })}
                        </div>
                        {c.title && <div className="coupon-chip-desc">{c.title}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── Category tiles ── */}
      <CategorySection categories={categories} error={catError} onSelect={goToCategory} />

      {/* ── Featured picks ── */}
      <section id="products-section" className="container" style={{ padding: "60px 24px 48px" }}>
        <div className="featured-head">
          <div>
            <span className="featured-badge">{t("home:trending")}</span>
            <h2 className="section-heading" style={{ fontSize: 28, marginTop: 4 }}>{t("home:featuredPieces")}</h2>
            <div className="divider-gold">✦</div>
          </div>
          <Link to="/products" style={s.viewAll}>{t("products:viewAllProducts")}</Link>
        </div>
        <div className="home-product-grid">
          {loadingF
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : featured.length === 0
              ? <p style={{ color: "var(--muted)", fontSize: 14, gridColumn: "1/-1" }}>
                  {t("products:noProductsYet")}
                </p>
              : featured.map(p => <ProductCard key={p._id} product={p} />)
          }
        </div>
      </section>

      {/* ── Best sellers ── */}
      {/* Ranked by real sales, so a fresh store with no orders yet has none
          to show — hide the whole section rather than render it empty. */}
      {(loadingBS || bestSellers.length > 0) && (
        <section style={{ background: "var(--cream-dark)", borderTop: "1px solid var(--border)", padding: "52px 0 60px" }}>
          <div className="container" style={{ padding: "0 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
              <div>
                <span className="eyebrow">{t("home:mostLoved")}</span>
                <h2 className="section-heading" style={{ marginTop: 6 }}>{t("home:bestSelling")}</h2>
                <div className="divider-gold">✦</div>
              </div>
              <Link to="/products" style={s.viewAll}>{t("products:shopAll")}</Link>
            </div>
            <div className="home-product-grid">
              {loadingBS
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : bestSellers.map(p => <ProductCard key={p._id} product={p} />)
              }
            </div>
          </div>
        </section>
      )}

      {/* ── Why choose us ── */}
      <section className="why-section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-light)", fontFamily: "var(--font-body)" }}>
              {t("home:whyCamellia")}
            </span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontStyle: "italic", color: "#FDF6EC", marginTop: 8 }}>
              {t("home:whyTitle")}
            </h2>
          </div>
          <div className="why-grid">
            {[
              { icon: "✦", titleKey: "featHandcraftedTitle", descKey: "featHandcraftedDesc" },
              { icon: Gift, titleKey: "featGiftTitle", descKey: "featGiftDesc" },
              { icon: Truck, titleKey: "featDeliveryTitle", descKey: "featDeliveryDesc" },
              { icon: Gem, titleKey: "featQualityTitle", descKey: "featQualityDesc" },
            ].map(f => (
              <div key={f.titleKey} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 14, color: "var(--gold-light)", display: "flex", justifyContent: "center" }}>
                  {typeof f.icon === "string" ? f.icon : <f.icon size={28} />}
                </div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#FDF6EC", marginBottom: 8, fontWeight: 600 }}>{t(`home:${f.titleKey}`)}</p>
                <p style={{ fontSize: 13, color: "rgba(232,217,192,0.55)", lineHeight: 1.6 }}>{t(`home:${f.descKey}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials (NEW) ── */}
      <section className="testimonial-section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span className="eyebrow">{t("home:happyBrides")}</span>
            <h2 className="section-heading" style={{ fontSize: 28, marginTop: 6 }}>{t("home:whatCustomersSay")}</h2>
            <div className="divider-gold" style={{ justifyContent: "center" }}>✦</div>
          </div>
          <div className="testimonial-grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="testimonial-card">
                <span className="testimonial-stars">{"★".repeat(t.stars)}</span>
                <p className="testimonial-quote">"{t.quote}"</p>
                <div>
                  <p className="testimonial-author">{t.name}</p>
                  <p className="testimonial-role">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner">
        <span className="eyebrow" style={{ color: "var(--gold-light)" }}>{t("home:readyToShop")}</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", margin: "10px 0 16px", color: "#FDF6EC" }}>
          {t("home:exploreCollection")}
        </h2>
        <p style={{ fontSize: 14, color: "rgba(232,217,192,0.75)", marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
          {t("home:ctaSub")}
        </p>
        <Link to="/products" className="btn btn-gold" style={{ display: "inline-block", padding: "13px 36px", fontSize: 13, letterSpacing: "0.1em", textDecoration: "none" }}>
          {t("home:browseAll")}
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