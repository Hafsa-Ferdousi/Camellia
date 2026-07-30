import { useTranslation } from "react-i18next";
import { Check, Circle } from "lucide-react";
import { getPasswordChecklist } from "../utils/passwordRules";

export default function PasswordStrengthChecklist({ password }) {
  const { t } = useTranslation("auth");
  if (!password) return null;
  const checklist = getPasswordChecklist(password);

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 16px", fontSize: 12 }}>
      {checklist.map((rule) => (
        <li key={rule.key} style={{ color: rule.met ? "#10884F" : "var(--muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ display: "inline-flex" }}>{rule.met ? <Check size={13} /> : <Circle size={13} />}</span>
          <span>{t(rule.labelKey)}</span>
        </li>
      ))}
    </ul>
  );
}