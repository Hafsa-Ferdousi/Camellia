// frontend/src/components/BkashPaymentPanel.jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, XCircle, Loader2, Upload, Phone, Hash } from "lucide-react";
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

  const cardStyle = {
    background: "var(--ivory)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "26px 28px",
    marginTop: 16,
    boxShadow: "var(--shadow-sm)",
  };
  const titleStyle = {
    fontFamily: "var(--font-display)",
    fontStyle: "italic",
    fontWeight: 700,
    fontSize: 26,
    margin: "0 0 14px",
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "var(--maroon)",
  };
  const labelStyle = {
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--muted)",
    letterSpacing: "0.03em",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  // ── Verified ──────────────────────────────────────────────────
  if (status === "verified") {
    return (
      <div style={{ ...cardStyle, background: "#F3FAF3", borderColor: "#CDE9CE" }}>
        <p style={{ ...titleStyle, color: "var(--green)" }}>
          <CheckCircle2 size={19} /> {t("bkashVerifiedTitle")}
        </p>
        <p style={{ fontSize: 13.5, color: "#2E5A30", margin: 0 }}>{t("bkashVerifiedDesc")}</p>
      </div>
    );
  }

  // ── Pending verification (already submitted, waiting on admin) ─
  if (status === "pending_verification" && !justSubmitted) {
    return (
      <div style={{ ...cardStyle, background: "var(--gold-pale)", borderColor: "var(--gold)" }}>
        <p style={{ ...titleStyle, color: "var(--gold-text)" }}>
          <Clock size={19} /> {t("bkashPendingTitle")}
        </p>
        <p style={{ fontSize: 13.5, color: "var(--gold-text)", margin: "0 0 8px", maxWidth: 440, lineHeight: 1.55 }}>{t("bkashPendingDesc")}</p>
        <p style={{ fontSize: 12.5, color: "var(--gold-text)", opacity: 0.85, margin: 0 }}>
          {t("bkashSubmittedDetails", { number: bkash.senderNumber, trxId: bkash.trxId })}
        </p>
      </div>
    );
  }

  if (justSubmitted) {
    return (
      <div style={{ ...cardStyle, background: "var(--gold-pale)", borderColor: "var(--gold)" }}>
        <p style={{ ...titleStyle, color: "var(--gold-text)" }}>
          <Clock size={19} /> {t("bkashSubmitted")}
        </p>
        <p style={{ fontSize: 13.5, color: "var(--gold-text)", margin: 0, maxWidth: 440, lineHeight: 1.55 }}>{t("bkashPendingDesc")}</p>
      </div>
    );
  }

  // ── awaiting_submission / rejected → show the form ──────────────
  return (
    <div style={cardStyle}>
      <p style={titleStyle}>{status === "rejected" ? t("bkashRejectedTitle") : t("bkashAwaitingTitle")}</p>

      {status === "rejected" && (
        <div style={{ background: "#FBEEEE", border: "1px solid #E8C4C4", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--red)", fontWeight: 600, marginBottom: 3 }}>
            <XCircle size={14} /> {t("bkashRejectedReasonLabel")}
          </div>
          <p style={{ margin: 0, color: "var(--red)" }}>{bkash.rejectionReason}</p>
          <p style={{ margin: "4px 0 0", color: "var(--red)" }}>{t("bkashResubmitPrompt")}</p>
        </div>
      )}

      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 18, lineHeight: 1.6 }}>{t("bkashAwaitingDesc")}</p>

      {merchant.number && (
        <div
          style={{
            background: "linear-gradient(135deg, var(--gold-pale), var(--parchment))",
            borderLeft: "3px solid var(--gold)",
            borderRadius: "var(--radius-sm)",
            padding: "16px 20px",
            marginBottom: 22,
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 6 }}>{t("bkashSendMoneyTo")}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 24, fontWeight: 700, color: "var(--charcoal)", letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" }}>
              {merchant.number}
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--gold-text)",
                background: "rgba(232,163,23,0.14)",
                padding: "3px 10px",
                borderRadius: 20,
              }}
            >
              {merchant.type === "merchant" ? t("bkashTypeMerchant") : t("bkashTypePersonal")}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "#FBEEEE", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={labelStyle}>
          <Phone size={13} /> {t("bkashSenderNumberLabel")}
          <input
            type="tel"
            required
            value={senderNumber}
            onChange={(e) => setSenderNumber(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="input"
            style={{ display: "block", width: "100%", marginTop: 6, fontWeight: 500, gridColumn: "1 / -1" }}
          />
        </label>

        <label style={labelStyle}>
          <Hash size={13} /> {t("bkashTrxIdLabel")}
          <input
            type="text"
            required
            value={trxId}
            onChange={(e) => setTrxId(e.target.value.toUpperCase())}
            placeholder={t("bkashTrxIdPlaceholder")}
            className="input"
            style={{ display: "block", width: "100%", marginTop: 6, fontWeight: 500, textTransform: "uppercase", gridColumn: "1 / -1" }}
          />
          <span style={{ display: "block", fontWeight: 400, fontSize: 11.5, marginTop: 5, color: "var(--faint)", letterSpacing: 0 }}>{t("bkashTrxIdHint")}</span>
        </label>

        <label style={labelStyle}>
          <Upload size={13} /> {t("bkashScreenshotLabel")}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, gridColumn: "1 / -1" }}>
            <label
              style={{
                width: 46,
                height: 46,
                borderRadius: "var(--radius-sm)",
                border: "1.5px dashed var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--gold-text)",
                background: "var(--gold-pale)",
                transition: "border-color 0.15s",
              }}
            >
              {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
              <input type="file" accept="image/*" hidden onChange={handleFile} disabled={uploading} />
            </label>
            {screenshot && <img src={screenshot} alt={t("bkashScreenshotPreview", { defaultValue: "Uploaded payment screenshot preview" })} style={{ width: 46, height: 46, objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />}
          </div>
        </label>

        <button type="submit" className="btn" style={{ marginTop: 6, width: "100%" }} disabled={submitting || uploading}>
          {submitting ? t("bkashSubmitting") : t("bkashSubmitBtn")}
        </button>
      </form>
    </div>
  );
}
