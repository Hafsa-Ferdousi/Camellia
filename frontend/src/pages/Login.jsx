import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  // BUG FIX #35: Show success message after registration
  const registered = location.state?.registered;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(identifier, password);
      navigate("/");
    } catch {
      setError("Invalid email/username or password.");
    } finally {
      setLoading(false);
    }
  };

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
            ✓ Account created! Please log in.
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="form-label">
            Email or Username
            <input className="input" type="text" placeholder="your@email.com" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
          </label>
          <label className="form-label">
            Password
            <input className="input" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
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
          Admin: admin@camellia.com / admin123<br />
          Customer: hafsa@example.com / customer123<br />
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
