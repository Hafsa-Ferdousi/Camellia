import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Contact() {
  const { t } = useTranslation("pages");
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send message. Please try again.");
        return;
      }

      setSent(true);
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "48px 24px 64px", maxWidth: 860 }}>
      <span className="eyebrow">{t("getInTouch")}</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontStyle: "italic", marginTop: 6 }}>
        {t("contactUs")}
      </h1>
      <div className="divider-gold">✦</div>

      <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--charcoal)", marginBottom: 32, maxWidth: 640 }}>
        {t("contactIntro")}
      </p>

      <div className="about-grid" style={{ gap: 32, alignItems: "start" }}>

        {/* Contact details */}
        <div className="panel">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 14 }}>
            {t("reachUsDirectly")}
          </p>
          <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}><MapPin size={14} /> {t("address")}</p>
          <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <Phone size={14} /> <a href="tel:+8801700000000" style={{ color: "var(--charcoal)" }}>+880 1700-000000</a>
          </p>
          <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <Mail size={14} /> <a href="mailto:hello@camellia.com" style={{ color: "var(--charcoal)" }}>camelliabyanandi@gmail.com</a>
          <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 10 }}>
            ✉️ <a href="mailto:camelliabyanandi@gmail.com" style={{ color: "var(--charcoal)" }}>camelliabyanandi@gmail.com</a>
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 14 }}>{t("hours")}</p>

          <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
            {[
              { name: "Facebook", href: "https://facebook.com" },
              { name: "Instagram", href: "https://instagram.com" },
              { name: "WhatsApp", href: "https://wa.me/8801700000000" },
            ].map((n) => (
              <a
                key={n.name}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: "var(--gold-text)", letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                {n.name}
              </a>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div className="panel">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 14 }}>
            {t("sendMessage")}
          </p>

          {/* Success message */}
          {sent && (
            <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #A7F3D0" }}>
              {t("emailOpened")}
            <div style={{
              background: "#ECFDF5", color: "#065F46",
              padding: "10px 14px", borderRadius: "var(--radius-sm)",
              marginBottom: 16, fontSize: 13,
              border: "1px solid #A7F3D0",
            }}>
              ✅ Your message has been sent! We will get back to you soon.
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              background: "#FEF2F2", color: "#991B1B",
              padding: "10px 14px", borderRadius: "var(--radius-sm)",
              marginBottom: 16, fontSize: 13,
              border: "1px solid #FECACA",
            }}>
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="form-label">
              {t("yourName")}
              <input className="input" name="name" value={form.name} onChange={set} placeholder="Your Full Name" required />
            </label>
            <label className="form-label">
              {t("emailAddress")}
              <input className="input" name="email" type="email" value={form.email} onChange={set} placeholder="your@email.com" required />
              Your Name *
              <input
                className="input"
                name="name"
                value={form.name}
                onChange={set}
                placeholder="Your Full Name"
                required
              />
            </label>
            <label className="form-label">
              Email Address *
              <input
                className="input"
                name="email"
                type="email"
                value={form.email}
                onChange={set}
                placeholder="your@email.com"
                required
              />
            </label>
            <label className="form-label">
              {t("message")}
              <textarea
                className="input"
                name="message"
                value={form.message}
                onChange={set}
                rows={5}
                placeholder={t("messagePlaceholder")}
                required
                style={{ resize: "vertical" }}
              />
            </label>
            <button className="btn" type="submit" style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
              {t("sendMessageBtn")}
            <button
              className="btn"
              type="submit"
              disabled={loading}
              style={{
                width: "100%", marginTop: 8,
                padding: 13, fontSize: 13,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
