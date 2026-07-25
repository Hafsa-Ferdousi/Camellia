import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PasswordField from "../components/PasswordField";

export default function Login() {
  const { t } = useTranslation("auth");
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);

  const [tempToken, setTempToken] = useState(null);
  const [code, setCode] = useState("");

  const { login, completeTwoFactorLogin } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  const registered = location.state?.registered;
  const explicitFrom = location.state?.from;
  // Where to land after a successful login: if the user was bounced here from
  // a specific protected page, honor that. Otherwise, admins go straight to
  // the admin panel, everyone else goes to the homepage.
  const destinationFor = (role) => explicitFrom || (role === "admin" ? "/admin" : "/");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await login(identifier, password);
      if (data.twoFactorRequired) {
        setTempToken(data.tempToken);
      } else {
        navigate(destinationFor(data.role), { replace: true });
      }
    } catch (err) {
      if (err.response?.status === 423) {
        setError(err.response.data.message);
      } else {
        setError(t("invalidLogin"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await completeTwoFactorLogin(tempToken, code);
      navigate(destinationFor(data.role), { replace: true });
    } catch {
      setError(t("incorrectCode"));
    } finally {
      setLoading(false);
    }
  };

  if (tempToken) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>{t("twoFactorTitle")}</p>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("twoFactorSub")}</p>
          </div>
          <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleTwoFactorSubmit}>
            <label className="form-label">
              {t("authCode")}
              <input
                className="input"
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                style={{ letterSpacing: "0.3em", fontSize: 18, textAlign: "center" }}
                required
              />
            </label>
            <button className="btn" type="submit" disabled={loading || code.length < 6} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
              {loading ? t("verifying") : t("verifyContinue")}
            </button>
          </form>

          <p style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => { setTempToken(null); setCode(""); setError(""); }}
              style={{ marginTop: 20, fontSize: 13, color: "var(--muted)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
            >
              {t("backToLogin")}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>{t("welcomeBack")}</p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("signInSub")}</p>
        </div>

        <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

        {registered && (
          <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #A7F3D0", display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> {t("accountCreated")}
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="form-label">
            {t("emailOrUsername")}
            <input className="input" type="text" placeholder="your@email.com" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
          </label>
          <label className="form-label">
            {t("password")}
            <PasswordField value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
          </label>
          <p style={{ textAlign: "right", marginTop: -8, marginBottom: 16 }}>
            <Link to="/forgot-password" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "underline" }}>{t("forgotPassword")}</Link>
          </p>
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
            {loading ? t("signingIn") : t("login")}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 20 }}>
          {t("noAccount")}{" "}
          <Link to="/register" style={{ color: "var(--maroon)", fontWeight: 600 }}>{t("signUp")}</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px", background: "var(--cream)" },
  card: { width: "100%", maxWidth: 420, background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px 36px", boxShadow: "var(--shadow-md)" },
  errorBox: { background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" },
};
