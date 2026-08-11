// frontend/src/pages/TrackOrder.jsx
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Phone } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { localized } from "../utils/localized";
import { formatPrice } from "../utils/formatPrice";
import { guestLookupOrder } from "../api/cart";

export default function TrackOrder() {
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
      setError(t("emailRequiredError"));
      setLoading(false);
      return;
    }
    if (!orderId.trim() && !phone.trim()) {
      setError(t("orderIdOrPhoneRequiredError"));
      setLoading(false);
      return;
    }

    // Build payload
    const payload = { email: email.trim() };
    if (orderId.trim()) payload.orderId = orderId.trim();
    if (phone.trim()) payload.phone = phone.trim();

    try {
      const { data } = await guestLookupOrder(payload);

      if (data.orders && data.orders.length > 0) {
        setOrders(data.orders);
      } else {
        setError(t("noOrderForIdEmail"));
      }
    } catch (err) {
      setError(err.response?.data?.message || t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>
            {t("trackYourOrder")}
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            {t("trackSub")}
          </p>
          <p style={{ fontSize: 12, color: "var(--gold-text)", marginTop: 4 }}>
            {t("trackHint")}
          </p>
        </div>
        <div style={{ textAlign: "center", marginBottom: 28, color: "var(--gold)" }}>✦</div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label className="form-label" style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                {t("orderId")}
              </label>
              <input
                className="input"
                type="text"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                placeholder={t("orderIdHint")}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 14,
                  marginTop: 0,
                  background: "var(--ivory)",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label className="form-label" style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                {t("phoneNumber")}
              </label>
              <input
                className="input"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 14,
                  marginTop: 0,
                  background: "var(--ivory)",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <label className="form-label" style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            {t("emailAddress")} <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t("emailPlaceholderExample")}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 14,
              marginTop: 0,
              background: "var(--ivory)",
              boxSizing: "border-box",
            }}
          />

          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 16,
              padding: 13,
              fontSize: 13,
              background: "var(--maroon)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? t("searching") : t("findMyOrder")}
          </button>
        </form>

        {orders && orders.length > 0 && (
          <div style={{ marginTop: 28, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
            {orders.map((order) => {
              const status = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
              const items = order.items || [];
              // ✅ Use guestOrderId if available, otherwise fallback to shortened _id
              const displayOrderId = order.guestOrderId || order._id.slice(-8).toUpperCase();

              return (
                <div key={order._id} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid var(--border-light)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
                        {t("orderHash")}{displayOrderId}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <span style={{
                      background: status.bg, color: status.color,
                      fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>
                      {status.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span>{item.nameSnapshot || localized(item.product?.name, language)} × {item.quantity}</span>
                        <span style={{ fontWeight: 600, color: "var(--gold-text)" }}>৳ {formatPrice(item.price * item.quantity, language)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "var(--parchment)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: 13, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--muted)" }}>
                      <span>{t("subtotal")}</span><span>৳ {formatPrice(order.subtotal, language)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "var(--muted)" }}>
                      <span>{t("delivery")}</span><span>৳ {formatPrice(order.deliveryCharge, language)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      <span>{t("total")}</span>
                      <span style={{ color: "var(--gold-text)", fontFamily: "var(--font-display)" }}>৳ {formatPrice(order.totalAmount, language)}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: "var(--charcoal)", lineHeight: 1.6 }}>
                    <strong>{t("deliveryAddress")}:</strong><br />
                    {order.address?.addressLine}, {order.address?.city}
                    {order.address?.phone && <> · <Phone size={12} style={{ verticalAlign: "-1px" }} /> {order.address.phone}</>}
                  </p>

                  <div style={{ marginTop: 12 }}>
                    <Link 
                      to={`/order-confirmation/${order._id}?email=${encodeURIComponent(email.trim())}`}
                      state={{ order }} 
                      style={{ color: "var(--gold-text)", fontWeight: 600, fontSize: 14 }}
                    >
                      {t("viewFullDetails")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 20 }}>
          {t("haveAccount")} <Link to="/login" style={{ color: "var(--maroon)", fontWeight: 600 }}>{t("logIn")}</Link> {t("seeAllOrders")}
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
    background: "var(--cream-dark)",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    background: "var(--ivory)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "40px 36px",
    boxShadow: "0 4px 30px rgba(0,0,0,0.08)",
  },
  errorBox: {
    background: "#FEF2F2",
    color: "var(--red)",
    padding: "10px 14px",
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 13,
    border: "1px solid #FECACA",
  },
};