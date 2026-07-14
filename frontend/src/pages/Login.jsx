import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resendVerification } from "../api/auth";
import PasswordField from "../components/PasswordField";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent

  const [tempToken, setTempToken] = useState(null);
  const [code, setCode] = useState("");

  const { login, completeTwoFactorLogin } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  const registered = location.state?.registered;
  const from = location.state?.from || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setNeedsVerification(false); setLoading(true);
    try {
      const data = await login(identifier, password);
      if (data.twoFactorRequired) {
        setTempToken(data.tempToken);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (err.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
        setError(err.response.data.message);
      } else if (err.response?.status === 423) {
        setError(err.response.data.message);
      } else {
        setError("Invalid email/username or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await completeTwoFactorLogin(tempToken, code);
      navigate(from, { replace: true });
    } catch {
      setError("Incorrect authentication code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendState("sending");
    try {
      await resendVerification(identifier);
    } finally {
      setResendState("sent");
    }
  };

  if (tempToken) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>Two-Factor Verification</p>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Enter the 6-digit code from your authenticator app</p>
          </div>
          <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleTwoFactorSubmit}>
            <label className="form-label">
              Authentication Code
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
              {loading ? "Verifying…" : "Verify & Continue"}
            </button>
          </form>

          <p style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => { setTempToken(null); setCode(""); setError(""); }}
              style={{ marginTop: 20, fontSize: 13, color: "var(--muted)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
            >
              ← Back to login
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
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>Welcome Back</p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Sign in to your Camellia account</p>
        </div>

        <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

        {registered && (
          <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #A7F3D0" }}>
            ✓ Account created! Please check your email to verify your address, then log in.
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            {error}
            {needsVerification && (
              <div style={{ marginTop: 8 }}>
                {resendState === "sent" ? (
                  <span>✓ Verification email sent — check your inbox.</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === "sending"}
                    style={{ background: "none", border: "none", padding: 0, color: "var(--red)", textDecoration: "underline", cursor: "pointer", fontSize: 13 }}
                  >
                    {resendState === "sending" ? "Sending…" : "Resend verification email"}
                  </button>
                )}
                {" · "}
                <Link to="/verify-otp" state={{ email: identifier }} style={{ color: "var(--red)", textDecoration: "underline", fontSize: 13 }}>
                  Enter code
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="form-label">
            Email or Username
            <input className="input" type="text" placeholder="your@email.com" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
          </label>
          <label className="form-label">
            Password *
            <PasswordField value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
          </label>
          <p style={{ textAlign: "right", marginTop: -8, marginBottom: 16 }}>
            <Link to="/forgot-password" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "underline" }}>Forgot password?</Link>
          </p>
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 20 }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "var(--maroon)", fontWeight: 600 }}>Sign Up</Link>
        </p>

        <div style={{ marginTop: 24, padding: "12px 14px", background: "var(--cream-dark)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--muted)", border: "1px solid var(--border)" }}>
          <strong style={{ color: "var(--charcoal)" }}>Demo accounts:</strong><br />
          Admin: admin@camellia.com / Admin123!<br />
          Customer: hafsa@example.com / Customer123!<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>(Run node seed.js in backend/ first)</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px", background: "var(--cream)" },
  card: { width: "100%", maxWidth: 420, background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px 36px", boxShadow: "var(--shadow-md)" },
  errorBox: { background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" },
};
