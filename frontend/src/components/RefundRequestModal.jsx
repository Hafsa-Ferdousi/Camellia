import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, RotateCcw } from "lucide-react";
import { requestRefund } from "../api/refunds";

const REASONS = ["damaged", "wrong_item", "not_as_described", "changed_mind", "size_issue", "other"];

export default function RefundRequestModal({ order, item, onClose, onSubmitted }) {
  const { t } = useTranslation("orders");
  const [requestType, setRequestType] = useState("refund");
  const [reason, setReason] = useState("damaged");
  const [quantity, setQuantity] = useState(item.quantity);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await requestRefund({
        orderId: order._id,
        productId: item.product?._id || item.product,
        quantity: Number(quantity),
        requestType,
        reason,
        details,
      });
      onSubmitted(res.data);
    } catch (err) {
      setError(err.response?.data?.message || t("refundSubmitError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(28,10,15,0.55)",
        zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel"
        style={{ maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
        >
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <RotateCcw size={18} style={{ color: "var(--maroon)" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontStyle: "italic", color: "var(--charcoal)" }}>
            {t("requestReturnTitle")}
          </h2>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>{item.nameSnapshot}</p>

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--red)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["refund", "exchange"].map((rt) => (
              <button
                key={rt}
                type="button"
                onClick={() => setRequestType(rt)}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: "var(--radius-sm)",
                  border: "1.5px solid", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  borderColor: requestType === rt ? "var(--maroon)" : "var(--border)",
                  background: requestType === rt ? "var(--maroon)" : "transparent",
                  color: requestType === rt ? "#fff" : "var(--charcoal)",
                }}
              >
                {t(rt === "refund" ? "typeRefund" : "typeExchange")}
              </button>
            ))}
          </div>

          <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
            {t("reasonLabel")}
          </label>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%", marginBottom: 16 }}>
            {REASONS.map((r) => (
              <option key={r} value={r}>{t(`reason_${r}`)}</option>
            ))}
          </select>

          {item.quantity > 1 && (
            <>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
                {t("quantityLabel")}
              </label>
              <input
                className="input"
                type="number"
                min={1}
                max={item.quantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: "100%", marginBottom: 16 }}
              />
            </>
          )}

          <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
            {t("detailsLabel")}
          </label>
          <textarea
            className="input"
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t("detailsPlaceholder")}
            style={{ width: "100%", marginBottom: 20, resize: "vertical", fontFamily: "var(--font-body)" }}
          />

          <button type="submit" className="btn" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? t("submitting") : t("submitRequest")}
          </button>
        </form>
      </div>
    </div>
  );
}