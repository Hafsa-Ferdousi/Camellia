import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { verifyEmailOtp, resendVerification } from "../api/auth";

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const from = location.state?.from;

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await verifyEmailOtp(email, code);
      navigate("/login", { state: { registered: true, from } });
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) { setError("Enter your email first."); return; }
    setResendState("sending"); setError("");
    try {
      await resendVerification(email);
      setResendState("sent");
    } catch {
      setResendState("idle");
      setError("Could not resend code. Please try again.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>Verify Your Email</p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Enter the 6-digit code we sent{email ? <> to <strong>{email}</strong></> : " to your email"}
          </p>
        </div>
        <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {!location.state?.email && (
            <label className="form-label">
              Email Address
              <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </label>
          )}
          <label className="form-label">
            Verification Code
            <input
              className="input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              required
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              style={{ letterSpacing: "0.3em", fontSize: 18, textAlign: "center" }}
            />
          </label>
          <button className="btn" type="submit" disabled={loading || code.length < 6} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
            {loading ? "Verifying…" : "Verify Email"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 20 }}>
          {resendState === "sent" ? (
            "✓ A new code has been sent."
          ) : (
            <>
              Didn't get a code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === "sending"}
                style={{ background: "none", border: "none", padding: 0, color: "var(--maroon)", fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}
              >
                {resendState === "sending" ? "Sending…" : "Resend code"}
              </button>
            </>
          )}
        </p>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
          You can also click the link in the email instead. <Link to="/login" style={{ color: "var(--maroon)" }}>Back to login</Link>
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
