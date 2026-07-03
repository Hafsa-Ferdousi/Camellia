import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { verifyEmail } from "../api/auth";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    verifyEmail(token)
      .then((res) => { setStatus("success"); setMessage(res.data.message); })
      .catch((err) => { setStatus("error"); setMessage(err.response?.data?.message || "Verification failed."); });
  }, [token]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center", background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px 36px", boxShadow: "var(--shadow-md)" }}>
        {status === "verifying" && (
          <>
            <p style={{ fontSize: 40, marginBottom: 12 }}>⏳</p>
            <p style={{ color: "var(--muted)" }}>Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <p style={{ fontSize: 40, marginBottom: 12 }}>✅</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--maroon)", marginBottom: 8 }}>Email Verified</p>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>{message}</p>
            <Link to="/login" className="btn">Go to Login</Link>
          </>
        )}
        {status === "error" && (
          <>
            <p style={{ fontSize: 40, marginBottom: 12 }}>⚠️</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--maroon)", marginBottom: 8 }}>Verification Failed</p>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>{message}</p>
            <Link to="/login" className="btn">Go to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
