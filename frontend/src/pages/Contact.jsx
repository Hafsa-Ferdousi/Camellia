import { useState } from "react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // No dedicated backend endpoint for contact messages yet — open the
    // customer's email client pre-filled with what they typed, so the
    // message still reaches us instead of silently vanishing.
    const subject = encodeURIComponent(`Message from ${form.name || "Camellia website"}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    window.location.href = `mailto:hello@camellia.com?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="container" style={{ padding: "48px 24px 64px", maxWidth: 860 }}>
      <span className="eyebrow">Get In Touch</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontStyle: "italic", marginTop: 6 }}>
        Contact Us
      </h1>
      <div className="divider-gold">✦</div>

      <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--charcoal)", marginBottom: 32, maxWidth: 640 }}>
        Have a question about an order, a custom piece, or just want to say hello?
        Reach out any way that's convenient — we usually reply within a few hours.
      </p>

      <div className="about-grid" style={{ gap: 32, alignItems: "start" }}>
        {/* Contact details */}
        <div className="panel">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 14 }}>
            Reach Us Directly
          </p>
          <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 10 }}>📍 Cox's Bazar, Bangladesh</p>
          <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 10 }}>
            📞 <a href="tel:+8801700000000" style={{ color: "var(--charcoal)" }}>+880 1700-000000</a>
          </p>
          <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 10 }}>
            ✉️ <a href="mailto:hello@camellia.com" style={{ color: "var(--charcoal)" }}>hello@camellia.com</a>
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 14 }}>Sat–Thu, 10am–8pm</p>

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
            Send a Message
          </p>

          {sent && (
            <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #A7F3D0" }}>
              Opening your email app with your message ready to send…
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="form-label">
              Your Name *
              <input className="input" name="name" value={form.name} onChange={set} placeholder="Your Full Name" required />
            </label>
            <label className="form-label">
              Email Address *
              <input className="input" name="email" type="email" value={form.email} onChange={set} placeholder="your@email.com" required />
            </label>
            <label className="form-label">
              Message *
              <textarea
                className="input"
                name="message"
                value={form.message}
                onChange={set}
                rows={5}
                placeholder="How can we help?"
                required
                style={{ resize: "vertical" }}
              />
            </label>
            <button className="btn" type="submit" style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}