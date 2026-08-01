import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

// Wrap any route that requires a logged-in user (and optionally an admin role),
// or that admins specifically shouldn't access (e.g. cart/checkout — admin
// accounts manage the store, they don't shop on it).
// Usage:
//   <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
//   <Route path="/admin"  element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
//   <Route path="/cart"   element={<ProtectedRoute blockAdmin><Cart /></ProtectedRoute>} />
export default function ProtectedRoute({ children, adminOnly = false, blockAdmin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation("common");

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 14 }}>
        {t("loading")}
      </div>
    );
  }

  if (blockAdmin && user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  // blockAdmin-only routes (e.g. cart/checkout) stay open to guests —
  // only admins get redirected away, everyone else (including logged-out
  // users) is allowed through.
  if (!user && !blockAdmin) {
    // Send them to login, remembering where they were headed so we can bounce back.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return (
      <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontStyle: "italic", color: "var(--maroon)", marginBottom: 8 }}>
          {t("accessRestricted")}
        </p>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          {t("adminOnlyArea")}
        </p>
      </div>
    );
  }

  return children;
}
