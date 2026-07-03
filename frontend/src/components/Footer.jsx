import { Link } from "react-router-dom";


function ComingSoon(label) {
  return (e) => {
    e.preventDefault();
    alert(`${label} — page coming soon!`);
  };
}

export default function Footer() {
  return (
    <footer className="footer" id="site-footer">
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
              {[
                { name: "Facebook", href: "https://facebook.com" },
                { name: "Instagram", href: "https://instagram.com" },
                { name: "WhatsApp", href: "https://wa.me/8801700000000" },
              ].map(n => (
                <a key={n.name} href={n.href} target="_blank" rel="noopener noreferrer" style={s.social}>
                  {n.name}
                </a>
              ))}
            </div>
          </div>

          {/* Shop — now real category filters instead of dead links */}
          <div>
            <p style={s.colHead}>Shop</p>
            {["Kalira", "Chura", "Jhumka", "Necklace Sets", "Diamond Cut", "Wedding Sets"].map(c => (
              <Link key={c} to={`/products?search=${encodeURIComponent(c)}`} style={s.link}>{c}</Link>
            ))}
          </div>

          {/* Information */}
          <div>
            <p style={s.colHead}>Information</p>
            <Link to="/about" style={s.link}>About Us</Link>
            <a href="#site-footer" style={s.link} onClick={(e) => { e.preventDefault(); window.location.href = "mailto:hello@camellia.com"; }}>
              Contact
            </a>
            <a href="#" style={s.link} onClick={ComingSoon("FAQs")}>FAQs</a>
            <a href="#" style={s.link} onClick={ComingSoon("Privacy Policy")}>Privacy Policy</a>
            <a href="#" style={s.link} onClick={ComingSoon("Terms of Service")}>Terms of Service</a>
          </div>

          {/* Customer Care */}
          <div>
            <p style={s.colHead}>Customer Care</p>
            <Link to="/orders" style={s.link}>Track Order</Link>
            <a href="#" style={s.link} onClick={ComingSoon("Returns & Exchanges")}>Returns &amp; Exchanges</a>
            <a href="#" style={s.link} onClick={ComingSoon("Size Guide")}>Size Guide</a>
            <div style={{ marginTop: 20 }}>
              <p style={{ ...s.colHead, marginBottom: 6 }}>Call Us</p>
              <a href="tel:+8801700000000" style={{ color: "rgba(232,217,192,0.7)", fontSize: 13 }}>+880 1700-000000</a>
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
          {/* FIX: these used <a href="/"> which force a full page reload and
              all pointed to the homepage regardless of label. Now real
              client-side routes / non-broken placeholders. */}
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <a href="#site-footer" onClick={(e) => { e.preventDefault(); window.location.href = "mailto:hello@camellia.com"; }}>Contact</a>
          <Link to="/orders">Track Order</Link>
          <a href="#" onClick={ComingSoon("Privacy Policy")}>Privacy Policy</a>
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