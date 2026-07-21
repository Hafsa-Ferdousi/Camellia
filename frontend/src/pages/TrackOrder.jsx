import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Phone } from "lucide-react";
import { guestLookupOrder } from "../api/cart";
import { useLanguage } from "../context/LanguageContext";
import { localized } from "../utils/localized";

export default function TrackOrder() {
  const { t } = useTranslation("orders");
  const { language } = useLanguage();
  const STATUS_STYLE = {
    pending:    { bg: "#FEF3C7", color: "#92400E", label: t("statusPending") },
    confirmed:  { bg: "#DBEAFE", color: "#1E40AF", label: t("statusConfirmed") },
    processing: { bg: "#E0E7FF", color: "#3730A3", label: t("statusProcessing") },
    shipped:    { bg: "#CFFAFE", color: "#155E75", label: t("statusShipped") },
    delivered:  { bg: "#D1FAE5", color: "#065F46", label: t("statusDelivered") },
    cancelled:  { bg: "#FEE2E2", color: "#991B1B", label: t("statusCancelled") },
  };
  const [params] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get("orderId") || "");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOrder(null);
    setLoading(true);
    try {
      const { data } = await guestLookupOrder(orderId.trim(), email.trim());
      setOrder(data);
    } catch (err) {
      setError(err.response?.data?.message || t("noOrderForIdEmail"));
    } finally {
      setLoading(false);
    }
  };

  const status = order ? (STATUS_STYLE[order.status] || STATUS_STYLE.pending) : null;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--maroon)", marginBottom: 4 }}>{t("trackYourOrder")}</p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            {t("trackSub")}
          </p>
        </div>
        <div className="divider-gold" style={{ justifyContent: "center", marginBottom: 28 }}>✦</div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="form-label">
            {t("orderId")}
            <input
              className="input"
              type="text"
              required
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder={t("orderIdHint")}
            />
          </label>
          <label className="form-label">
            {t("emailAddress")}
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8, padding: 13, fontSize: 13 }}>
            {loading ? t("searching") : t("findMyOrder")}
          </button>
        </form>

        {order && (
          <div style={{ marginTop: 28, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
                  {t("orderHash")}{order._id.slice(-8).toUpperCase()}
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
              {order.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{item.nameSnapshot || localized(item.product?.name, language)} × {item.quantity}</span>
                  <span style={{ fontWeight: 600, color: "var(--gold-text)" }}>৳ {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--parchment)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: 13, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--muted)" }}>
                <span>{t("subtotal")}</span><span>৳ {order.subtotal?.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "var(--muted)" }}>
                <span>{t("delivery")}</span><span>৳ {order.deliveryCharge?.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <span>{t("total")}</span>
                <span style={{ color: "var(--gold-text)", fontFamily: "var(--font-display)" }}>৳ {order.totalAmount?.toLocaleString()}</span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--charcoal)", lineHeight: 1.6 }}>
              <strong>{t("deliveryAddress")}:</strong><br />
              {order.address?.addressLine}, {order.address?.city}
              {order.address?.phone && <> · <Phone size={12} style={{ verticalAlign: "-1px" }} /> {order.address.phone}</>}
            </p>
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
  page: { minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px", background: "var(--cream)" },
  card: { width: "100%", maxWidth: 460, background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px 36px", boxShadow: "var(--shadow-md)" },
  errorBox: { background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" },
};
