import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
export default function PasswordField({
  value,
  onChange,
  placeholder = "",
  name,
  id,
  required = true,
  autoFocus = false,
}) {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation("auth");

  return (
    <div style={{ position: "relative" }}>
      <input
        className="input"
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", display: "inline-flex", color: "var(--muted)",
        }}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        tabIndex={-1}
      >
        {visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}