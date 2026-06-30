import { Link, useLocation } from "react-router-dom";

export default function OrderConfirmation() {
  const { state } = useLocation();
  const order = state?.order;

  // If someone lands here directly (refresh, bookmark) without an order
  // in router state, send them somewhere useful instead of a dead end.
  if (!order) {
    return (
      <div className="container" style={{ padding: "60px 0", textAlign: "center" }}>
        <span className="eyebrow">No Order Found</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, margin: "12px 0 16px" }}>
          We couldn't find that order
        </h2>
        <p style={{ color: "var(--muted)", marginBottom: 28 }}>
          Check your order history to view past orders.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link to="/orders" className="btn btn-gold">View My Orders</Link>
          <Link to="/" className="btn">Back to Home</Link>
        </div>
      </div>
    );
  }

  const placedDate = new Date(order.createdAt || Date.now()).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="container" style={{ padding: "48px 24px 64px", maxWidth: 640 }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "var(--cream-dark)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, margin: "0 auto 18px", border: "1px solid var(--gold)",
        }}>✓</div>
        <span className="eyebrow">Thank You</span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontStyle: "italic", margin: "8px 0 8px" }}>
          Your Order Has Been Placed
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Order <strong>#{order._id?.slice(-8).toUpperCase()}</strong> · Placed on {placedDate}
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Order Summary
        </p>
        {order.items?.map((item, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", fontSize: 14,
            padding: "10px 0", borderBottom: i < order.items.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <span style={{ color: "var(--charcoal)" }}>
              {item.nameSnapshot} <span style={{ color: "var(--muted)" }}>× {item.quantity}</span>
            </span>
            <span style={{ fontWeight: 600 }}>৳ {(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--muted)", marginBottom: 6 }}>
            <span>Subtotal</span><span>৳ {order.subtotal?.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--muted)", marginBottom: 10 }}>
            <span>Delivery</span><span>{order.deliveryCharge ? `৳ ${order.deliveryCharge}` : "Free"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18 }}>
            <span>Total</span>
            <span style={{ color: "var(--gold-text)" }}>৳ {order.totalAmount?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 14 }}>
          Delivery Details
        </p>
        <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 4 }}>{order.address?.addressLine}</p>
        <p style={{ fontSize: 14, color: "var(--charcoal)", marginBottom: 4 }}>{order.address?.city}</p>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>{order.address?.phone}</p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12, textTransform: "capitalize" }}>
          Payment: {order.payment?.method === "cod" ? "Cash on Delivery" : order.payment?.method}
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Link to="/orders" className="btn btn-gold">Track This Order</Link>
        <Link to="/" className="btn">Continue Shopping</Link>
      </div>
    </div>
  );
}