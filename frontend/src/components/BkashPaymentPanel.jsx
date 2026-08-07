// frontend/src/components/BkashPaymentPanel.jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, XCircle, Loader2, Upload } from "lucide-react";
import { submitBkashPayment, uploadBkashScreenshot } from "../api/payments";
import { getPricing } from "../api/settings";

// order: the order object — needs at least { _id, payment: { method, status, bkash } }.
// guestEmail: required when the order has no logged-in user attached.
// onUpdated(payment): called with the fresh payment object after a successful submit.
export default function BkashPaymentPanel({ order, guestEmail, onUpdated }) {
  const { t } = useTranslation("orders");
  const bkash = order.payment?.bkash || {};
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [merchant, setMerchant] = useState({ number: null, type: "personal" });

  useEffect(() => {
    getPricing()
      .then(({ data }) => setMerchant({ number: data.bkashMerchantNumber, type: data.bkashNumberType }))
      .catch(() => {});
  }, []);

  if (order.payment?.method !== "bkash") return null;

  const status = bkash.verificationStatus;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { data } = await uploadBkashScreenshot(file);
      setScreenshot(data.url);
    } catch (err) {
      setError(err.response?.data?.message || t("bkashGenericError"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { data } = await submitBkashPayment(order._id, {
        senderNumber: senderNumber.trim(),
        trxId: trxId.trim(),
        screenshot,
        guestEmail,
      });
      setJustSubmitted(true);
      onUpdated?.(data.payment);
    } catch (err) {
      setError(err.response?.data?.message || t("bkashGenericError"));
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle = { border: "1px solid var(--border)", borderRadius: 10, padding: "18px 20px", marginTop: 16 };
  const titleStyle = { fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 17, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 };

  // ── Verified ──────────────────────────────────────────────────
  if (status === "verified") {
    return (
      <div style={{ ...cardStyle, background: "#F0FDF4", borderColor: "#BBF7D0" }}>
        <p style={{ ...titleStyle, color: "#166534" }}>
          <CheckCircle2 size={18} /> {t("bkashVerifiedTitle")}
        </p>
        <p style={{ fontSize: 13.5, color: "#166534", margin: 0 }}>{t("bkashVerifiedDesc")}</p>
      </div>
    );
  }

  // ── Pending verification (already submitted, waiting on admin) ─
  if (status === "pending_verification" && !justSubmitted) {
    return (
      <div style={{ ...cardStyle, background: "#FFFBEB", borderColor: "#FDE68A" }}>
        <p style={{ ...titleStyle, color: "#92400E" }}>
          <Clock size={18} /> {t("bkashPendingTitle")}
        </p>
        <p style={{ fontSize: 13.5, color: "#92400E", margin: "0 0 6px" }}>{t("bkashPendingDesc")}</p>
        <p style={{ fontSize: 12.5, color: "#92400E", opacity: 0.85, margin: 0 }}>
          {t("bkashSubmittedDetails", { number: bkash.senderNumber, trxId: bkash.trxId })}
        </p>
      </div>
    );
  }

  if (justSubmitted) {
    return (
      <div style={{ ...cardStyle, background: "#FFFBEB", borderColor: "#FDE68A" }}>
        <p style={{ ...titleStyle, color: "#92400E" }}>
          <Clock size={18} /> {t("bkashSubmitted")}
        </p>
        <p style={{ fontSize: 13.5, color: "#92400E", margin: 0 }}>{t("bkashPendingDesc")}</p>
      </div>
    );
  }

  // ── awaiting_submission / rejected → show the form ──────────────
  return (
    <div style={cardStyle}>
      <p style={titleStyle}>{status === "rejected" ? t("bkashRejectedTitle") : t("bkashAwaitingTitle")}</p>

      {status === "rejected" && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#991B1B", fontWeight: 600, marginBottom: 2 }}>
            <XCircle size={14} /> {t("bkashRejectedReasonLabel")}
          </div>
          <p style={{ margin: 0, color: "#991B1B" }}>{bkash.rejectionReason}</p>
          <p style={{ margin: "4px 0 0", color: "#991B1B" }}>{t("bkashResubmitPrompt")}</p>
        </div>
      )}

      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>{t("bkashAwaitingDesc")}</p>

      {merchant.number && (
        <div style={{ display: "flex", gap: 14, alignItems: "center", background: "var(--cream-dark, #FAF6F0)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("bkashSendMoneyTo")}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--charcoal)" }}>{merchant.number}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{merchant.type === "merchant" ? t("bkashTypeMerchant") : t("bkashTypePersonal")}</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "#FEE2E2", color: "#B91C1C", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>
          {t("bkashSenderNumberLabel")}
          <input
            type="tel"
            required
            value={senderNumber}
            onChange={(e) => setSenderNumber(e.target.value)}
            placeholder="01XXXXXXXXX"
            style={{ display: "block", width: "100%", marginTop: 4, padding: "9px 12px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13.5 }}
          />
        </label>

        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>
          {t("bkashTrxIdLabel")}
          <input
            type="text"
            required
            value={trxId}
            onChange={(e) => setTrxId(e.target.value.toUpperCase())}
            placeholder={t("bkashTrxIdPlaceholder")}
            style={{ display: "block", width: "100%", marginTop: 4, padding: "9px 12px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13.5, textTransform: "uppercase" }}
          />
          <span style={{ display: "block", fontWeight: 400, fontSize: 11.5, marginTop: 3, color: "var(--muted)" }}>{t("bkashTrxIdHint")}</span>
        </label>

        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>
          {t("bkashScreenshotLabel")}
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ width: 44, height: 44, borderRadius: 6, border: "1.5px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)" }}>
              {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
              <input type="file" accept="image/*" hidden onChange={handleFile} disabled={uploading} />
            </label>
            {screenshot && <img src={screenshot} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />}
          </div>
        </label>

        <button type="submit" className="btn" disabled={submitting || uploading}>
          {submitting ? t("bkashSubmitting") : t("bkashSubmitBtn")}
        </button>
      </form>
    </div>
  );
}
