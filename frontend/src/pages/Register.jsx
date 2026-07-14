import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { register } from "../api/auth";
import PasswordField from "../components/PasswordField";
import PasswordStrengthChecklist from "../components/PasswordStrengthChecklist";
import { isPasswordStrong } from "../utils/passwordRules";

export default function Register() {
  const [form, setForm] = useState({ username: "", name: "", email: "", password: "", phone: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === form.password;
  const strong = isPasswordStrong(form.password);
  const canSubmit = strong && form.password === confirmPassword && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!strong) {
      setError("Please choose a stronger password — see the requirements below.");
      return;
    }
    if (form.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    // BUG FIX #34: Register was missing username field (required by backend User model)
    try {
      await register(form);
      // Take them straight to the OTP entry screen — carry the original
      // destination (e.g. /checkout) forward so Login can bounce them back
      // there once they've verified and signed in.
      navigate("/verify-otp", { state: { email: form.email, from } });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>Join Camellia</p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Create your account to start shopping</p>
        </div>

        <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="form-label">
            Full Name *
            <input className="input" name="name" value={form.name} onChange={set} placeholder="Your Full Name" required />
          </label>
          <label className="form-label">
            Username *
             <input className="input" name="username" value={form.username} onChange={set} placeholder="Choose a username" required />
          </label>
          <label className="form-label">
            Email Address *
            <input className="input" name="email" type="email" value={form.email} onChange={set} placeholder="your@email.com" required />
          </label>
          <label className="form-label">
            Phone Number
            <input className="input" name="phone" value={form.phone} onChange={set} placeholder="01XXXXXXXXX" />
          </label>
          <label className="form-label">
            Password *
            <PasswordField name="password" value={form.password} onChange={set} placeholder="Create a strong password" />
          </label>
          <PasswordStrengthChecklist password={form.password} />

          <label className="form-label">
            Confirm Password *
            <PasswordField
              name="confirmPassword"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
            />
          </label>
          {!passwordsMatch && (
            <p style={{ color: "var(--red)", fontSize: 12, marginTop: -10, marginBottom: 16 }}>Passwords do not match.</p>
          )}

          <button className="btn" type="submit" disabled={!canSubmit} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
            {loading ? "Creating Account…" : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 20 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--maroon)", fontWeight: 600 }}>Login</Link>
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
