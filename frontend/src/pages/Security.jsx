import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { setupTwoFactor, confirmTwoFactorSetup, disableTwoFactor } from "../api/auth";

export default function Security() {
  const { t } = useTranslation("auth");
  const { user, setUser } = useAuth();
  const [setup, setSetup] = useState(null); // { qrCodeDataUrl, secret }
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setError(""); setMessage(""); setLoading(true);
    try {
      const { data } = await setupTwoFactor();
      setSetup(data);
    } catch (err) {
      setError(err.response?.data?.message || t("couldNotStart2fa"));
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await confirmTwoFactorSetup(code);
      setUser(u => ({ ...u, twoFactorEnabled: true }));
      setSetup(null);
      setCode("");
      setMessage(t("twoFactorEnabledMsg"));
    } catch (err) {
      setError(err.response?.data?.message || t("incorrectCodeRetry"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await disableTwoFactor(password);
      setUser(u => ({ ...u, twoFactorEnabled: false }));
      setPassword("");
      setMessage(t("twoFactorDisabledMsg"));
    } catch (err) {
      setError(err.response?.data?.message || t("incorrectPassword"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 24px 64px" }}>
      <span className="eyebrow">{t("yourAccount")}</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", marginTop: 4 }}>
        {t("security")}
      </h1>
      <div className="divider-gold">✦</div>

      {message && (
        <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #A7F3D0", display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={14} /> {message}
        </div>
      )}
      {error && (
        <div style={{ background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" }}>
          {error}
        </div>
      )}

      <div className="panel" style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
          {t("twoFactorAuth")}
        </p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          {t("twoFactorDesc")}
        </p>

        {user?.twoFactorEnabled && !setup && (
          <>
            <p style={{ fontSize: 13, color: "#065F46", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={14} /> <span dangerouslySetInnerHTML={{ __html: t("twoFactorEnabledNote") }} />
            </p>
            <form onSubmit={handleDisable}>
              <label className="form-label">
                {t("enterPasswordDisable")}
                <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Current password" />
              </label>
              <button className="btn" type="submit" disabled={loading} style={{ padding: "10px 20px", fontSize: 13 }}>
                {loading ? t("disabling") : t("disable2fa")}
              </button>
            </form>
          </>
        )}

        {!user?.twoFactorEnabled && !setup && (
          <button className="btn btn-gold" onClick={startSetup} disabled={loading} style={{ padding: "10px 20px", fontSize: 13 }}>
            {loading ? t("loading") : t("enable2fa")}
          </button>
        )}

        {setup && (
          <div>
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              {t("scanQr")}
            </p>
            <img src={setup.qrCodeDataUrl} alt="2FA QR code" style={{ width: 180, height: 180, marginBottom: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, wordBreak: "break-all" }}>
              {t("enterKeyManually")} <code>{setup.secret}</code>
            </p>
            <form onSubmit={confirmSetup}>
              <label className="form-label">
                {t("enterCode")}
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  style={{ letterSpacing: "0.3em", textAlign: "center" }}
                />
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-gold" type="submit" disabled={loading || code.length < 6} style={{ padding: "10px 20px", fontSize: 13 }}>
                  {loading ? t("confirming") : t("confirmEnable")}
                </button>
                <button type="button" className="btn" onClick={() => { setSetup(null); setCode(""); }} style={{ padding: "10px 20px", fontSize: 13 }}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
