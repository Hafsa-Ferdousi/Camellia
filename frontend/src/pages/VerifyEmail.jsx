import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { verifyEmailOtp, resendEmailOtp } from "../api/auth";
import Seo from "../components/Seo";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";
  const from = location.state?.from;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = () => {
    setCooldown(30);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    try {
      await verifyEmailOtp(email, otp);
      navigate("/login", { state: { registered: true, from } });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(""); setInfo(""); setResending(true);
    try {
      await resendEmailOtp(email);
      setInfo("A new code has been sent to your email.");
      startCooldown();
    } catch {
      setError("Couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={{ textAlign: "center", fontSize: 14, color: "var(--muted)" }}>
            No email to verify. Please{" "}
            <Link to="/register" style={{ color: "var(--maroon)", fontWeight: 600 }}>register</Link>{" "}
            or{" "}
            <Link to="/login" style={{ color: "var(--maroon)", fontWeight: 600 }}>log in</Link> first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Seo title="Verify Email" noindex />
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>
            Verify your email
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
          </p>
        </div>

        <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {info && <div style={styles.infoBox}>{info}</div>}

        <form onSubmit={handleSubmit}>
          <label className="form-label">
            Verification code
            <input
              className="input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              style={{ letterSpacing: 4, textAlign: "center", fontSize: 18 }}
              required
            />
          </label>
          <button
            className="btn"
            type="submit"
            disabled={loading || otp.length !== 6}
            style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 20 }}>
          Didn't get a code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            style={{ color: "var(--maroon)", fontWeight: 600, background: "none", border: "none", cursor: cooldown > 0 ? "default" : "pointer", textDecoration: "underline", padding: 0, fontSize: 13 }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : (resending ? "Sending..." : "Resend code")}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px", background: "var(--cream)" },
  card: { width: "100%", maxWidth: 420, background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px 36px", boxShadow: "var(--shadow-md)" },
  errorBox: { background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" },
  infoBox: { background: "#ECFDF5", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #A7F3D0" },
};
