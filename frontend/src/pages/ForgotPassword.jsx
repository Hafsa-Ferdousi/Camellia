import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { forgotPassword, resetPasswordWithOtp } from "../api/auth";
import PasswordField from "../components/PasswordField";
import PasswordStrengthChecklist from "../components/PasswordStrengthChecklist";
import { isPasswordStrong } from "../utils/passwordRules";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("request"); // request | reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLink, setDevLink] = useState(null);
  const [devOtp, setDevOtp] = useState(null);

  const handleRequest = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await forgotPassword(email);
      if (data.devResetLink) setDevLink(data.devResetLink);
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep("reset");
    } catch {
      // Backend returns a generic message regardless — don't reveal whether the email exists.
      setStep("reset");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithOtp(email, otp, password);
      navigate("/login", { state: { passwordReset: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password. The code may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>Reset Your Password</p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            {step === "request" ? "We'll email you a 6-digit code" : "Enter the code from your email"}
          </p>
        </div>
        <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {step === "request" ? (
          <form onSubmit={handleRequest}>
            <label className="form-label">
              Email Address
              <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </label>
            <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
              {loading ? "Sending…" : "Send Reset Code"}
            </button>
          </form>
        ) : (
          <>
            <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #A7F3D0" }}>
              ✓ If that account exists, a code has been sent to {email}.
            </div>
            {(devLink || devOtp) && (
              <div style={{ fontSize: 12, color: "var(--muted)", padding: "10px 14px", background: "var(--cream-dark)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: 16, wordBreak: "break-all" }}>
                <strong>Dev mode (no SMTP configured):</strong><br />
                {devOtp && <>Code: <strong>{devOtp}</strong><br /></>}
                {devLink && <Link to={devLink.replace(/^.*\/reset-password/, "/reset-password")}>Or use the link instead</Link>}
              </div>
            )}
            <form onSubmit={handleReset}>
              <label className="form-label">
                Verification Code
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  style={{ letterSpacing: "0.3em", fontSize: 18, textAlign: "center" }}
                />
              </label>
              <label className="form-label">
                New Password *
                <PasswordField value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" />
              </label>
              <PasswordStrengthChecklist password={password} />

              <label className="form-label">
                Confirm Password *
                <PasswordField value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
              </label>
              <button className="btn" type="submit" disabled={loading || otp.length < 6 || !isPasswordStrong(password)} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 20 }}>
          <Link to="/login" style={{ color: "var(--maroon)", fontWeight: 600 }}>← Back to Login</Link>
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