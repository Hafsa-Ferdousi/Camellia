import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOrders } from "../api/cart";

const STATUS_STYLE = {
  pending:    { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  confirmed:  { bg: "#DBEAFE", color: "#1E40AF", label: "Confirmed" },
  processing: { bg: "#E0E7FF", color: "#3730A3", label: "Processing" },
  shipped:    { bg: "#CFFAFE", color: "#155E75", label: "Shipped" },
  delivered:  { bg: "#D1FAE5", color: "#065F46", label: "Delivered" },
  cancelled:  { bg: "#FEE2E2", color: "#991B1B", label: "Cancelled" },
};

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login", { state: { from: "/orders" } }); return; }

    getOrders()
      .then(r => setOrders(r.data))
      .catch(() => setError("Could not load your orders."))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="container" style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
        Loading your orders…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px 64px" }}>
      <span className="eyebrow">Your Account</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", marginTop: 4 }}>
        Order History
      </h1>
      <div className="divider-gold">✦</div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "var(--red)" }}>
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.25 }}>📦</div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--charcoal)", marginBottom: 8 }}>
            No orders yet
          </p>
          <p style={{ fontSize: 14, marginBottom: 28 }}>When you place an order, it will show up here.</p>
          <Link to="/" className="btn">Start Shopping</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orders.map(order => {
            const status = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
            return (
              <div key={order._id} className="panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  <div>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
                      Order #{order._id.slice(-8).toUpperCase()}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      {" · "}{order.items.length} {order.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <span style={{
                    background: status.bg, color: status.color, fontSize: 11, fontWeight: 600,
                    padding: "4px 12px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}>
                    {status.label}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
                  {order.items.slice(0, 5).map((item, i) => (
                    <div key={i} style={{
                      width: 48, height: 48, borderRadius: "var(--radius-sm)", flexShrink: 0,
                      background: "var(--parchment)", overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {item.product?.images?.[0]
                        ? <img src={item.product.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 18, opacity: 0.3 }}>💍</span>}
                    </div>
                  ))}
                  {order.items.length > 5 && (
                    <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center" }}>
                      +{order.items.length - 5} more
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", textTransform: "capitalize" }}>
                    {order.payment?.method === "cod" ? "Cash on Delivery" : order.payment?.method}
                    {" · "}{order.payment?.status}
                  </span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--gold-text)" }}>
                    ৳ {order.totalAmount?.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}