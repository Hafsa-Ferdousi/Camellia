import { useParams, Link, Navigate } from "react-router-dom";

const SECTIONS = {
  terms: {
    eyebrow: "Legal",
    title: "Terms & Conditions",
    updated: "15 July 2026",
    content: [
      {
        heading: "1. Acceptance of Terms",
        body: "By accessing and using the Camellia website (camellia.com), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our website.",
      },
      {
        heading: "2. Products & Pricing",
        body: "All products listed on our website are subject to availability. Prices are displayed in Bangladeshi Taka (৳) and are inclusive of applicable taxes. We reserve the right to change prices at any time without prior notice. However, orders already placed will be honoured at the price shown at the time of purchase.",
      },
      {
        heading: "3. Orders & Payment",
        body: "By placing an order, you confirm that all information provided is accurate and complete. We accept Cash on Delivery (COD) and online payments via bKash, Nagad, and bank transfer. Orders are confirmed only after successful payment verification or COD confirmation.",
      },
      {
        heading: "4. Delivery",
        body: "We deliver across Bangladesh. Delivery time is typically 3–7 business days depending on your location. A delivery charge of ৳80 applies to Cash on Delivery orders. Online payment orders qualify for free delivery. We are not responsible for delays caused by courier partners or unforeseen circumstances.",
      },
      {
        heading: "5. Cancellations",
        body: "Orders can be cancelled within 24 hours of placement, provided the order has not yet been shipped. To cancel, contact us via our Contact page or call our support line. Once shipped, cancellations are not possible but you may initiate a return.",
      },
      {
        heading: "6. Intellectual Property",
        body: "All content on this website — including images, text, logos, and designs — is the property of Camellia and is protected by copyright law. You may not reproduce, distribute, or use our content without written permission.",
      },
      {
        heading: "7. Limitation of Liability",
        body: "Camellia shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or website. Our total liability in any matter is limited to the amount paid for the specific product in question.",
      },
      {
        heading: "8. Changes to Terms",
        body: "We reserve the right to update these Terms and Conditions at any time. Changes will be posted on this page with an updated date. Continued use of the website after changes constitutes acceptance of the new terms.",
      },
      {
        heading: "9. Governing Law",
        body: "These terms are governed by the laws of Bangladesh. Any disputes shall be resolved in the courts of Cox's Bazar, Bangladesh.",
      },
      {
        heading: "10. Contact",
        body: "For any questions about these Terms, please contact us at camelliabyanandi@gmail.com or visit our Contact page.",
      },
    ],
  },

  privacy: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    updated: "15 July 2026",
    content: [
      {
        heading: "1. Information We Collect",
        body: "We collect information you provide directly to us, including your name, email address, phone number, and delivery address when you register or place an order. We also collect usage data such as pages visited, browser type, and device information to improve our services.",
      },
      {
        heading: "2. How We Use Your Information",
        body: "We use the information we collect to process and deliver your orders, send order confirmations and updates, respond to your enquiries, improve our website and services, and send promotional communications (only if you have opted in).",
      },
      {
        heading: "3. Information Sharing",
        body: "We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted courier partners solely to fulfil your delivery, and with payment processors to complete transactions securely. All partners are required to keep your information confidential.",
      },
      {
        heading: "4. Data Security",
        body: "We take reasonable measures to protect your personal information from unauthorised access, loss, or misuse. Our website uses HTTPS encryption. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.",
      },
      {
        heading: "5. Cookies",
        body: "We use cookies to enhance your browsing experience, remember your preferences, and analyse website traffic. You can disable cookies in your browser settings, but this may affect some website functionality.",
      },
      {
        heading: "6. Your Rights",
        body: "You have the right to access, correct, or delete your personal information. You may also opt out of marketing emails at any time by clicking 'unsubscribe' in any email or contacting us directly. To exercise these rights, contact us at camelliabyanandi@gmail.com.",
      },
      {
        heading: "7. Data Retention",
        body: "We retain your personal data for as long as your account is active or as needed to provide services. Order records are kept for 5 years for legal and accounting purposes. You may request deletion of your account and associated data at any time.",
      },
      {
        heading: "8. Children's Privacy",
        body: "Our website is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it.",
      },
      {
        heading: "9. Changes to This Policy",
        body: "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date.",
      },
      {
        heading: "10. Contact Us",
        body: "If you have questions about this Privacy Policy or how we handle your data, please contact us at camelliabyanandi@gmail.com.",
      },
    ],
  },

  refund: {
    eyebrow: "Legal",
    title: "Refund & Return Policy",
    updated: "15 July 2026",
    content: [
      {
        heading: "1. Our Commitment",
        body: "At Camellia, we take pride in the quality of our handcrafted jewellery. If you are not completely satisfied with your purchase, we are here to help.",
      },
      {
        heading: "2. Return Eligibility",
        body: "You may request a return within 7 days of receiving your order. To be eligible, the item must be unused, in its original condition, and in the original packaging. Items that have been worn, altered, or damaged after delivery are not eligible for return.",
      },
      {
        heading: "3. Non-Returnable Items",
        body: "The following items cannot be returned: customised or personalised jewellery, items marked as 'Final Sale', gift cards, and items returned after 7 days of delivery.",
      },
      {
        heading: "4. How to Request a Return",
        body: "To initiate a return, contact us at camelliabyanandi@gmail.com or through our Contact page within 7 days of delivery. Include your order number, reason for return, and photos of the item. We will respond within 2 business days with return instructions.",
      },
      {
        heading: "5. Return Shipping",
        body: "If the return is due to a defect or our error, we will cover the return shipping cost. If you are returning for any other reason (e.g. change of mind), the return shipping cost is your responsibility.",
      },
      {
        heading: "6. Refund Process",
        body: "Once we receive and inspect the returned item, we will notify you of the approval or rejection of your refund. Approved refunds will be processed within 5–7 business days. Refunds will be made to the original payment method (bKash, Nagad, or bank transfer). COD orders will be refunded via bKash or bank transfer.",
      },
      {
        heading: "7. Damaged or Defective Items",
        body: "If you receive a damaged or defective item, please contact us within 48 hours of delivery with photos. We will arrange a replacement or full refund at no extra cost to you.",
      },
      {
        heading: "8. Exchanges",
        body: "We do not currently offer direct exchanges. If you need a different item, please return the original (if eligible) and place a new order.",
      },
      {
        heading: "9. Late or Missing Refunds",
        body: "If you have not received your refund within 7 business days of approval, first check with your bank or payment provider. If the issue persists, contact us at camelliabyanandi@gmail.com.",
      },
      {
        heading: "10. Contact",
        body: "For any questions about returns or refunds, please contact us at camelliabyanandi@gmail.com or call us during business hours (Sat–Thu, 10am–8pm).",
      },
    ],
  },
};

export default function Legal() {
  const { page } = useParams();

  if (!SECTIONS[page]) return <Navigate to="/terms" replace />;

  const { eyebrow, title, updated, content } = SECTIONS[page];

  return (
    <div className="container" style={{ padding: "48px 24px 80px", maxWidth: 800 }}>

      {/* Header */}
      <span className="eyebrow">{eyebrow}</span>
      <h1 style={{
        fontFamily: "var(--font-display)",
        fontSize: 36,
        fontStyle: "italic",
        marginTop: 6,
        marginBottom: 8,
      }}>
        {title}
      </h1>
      <div className="divider-gold">✦</div>

      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>
        Last updated: {updated}
      </p>

      {/* Tab Navigation */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap",
        marginBottom: 36, borderBottom: "1px solid var(--border)",
        paddingBottom: 16,
      }}>
        {[
          { label: "Terms & Conditions", path: "/legal/terms" },
          { label: "Privacy Policy",     path: "/legal/privacy" },
          { label: "Refund Policy",      path: "/legal/refund" },
        ].map(tab => (
          <Link
            key={tab.path}
            to={tab.path}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              border: "1.5px solid",
              borderColor: tab.path === `/legal/${page}` ? "var(--maroon)" : "var(--border)",
              background: tab.path === `/legal/${page}` ? "var(--maroon)" : "transparent",
              color: tab.path === `/legal/${page}` ? "#fff" : "var(--muted)",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {content.map((section, i) => (
          <div key={i} className="panel">
            <h3 style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--charcoal)",
              marginBottom: 10,
            }}>
              {section.heading}
            </h3>
            <p style={{
              fontSize: 14,
              color: "var(--ink)",
              lineHeight: 1.8,
            }}>
              {section.body}
            </p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: 40, padding: "16px 20px",
        background: "var(--parchment)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        fontSize: 13, color: "var(--muted)",
        textAlign: "center",
      }}>
        Have questions? {" "}
        <Link to="/contact" style={{ color: "var(--gold-text)", fontWeight: 600 }}>
          Contact us
        </Link>
        {" "} — we're happy to help!
      </div>
    </div>
  );
}
