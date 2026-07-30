import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { register } from "../api/auth";
import PasswordField from "../components/PasswordField";
import PasswordStrengthChecklist from "../components/PasswordStrengthChecklist";
import { isPasswordStrong } from "../utils/passwordRules";
import { SECURITY_QUESTIONS } from "../utils/securityQuestions";

export default function Register() {
  const { t } = useTranslation("auth");
  const [form, setForm] = useState({
    username: "", name: "", email: "", password: "", phone: "",
    securityQuestion: SECURITY_QUESTIONS[0], securityAnswer: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === form.password;
  const strong = isPasswordStrong(form.password);
  const canSubmit = strong && form.password === confirmPassword && form.securityAnswer.trim().length > 0 && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!strong) {
      setError(t("weakPassword"));
      return;
    }
    if (form.password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (!form.securityAnswer.trim()) {
      setError(t("answerRequired"));
      return;
    }

    setLoading(true);
    // BUG FIX #34: Register was missing username field (required by backend User model)
    try {
      await register(form);
      navigate("/verify-email", { state: { email: form.email, from } });
    } catch (err) {
      setError(err.response?.data?.message || t("registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>{t("joinCamellia")}</p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("createAccountSub")}</p>
        </div>

        <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="form-label">
            {t("fullName")}
            <input className="input" name="name" value={form.name} onChange={set} placeholder={t("fullNamePlaceholder")} required />
          </label>
          <label className="form-label">
            {t("username")}
             <input className="input" name="username" value={form.username} onChange={set} placeholder={t("usernamePlaceholder")} required />
          </label>
          <label className="form-label">
            {t("emailAddress")}
            <input className="input" name="email" type="email" value={form.email} onChange={set} placeholder={t("emailPlaceholder")} required />
          </label>
          <label className="form-label">
            {t("phoneNumber")}
            <input className="input" name="phone" value={form.phone} onChange={set} placeholder={t("phonePlaceholder")} />
          </label>
          <label className="form-label">
            {t("password")}
            <PasswordField name="password" value={form.password} onChange={set} placeholder={t("createPasswordPlaceholder")} />
          </label>
          <PasswordStrengthChecklist password={form.password} />

          <label className="form-label">
            {t("confirmPassword")}
            <PasswordField
              name="confirmPassword"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t("reenterPasswordPlaceholder")}
            />
          </label>
          {!passwordsMatch && (
            <p style={{ color: "var(--red)", fontSize: 12, marginTop: -10, marginBottom: 16 }}>{t("passwordMismatch")}</p>
          )}

          <label className="form-label">
            {t("securityQuestion")}
            <select className="input" name="securityQuestion" value={form.securityQuestion} onChange={set}>
              {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </label>
          <label className="form-label">
            {t("yourAnswer")}
            <input
              className="input"
              name="securityAnswer"
              value={form.securityAnswer}
              onChange={set}
              placeholder={t("answerPlaceholder")}
              required
            />
          </label>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -10, marginBottom: 16 }}>
            {t("recoveryNote")}
          </p>

          <button className="btn" type="submit" disabled={!canSubmit} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
            {loading ? t("creatingAccount") : t("createAccount")}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 20 }}>
          {t("haveAccount")}{" "}
          <Link to="/login" style={{ color: "var(--maroon)", fontWeight: 600 }}>{t("login")}</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px", background: "var(--cream)" },
  card: { width: "100%", maxWidth: 440, background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px 36px", boxShadow: "var(--shadow-md)" },
  errorBox: { background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" },
};
