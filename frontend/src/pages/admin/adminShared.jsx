// Shared styles, formatters, and small presentational pieces used across the
// admin tabs. Pulled out of the (formerly monolithic) Admin.jsx so each tab
// can be split into its own file without duplicating this boilerplate.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const STATUS_COLORS = {
  pending:    { bg: "#FEF9C3", color: "#854D0E" },
  confirmed:  { bg: "#DBEAFE", color: "#1E40AF" },
  processing: { bg: "#EDE9FE", color: "#5B21B6" },
  shipped:    { bg: "#CFFAFE", color: "#0E7490" },
  delivered:  { bg: "#DCFCE7", color: "#166534" },
  cancelled:  { bg: "#FEE2E2", color: "#991B1B" },
};
export const ORDER_STATUSES = ["pending","confirmed","processing","shipped","delivered","cancelled"];

export const statusLabelKey = (status) => `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;

export const StatusBadge = ({ status }) => {
  const { t } = useTranslation("orders");
  const c = STATUS_COLORS[status] || { bg: "#F3F4F6", color: "#374151" };
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      textTransform: "capitalize", whiteSpace: "nowrap",
    }}>
      {t(statusLabelKey(status))}
    </span>
  );
};

export const BKASH_STATUS_COLORS = {
  awaiting_submission:  { bg: "#F3F4F6", color: "#4B5563" },
  pending_verification: { bg: "#FEF9C3", color: "#854D0E" },
  verified:              { bg: "#DCFCE7", color: "#166534" },
  rejected:              { bg: "#FEE2E2", color: "#991B1B" },
};
export const BKASH_STATUS_LABEL_KEYS = {
  awaiting_submission: "bkashFilterAwaiting",
  pending_verification: "bkashFilterPending",
  verified: "bkashFilterVerified",
  rejected: "bkashFilterRejected",
};
export const BkashStatusBadge = ({ status }) => {
  const { t } = useTranslation("admin");
  const c = BKASH_STATUS_COLORS[status] || BKASH_STATUS_COLORS.awaiting_submission;
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    }}>
      {t(BKASH_STATUS_LABEL_KEYS[status] || "bkashFilterAwaiting")}
    </span>
  );
};

export const fmt = (n) => `৳${Number(n).toLocaleString("en-BD")}`;
export const fmtDate = (d) => new Date(d).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
export const fmtDayLabel = (isoDate) => new Date(isoDate).toLocaleDateString("en-BD", { weekday: "short" });

export const RevenueTrendChart = ({ data }) => {
  const max = Math.max(1, ...data.map(d => d.total));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, padding: "8px 4px 0" }}>
      {data.map(d => (
        <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div title={fmt(d.total)} style={{
            width: "100%", maxWidth: 32,
            height: `${Math.max(4, (d.total / max) * 100)}px`,
            background: "var(--gold, #C9A24B)", borderRadius: "4px 4px 0 0",
            transition: "height 0.2s",
          }} />
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{fmtDayLabel(d.date)}</span>
        </div>
      ))}
    </div>
  );
};

export const StatusBreakdownChart = ({ data }) => {
  const { t } = useTranslation("orders");
  const total = Math.max(1, Object.values(data).reduce((a, b) => a + b, 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 4px 0" }}>
      {Object.entries(data).map(([status, count]) => {
        const c = STATUS_COLORS[status] || { bg: "#F3F4F6", color: "#374151" };
        return (
          <div key={status}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span style={{ textTransform: "capitalize", color: "var(--muted)" }}>{t(statusLabelKey(status))}</span>
              <span style={{ fontWeight: 600 }}>{count}</span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: "var(--cream-dark)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(count / total) * 100}%`, background: c.color, borderRadius: 4 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const pagBtnStyle = { padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--ivory)", cursor: "pointer", fontSize: 12 };

export const Pagination = ({ page, totalPages, onChange }) => {
  const { t } = useTranslation("admin");
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{ ...pagBtnStyle, opacity: page === 1 ? 0.4 : 1, display: "inline-flex", alignItems: "center", gap: 4 }}
      ><ChevronLeft size={14} /> {t("prev")}</button>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("pageOf", { page, totalPages })}</span>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        style={{ ...pagBtnStyle, opacity: page === totalPages ? 0.4 : 1, display: "inline-flex", alignItems: "center", gap: 4 }}
      >{t("next")} <ChevronRight size={14} /></button>
    </div>
  );
};

export const CheckboxMultiSelect = ({ options, selected, onToggle, placeholder }) => {
  const { t } = useTranslation("admin");
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 6, background: "var(--ivory)", overflow: "hidden" }}>
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "7px 10px", border: "none", borderBottom: "1px solid var(--border)", fontSize: 12, boxSizing: "border-box", fontFamily: "var(--font-body)" }}
      />
      <div style={{ maxHeight: 150, overflowY: "auto", padding: 4 }}>
        {filtered.length === 0 && <p style={{ fontSize: 12, color: "var(--muted)", padding: "6px 8px" }}>{t("noMatches")}</p>}
        {filtered.map(o => (
          <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", fontSize: 13, cursor: "pointer", borderRadius: 4 }}>
            <input
              type="checkbox"
              checked={selected.includes(o.value)}
              onChange={() => onToggle(o.value)}
              style={{ width: 14, height: 14, accentColor: "var(--maroon)", flexShrink: 0 }}
            />
            {o.label}
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div style={{ padding: "5px 8px", fontSize: 11, color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
          {t("selectedCount", { count: selected.length })}
        </div>
      )}
    </div>
  );
};

export const BLANK_PRODUCT = {
  nameEn: "", nameBn: "",
  descEn: "", descBn: "",
  category: "", basePrice: "", totalStock: "",
  images: [], isFeatured: false, isBestSeller: false, isActive: true,
};

export const BLANK_CATEGORY = { nameEn: "", nameBn: "", slug: "", image: "", isFixed: false };
export const BLANK_COUPON = { code: "", title: "", description: "", discountType: "percentage", discountValue: "", minimumPurchase: "", maximumDiscount: "", usageLimit: "", perUserLimit: "", startDate: "", endDate: "", applicableProducts: [], applicableCategories: [], excludedProducts: [], isActive: true };

export const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
export const isCouponExpired = (c) => new Date(c.endDate) < new Date();
export const isCouponUpcoming = (c) => new Date(c.startDate) > new Date();
export const slugify = (str) => (str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const isCloudinaryUploadUrl = (url) => typeof url === "string" && url.includes("/camellia/products/");

export const NOTIFICATION_TAB = {
  new_order: "orders",
  low_stock: "products",
  new_customer: "customers",
  order_status: "orders",
  payment: "orders",
};

export const s = {
  center:       { display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--muted)" },
  pageTitle:    { fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "var(--charcoal)", marginBottom: 24 },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: 20, color: "var(--charcoal)", marginBottom: 16 },
  err:          { background: "#FEE2E2", color: "var(--red)", padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: 13 },
  statGrid:     { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  statCard:     { background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 22px", boxShadow: "var(--shadow-sm)" },
  statIcon:     { fontSize: 26, marginBottom: 8 },
  statValue:    { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--charcoal)", marginBottom: 2 },
  statLabel:    { fontSize: 12, color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase" },
  tableWrap:    { overflowX: "auto", background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:           { padding: "12px 16px", background: "var(--cream-dark)", color: "var(--muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" },
  td:           { padding: "12px 16px", borderBottom: "1px solid var(--border-light)", verticalAlign: "middle" },
  tr:           { transition: "background 0.12s" },
  mono:         { fontFamily: "monospace", fontWeight: 600, fontSize: 12, color: "var(--maroon)" },
  select:       { padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12, fontFamily: "var(--font-body)", background: "var(--cream)", color: "var(--ink)", cursor: "pointer" },
  editBtn:      { padding: "5px 12px", background: "var(--maroon)", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer", marginRight: 6, fontFamily: "var(--font-body)" },
  delBtn:       { padding: "5px 12px", background: "transparent", color: "var(--red)", border: "1px solid var(--red)", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)" },
  overlay:      { position: "fixed", inset: 0, background: "rgba(28,10,15,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox:     { background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: 12, padding: "32px 28px", maxWidth: 580, width: "100%", boxShadow: "var(--shadow-lg)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle:   { fontFamily: "var(--font-display)", fontSize: 22, fontStyle: "italic", marginBottom: 20, color: "var(--charcoal)" },
  modalSubTitle:{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 },
  chartCard:    { background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 22px", boxShadow: "var(--shadow-sm)" },
  formGrid:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" },
  label:        { display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--muted)", marginBottom: 14, fontWeight: 500 },
  formErr:      { background: "#FEE2E2", color: "var(--red)", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 },
};
