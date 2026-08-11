import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, RotateCcw, Gem } from "lucide-react";
import { requestRefund } from "../api/refunds";
import { searchProducts } from "../api/products";
import { useLanguage } from "../context/LanguageContext";

const REASONS = ["damaged", "wrong_item", "not_as_described", "changed_mind", "size_issue", "other"];
const REQUEST_TYPES = ["refund", "replacement", "exchange"];

export default function RefundRequestModal({ order, item, onClose, onSubmitted }) {
  const { t } = useTranslation("orders");
  const { language } = useLanguage();
  const [requestType, setRequestType] = useState("refund");
  const [reason, setReason] = useState("damaged");
  const [quantity, setQuantity] = useState(item.quantity);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [exchangeQuery, setExchangeQuery] = useState("");
  const [exchangeResults, setExchangeResults] = useState([]);
  const [exchangeSearching, setExchangeSearching] = useState(false);
  const [selectedExchangeProduct, setSelectedExchangeProduct] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (requestType === "exchange" && !selectedExchangeProduct) {
      setError(t("exchangeProductRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestRefund({
        orderId: order._id,
        productId: item.product?._id || item.product,
        quantity: Number(quantity),
        requestType,
        reason,
        details,
        exchangeProductId: requestType === "exchange" ? selectedExchangeProduct._id : undefined,
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
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
            {t("requestTypeLabel")}
          </label>
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

          {requestType === "exchange" && (
            <div style={{ marginBottom: 16, position: "relative" }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
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
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <input
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