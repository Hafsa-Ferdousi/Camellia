// frontend/src/pages/OrderHistory.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package, Gem, Check, Phone, Clock, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { localized } from "../utils/localized";
import { formatPrice } from "../utils/formatPrice";
import { getOrders } from "../api/cart";

// Progress steps for order tracking
const STATUS_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

export default function OrderHistory() {
  const { t } = useTranslation("orders");
  const { language } = useLanguage();
  const STATUS_STYLE = {
    pending:    { bg: "#FEF3C7", color: "#92400E", label: t("statusPending") },
    confirmed:  { bg: "#FCEFC7", color: "#8B6914", label: t("statusConfirmed") },
    processing: { bg: "#F5DCC0", color: "#9A4A0F", label: t("statusProcessing") },
    shipped:    { bg: "#E8D9C0", color: "#6B4226", label: t("statusShipped") },
    delivered:  { bg: "#D1FAE5", color: "#065F46", label: t("statusDelivered") },
    cancelled:  { bg: "#FEE2E2", color: "#991B1B", label: t("statusCancelled") },
  };
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
      .catch(() => setError(t("loadOrdersError")))
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
        <Loader2 size={32} strokeWidth={1.5} className="spin" style={{ marginBottom: 12 }} />
        <div>{t("loadingOrders")}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 64px" }}>

      {/* Header */}
      <span className="eyebrow">{t("yourAccount")}</span>
      <h1 style={{
        fontFamily: "var(--font-display)",
        fontSize: 32,
        fontStyle: "italic",
        marginTop: 4,
        marginBottom: 8,
      }}>
        {t("orderHistory")}
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
              {t("totalOrders")}
            </div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div style={{ flex: 1, minWidth: 100, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-display)", color: "#065F46" }}>
              {orders.filter(o => o.status === "delivered").length}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("delivered")}
            </div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div style={{ flex: 1, minWidth: 100, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--gold-text)" }}>
              ৳ {formatPrice(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), language)}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("totalSpent")}
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
                borderColor: filterStatus === status ? "var(--maroon)" : "var(--border)",
                background: filterStatus === status ? "var(--maroon)" : "transparent",
                color: filterStatus === status ? "#fff" : "var(--muted)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.2s",
              }}
            >
              {status === "all" ? t("all", { count: orders.length }) : STATUS_STYLE[status]?.label}
            </button>
          ))}
        </div>
      )}

      {filteredOrders.length === 0 && !error ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ marginBottom: 16, opacity: 0.25, display: "flex", justifyContent: "center" }}><Package size={48} /></div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--charcoal)", marginBottom: 8 }}>
            {filterStatus === "all" ? t("noOrdersYet") : t("noStatusOrders", { status: filterStatus })}
          </p>
          <p style={{ fontSize: 14, marginBottom: 28 }}>
            {filterStatus === "all"
              ? t("noOrdersHint")
              : t("noStatusOrdersHint", { status: filterStatus })}
          </p>
          <Link to="/" className="btn">{t("startShopping")}</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredOrders.map(order => {
            const status = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
            const isExpanded = expandedOrder === order._id;
            const stepIndex = STATUS_STEPS.indexOf(order.status);
            const isPaid = order.payment?.status === 'paid';

            // ✅ Friendly order ID: use guestOrderId if exists, else fallback to shortened _id
            const displayOrderId = order.guestOrderId || order._id.slice(-8).toUpperCase();

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
                      {t("orderHash")}{displayOrderId}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                      {" · "}{order.items.length} {t(order.items.length === 1 ? "item_one" : "item_other")}
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
                        ? <img src={item.product.images[0]} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Gem size={18} style={{ opacity: 0.3 }} />}
                    </div>
                  ))}
                  {order.items.length > 5 && (
                    <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center" }}>
                      {t("moreCount", { count: order.items.length - 5 })}
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
                            background: i <= stepIndex ? "var(--maroon)" : "var(--border)",
                            margin: "0 auto 4px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {i < stepIndex && <Check size={12} color="#fff" strokeWidth={3} />}
                            {i === stepIndex && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "block" }} />}
                          </div>
                          <div style={{ fontSize: 9, color: i <= stepIndex ? "var(--charcoal)" : "var(--muted)", textTransform: "capitalize" }}>
                            {STATUS_STYLE[step].label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 2, background: "var(--border)", borderRadius: 1, marginTop: 4 }}>
                      <div style={{
                        height: "100%", borderRadius: 1,
                        background: "var(--maroon)",
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
                      {t("items")}
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
                                ? <img src={item.product.images[0]} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <Gem size={14} style={{ opacity: 0.3 }} />}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{item.nameSnapshot || localized(item.product?.name, language)}</div>
                              <div style={{ color: "var(--muted)", fontSize: 11 }}>{t("qtyLabel", { count: item.quantity })}</div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: "var(--gold-text)" }}>
                            ৳ {formatPrice(item.price * item.quantity, language)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Address */}
                    {order.address && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 6 }}>
                          {t("deliveryAddress")}
                        </p>
                        <p style={{ fontSize: 13, color: "var(--charcoal)", lineHeight: 1.6 }}>
                          {order.address.addressLine}, {order.address.city}
                          {order.address.phone && <> · <Phone size={12} style={{ verticalAlign: "-1px" }} /> {order.address.phone}</>}
                        </p>
                      </div>
                    )}

                    {/* Price Breakdown */}
                    <div style={{
                      background: "var(--parchment)", borderRadius: "var(--radius-sm)",
                      padding: "12px 16px", fontSize: 13,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--muted)" }}>
                        <span>{t("subtotal")}</span>
                        <span>৳ {formatPrice(order.subtotal, language)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "var(--muted)" }}>
                        <span>{t("delivery")}</span>
                        <span style={{ color: order.deliveryCharge === 0 ? "#065F46" : "inherit" }}>
                          {order.deliveryCharge === 0 ? t("free") : `৳ ${formatPrice(order.deliveryCharge, language)}`}
                        </span>
                      </div>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        fontWeight: 700, fontSize: 15,
                        borderTop: "1px solid var(--border)", paddingTop: 10,
                      }}>
                        <span>{t("total")}</span>
                        <span style={{ color: "var(--gold-text)", fontFamily: "var(--font-display)" }}>
                          ৳ {formatPrice(order.totalAmount, language)}
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
                  <span style={{ fontSize: 13, color: "var(--muted)", textTransform: "capitalize" }}>
                    {order.payment?.method === "cod" ? t("cashOnDelivery") : order.payment?.method}
                    {" · "}{order.payment?.status}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "2px 12px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: isPaid ? "#E8F5E9" : "#FFF3E0",
                      color: isPaid ? "#2E7D32" : "#E65100",
                      textTransform: "capitalize",
                    }}>
                      {isPaid ? <Check size={12} strokeWidth={3} /> : <Clock size={12} strokeWidth={2.5} />}
                      {isPaid ? t("paid") : t("unpaid")}
                    </span>
                  </div>

                  <span style={{
                    fontFamily: "var(--font-display)", fontSize: 18,
                    fontWeight: 700, color: "var(--gold-text)",
                  }}>
                    ৳ {formatPrice(order.totalAmount, language)}
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