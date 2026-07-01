import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";

export default function Register() {
  const [form, setForm] = useState({ username: "", name: "", email: "", password: "", phone: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    // BUG FIX #34: Register was missing username field (required by backend User model)
    try {
      await register(form);
      navigate("/login", { state: { registered: true } });
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
            Username *
            <input className="input" name="username" value={form.username} onChange={set} placeholder="yourname123" required />
          </label>
          <label className="form-label">
            Full Name *
            <input className="input" name="name" value={form.name} onChange={set} placeholder="Your Full Name" required />
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
            <input className="input" name="password" type="password" value={form.password} onChange={set} placeholder="Minimum 6 characters" required minLength={6} />
          </label>
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
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
