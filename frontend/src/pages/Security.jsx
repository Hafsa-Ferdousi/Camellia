import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { setupTwoFactor, confirmTwoFactorSetup, disableTwoFactor } from "../api/auth";

export default function Security() {
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
      setError(err.response?.data?.message || "Could not start 2FA setup.");
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
      setMessage("Two-factor authentication is now enabled on your account.");
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect code. Please try again.");
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
      setMessage("Two-factor authentication has been disabled.");
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 24px 64px" }}>
      <span className="eyebrow">Your Account</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", marginTop: 4 }}>
        Security
      </h1>
      <div className="divider-gold">✦</div>

      {message && (
        <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #A7F3D0" }}>
          ✓ {message}
        </div>
      )}
      {error && (
        <div style={{ background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" }}>
          {error}
        </div>
      )}

      <div className="panel" style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
          Two-Factor Authentication (2FA)
        </p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc).
        </p>

        {user?.twoFactorEnabled && !setup && (
          <>
            <p style={{ fontSize: 13, color: "#065F46", marginBottom: 16 }}>✓ 2FA is currently <strong>enabled</strong> on your account.</p>
            <form onSubmit={handleDisable}>
              <label className="form-label">
                Enter your password to disable 2FA
                <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Current password" />
              </label>
              <button className="btn" type="submit" disabled={loading} style={{ padding: "10px 20px", fontSize: 13 }}>
                {loading ? "Disabling…" : "Disable 2FA"}
              </button>
            </form>
          </>
        )}

        {!user?.twoFactorEnabled && !setup && (
          <button className="btn btn-gold" onClick={startSetup} disabled={loading} style={{ padding: "10px 20px", fontSize: 13 }}>
            {loading ? "Loading…" : "Enable 2FA"}
          </button>
        )}

        {setup && (
          <div>
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              1. Scan this QR code with your authenticator app:
            </p>
            <img src={setup.qrCodeDataUrl} alt="2FA QR code" style={{ width: 180, height: 180, marginBottom: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, wordBreak: "break-all" }}>
              Or enter this key manually: <code>{setup.secret}</code>
            </p>
            <form onSubmit={confirmSetup}>
              <label className="form-label">
                2. Enter the 6-digit code it shows
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
                  {loading ? "Confirming…" : "Confirm & Enable"}
                </button>
                <button type="button" className="btn" onClick={() => { setSetup(null); setCode(""); }} style={{ padding: "10px 20px", fontSize: 13 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
