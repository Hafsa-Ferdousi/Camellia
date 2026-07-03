export default function About() {
  return (
    <div className="container" style={{ padding: "48px 24px 64px", maxWidth: 860 }}>
      <span className="eyebrow">Our Story</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontStyle: "italic", marginTop: 6 }}>
        About Camellia
      </h1>
      <div className="divider-gold">✦</div>

      <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--charcoal)", marginBottom: 24 }}>
        Founded in 2019 in Cox's Bazar, Bangladesh, Camellia began as a small family workshop
        crafting bridal jewellery for local weddings. Today we design and handcraft kalira,
        chura, bangles, necklace sets, diamond-cut pieces, and complete wedding accessory sets —
        combining traditional Bangladeshi craftsmanship with modern bridal styling.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>
        <div className="panel">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 10 }}>Our Mission</p>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
            To make beautifully handcrafted, certified-quality bridal jewellery accessible to
            every bride in Bangladesh, with honest pricing and reliable delivery.
          </p>
        </div>
        <div className="panel">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 10 }}>Our Vision</p>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
            To become Bangladesh's most trusted online destination for bridal jewellery,
            celebrated for craftsmanship, authenticity, and customer care.
          </p>
        </div>
      </div>

      <div className="panel">
        <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 14 }}>Contact Us</p>
        <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 6 }}>📍 Cox's Bazar, Bangladesh</p>
        <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 6 }}>📞 +880 1700-000000</p>
        <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 6 }}>✉️ hello@camellia.com</p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 10 }}>Sat–Thu, 10am–8pm</p>
      </div>
    </div>
  );
}