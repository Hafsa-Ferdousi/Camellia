import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation(["footer", "common"]);

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
              {[
                { name: "Facebook", href: "https://facebook.com/camelliabyanandi" },
                { name: "Instagram", href: "https://instagram.com/camelliabyanandi" },
              ].map(n => (
                <a key={n.name} href={n.href} target="_blank" rel="noopener noreferrer" style={s.social}>
                  {n.name}
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <p style={s.colHead}>{t("footer:shop")}</p>
            {[
              { en: "Kalira", key: "categoryKalira" },
              { en: "Chura", key: "categoryChura" },
              { en: "Jhumka", key: "categoryJhumka" },
              { en: "Necklace Sets", key: "categoryNecklaceSets" },
              { en: "Diamond Cut", key: "categoryDiamondCut" },
              { en: "Wedding Sets", key: "categoryWeddingSets" },
            ].map(c => (
              <Link key={c.en} to={`/products?search=${encodeURIComponent(c.en)}`} style={s.link}>{t(`footer:${c.key}`)}</Link>
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
  social:  { fontSize: 12, color: "rgba(244,196,48,0.85)", letterSpacing: "0.06em", textTransform: "uppercase" },
  colHead: { fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold-light)", fontWeight: 500, marginBottom: 14, fontFamily: "var(--font-body)" },
  link:    { display: "block", fontSize: 13, color: "rgba(232,217,192,0.92)", marginBottom: 8 },
};