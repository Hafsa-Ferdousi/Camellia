import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSecurityQuestion, resetPasswordWithAnswer } from "../api/auth";
import PasswordField from "../components/PasswordField";
import PasswordStrengthChecklist from "../components/PasswordStrengthChecklist";
import { isPasswordStrong } from "../utils/passwordRules";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("identify"); // identify | answer
  const [identifier, setIdentifier] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleIdentify = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await getSecurityQuestion(identifier);
      setQuestion(data.question);
      setStep("answer");
    } catch (err) {
      setError(err.response?.data?.message || "No account found with that email or username.");
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
      await resetPasswordWithAnswer(identifier, answer, password);
      navigate("/login", { state: { passwordReset: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password.");
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
            {step === "identify" ? "No email needed — answer your security question instead" : "Answer your security question to continue"}
          </p>
        </div>
        <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {step === "identify" ? (
          <form onSubmit={handleIdentify}>
            <label className="form-label">
              Email or Username
              <input className="input" type="text" required value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="your@email.com" />
            </label>
            <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
              {loading ? "Looking up…" : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <label className="form-label">
              {question}
              <input className="input" type="text" required value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your answer" />
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
            <button
              className="btn"
              type="submit"
              disabled={loading || !answer.trim() || !isPasswordStrong(password) || password !== confirmPassword}
              style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}
            >
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </form>
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
