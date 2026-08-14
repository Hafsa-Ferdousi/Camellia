import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getCategories } from "../api/products";
import { FacebookIcon, InstagramIcon } from "./SocialIcons";

const SOCIAL_LINKS = [
  { name: "Facebook", href: "https://facebook.com/camelliabyanandi", Icon: FacebookIcon },
  { name: "Instagram", href: "https://instagram.com/camelliabyanandi", Icon: InstagramIcon },
];

const SHOP_LINKS = [
  { slug: "kalira",              key: "categoryKalira" },
  { slug: "chura",               key: "categoryChura" },
  { slug: "bangles",             key: "categoryBangles" },
  { slug: "necklace",            key: "categoryNecklaceSets" },
  { slug: "diamond-cut",         key: "categoryDiamondCut" },
  { slug: "wedding-accessories", key: "categoryWeddingSets" },
  { slug: "nath",                key: "categoryNath" },
  { slug: "earrings-tikli",      key: "categoryEarringsTikli" },
];

export default function Footer() {
  const { t } = useTranslation(["footer", "common"]);
  const [categoryIdBySlug, setCategoryIdBySlug] = useState({});

  useEffect(() => {
    getCategories()
      .then(r => setCategoryIdBySlug(Object.fromEntries(r.data.map(c => [c.slug, c._id]))))
      .catch(() => {});
  }, []);

  return (
    <footer className="footer" id="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <p style={s.logo}>{t("common:brand")}</p>
            <p style={s.tagline}>{t("footer:tagline")}</p>
            <p style={s.desc}>
              {t("footer:desc1")}<br />
              {t("footer:desc2")}
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
              {SOCIAL_LINKS.map(({ name, href, Icon }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  style={s.social}
                >
                  <Icon width={18} height={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <p style={s.colHead}>{t("footer:shop")}</p>
            {SHOP_LINKS.map(c => (
              <Link
                key={c.slug}
                to={categoryIdBySlug[c.slug] ? `/products?category=${categoryIdBySlug[c.slug]}` : "/products"}
                style={s.link}
              >
                {t(`footer:${c.key}`)}
              </Link>
            ))}
          </div>

          {/* Information */}
          <div>
            <p style={s.colHead}>{t("footer:information")}</p>
            <Link to="/about" style={s.link}>{t("footer:aboutUs")}</Link>
            <Link to="/contact" style={s.link}>{t("footer:contact")}</Link>
            <Link to="/legal/privacy" style={s.link}>{t("footer:privacyPolicy")}</Link>
            <Link to="/legal/terms" style={s.link}>{t("footer:termsOfService")}</Link>
          </div>

          {/* Customer Care */}
          <div>
            <p style={s.colHead}>{t("footer:customerCare")}</p>
            <Link to="/track-order" style={s.link}>{t("footer:trackOrder")}</Link>
            <Link to="/legal/refund" style={s.link}>{t("footer:returnsExchanges")}</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-links">
          <span style={{ color: "rgba(232,217,192,0.85)", fontSize: 13 }}>
            {t("footer:copyright")}
          </span>
          <Link to="/">{t("footer:home")}</Link>
          <Link to="/products">{t("footer:products")}</Link>
          <Link to="/contact">{t("footer:contact")}</Link>
          <Link to="/track-order">{t("footer:trackOrder")}</Link>
          <Link to="/legal/privacy">{t("footer:privacyPolicy")}</Link>
        </div>
      </div>
    </footer>
  );
}

const s = {
  logo:    { fontFamily: "var(--font-display)", fontSize: 22, fontStyle: "italic", color: "var(--gold-light)", marginBottom: 2 },
  tagline: { fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(244,196,48,0.85)", marginBottom: 14 },
  desc:    { fontSize: 13, color: "rgba(232,217,192,0.92)", lineHeight: 1.7, marginBottom: 20 },
  social:  { display: "inline-flex", alignItems: "center", justifyContent: "center", color: "rgba(244,196,48,0.85)" },
  colHead: { fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold-light)", fontWeight: 500, marginBottom: 14, fontFamily: "var(--font-body)" },
  link:    { display: "block", fontSize: 13, color: "rgba(232,217,192,0.92)", marginBottom: 8 },
};