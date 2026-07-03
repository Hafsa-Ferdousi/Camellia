import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../api/auth";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate("/login", { state: { registered: false, passwordReset: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>Choose a New Password</p>
        </div>
        <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="form-label">
            New Password *
            <input className="input" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" />
          </label>
          <label className="form-label">
            Confirm Password *
            <input className="input" type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" />
          </label>
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>

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
