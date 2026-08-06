import { useTranslation } from "react-i18next";
import { MapPin, Mail } from "lucide-react";

export default function About() {
  const { t } = useTranslation("pages");
  return (
    <div className="container" style={{ padding: "48px 24px 64px", maxWidth: 860 }}>
      <span className="eyebrow">{t("ourStory")}</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontStyle: "italic", marginTop: 6 }}>
        {t("aboutTitle")}
      </h1>
      <div className="divider-gold">✦</div>

      <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--charcoal)", marginBottom: 24 }}>
        {t("aboutBody")}
      </p>

      <div className="about-grid" style={{ gap: 32, marginBottom: 32 }}>
        <div className="panel">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 10 }}>{t("ourMission")}</p>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
            {t("missionBody")}
          </p>
        </div>
        <div className="panel">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 10 }}>{t("ourVision")}</p>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
            {t("visionBody")}
          </p>
        </div>
      </div>

      <div className="panel">
        <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 14 }}>{t("contactUs")}</p>
        <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><MapPin size={14} /> {t("address")}</p>
        <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><Mail size={14} /> {t("email")}</p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 10 }}>{t("hours")}</p>
      </div>
    </div>
  );
}