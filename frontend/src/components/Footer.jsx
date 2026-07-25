import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";


export default function Footer() {
  const { t } = useTranslation(["footer", "common"]);

  function ComingSoon(label) {
    return (e) => {
      e.preventDefault();
      alert(t("footer:comingSoon", { label }));
    };
  }

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
                { name: "WhatsApp", href: "https://wa.me/8801700000000" },
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
            {["Kalira", "Chura", "Jhumka", "Necklace Sets", "Diamond Cut", "Wedding Sets"].map(c => (
              <Link key={c} to={`/products?search=${encodeURIComponent(c)}`} style={s.link}>{c}</Link>
            ))}
          </div>

          {/* Information */}
          <div>
            <p style={s.colHead}>{t("footer:information")}</p>
            <Link to="/about" style={s.link}>{t("footer:aboutUs")}</Link>
            <Link to="/contact" style={s.link}>{t("footer:contact")}</Link>
            <a href="#" style={s.link} onClick={ComingSoon(t("footer:faqs"))}>{t("footer:faqs")}</a>
            <a href="#" style={s.link} onClick={ComingSoon(t("footer:privacyPolicy"))}>{t("footer:privacyPolicy")}</a>
            <a href="#" style={s.link} onClick={ComingSoon(t("footer:termsOfService"))}>{t("footer:termsOfService")}</a>
            <p style={s.colHead}>Information</p>
            <Link to="/about" style={s.link}>About Us</Link>
            <Link to="/contact" style={s.link}>Contact</Link>
            <Link to="/legal/terms" style={s.link}>Terms of Service</Link>
            <Link to="/legal/privacy" style={s.link}>Privacy Policy</Link>
            <Link to="/legal/refund" style={s.link}>Returns &amp; Exchanges</Link>
          </div>

          {/* Customer Care */}
          <div>
            <p style={s.colHead}>{t("footer:customerCare")}</p>
            <Link to="/track-order" style={s.link}>{t("footer:trackOrder")}</Link>
            <a href="#" style={s.link} onClick={ComingSoon(t("footer:returnsExchanges"))}>{t("footer:returnsExchanges")}</a>
            <a href="#" style={s.link} onClick={ComingSoon(t("footer:sizeGuide"))}>{t("footer:sizeGuide")}</a>
            <p style={s.colHead}>Customer Care</p>
            <Link to="/track-order" style={s.link}>Track Order</Link>
            <Link to="/legal/refund" style={s.link}>Returns &amp; Exchanges</Link>
            <div style={{ marginTop: 20 }}>
              <p style={{ ...s.colHead, marginBottom: 6 }}>{t("footer:callUs")}</p>
              <a href="tel:+8801700000000" style={{ color: "rgba(232,217,192,0.7)", fontSize: 13 }}>+880 1700-000000</a>
              <p style={{ color: "rgba(232,217,192,0.4)", fontSize: 12, marginTop: 4 }}>{t("footer:hours")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-links">
          <span style={{ color: "rgba(232,217,192,0.3)", fontSize: 13 }}>
            {t("footer:copyright")}
          </span>
          {/* FIX: these used <a href="/"> which force a full page reload and
              all pointed to the homepage regardless of label. Now real
              client-side routes / non-broken placeholders. */}
          <Link to="/">{t("footer:home")}</Link>
          <Link to="/products">{t("footer:products")}</Link>
          <Link to="/contact">{t("footer:contact")}</Link>
          <Link to="/track-order">{t("footer:trackOrder")}</Link>
          <a href="#" onClick={ComingSoon(t("footer:privacyPolicy"))}>{t("footer:privacyPolicy")}</a>
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/track-order">Track Order</Link>
          <Link to="/legal/privacy">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}

const s = {
  logo:    { fontFamily: "var(--font-display)", fontSize: 22, fontStyle: "italic", color: "var(--gold-light)", marginBottom: 2 },
  tagline: { fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(212,160,23,0.55)", marginBottom: 14 },
  desc:    { fontSize: 13, color: "rgba(232,217,192,0.45)", lineHeight: 1.7, marginBottom: 20 },
  social:  { fontSize: 12, color: "rgba(212,160,23,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" },
  colHead: { fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold-light)", fontWeight: 500, marginBottom: 14, fontFamily: "var(--font-body)" },
  link:    { display: "block", fontSize: 13, color: "rgba(232,217,192,0.45)", marginBottom: 8 },
};