import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, RotateCcw, Gem, Camera, Loader2 } from "lucide-react";
import { requestRefund, requestGuestRefund, uploadRefundImage } from "../api/refunds";
import { searchProducts } from "../api/products";
import { useLanguage } from "../context/LanguageContext";

const REASONS = ["damaged", "wrong_item", "not_as_described", "changed_mind", "size_issue", "other"];
const REQUEST_TYPES = ["refund", "replacement", "exchange"];
const MAX_PHOTOS = 5;

// `guestEmail` is only passed from Track Order (no logged-in user) — its
// presence switches submission to the /refunds/guest endpoint, verified by
// order + email instead of a JWT.
export default function RefundRequestModal({ order, item, guestEmail, onClose, onSubmitted }) {
  const { t } = useTranslation("orders");
  const { language } = useLanguage();
  const [requestType, setRequestType] = useState("refund");
  const [reason, setReason] = useState("damaged");
  const [quantity, setQuantity] = useState(item.quantity);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Proof photos — each entry uploads to Cloudinary as soon as it's picked
  // (rather than on submit) so the customer sees per-photo progress/errors
  // and the final submit only ever sends URLs, never raw files.
  const [photos, setPhotos] = useState([]); // [{ url, uploading, error }]
  const photoInputRef = useRef(null);

  const [exchangeQuery, setExchangeQuery] = useState("");
  const [exchangeResults, setExchangeResults] = useState([]);
  const [exchangeSearching, setExchangeSearching] = useState(false);
  const [selectedExchangeProduct, setSelectedExchangeProduct] = useState(null);

  const closeBtnRef = useRef(null);
  const titleId = "refund-modal-title";

  useEffect(() => {
    closeBtnRef.current?.focus();
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (requestType !== "exchange") return;
    const q = exchangeQuery.trim();
    if (q.length < 1) { setExchangeResults([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setExchangeSearching(true);
      try {
        const { data } = await searchProducts(q, controller.signal);
        setExchangeResults(data.products || []);
      } catch (err) {
        if (err.code !== "ERR_CANCELED") setExchangeResults([]);
      } finally {
        if (!controller.signal.aborted) setExchangeSearching(false);
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [exchangeQuery, requestType]);

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-picking the same file later
    const room = MAX_PHOTOS - photos.length;
    for (const file of files.slice(0, room)) {
      const localId = `${Date.now()}-${Math.random()}`;
      setPhotos((prev) => [...prev, { localId, url: null, previewUrl: URL.createObjectURL(file), uploading: true, error: false }]);
      try {
        const { data } = await uploadRefundImage(file);
        setPhotos((prev) => prev.map((p) => (p.localId === localId ? { ...p, url: data.url, uploading: false } : p)));
      } catch {
        setPhotos((prev) => prev.map((p) => (p.localId === localId ? { ...p, uploading: false, error: true } : p)));
      }
    }
  };

  const removePhoto = (localId) => {
    setPhotos((prev) => prev.filter((p) => p.localId !== localId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (requestType === "exchange" && !selectedExchangeProduct) {
      setError(t("exchangeProductRequired"));
      return;
    }

    const uploadedUrls = photos.filter((p) => p.url && !p.error).map((p) => p.url);
    if (uploadedUrls.length === 0) {
      setError(t("returnPhotosRequired"));
      return;
    }
    if (photos.some((p) => p.uploading)) {
      setError(t("uploadingPhoto"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orderId: order._id,
        productId: item.product?._id || item.product,
        quantity: Number(quantity),
        requestType,
        reason,
        details,
        exchangeProductId: requestType === "exchange" ? selectedExchangeProduct._id : undefined,
        images: uploadedUrls,
      };
      const res = guestEmail
        ? await requestGuestRefund({ ...payload, email: guestEmail })
        : await requestRefund(payload);
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
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
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
          ref={closeBtnRef}
          onClick={onClose}
          aria-label={t("close")}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
        >
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <RotateCcw size={18} style={{ color: "var(--maroon)" }} />
          <h2 id={titleId} style={{ fontFamily: "var(--font-display)", fontSize: 20, fontStyle: "italic", color: "var(--charcoal)" }}>
            {t("requestReturnTitle")}
          </h2>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>{item.nameSnapshot}</p>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 20 }}>{t("returnWindowNote")}</p>

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--red)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 6, padding: 0 }}>
            {t("requestTypeLabel")}
          </legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {REQUEST_TYPES.map((rt) => (
              <button
                key={rt}
                type="button"
                onClick={() => { setRequestType(rt); setSelectedExchangeProduct(null); setExchangeQuery(""); }}
                style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: "var(--radius-sm)",
                  border: "1.5px solid", cursor: "pointer",
                  borderColor: requestType === rt ? "var(--maroon)" : "var(--border)",
                  background: requestType === rt ? "var(--maroon)" : "transparent",
                  color: requestType === rt ? "#fff" : "var(--charcoal)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t(`type_${rt}_title`)}</div>
                <div style={{ fontSize: 11.5, opacity: requestType === rt ? 0.9 : 0.7, marginTop: 2 }}>
                  {t(`type_${rt}_desc`)}
                </div>
              </button>
            ))}
          </div>
          </fieldset>

          {requestType === "exchange" && (
            <div style={{ marginBottom: 16, position: "relative" }}>
              <label htmlFor="refund-exchange-search" style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
                {t("exchangeForLabel")}
              </label>

              {selectedExchangeProduct ? (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  border: "1.5px solid var(--maroon)", borderRadius: "var(--radius-sm)", padding: "8px 12px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {selectedExchangeProduct.images?.[0]
                      ? <img src={selectedExchangeProduct.images[0]} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />
                      : <Gem size={16} style={{ opacity: 0.4 }} />}
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {(language === "bn" ? selectedExchangeProduct.name?.bn : selectedExchangeProduct.name?.en) || selectedExchangeProduct.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedExchangeProduct(null)}
                    aria-label={t("removeSelection", { defaultValue: "Remove selected product" })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    id="refund-exchange-search"
                    className="input"
                    type="text"
                    value={exchangeQuery}
                    onChange={(e) => setExchangeQuery(e.target.value)}
                    placeholder={t("exchangeSearchPlaceholder")}
                    style={{ width: "100%" }}
                  />
                  {exchangeQuery.trim() && (
                    <div style={{
                      border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                      marginTop: 6, maxHeight: 180, overflowY: "auto", background: "var(--ivory)",
                    }}>
                      {exchangeSearching && (
                        <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)" }}>{t("submitting")}</div>
                      )}
                      {!exchangeSearching && exchangeResults.length === 0 && (
                        <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)" }}>{t("noMatches")}</div>
                      )}
                      {exchangeResults.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => { setSelectedExchangeProduct(p); setExchangeQuery(""); setExchangeResults([]); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-light)" }}
                        >
                          {p.images?.[0]
                            ? <img src={p.images[0]} alt="" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 4 }} />
                            : <Gem size={14} style={{ opacity: 0.4 }} />}
                          <span style={{ fontSize: 13 }}>{(language === "bn" ? p.name?.bn : p.name?.en) || p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <label htmlFor="refund-reason" style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
            {t("reasonLabel")}
          </label>
          <select id="refund-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%", marginBottom: 16 }}>
            {REASONS.map((r) => (
              <option key={r} value={r}>{t(`reason_${r}`)}</option>
            ))}
          </select>

          {item.quantity > 1 && (
            <>
              <label htmlFor="refund-quantity" style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
                {t("quantityLabel")}
              </label>
              <input
                id="refund-quantity"
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
            {t("returnPhotosLabel")}
          </label>
          <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10, lineHeight: 1.5 }}>
            {t("returnPhotosHint")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {photos.map((p) => (
              <div key={p.localId} style={{ position: "relative", width: 64, height: 64, borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
                <img src={p.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: p.uploading ? 0.5 : 1 }} />
                {p.uploading && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader2 size={16} className="spin" style={{ animation: "refund-spin 0.8s linear infinite", color: "var(--maroon)" }} />
                  </div>
                )}
                {p.error && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(220,38,38,0.65)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", textAlign: "center", padding: 2 }}>
                    {t("returnPhotoUploadError")}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(p.localId)}
                  aria-label={t("close")}
                  style={{
                    position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: 64, height: 64, borderRadius: "var(--radius-sm)",
                  border: "1.5px dashed var(--border)", background: "transparent",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 3, cursor: "pointer", color: "var(--muted)",
                }}
              >
                <Camera size={16} />
                <span style={{ fontSize: 9, fontWeight: 500 }}>{t("addPhoto")}</span>
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            style={{ display: "none" }}
          />
          <style>{"@keyframes refund-spin { to { transform: rotate(360deg); } }"}</style>

          <label htmlFor="refund-details" style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
            {t("detailsLabel")}
          </label>
          <textarea
            id="refund-details"
            className="input"
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t("detailsPlaceholder")}
            style={{ width: "100%", marginBottom: 20, resize: "vertical", fontFamily: "var(--font-body)" }}
          />

          <button
            type="submit"
            className="btn"
            disabled={submitting || photos.some((p) => p.uploading) || photos.filter((p) => p.url && !p.error).length === 0}
            style={{ width: "100%" }}
          >
            {submitting ? t("submitting") : t("submitRequest")}
          </button>
        </form>
      </div>
    </div>
  );
}