// frontend/src/pages/TrackOrder.jsx
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const STATUS_STYLE = {
  pending:    { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  confirmed:  { bg: "#DBEAFE", color: "#1E40AF", label: "Confirmed" },
  processing: { bg: "#E0E7FF", color: "#3730A3", label: "Processing" },
  shipped:    { bg: "#CFFAFE", color: "#155E75", label: "Shipped" },
  delivered:  { bg: "#D1FAE5", color: "#065F46", label: "Delivered" },
  cancelled:  { bg: "#FEE2E2", color: "#991B1B", label: "Cancelled" },
};

export default function TrackOrder() {
  const [params] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get("orderId") || "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOrders(null);
    setLoading(true);

    // Validate
    if (!email.trim()) {
      setError("Email address is required.");
      setLoading(false);
      return;
    }
    if (!orderId.trim() && !phone.trim()) {
      setError("Please provide either Order ID or Phone Number.");
      setLoading(false);
      return;
    }

    // Build payload
    const payload = { email: email.trim() };
    if (orderId.trim()) payload.orderId = orderId.trim();
    if (phone.trim()) payload.phone = phone.trim();

    try {
      // ✅ Use fetch directly (bypasses Axios, sends phone number correctly)
      const response = await fetch('/api/orders/guest-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Order not found.');
      }

      const data = await response.json();
      
      if (data.orders && data.orders.length > 0) {
        setOrders(data.orders);
      } else {
        setError("No orders found for the provided information.");
      }
    } catch (err) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 28, fontStyle: "italic", color: "#8B1A1A", marginBottom: 4 }}>
            Track Your Order
          </p>
          <p style={{ fontSize: 13, color: "#888" }}>
            Enter your email and <strong>either</strong> your Order ID <strong>or</strong> the phone number used at checkout.
          </p>
        </div>
        <div style={{ textAlign: "center", marginBottom: 28, color: "#C9A84C" }}>✦</div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 12, fontSize: 14, fontWeight: 500 }}>
            Email Address <span style={{ color: "#C62828" }}>*</span>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
            />
          </label>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                Order ID
                <input
                  type="text"
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  placeholder="e.g., 65f3a8b2..."
                  style={styles.input}
                />
              </label>
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                Phone Number
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  style={styles.input}
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 13,
              fontSize: 14,
              background: "#C9A84C",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "Searching…" : "🔍 Find My Order"}
          </button>
        </form>

        {orders && orders.length > 0 && (
          <div style={{ marginTop: 28, borderTop: "1px solid #ddd", paddingTop: 24 }}>
            {orders.map((order) => {
              const status = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
              const items = order.items || [];

              return (
                <div key={order._id} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <p style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 600 }}>
                        Order #{order._id.slice(-8).toUpperCase()}
                      </p>
                      <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <span style={{
                      background: status.bg,
                      color: status.color,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 12px",
                      borderRadius: 20,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}>
                      {status.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {items.length > 0 ? (
                      items.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span>{item.nameSnapshot || item.product?.name?.en || "Product"} × {item.quantity}</span>
                          <span style={{ fontWeight: 600, color: "#C9A84C" }}>৳ {(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: 13, color: "#999" }}>No items listed.</p>
                    )}
                  </div>

                  <div style={{ background: "#FAF8F5", borderRadius: 6, padding: "12px 16px", fontSize: 13, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "#888" }}>
                      <span>Subtotal</span><span>৳ {order.subtotal?.toLocaleString() || "0"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#888" }}>
                      <span>Delivery</span><span>৳ {order.deliveryCharge?.toLocaleString() || "0"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: "1px solid #ddd", paddingTop: 10 }}>
                      <span>Total</span>
                      <span style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>৳ {order.totalAmount?.toLocaleString() || "0"}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: "#333", lineHeight: 1.6 }}>
                    <strong>Delivery Address:</strong><br />
                    {order.address?.addressLine || "N/A"}, {order.address?.city || "N/A"}
                    {order.address?.phone && <> · 📞 {order.address.phone}</>}
                  </p>

                  <div style={{ marginTop: 12 }}>
                    <Link to={`/order-confirmation`} state={{ order }} style={{ color: "#C9A84C", fontWeight: 600, fontSize: 14 }}>
                      View Full Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 13, color: "#888", marginTop: 20 }}>
          Have an account? <Link to="/login" style={{ color: "#8B1A1A", fontWeight: 600 }}>Log in</Link> to see all your orders in one place.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "70vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 16px",
    background: "#F8F5F0",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    background: "#FFFFFF",
    border: "1px solid #E8E0D8",
    borderRadius: 12,
    padding: "40px 36px",
    boxShadow: "0 4px 30px rgba(0,0,0,0.08)",
  },
  errorBox: {
    background: "#FEF2F2",
    color: "#C62828",
    padding: "10px 14px",
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 13,
    border: "1px solid #FECACA",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 14,
    marginTop: 4,
    background: "#FAFAFA",
    boxSizing: "border-box",
  },
};