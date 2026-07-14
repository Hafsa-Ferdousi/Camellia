import { getPasswordChecklist } from "../utils/passwordRules";

export default function PasswordStrengthChecklist({ password }) {
  if (!password) return null;
  const checklist = getPasswordChecklist(password);

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 16px", fontSize: 12 }}>
      {checklist.map((rule) => (
        <li key={rule.key} style={{ color: rule.met ? "#10884F" : "var(--muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span>{rule.met ? "✓" : "○"}</span>
          <span>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}