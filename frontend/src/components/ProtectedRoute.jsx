import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap any route that requires a logged-in user (and optionally an admin role).
// Usage:
//   <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
//   <Route path="/admin"  element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    // Send them to login, remembering where they were headed so we can bounce back.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return (
      <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontStyle: "italic", color: "var(--maroon)", marginBottom: 8 }}>
          Access Restricted
        </p>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          This area is only available to administrators.
        </p>
      </div>
    );
  }

  return children;
}
