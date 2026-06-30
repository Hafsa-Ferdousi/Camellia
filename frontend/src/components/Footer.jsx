import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <p style={s.logo}>Camellia</p>
            <p style={s.tagline}>Jewelry &amp; Wedding Accessories</p>
            <p style={s.desc}>
              Handcrafted bridal jewelry since 2019.<br />
              Cox's Bazar, Bangladesh.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
              {["Facebook", "Instagram", "WhatsApp"].map(n => (
                <a key={n} href="/" style={s.social}>{n}</a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <p style={s.colHead}>Shop</p>
            {["Kalira", "Chura", "Jhumka", "Necklace Sets", "Diamond Cut", "Wedding Sets"].map(c => (
              <a key={c} href="/" style={s.link}>{c}</a>
            ))}
          </div>

          {/* Information */}
          <div>
            <p style={s.colHead}>Information</p>
            {["About Us", "Contact", "FAQs", "Privacy Policy", "Terms of Service"].map(i => (
              <a key={i} href="/" style={s.link}>{i}</a>
            ))}
          </div>

          {/* Customer Care */}
          <div>
            <p style={s.colHead}>Customer Care</p>
            <Link to="/orders" style={s.link}>Track Order</Link>
            <a href="/" style={s.link}>Returns &amp; Exchanges</a>
            <a href="/" style={s.link}>Size Guide</a>
            <div style={{ marginTop: 20 }}>
              <p style={{ ...s.colHead, marginBottom: 6 }}>Call Us</p>
              <p style={{ color: "rgba(232,217,192,0.7)", fontSize: 13 }}>+880 1700-000000</p>
              <p style={{ color: "rgba(232,217,192,0.4)", fontSize: 12, marginTop: 4 }}>Sat–Thu, 10am–8pm</p>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-links">
          <span style={{ color: "rgba(232,217,192,0.3)", fontSize: 13 }}>
            © 2026 Camellia — Cox's Bazar, Bangladesh. All rights reserved.
          </span>
          <a href="/">Home</a>
          <a href="/">Products</a>
          <a href="/">Contact</a>
          <Link to="/orders">Track Order</Link>
          <a href="/">Privacy Policy</a>
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
