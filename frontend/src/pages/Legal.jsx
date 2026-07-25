import { useParams, Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const PAGE_KEYS = {
  terms: { titleKey: "termsTitle", updatedKey: "termsUpdated", prefix: "terms" },
  privacy: { titleKey: "privacyTitle", updatedKey: "privacyUpdated", prefix: "privacy" },
  refund: { titleKey: "refundTitle", updatedKey: "refundUpdated", prefix: "refund" },
};

export default function Legal() {
  const { t } = useTranslation("legal");
  const { page } = useParams();

  if (!PAGE_KEYS[page]) return <Navigate to="/legal/terms" replace />;

  const { titleKey, updatedKey, prefix } = PAGE_KEYS[page];
  const title = t(titleKey);
  const updated = t(updatedKey);
  const content = Array.from({ length: 10 }, (_, i) => ({
    heading: t(`${prefix}${i + 1}Heading`),
    body: t(`${prefix}${i + 1}Body`),
  }));

  return (
    <div className="container" style={{ padding: "48px 24px 80px", maxWidth: 800 }}>

      {/* Header */}
      <span className="eyebrow">{t("eyebrow")}</span>
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
        {t("lastUpdated", { date: updated })}
      </p>

      {/* Tab Navigation */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap",
        marginBottom: 36, borderBottom: "1px solid var(--border)",
        paddingBottom: 16,
      }}>
        {[
          { label: t("tabTerms"), path: "/legal/terms" },
          { label: t("tabPrivacy"), path: "/legal/privacy" },
          { label: t("tabRefund"), path: "/legal/refund" },
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
        {t("haveQuestions")} {" "}
        <Link to="/contact" style={{ color: "var(--gold-text)", fontWeight: 600 }}>
          {t("contactUs")}
        </Link>
        {" "} {t("happyToHelp")}
      </div>
    </div>
  );
}
