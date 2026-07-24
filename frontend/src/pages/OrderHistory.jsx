import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

// Progress steps for order tracking
const STATUS_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

export default function OrderHistory() {
  const { loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (authLoading) return;
    getOrders()
      .then(r => setOrders(r.data))
      .catch(() => setError("Could not load your orders. Please try again."))
      .finally(() => setLoading(false));
  }, [authLoading]);

  const filteredOrders = filterStatus === "all"
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (authLoading || loading) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        Loading your orders…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 64px" }}>
      <span className="eyebrow">Your Account</span>
      <h1 style={{
        fontFamily: "var(--font-display)",
        fontSize: 32,
        fontStyle: "italic",
        marginTop: 4,
        marginBottom: 8,
      }}>
        Order History
      </h1>
      <div className="divider-gold">✦</div>

      {error && (
        <div style={{
          background: "#FEF2F2", border: "1px solid #FECACA",
          borderRadius: "var(--radius-sm)", padding: "12px 16px",
          marginBottom: 20, fontSize: 13, color: "var(--red)",
        }}>
          {error}
        </div>
      )}

      {orders.length > 0 && (
        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap",
          marginBottom: 24, padding: "16px 20px",
          background: "var(--parchment)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
        }}>
          <div style={{ flex: 1, minWidth: 100, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--charcoal)" }}>
              {orders.length}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Orders
            </div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div style={{ flex: 1, minWidth: 100, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-display)", color: "#065F46" }}>
              {orders.filter(o => o.status === "delivered").length}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Delivered
            </div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div style={{ flex: 1, minWidth: 100, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--gold-text)" }}>
              ৳ {orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Spent
            </div>
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1.5px solid",
                borderColor: filterStatus === status ? "var(--charcoal)" : "var(--border)",
                background: filterStatus === status ? "var(--charcoal)" : "transparent",
                color: filterStatus === status ? "#fff" : "var(--muted)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.2s",
              }}
            >
              {status === "all" ? `All (${orders.length})` : STATUS_STYLE[status]?.label}
            </button>
          ))}
        </div>
      )}

      {filteredOrders.length === 0 && !error ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.25 }}>📦</div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--charcoal)", marginBottom: 8 }}>
            {filterStatus === "all" ? "No orders yet" : `No ${filterStatus} orders`}
          </p>
          <p style={{ fontSize: 14, marginBottom: 28 }}>
            {filterStatus === "all"
              ? "When you place an order, it will show up here."
              : `You have no orders with status "${filterStatus}".`}
          </p>
          <Link to="/" className="btn">Start Shopping</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredOrders.map(order => {
            const status = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
            const isExpanded = expandedOrder === order._id;
            const stepIndex = STATUS_STEPS.indexOf(order.status);
            const isPaid = order.payment?.status === 'paid';

            return (
              <div key={order._id} className="panel" style={{ overflow: "hidden" }}>

                {/* Order Header */}
                <div
                  onClick={() => toggleExpand(order._id)}
                  style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", flexWrap: "wrap",
                    gap: 10, marginBottom: 14, cursor: "pointer",
                  }}
                >
                  <div>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
                      Order #{order._id.slice(-8).toUpperCase()}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                      {" · "}{order.items.length} {order.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      background: status.bg, color: status.color,
                      fontSize: 11, fontWeight: 600,
                      padding: "4px 12px", borderRadius: 20,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>
                      {status.label}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Product Thumbnails */}
                <div style={{ display: "flex", gap: 10, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
                  {order.items.slice(0, 5).map((item, i) => (
                    <div key={i} style={{
                      width: 48, height: 48, borderRadius: "var(--radius-sm)",
                      flexShrink: 0, background: "var(--parchment)", overflow: "hidden",
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

                {/* Order Tracking Progress Bar */}
                {order.status !== "cancelled" && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      {STATUS_STEPS.map((step, i) => (
                        <div key={step} style={{ textAlign: "center", flex: 1 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            background: i <= stepIndex ? "var(--charcoal)" : "var(--border)",
                            margin: "0 auto 4px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {i < stepIndex && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                            {i === stepIndex && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "block" }} />}
                          </div>
                          <div style={{ fontSize: 9, color: i <= stepIndex ? "var(--charcoal)" : "var(--muted)", textTransform: "capitalize" }}>
                            {step}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 2, background: "var(--border)", borderRadius: 1, marginTop: 4 }}>
                      <div style={{
                        height: "100%", borderRadius: 1,
                        background: "var(--charcoal)",
                        width: `${Math.max(0, (stepIndex / (STATUS_STEPS.length - 1)) * 100)}%`,
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: 16, marginTop: 4,
                  }}>

                    {/* Items List */}
                    <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 10 }}>
                      Items
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {order.items.map((item, i) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", fontSize: 13,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: "var(--radius-sm)",
                              background: "var(--parchment)", overflow: "hidden",
                              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {item.product?.images?.[0]
                                ? <img src={item.product.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <span style={{ fontSize: 14, opacity: 0.3 }}>💍</span>}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{item.nameSnapshot || item.product?.name?.en}</div>
                              <div style={{ color: "var(--muted)", fontSize: 11 }}>Qty: {item.quantity}</div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: "var(--gold-text)" }}>
                            ৳ {(item.price * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Address */}
                    {order.address && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 6 }}>
                          Delivery Address
                        </p>
                        <p style={{ fontSize: 13, color: "var(--charcoal)", lineHeight: 1.6 }}>
                          {order.address.addressLine}, {order.address.city}
                          {order.address.phone && ` · 📞 ${order.address.phone}`}
                        </p>
                      </div>
                    )}

                    {/* Price Breakdown */}
                    <div style={{
                      background: "var(--parchment)", borderRadius: "var(--radius-sm)",
                      padding: "12px 16px", fontSize: 13,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--muted)" }}>
                        <span>Subtotal</span>
                        <span>৳ {order.subtotal?.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "var(--muted)" }}>
                        <span>Delivery</span>
                        <span style={{ color: order.deliveryCharge === 0 ? "#065F46" : "inherit" }}>
                          {order.deliveryCharge === 0 ? "Free" : `৳ ${order.deliveryCharge}`}
                        </span>
                      </div>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        fontWeight: 700, fontSize: 15,
                        borderTop: "1px solid var(--border)", paddingTop: 10,
                      }}>
                        <span>Total</span>
                        <span style={{ color: "var(--gold-text)", fontFamily: "var(--font-display)" }}>
                          ৳ {order.totalAmount?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", borderTop: "1px solid var(--border)",
                  paddingTop: 12, marginTop: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: "var(--muted)", textTransform: "capitalize" }}>
                      {order.payment?.method === "cod" ? "Cash on Delivery" : order.payment?.method}
                    </span>

                    {/* ✅ NEW PAYMENT STATUS BADGE */}
                    <span style={{
                      padding: "2px 12px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: isPaid ? "#E8F5E9" : "#FFF3E0",
                      color: isPaid ? "#2E7D32" : "#E65100",
                      textTransform: "capitalize",
                    }}>
                      {isPaid ? "✅ Paid" : "⏳ Unpaid"}
                    </span>
                  </div>

                  <span style={{
                    fontFamily: "var(--font-display)", fontSize: 18,
                    fontWeight: 700, color: "var(--gold-text)",
                  }}>
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