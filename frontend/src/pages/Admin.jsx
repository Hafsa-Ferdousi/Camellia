import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Globe, DollarSign, Package, Users, Gem, AlertTriangle, Star, Tag,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Phone, Check,
  LayoutDashboard, Settings, LogOut, ArrowLeft, Download, Lock,
  Ticket, Mail, MessageCircle, Trash2, Bell, TrendingUp,
  RotateCcw, PackageCheck, Wallet, Menu, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { generateDescription } from "../api/admin";
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from "../api/notifications";
import { getAllRefunds, updateRefundStatus as updateRefundStatusApi } from "../api/refunds";
import { useLanguage } from "../context/LanguageContext";
import { localized } from "../utils/localized";
import { getCategoryIcon } from "../utils/categoryIcons";
import {
  getAdminStats,
  getCustomers,
  getCustomerDetail,
  resetCustomerPassword,
  getAllOrders,
  updateOrderStatus,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminSettings,
  updateAdminSettings,
  getLowStockProducts,
  exportSalesCSV,
  uploadImage,
  deleteUploadedImage,
  getAllConversations,
  getConversationById,
  deleteConversation as deleteConversationApi,
} from "../api/admin";
import {
  getAllCoupons,
  createCoupon as createCouponApi,
  updateCoupon as updateCouponApi,
  deleteCoupon as deleteCouponApi,
  setCouponStatus,
} from "../api/coupons";
import { getBkashSubmissions, verifyBkashPayment as verifyBkashPaymentApi } from "../api/payments";
import client from "../api/client";

const STATUS_COLORS = {
  pending:    { bg: "#FEF9C3", color: "#854D0E" },
  confirmed:  { bg: "#DBEAFE", color: "#1E40AF" },
  processing: { bg: "#EDE9FE", color: "#5B21B6" },
  shipped:    { bg: "#CFFAFE", color: "#0E7490" },
  delivered:  { bg: "#DCFCE7", color: "#166534" },
  cancelled:  { bg: "#FEE2E2", color: "#991B1B" },
};
const ORDER_STATUSES = ["pending","confirmed","processing","shipped","delivered","cancelled"];

const statusLabelKey = (status) => `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;

const StatusBadge = ({ status }) => {
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

const BKASH_STATUS_COLORS = {
  awaiting_submission:  { bg: "#F3F4F6", color: "#4B5563" },
  pending_verification: { bg: "#FEF9C3", color: "#854D0E" },
  verified:              { bg: "#DCFCE7", color: "#166534" },
  rejected:              { bg: "#FEE2E2", color: "#991B1B" },
};
const BKASH_STATUS_LABEL_KEYS = {
  awaiting_submission: "bkashFilterAwaiting",
  pending_verification: "bkashFilterPending",
  verified: "bkashFilterVerified",
  rejected: "bkashFilterRejected",
};
const BkashStatusBadge = ({ status }) => {
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

// Private note for staff eyes only. Keeps its own draft state (initialized
// once from the order's saved note) so typing isn't interrupted by the
// orders list re-rendering; only saved back to the order on blur/Save.
const AdminNoteInput = ({ order, saving, onSave }) => {
  const { t } = useTranslation("admin");
  const [draft, setDraft] = useState(order.payment?.adminNote || "");
  const [dirty, setDirty] = useState(false);

  return (
    <div style={{ marginTop: 8 }}>
      <textarea
        value={draft}
        onChange={e => { setDraft(e.target.value); setDirty(true); }}
        placeholder={t("adminNotePlaceholder")}
        rows={2}
        style={{
          width: "100%", minWidth: 160, resize: "vertical",
          padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 4,
          fontSize: 11.5, fontFamily: "var(--font-body)", background: "var(--cream)",
          color: "var(--ink)", boxSizing: "border-box",
        }}
      />
      {dirty && (
        <button
          onClick={() => { onSave(order, draft.trim()); setDirty(false); }}
          disabled={saving}
          style={{ ...styles_editBtnSmall, marginTop: 4 }}
        >
          {saving ? t("saving") : t("saveNote")}
        </button>
      )}
    </div>
  );
};

const styles_editBtnSmall = {
  padding: "3px 10px", background: "var(--maroon)", color: "#fff", border: "none",
  borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)",
};

const fmt = (n) => `৳${Number(n).toLocaleString("en-BD")}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
const fmtDayLabel = (isoDate) => new Date(isoDate).toLocaleDateString("en-BD", { weekday: "short" });

const RevenueTrendChart = ({ data }) => {
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

const StatusBreakdownChart = ({ data }) => {
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

const Pagination = ({ page, totalPages, onChange }) => {
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
const pagBtnStyle = { padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--ivory)", cursor: "pointer", fontSize: 12 };

const CheckboxMultiSelect = ({ options, selected, onToggle, placeholder }) => {
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

const BLANK_PRODUCT = {
  nameEn: "", nameBn: "",
  descEn: "", descBn: "",
  category: "", basePrice: "", totalStock: "",
  images: [], isFeatured: false, isBestSeller: false, isActive: true,
};

const BLANK_CATEGORY = { nameEn: "", nameBn: "", slug: "", image: "", isFixed: false };
const BLANK_COUPON = { code: "", title: "", description: "", discountType: "percentage", discountValue: "", minimumPurchase: "", maximumDiscount: "", usageLimit: "", perUserLimit: "", startDate: "", endDate: "", applicableProducts: [], applicableCategories: [], excludedProducts: [], isActive: true };

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const isCouponExpired = (c) => new Date(c.endDate) < new Date();
const isCouponUpcoming = (c) => new Date(c.startDate) > new Date();
const slugify = (str) => (str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const isCloudinaryUploadUrl = (url) => typeof url === "string" && url.includes("/camellia/products/");

const NOTIFICATION_TAB = {
  new_order: "orders",
  low_stock: "products",
  new_customer: "customers",
  order_status: "orders",
  payment: "orders",
};

export default function Admin() {
  const { t } = useTranslation(["admin", "notifications"]);
  const { language, setLanguage } = useLanguage();
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  const [alerts, setAlerts]           = useState([]);
  const [alertsUnread, setAlertsUnread] = useState(0);
  const [bellOpen, setBellOpen]       = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const bellRef = useRef(null);

  const loadAlerts = useCallback(() => {
    getNotifications()
      .then(({ data }) => { setAlerts(data.notifications); setAlertsUnread(data.unreadCount); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, [user, loadAlerts]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAlertClick = async (n) => {
    if (!n.read) {
      setAlerts((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setAlertsUnread((c) => Math.max(0, c - 1));
      try { await markAsRead(n._id); } catch { /* best-effort */ }
    }
    setBellOpen(false);
    setTab(NOTIFICATION_TAB[n.type] || "overview");
  };

  const handleAlertsMarkAllRead = async () => {
    setAlerts((list) => list.map((n) => ({ ...n, read: true })));
    setAlertsUnread(0);
    try { await markAllAsRead(); } catch { /* best-effort */ }
  };

  const handleAlertDelete = async (e, n) => {
    e.stopPropagation();
    setAlerts((list) => list.filter((x) => x._id !== n._id));
    if (!n.read) setAlertsUnread((c) => Math.max(0, c - 1));
    try { await deleteNotification(n._id); } catch { /* best-effort */ }
  };

  const [stats, setStats]       = useState(null);
  const [statsErr, setStatsErr] = useState("");
  const [orders, setOrders]           = useState([]);
  const [ordersLoading, setOL]        = useState(false);
  const [statusUpdating, setSU]       = useState(null);
  const [noteSaving, setNoteSaving]   = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPage, setOrderPage]     = useState(1);
  const [orderDetail, setOrderDetail] = useState(null);
  const [exportFrom, setExportFrom]   = useState("");
  const [exportTo, setExportTo]       = useState("");
  const [exporting, setExporting]     = useState(false);
  const [exportErr, setExportErr]     = useState("");

  const [customers, setCustomers]         = useState([]);
  const [customersLoading, setCustL]      = useState(false);
  const [customerFilter, setCustomerFilter] = useState("all");
  const [customerDetail, setCustomerDetail]   = useState(null);
  const [customerDetailLoading, setCDL]       = useState(false);
  const [resetPwUserId, setResetPwUserId]     = useState(null);
  const [resetPwValue, setResetPwValue]       = useState("");
  const [resetPwMsg, setResetPwMsg]           = useState("");
  const [resetPwOk, setResetPwOk]             = useState(false);
  const [resetPwSaving, setResetPwSaving]     = useState(false);
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [prodLoading, setPL]          = useState(false);
  const [modal, setModal]             = useState(null);
  const [editTarget, setEditTarget]   = useState(null);
  const [form, setForm]               = useState(BLANK_PRODUCT);
  const [formErr, setFormErr]         = useState("");
  const [formSaving, setFormSaving]   = useState(false);
  const [aiLoading,  setAiLoading]    = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [pendingDeleteImages, setPendingDeleteImages] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage]     = useState(1);
  const [lowStockIds, setLowStockIds]     = useState(new Set());
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [settings, setSettings]           = useState(null);
  const [settingsLoading, setSTL]         = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg]     = useState("");
  const [settingsErr, setSettingsErr]     = useState("");
  const PAGE_SIZE = 10;
  const [catLoading, setCL]               = useState(false);
  const [catModal, setCatModal]           = useState(null);
  const [catEditTarget, setCatEditTarget] = useState(null);
  const [catForm, setCatForm]             = useState(BLANK_CATEGORY);
  const [catFormErr, setCatFormErr]       = useState("");
  const [catFormSaving, setCatFormSaving] = useState(false);
  const [catImageUploading, setCatImageUploading] = useState(false);
  const [pendingDeleteCatImages, setPendingDeleteCatImages] = useState([]);
  const [catConfirmDelete, setCatConfirmDelete] = useState(null);
  const [catReordering, setCatReordering] = useState(null);
  const [coupons, setCoupons]             = useState([]);
  const [couponsLoading, setCoL]           = useState(false);
  const [couponSearch, setCouponSearch]     = useState("");
  const [couponStatusFilter, setCouponStatusFilter] = useState("all");
  const [couponModal, setCouponModal]       = useState(null);
  const [couponEditTarget, setCouponEditTarget] = useState(null);
  const [couponForm, setCouponForm]         = useState(BLANK_COUPON);
  const [couponFormErr, setCouponFormErr]   = useState("");
  const [couponFormSaving, setCouponFormSaving] = useState(false);
  const [couponConfirmDelete, setCouponConfirmDelete] = useState(null);
  const [couponStatsTarget, setCouponStatsTarget] = useState(null);
  const [couponPage, setCouponPage]         = useState(1);

  const [messages, setMessages]         = useState([]);
  const [messagesLoading, setML]        = useState(false);
  const [messageFilter, setMessageFilter] = useState("all");
  const [replyTarget, setReplyTarget]   = useState(null);
  const [replyText, setReplyText]       = useState("");
  const [replySending, setReplySending] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConvL]  = useState(false);
  const [conversationDetail, setConversationDetail] = useState(null);
  const [conversationDetailLoading, setConvDL] = useState(false);

  const [refunds, setRefunds]                 = useState([]);
  const [refundsLoading, setRL]                = useState(false);
  const [refundStatusFilter, setRefundStatusFilter] = useState("pending");
  const [refundActionId, setRefundActionId]    = useState(null);

  // ── bKash payment verification state ────────────────────────
  const [bkashSubmissions, setBkashSubmissions] = useState([]);
  const [bkashLoading, setBkashL] = useState(false);
  const [bkashStatusFilter, setBkashStatusFilter] = useState("pending_verification");
  const [bkashSearch, setBkashSearch] = useState("");
  const [bkashDetail, setBkashDetail] = useState(null);
  const [bkashRejectReason, setBkashRejectReason] = useState("");
  const [bkashActing, setBkashActing] = useState(false);
  const [bkashActErr, setBkashActErr] = useState("");

  // ── data loaders ────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const r = await getAdminStats();
      setStats(r.data);
    } catch {
      setStatsErr(t("couldNotLoadStats"));
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOL(true);
    try { const r = await getAllOrders(); setOrders(r.data); }
    finally { setOL(false); }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustL(true);
    try { const r = await getCustomers(); setCustomers(r.data); }
    finally { setCustL(false); }
  }, []);

  const loadProducts = useCallback(async () => {
    setPL(true);
    try {
      const [pr, cr, lr] = await Promise.all([getAllProducts(), getCategories(), getLowStockProducts()]);
      setProducts(pr.data);
      setCategories(cr.data);
      setLowStockIds(new Set(lr.data.products.map(p => p._id)));
    } finally { setPL(false); }
  }, []);

  const loadCategories = useCallback(async () => {
    setCL(true);
    try { const r = await getCategories(); setCategories(r.data); }
    finally { setCL(false); }
  }, []);

  const loadSettings = useCallback(async () => {
    setSTL(true);
    try { const r = await getAdminSettings(); setSettings(r.data); }
    finally { setSTL(false); }
  }, []);

  const loadCoupons = useCallback(async () => {
    setCoL(true);
    try { const [cr, pr, catr] = await Promise.all([getAllCoupons(), getAllProducts(), getCategories()]); setCoupons(cr.data); setProducts(pr.data); setCategories(catr.data); }
    finally { setCoL(false); }
  }, []);

  const loadMessages = useCallback(async () => {
    setML(true);
    try { const r = await client.get("/contact"); setMessages(r.data); }
    catch { setMessages([]); }
    finally { setML(false); }
  }, []);

  const handleUpdateMessageStatus = async (id, status) => {
    try {
      await client.patch(`/contact/${id}/status`, { status });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, status } : m));
    } catch { /* ignore */ }
  };

  const handleDeleteMessage = async (id) => {
    try {
      await client.delete(`/contact/${id}`);
      setMessages(prev => prev.filter(m => m._id !== id));
    } catch { /* ignore */ }
  };

  const openReplyModal = (m) => { setReplyTarget(m); setReplyText(""); };
  const closeReplyModal = () => { setReplyTarget(null); setReplyText(""); };

  const handleSendReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    setReplySending(true);
    try {
      await client.post(`/contact/${replyTarget._id}/reply`, { reply: replyText.trim() });
      setMessages(prev => prev.map(m => m._id === replyTarget._id ? { ...m, status: "replied", reply: replyText.trim() } : m));
      closeReplyModal();
    } catch { /* ignore */ }
    finally { setReplySending(false); }
  };

  const loadConversations = useCallback(async () => {
    setConvL(true);
    try { const r = await getAllConversations(); setConversations(r.data); }
    catch { setConversations([]); }
    finally { setConvL(false); }
  }, []);

  const openConversationDetail = async (id) => {
    setConvDL(true);
    setConversationDetail({ _id: id, messages: [] });
    try { const r = await getConversationById(id); setConversationDetail(r.data); }
    catch { setConversationDetail(null); }
    finally { setConvDL(false); }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversationApi(id);
      setConversations(prev => prev.filter(c => c._id !== id));
    } catch { /* ignore */ }
  };

  const loadRefunds = useCallback(async (status = refundStatusFilter) => {
    setRL(true);
    try { const r = await getAllRefunds(status); setRefunds(r.data); }
    catch { setRefunds([]); }
    finally { setRL(false); }
  }, [refundStatusFilter]);

  const handleRefundStatusChange = async (refund, status) => {
    let adminNote = "";
    if (status === "rejected") {
      adminNote = window.prompt(t("refundRejectPrompt")) || "";
      if (adminNote === "" && !window.confirm(t("refundRejectConfirmNoReason"))) return;
    }
    setRefundActionId(refund._id);
    try {
      const r = await updateRefundStatusApi(refund._id, status, adminNote);
      setRefunds(prev =>
        refundStatusFilter === "all"
          ? prev.map(x => x._id === refund._id ? r.data : x)
          : prev.filter(x => x._id !== refund._id)
      );
    } catch { /* ignore */ }
    finally { setRefundActionId(null); }
  };

  // ── bKash loader / handlers ─────────────────────────────────
  const loadBkash = useCallback(async () => {
    setBkashL(true);
    try { const r = await getBkashSubmissions(bkashStatusFilter); setBkashSubmissions(r.data); }
    catch { setBkashSubmissions([]); }
    finally { setBkashL(false); }
  }, [bkashStatusFilter]);

  const openBkashDetail = (order) => { setBkashDetail(order); setBkashRejectReason(""); setBkashActErr(""); };
  const closeBkashDetail = () => { setBkashDetail(null); setBkashRejectReason(""); setBkashActErr(""); };

  const handleBkashDecision = async (approve) => {
    if (!bkashDetail) return;
    setBkashActing(true);
    setBkashActErr("");
    try {
      await verifyBkashPaymentApi(bkashDetail._id, { approve, rejectionReason: bkashRejectReason });
      setBkashSubmissions(prev => prev.filter(o => o._id !== bkashDetail._id));
      closeBkashDetail();
    } catch (err) {
      setBkashActErr(err.response?.data?.message || t("bkashActionError"));
    } finally {
      setBkashActing(false);
    }
  };

  useEffect(() => {
    if (tab === "overview")   loadStats();
    if (tab === "orders")     loadOrders();
    if (tab === "customers")  loadCustomers();
    if (tab === "products")   loadProducts();
    if (tab === "categories") loadCategories();
    if (tab === "settings")   loadSettings();
    if (tab === "coupons")    { loadCoupons(); }
    if (tab === "messages")   loadMessages();
    if (tab === "chats")      loadConversations();
    if (tab === "refunds")    loadRefunds();
    if (tab === "bkash")      loadBkash();
  }, [tab, loadStats, loadOrders, loadCustomers, loadProducts, loadCategories, loadSettings, loadCoupons, loadMessages, loadConversations, loadRefunds, loadBkash]);

  useEffect(() => { if (tab === "refunds") loadRefunds(refundStatusFilter); }, [refundStatusFilter]);
  useEffect(() => { setMobileNavOpen(false); }, [tab]);

  useEffect(() => { setOrderPage(1); }, [orderSearch, orderStatusFilter]);
  useEffect(() => { setProductPage(1); }, [productSearch, showLowStockOnly]);
  useEffect(() => { setCouponPage(1); }, [couponSearch, couponStatusFilter]);

  const openCustomerDetail = async (c) => {
    if (c.type === "guest") return;
    setCDL(true);
    setCustomerDetail({ user: { name: c.name, email: c.email }, orders: [] });
    try { const r = await getCustomerDetail(c._id); setCustomerDetail(r.data); }
    catch { setCustomerDetail(null); }
    finally { setCDL(false); }
  };

  const closeCustomerDetail = () => { setCustomerDetail(null); setResetPwUserId(null); setResetPwValue(""); setResetPwMsg(""); };

  const handleResetCustomerPassword = async (userId) => {
    setResetPwSaving(true);
    setResetPwMsg("");
    try {
      await resetCustomerPassword(userId, resetPwValue);
      setResetPwMsg(t("passwordResetSuccess"));
      setResetPwOk(true);
      setResetPwValue("");
    } catch (err) {
      setResetPwMsg(err.response?.data?.message || t("couldNotResetPassword"));
      setResetPwOk(false);
    } finally {
      setResetPwSaving(false);
    }
  };

  const setVatRate = (pct) => setSettings(s => ({ ...s, vatRate: Number(pct) / 100 }));
  const setDefaultDelivery = (v) => setSettings(s => ({ ...s, defaultDeliveryCharge: Number(v) }));
  const setDistrictCharge = (idx, field, value) => setSettings(s => ({ ...s, districtDeliveryCharges: s.districtDeliveryCharges.map((d, i) => i === idx ? { ...d, [field]: field === "charge" ? Number(value) : value } : d) }));
  const addDistrictCharge = () => setSettings(s => ({ ...s, districtDeliveryCharges: [...s.districtDeliveryCharges, { district: "", charge: 0 }] }));
  const removeDistrictCharge = (idx) => setSettings(s => ({ ...s, districtDeliveryCharges: s.districtDeliveryCharges.filter((_, i) => i !== idx) }));

  const handleSaveSettings = async () => {
    if (settings.districtDeliveryCharges.some(d => !d.district.trim())) {
      setSettingsErr(t("districtRowError"));
      return;
    }
    setSettingsErr(""); setSettingsMsg(""); setSettingsSaving(true);
    try {
      const r = await updateAdminSettings(settings);
      setSettings(r.data);
      setSettingsMsg(t("settingsSaved"));
    } catch (err) {
      setSettingsErr(err.response?.data?.message || t("saveFailed"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setSU(orderId);
    try {
      const r = await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o._id === orderId ? r.data : o));
    } catch { /* keep old */ } finally { setSU(null); }
  };

  const handleSaveAdminNote = async (order, noteText) => {
    setNoteSaving(order._id);
    try {
      const r = await updateOrderStatus(order._id, order.status, noteText);
      setOrders(prev => prev.map(o => o._id === order._id ? r.data : o));
    } catch { /* keep old */ } finally { setNoteSaving(null); }
  };

  const handleExportSales = async () => {
    setExportErr(""); setExporting(true);
    try {
      const params = {};
      if (exportFrom) params.from = exportFrom;
      if (exportTo) params.to = exportTo;
      if (orderStatusFilter !== "all") params.status = orderStatusFilter;
      const r = await exportSalesCSV(params);
      const url = window.URL.createObjectURL(new Blob([r.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportErr(t("couldNotExport"));
    } finally {
      setExporting(false);
    }
  };

  const openAdd = () => {
    setForm({ ...BLANK_PRODUCT, category: categories[0]?._id || "" });
    setEditTarget(null);
    setFormErr("");
    setPendingDeleteImages([]);
    setModal("add");
  };

  const openEdit = (p) => {
    setForm({
      nameEn:     p.name?.en || "",
      nameBn:     p.name?.bn || "",
      descEn:     p.description?.en || "",
      descBn:     p.description?.bn || "",
      category:   p.category?._id || p.category || "",
      basePrice:  p.basePrice,
      totalStock: p.totalStock ?? 0,
      images:      p.images || [],
      isFeatured:  p.isFeatured || false,
      isBestSeller: p.isBestSeller || false,
      isActive:    p.isActive !== false,
    });
    setEditTarget(p);
    setFormErr("");
    setPendingDeleteImages([]);
    setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditTarget(null); setPendingDeleteImages([]); };

  const setF = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleProductImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setFormErr(""); setImageUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const r = await uploadImage(file);
        uploaded.push(r.data.url);
      }
      setForm(f => ({ ...f, images: [...f.images, ...uploaded] }));
    } catch (err) {
      setFormErr(err.response?.data?.message || t("imageUploadFailed"));
    } finally { setImageUploading(false); }
  };

  const removeProductImage = (idx) => {
    setForm(f => {
      const removed = f.images[idx];
      if (removed && removed.startsWith("/uploads/")) {
        setPendingDeleteImages(prev => [...prev, removed]);
      }
      return { ...f, images: f.images.filter((_, i) => i !== idx) };
    });
  };

  const buildPayload = () => ({
    name:        { en: form.nameEn.trim(), bn: form.nameBn.trim() },
    description: { en: form.descEn.trim(), bn: form.descBn.trim() },
    category:    form.category,
    basePrice:   Number(form.basePrice),
    totalStock:  Number(form.totalStock) || 0,
    images:       form.images,
    isFeatured:   form.isFeatured,
    isBestSeller: form.isBestSeller,
    isActive:     form.isActive,
  });

  const handleSaveProduct = async () => {
    if (!form.nameEn.trim()) return setFormErr(t("productNameRequired"));
    if (!form.category)      return setFormErr(t("selectCategoryRequired"));
    if (!form.basePrice || isNaN(Number(form.basePrice))) return setFormErr(t("validBasePriceRequired"));
    if (form.totalStock === "" || isNaN(Number(form.totalStock)) || Number(form.totalStock) < 0)
      return setFormErr(t("validStockRequired"));
    setFormErr(""); setFormSaving(true);
    try {
      if (modal === "add") {
        const r = await createProduct(buildPayload());
        setProducts(prev => [r.data, ...prev]);
      } else {
        const r = await updateProduct(editTarget._id, buildPayload());
        setProducts(prev => prev.map(p => p._id === editTarget._id ? r.data : p));
      }
      pendingDeleteImages.forEach(url => { deleteUploadedImage(url).catch(() => {}); });
      closeModal();
    } catch (err) {
      setFormErr(err.response?.data?.message || t("saveFailed"));
    } finally { setFormSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch { /* ignore */ }
    setConfirmDelete(null);
  };

  const openAddCategory = () => {
    setCatForm(BLANK_CATEGORY);
    setCatEditTarget(null);
    setCatFormErr("");
    setPendingDeleteCatImages([]);
    setCatModal("add");
  };

  const openEditCategory = (c) => {
    setCatForm({
      nameEn: c.name?.en || "",
      nameBn: c.name?.bn || "",
      slug:   c.slug || "",
      image:  c.image || "",
      isFixed: c.isFixed || false,
    });
    setCatEditTarget(c);
    setCatFormErr("");
    setPendingDeleteCatImages([]);
    setCatModal("edit");
  };

  const closeCatModal = () => { setCatModal(null); setCatEditTarget(null); setPendingDeleteCatImages([]); };

  const setCF = (e) => {
    const { name, value, type, checked } = e.target;
    setCatForm(f => {
      const next = { ...f, [name]: type === "checkbox" ? checked : value };
      if (name === "nameEn" && catModal === "add" && (!f.slug || f.slug === slugify(f.nameEn))) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleCategoryImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCatFormErr(""); setCatImageUploading(true);
    try {
      const r = await uploadImage(file);
      setCatForm(f => {
        if (f.image && f.image.startsWith("/uploads/")) {
          setPendingDeleteCatImages(prev => [...prev, f.image]);
        }
        return { ...f, image: r.data.url };
      });
    } catch (err) {
      setCatFormErr(err.response?.data?.message || t("imageUploadFailed"));
    } finally { setCatImageUploading(false); }
  };

  const handleSaveCategory = async () => {
    if (!catForm.nameEn.trim()) return setCatFormErr(t("categoryNameRequired"));
    if (!catForm.slug.trim())   return setCatFormErr(t("slugRequired"));
    setCatFormErr(""); setCatFormSaving(true);
    try {
      const payload = {
        name: { en: catForm.nameEn.trim(), bn: catForm.nameBn.trim() },
        slug: slugify(catForm.slug),
        image: catForm.image.trim(),
      };
      if (catModal === "add") {
        payload.isFixed = catForm.isFixed;
        payload.sortOrder = categories.length
          ? Math.max(...categories.map(c => c.sortOrder || 0)) + 1
          : 1;
        const r = await createCategory(payload);
        setCategories(prev => [...prev, r.data].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      } else {
        const r = await updateCategory(catEditTarget._id, payload);
        setCategories(prev => prev.map(c => c._id === catEditTarget._id ? r.data : c));
      }
      pendingDeleteCatImages.forEach(url => { deleteUploadedImage(url).catch(() => {}); });
      closeCatModal();
    } catch (err) {
      setCatFormErr(err.response?.data?.message || t("saveFailed"));
    } finally { setCatFormSaving(false); }
  };

  const handleDeleteCategory = async (cat) => {
    try {
      await deleteCategory(cat._id);
      setCategories(prev => prev.filter(c => c._id !== cat._id));
      if (cat.image && cat.image.startsWith("/uploads/")) {
        deleteUploadedImage(cat.image).catch(() => {});
      }
    } catch (err) {
      setCatFormErr(err.response?.data?.message || t("saveFailed"));
    }
    setCatConfirmDelete(null);
  };

  const handleMoveCategory = async (cat, direction) => {
    const sorted = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const idx = sorted.findIndex(c => c._id === cat._id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx]; const b = sorted[swapIdx];
    setCatReordering(a._id);
    try {
      const [ra, rb] = await Promise.all([updateCategory(a._id, { sortOrder: b.sortOrder }), updateCategory(b._id, { sortOrder: a.sortOrder })]);
      setCategories(prev => { const next = prev.map(c => { if (c._id === ra.data._id) return ra.data; if (c._id === rb.data._id) return rb.data; return c; }); return next.sort((x, y) => (x.sortOrder || 0) - (y.sortOrder || 0)); });
    } finally { setCatReordering(null); }
  };

  const openAddCoupon = () => { setCouponForm(BLANK_COUPON); setCouponEditTarget(null); setCouponFormErr(""); setCouponModal("add"); };
  const openEditCoupon = (c) => { setCouponForm({ code: c.code || "", title: c.title || "", description: c.description || "", discountType: c.discountType || "percentage", discountValue: c.discountValue ?? "", minimumPurchase: c.minimumPurchase ?? "", maximumDiscount: c.maximumDiscount ?? "", usageLimit: c.usageLimit ?? "", perUserLimit: c.perUserLimit ?? "", startDate: toDateInput(c.startDate), endDate: toDateInput(c.endDate), applicableProducts: (c.applicableProducts || []).map(p => p._id || p), applicableCategories: (c.applicableCategories || []).map(cat => cat._id || cat), excludedProducts: (c.excludedProducts || []).map(p => p._id || p), isActive: c.isActive !== false }); setCouponEditTarget(c); setCouponFormErr(""); setCouponModal("edit"); };
  const closeCouponModal = () => { setCouponModal(null); setCouponEditTarget(null); };
  const setCouponF = (e) => { const { name, value, type, checked } = e.target; if (type === "select-multiple") { const values = Array.from(e.target.selectedOptions).map(o => o.value); setCouponForm(f => ({ ...f, [name]: values })); return; } setCouponForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value })); };
  const buildCouponPayload = () => ({ code: couponForm.code.trim().toUpperCase(), title: couponForm.title.trim(), description: couponForm.description.trim(), discountType: couponForm.discountType, discountValue: Number(couponForm.discountValue), minimumPurchase: couponForm.minimumPurchase === "" ? 0 : Number(couponForm.minimumPurchase), maximumDiscount: couponForm.maximumDiscount === "" ? null : Number(couponForm.maximumDiscount), usageLimit: couponForm.usageLimit === "" ? null : Number(couponForm.usageLimit), perUserLimit: couponForm.perUserLimit === "" ? null : Number(couponForm.perUserLimit), startDate: couponForm.startDate, endDate: couponForm.endDate, applicableProducts: couponForm.applicableProducts, applicableCategories: couponForm.applicableCategories, excludedProducts: couponForm.excludedProducts, isActive: couponForm.isActive });

  const handleSaveCoupon = async () => {
    if (!couponForm.code.trim()) return setCouponFormErr("Coupon code is required.");
    if (!couponForm.title.trim()) return setCouponFormErr("Title is required.");
    if (!couponForm.discountValue || isNaN(Number(couponForm.discountValue)) || Number(couponForm.discountValue) <= 0) return setCouponFormErr("Enter a valid discount value.");
    if (couponForm.discountType === "percentage" && Number(couponForm.discountValue) > 100) return setCouponFormErr("Percentage discount cannot exceed 100.");
    if (!couponForm.startDate || !couponForm.endDate) return setCouponFormErr("Start and end dates are required.");
    if (new Date(couponForm.startDate) >= new Date(couponForm.endDate)) return setCouponFormErr("End date must be after start date.");
    setCouponFormErr(""); setCouponFormSaving(true);
    try {
      if (couponModal === "add") { const r = await createCouponApi(buildCouponPayload()); setCoupons(prev => [r.data, ...prev]); }
      else { const r = await updateCouponApi(couponEditTarget._id, buildCouponPayload()); setCoupons(prev => prev.map(c => c._id === couponEditTarget._id ? r.data : c)); }
      closeCouponModal();
    } catch (err) { setCouponFormErr(err.response?.data?.message || "Save failed."); }
    finally { setCouponFormSaving(false); }
  };

  const handleDeleteCoupon = async (id) => { try { await deleteCouponApi(id); setCoupons(prev => prev.filter(c => c._id !== id)); } catch { } setCouponConfirmDelete(null); };
  const handleToggleCouponStatus = async (c) => { try { const r = await setCouponStatus(c._id, !c.isActive); setCoupons(prev => prev.map(x => x._id === c._id ? r.data : x)); } catch { } };

  if (authLoading) return <div style={s.center}>{t("loading")}</div>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="admin-layout">
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-hamburger-btn"
          onClick={() => setMobileNavOpen(o => !o)}
          aria-label={t("adminPanel")}
          aria-expanded={mobileNavOpen}
        >
          <Menu size={20} />
        </button>

        <Link to="/" className="navbar-logo admin-topbar-logo" style={{ textDecoration: "none" }}>Camellia</Link>
        <span className="admin-topbar-role">{t("adminPanel")}</span>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <div ref={bellRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="admin-topbar-icon-btn"
              onClick={() => setBellOpen((o) => !o)}
              aria-expanded={bellOpen}
              aria-label={t("notifications:adminAlerts")}
              title={t("notifications:adminAlerts")}
            >
              <Bell size={15} />
              {alertsUnread > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "var(--red)", color: "#fff", borderRadius: "50%",
                  fontSize: 10, fontWeight: 700, width: 16, height: 16, lineHeight: 1,
                }}>
                  {alertsUnread > 9 ? "9+" : alertsUnread}
                </span>
              )}
            </button>
            {bellOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320,
                background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)", overflow: "hidden", zIndex: 200,
              }}>
                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  {alerts.length === 0 ? (
                    <p style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted)" }}>{t("notifications:empty")}</p>
                  ) : (
                    alerts.slice(0, 10).map((n) => (
                      <div
                        key={n._id}
                        onClick={() => handleAlertClick(n)}
                        style={{
                          padding: "10px 16px", fontSize: 13, cursor: "pointer",
                          opacity: n.read ? 0.6 : 1, borderBottom: "1px solid var(--border)",
                          display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, whiteSpace: "normal" }}>
                          <div style={{ fontWeight: 600, color: "var(--charcoal, #2A160F)", wordBreak: "break-word", whiteSpace: "normal" }}>{n.title}</div>
                          <div style={{ color: "var(--muted)", fontSize: 12, wordBreak: "break-word", whiteSpace: "normal" }}>{n.message}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleAlertDelete(e, n)}
                          aria-label={t("notifications:delete")}
                          title={t("notifications:delete")}
                          style={{
                            flexShrink: 0, width: "auto", background: "none", border: "none", cursor: "pointer",
                            color: "var(--muted)", padding: 4, display: "flex",
                            alignItems: "center", justifyContent: "center", borderRadius: 4,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderTop: "1px solid var(--border)" }}>
                  {alertsUnread > 0 ? (
                    <button type="button" onClick={handleAlertsMarkAllRead} style={{ background: "none", border: "none", color: "var(--maroon)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                      {t("notifications:markAllRead")}
                    </button>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={() => { setBellOpen(false); setTab("notifications"); }}
                    style={{ background: "none", border: "none", color: "var(--maroon)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
                  >
                    {t("notifications:viewAll")}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="admin-topbar-btn"
            onClick={() => setLanguage(language === "en" ? "bn" : "en")}
          >
            <Globe size={13} /> <span className="admin-topbar-btn-label">{language === "en" ? "বাংলা" : "English"}</span>
          </button>
          <button
            type="button"
            className="admin-topbar-btn"
            onClick={async () => { await logout(); navigate("/"); }}
          >
            <LogOut size={13} /> <span className="admin-topbar-btn-label">{t("logout")}</span>
          </button>
        </div>
      </header>

      {mobileNavOpen && <div className="admin-sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />}

      <div className="admin-body">
      <aside className={`admin-sidebar${mobileNavOpen ? " admin-sidebar-open" : ""}`}>
        <button
          type="button"
          className="admin-sidebar-close-btn"
          onClick={() => setMobileNavOpen(false)}
          aria-label={t("close")}
        >
          <X size={18} />
        </button>
        {[
          { id: "overview",   label: t("navOverview"),   icon: LayoutDashboard },
          { id: "orders",     label: t("navOrders"),     icon: Package },
          { id: "refunds",    label: t("navRefunds"),    icon: RotateCcw },
          { id: "bkash",      label: t("navBkash"),      icon: Wallet },
          { id: "customers",  label: t("navCustomers"),  icon: Users },
          { id: "products",   label: t("navProducts"),   icon: Gem },
          { id: "categories", label: t("navCategories"), icon: Tag },
          { id: "coupons",    label: t("navCoupons"),     icon: Ticket },
          { id: "messages",   label: t("navMessages"),    icon: Mail },
          { id: "chats",      label: t("navChats"),       icon: MessageCircle },
          { id: "settings",   label: t("navSettings"),   icon: Settings },
        ].map(navItem => (
          <button
            key={navItem.id}
            className={`admin-nav-btn${tab === navItem.id ? " active" : ""}`}
            onClick={() => setTab(navItem.id)}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <navItem.icon size={15} /> {navItem.label}
            {navItem.id === "messages" && messages.filter(m => m.status === "unread").length > 0 && (
              <span style={{ marginLeft: 8, background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {messages.filter(m => m.status === "unread").length}
              </span>
            )}
            {navItem.id === "refunds" && refundStatusFilter === "pending" && refunds.length > 0 && (
              <span style={{ marginLeft: 8, background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {refunds.length}
              </span>
            )}
          </button>
        ))}
        <div style={{ marginTop: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
          <button
            className="admin-nav-btn admin-logout-btn"
            onClick={() => navigate("/")}
            style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <ArrowLeft size={13} /> {t("backToStore")}
          </button>
        </div>
      </aside>

      <main className="admin-main">

        {tab === "overview" && (
          <div>
            <h2 style={s.pageTitle}>{t("overview")}</h2>
            {statsErr && <p style={s.err}>{statsErr}</p>}
            {!stats && !statsErr && <p style={{ color: "var(--muted)" }}>{t("loading")}</p>}
            {stats && (
              <>
                <div className="admin-stat-grid" style={s.statGrid}>
                  {[
                    { label: t("totalRevenue"),  value: fmt(stats.totalRevenue),  icon: DollarSign },
                    { label: t("totalOrders"),   value: stats.totalOrders,         icon: Package },
                    { label: t("customers"),      value: stats.totalUsers,          icon: Users },
                    { label: t("activeProducts"),value: stats.totalProducts,       icon: Gem },
                    { label: t("lowStock"),      value: stats.lowStockCount,       icon: AlertTriangle, alert: stats.lowStockCount > 0 },
                  ].map(c => (
                    <div key={c.label} style={{ ...s.statCard, ...(c.alert ? { borderColor: "var(--red)" } : {}) }}>
                      <div style={s.statIcon}><c.icon size={22} /></div>
                      <div style={{ ...s.statValue, ...(c.alert ? { color: "var(--red)" } : {}) }}>{c.value}</div>
                      <div style={s.statLabel}>{c.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 32 }} className="admin-chart-grid">
                  <div style={s.chartCard}>
                    <h3 style={s.sectionTitle}>{t("revenueLast7Days")}</h3>
                    <RevenueTrendChart data={stats.revenueTrend} />
                  </div>
                  <div style={s.chartCard}>
                    <h3 style={s.sectionTitle}>{t("ordersByStatus")}</h3>
                    <StatusBreakdownChart data={stats.statusCounts} />
                  </div>
                </div>

                <h3 style={{ ...s.sectionTitle, marginTop: 32 }}>{t("recentOrders")}</h3>
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {[t("colOrderId"),t("colCustomer"),t("colDate"),t("colAmount"),t("colStatus")].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map(o => (
                        <tr key={o._id} style={{ ...s.tr, cursor: "pointer" }} onClick={() => setOrderDetail(o)}>
                          <td style={s.td}><span style={s.mono}>#{o._id.slice(-6).toUpperCase()}</span></td>
                          <td style={s.td}>{o.user?.name || o.guestInfo?.name || "—"}{o.isGuest && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: "var(--muted-bg, #eee)", color: "var(--muted)" }}>{t("guestBadge")}</span>}<br/><span style={{ fontSize: 12, color: "var(--muted)" }}>{o.user?.email || o.guestInfo?.email}</span></td>
                          <td style={s.td}>{fmtDate(o.createdAt)}</td>
                          <td style={s.td}>{fmt(o.totalAmount)}</td>
                          <td style={s.td}>
                            <StatusBadge status={o.status} />
                            {o.payment?.status === "paid" && o.payment?.paidAt && (
                              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>{t("paidOn", { date: fmtDate(o.payment.paidAt) })}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>{t("allOrders")}</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  className="input"
                  placeholder={t("searchOrdersPlaceholder")}
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  style={{ width: 240 }}
                />
                <select className="input" value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} style={{ width: 160 }}>
                  <option value="all">{t("allStatuses")}</option>
                  {ORDER_STATUSES.map(st => (
                    <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16, padding: "12px 16px", background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{t("exportSales")}</span>
              <input className="input" type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} style={{ width: 150 }} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("to")}</span>
              <input className="input" type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} style={{ width: 150 }} />
              <button className="btn btn-outline" onClick={handleExportSales} disabled={exporting} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {exporting ? t("exporting") : <><Download size={14} /> {t("exportCsv")}</>}
              </button>
              {exportErr && <span style={{ fontSize: 12, color: "var(--red)" }}>{exportErr}</span>}
            </div>

            {ordersLoading && <p style={{ color: "var(--muted)" }}>{t("loadingOrders")}</p>}
            {!ordersLoading && (() => {
              const q = orderSearch.trim().toLowerCase().replace(/^#/, "");
              const filtered = orders.filter(o => {
                if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
                if (!q) return true;
                const idMatch = o._id.slice(-6).toLowerCase().includes(q) || o._id.toLowerCase().includes(q);
                const name = (o.user?.name || o.guestInfo?.name || "").toLowerCase();
                const email = (o.user?.email || o.guestInfo?.email || "").toLowerCase();
                return idMatch || name.includes(q) || email.includes(q);
              });
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const page = Math.min(orderPage, totalPages);
              const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
              return (
                <>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {[t("colOrderId"),t("colCustomer"),t("colDate"),t("colItems"),t("colAmount"),t("colPayment"),t("colStatus"),t("colUpdate")].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map(o => (
                          <tr key={o._id} style={s.tr}>
                            <td style={{ ...s.td, cursor: "pointer" }} onClick={() => setOrderDetail(o)}><span style={s.mono}>#{o._id.slice(-6).toUpperCase()}</span></td>
                            <td style={{ ...s.td, cursor: "pointer" }} onClick={() => setOrderDetail(o)}>
                              <div style={{ fontSize: 13 }}>{o.user?.name || o.guestInfo?.name || "—"}{o.isGuest && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: "var(--muted-bg, #eee)", color: "var(--muted)" }}>{t("guestBadge")}</span>}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{o.address?.city}</div>
                            </td>
                            <td style={s.td}><span style={{ fontSize: 12 }}>{fmtDate(o.createdAt)}</span></td>
                            <td style={{ ...s.td, textAlign: "center" }}>{o.items?.length}</td>
                            <td style={s.td}>{fmt(o.totalAmount)}</td>
                            <td style={s.td}>
                              <div style={{ fontSize: 12 }}>{o.payment?.method?.toUpperCase()}</div>
                              <div style={{ fontSize: 11, color: o.payment?.status === "paid" ? "var(--green)" : "var(--muted)" }}>{t(`orders:${o.payment?.status === "paid" ? "paid" : "unpaid"}`)}</div>
                              {o.payment?.status === "paid" && o.payment?.paidAt && (
                                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1 }}>{t("paidOn", { date: fmtDate(o.payment.paidAt) })}</div>
                              )}
                              {o.payment?.method === "bkash" && (
                                <div style={{ marginTop: 5 }}>
                                  {o.payment?.bkash?.trxId && (
                                    <div style={{ ...s.mono, fontSize: 11 }}>{o.payment.bkash.trxId}</div>
                                  )}
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                                    <BkashStatusBadge status={o.payment?.bkash?.verificationStatus || "awaiting_submission"} />
                                    {o.payment?.bkash?.verificationStatus && o.payment.bkash.verificationStatus !== "awaiting_submission" && (
                                      <button onClick={() => openBkashDetail(o)} style={{ ...s.editBtn, marginRight: 0, padding: "3px 9px" }}>
                                        {o.payment.bkash.verificationStatus === "pending_verification" ? t("verifyAction") : t("viewDetails")}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td style={s.td}><StatusBadge status={o.status} /></td>
                            <td style={s.td}>
                              <select value={o.status} disabled={statusUpdating === o._id} onChange={e => handleStatusChange(o._id, e.target.value)} style={s.select}>
                                {ORDER_STATUSES.map(st => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
                              </select>
                              <AdminNoteInput order={o} saving={noteSaving === o._id} onSave={handleSaveAdminNote} />
                            </td>
                          </tr>
                        ))}
                        {pageItems.length === 0 && (
                          <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>{t("noOrdersMatch")}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={page} totalPages={totalPages} onChange={setOrderPage} />
                </>
              );
            })()}
          </div>
        )}

        {tab === "refunds" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>{t("refundsTitle")}</h2>
              <div style={{ display: "flex", gap: 8 }}>
                {["pending", "approved", "processed", "rejected", "all"].map(f => (
                  <button
                    key={f}
                    onClick={() => setRefundStatusFilter(f)}
                    style={{
                      padding: "6px 14px", borderRadius: 20, border: "1.5px solid", cursor: "pointer",
                      fontSize: 12, fontWeight: 500, textTransform: "capitalize",
                      borderColor: refundStatusFilter === f ? "var(--maroon)" : "var(--border)",
                      background: refundStatusFilter === f ? "var(--maroon)" : "transparent",
                      color: refundStatusFilter === f ? "#fff" : "var(--muted)",
                    }}
                  >
                    {t(`refundFilter_${f}`)}
                  </button>
                ))}
              </div>
            </div>

            {refundsLoading && <p style={{ color: "var(--muted)" }}>{t("loadingOrders")}</p>}
            {!refundsLoading && (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {[t("colOrderId"), t("colCustomer"), t("refundColItem"), t("refundColType"), t("refundColReason"), t("colAmount"), t("colStatus"), t("colActions")].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map(rf => (
                      <tr key={rf._id} style={s.tr}>
                        <td style={s.td}>
                          <span style={s.mono}>#{(rf.order?.invoiceNumber || rf.order?.guestOrderId || rf.order?._id?.slice(-6) || "—").toString().slice(-8).toUpperCase()}</span>
                        </td>
                        <td style={s.td}>
                          <div style={{ fontSize: 13 }}>{rf.user?.name || "—"}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{rf.user?.email}</div>
                        </td>
                        <td style={{ ...s.td, maxWidth: 200 }}>
                          <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rf.item?.nameSnapshot}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("qtyLabel", { count: rf.item?.quantity })}</div>
                        </td>
                        <td style={{ ...s.td, textTransform: "capitalize" }}>
                          {rf.requestType}
                          {rf.requestType === "exchange" && rf.exchangeProduct?.nameSnapshot && (
                            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "none", marginTop: 2 }}>
                              → {rf.exchangeProduct.nameSnapshot}
                            </div>
                          )}
                        </td>
                        <td style={{ ...s.td, textTransform: "capitalize" }}>{rf.reason?.replace(/_/g, " ")}</td>
                        <td style={s.td}>{fmt(rf.refundAmount)}</td>
                        <td style={s.td}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, textTransform: "capitalize",
                            background: rf.status === "pending" ? "#FEF9C3" : rf.status === "approved" ? "#DBEAFE" : rf.status === "processed" ? "#DCFCE7" : "#FEE2E2",
                            color: rf.status === "pending" ? "#854D0E" : rf.status === "approved" ? "#1E40AF" : rf.status === "processed" ? "#166534" : "#991B1B",
                          }}>
                            {rf.status}
                          </span>
                        </td>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                          {rf.status === "pending" && (
                            <>
                              <button
                                disabled={refundActionId === rf._id}
                                onClick={() => handleRefundStatusChange(rf, "approved")}
                                style={{ ...s.editBtn, background: "var(--green)" }}
                              >
                                {t("refundApprove")}
                              </button>
                              <button
                                disabled={refundActionId === rf._id}
                                onClick={() => handleRefundStatusChange(rf, "rejected")}
                                style={s.delBtn}
                              >
                                {t("refundReject")}
                              </button>
                            </>
                          )}
                          {rf.status === "approved" && (
                            <button
                              disabled={refundActionId === rf._id}
                              onClick={() => handleRefundStatusChange(rf, "processed")}
                              style={{ ...s.editBtn, background: "var(--maroon)", display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <PackageCheck size={12} /> {t("refundProcess")}
                            </button>
                          )}
                          {(rf.status === "processed" || rf.status === "rejected") && (
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>
                              {rf.status === "processed" ? t("refundStockRestored") : (rf.adminNote || "—")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {refunds.length === 0 && (
                      <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>{t("refundsNone")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── bKASH MANUAL VERIFICATION ── */}
        {tab === "bkash" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>{t("bkashTitle")}</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  className="input"
                  placeholder={t("bkashSearchPlaceholder")}
                  value={bkashSearch}
                  onChange={e => setBkashSearch(e.target.value)}
                  style={{ width: 240 }}
                />
                <select className="input" value={bkashStatusFilter} onChange={e => setBkashStatusFilter(e.target.value)} style={{ width: 200 }}>
                  <option value="pending_verification">{t("bkashFilterPending")}</option>
                  <option value="verified">{t("bkashFilterVerified")}</option>
                  <option value="rejected">{t("bkashFilterRejected")}</option>
                  <option value="awaiting_submission">{t("bkashFilterAwaiting")}</option>
                  <option value="all">{t("bkashFilterAll")}</option>
                </select>
              </div>
            </div>

            {bkashLoading && <p style={{ color: "var(--muted)" }}>{t("loadingBkash")}</p>}
            {!bkashLoading && (() => {
              const q = bkashSearch.trim().toLowerCase().replace(/^#/, "");
              const filteredBkash = !q ? bkashSubmissions : bkashSubmissions.filter(o => {
                const idMatch = (o._id || "").toString().toLowerCase().includes(q);
                const name = (o.user?.name || o.guestInfo?.name || "").toLowerCase();
                const email = (o.user?.email || o.guestInfo?.email || "").toLowerCase();
                const trxId = (o.payment?.bkash?.trxId || "").toLowerCase();
                const senderNumber = (o.payment?.bkash?.senderNumber || "").toLowerCase();
                return idMatch || name.includes(q) || email.includes(q) || trxId.includes(q) || senderNumber.includes(q);
              });
              return (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {[t("colOrderId"), t("colCustomer"), t("bkashColSenderNumber"), t("bkashColTrxId"), t("colFiledOn"), t("colStatus"), t("colActions")].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBkash.map(o => (
                      <tr key={o._id} style={s.tr}>
                        <td style={{ ...s.td, cursor: "pointer" }} onClick={() => openBkashDetail(o)}>
                          <span style={s.mono}>#{(o._id || "").toString().slice(-6).toUpperCase()}</span>
                        </td>
                        <td style={{ ...s.td, cursor: "pointer" }} onClick={() => openBkashDetail(o)}>
                          <div style={{ fontSize: 13 }}>
                            {o.user?.name || o.guestInfo?.name || "—"}
                            {o.isGuest && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: "var(--muted-bg, #eee)", color: "var(--muted)" }}>{t("guestRequestBadge")}</span>}
                          </div>
                        </td>
                        <td style={s.td}><span style={s.mono}>{o.payment?.bkash?.senderNumber || "—"}</span></td>
                        <td style={s.td}><span style={s.mono}>{o.payment?.bkash?.trxId || "—"}</span></td>
                        <td style={s.td}><span style={{ fontSize: 12 }}>{o.payment?.bkash?.submittedAt ? fmtDate(o.payment.bkash.submittedAt) : "—"}</span></td>
                        <td style={s.td}><BkashStatusBadge status={o.payment?.bkash?.verificationStatus || "awaiting_submission"} /></td>
                        <td style={s.td}>
                          <button onClick={() => openBkashDetail(o)} style={s.editBtn}>{t("viewDetails")}</button>
                        </td>
                      </tr>
                    ))}
                    {filteredBkash.length === 0 && (
                      <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>{t("noBkashFound")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              );
            })()}
          </div>
        )}

        {tab === "customers" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>{t("customersTitle")}</h2>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "all", label: t("allCount", { count: customers.length }) },
                  { id: "registered", label: t("registeredCount", { count: customers.filter(c => c.type === "registered" || c.type === "admin").length }) },
                  { id: "guest", label: t("guestCount", { count: customers.filter(c => c.type === "guest").length }) },
                ].map(f => (
                  <button key={f.id} onClick={() => setCustomerFilter(f.id)} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid", cursor: "pointer", fontSize: 12, fontWeight: 500, borderColor: customerFilter === f.id ? "var(--charcoal)" : "var(--border)", background: customerFilter === f.id ? "var(--charcoal)" : "transparent", color: customerFilter === f.id ? "#fff" : "var(--muted)" }}>{f.label}</button>
                ))}
              </div>
            </div>
            {customersLoading && <p style={{ color: "var(--muted)" }}>{t("loadingCustomers")}</p>}
            {!customersLoading && (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {[t("colCustomer"), t("colType"), t("colContact"), t("colOrders"), t("colTotalSpent"), t("colJoinedLastOrder")].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers
                      .filter(c => {
                        if (customerFilter === "all") return true;
                        if (customerFilter === "registered") return c.type === "registered" || c.type === "admin";
                        return c.type === customerFilter;
                      })
                      .map(c => (
                        <tr key={c._id} style={{ ...s.tr, cursor: c.type === "guest" ? "default" : "pointer" }} onClick={() => openCustomerDetail(c)}>
                          <td style={s.td}>
                            <div style={{ fontWeight: 500 }}>{c.name || "—"}</div>
                          </td>
                          <td style={s.td}>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                              textTransform: "uppercase", letterSpacing: "0.03em",
                              background: c.type === "admin" ? "#EDE9FE" : c.type === "guest" ? "#F3F4F6" : "#DCFCE7",
                              color: c.type === "admin" ? "#5B21B6" : c.type === "guest" ? "#4B5563" : "#166534",
                            }}>
                              {c.type === "admin" ? t("typeAdmin") : c.type === "guest" ? t("typeGuest") : t("typeRegistered")}
                            </span>
                          </td>
                          <td style={s.td}>
                            <div style={{ fontSize: 13 }}>{c.email}</div>
                            {c.phone && <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.phone}</div>}
                          </td>
                          <td style={{ ...s.td, textAlign: "center" }}>{c.orderCount}</td>
                          <td style={s.td}>{fmt(c.totalSpent)}</td>
                          <td style={s.td}>
                            <div style={{ fontSize: 12 }}>
                              {c.joinedAt ? t("joined", { date: fmtDate(c.joinedAt) }) : t("noAccount")}
                            </div>
                            {c.lastOrderAt && (
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("lastOrder", { date: fmtDate(c.lastOrderAt) })}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    {customers.length === 0 && (
                      <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>{t("noCustomersYet")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "products" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>{t("productsTitle")}</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  className="input"
                  placeholder={t("searchProductsPlaceholder")}
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  style={{ width: 220 }}
                />
                <button
                  onClick={() => setShowLowStockOnly(v => !v)}
                  style={{
                    padding: "6px 14px", borderRadius: 20,
                    border: "1.5px solid", cursor: "pointer", fontSize: 12, fontWeight: 500,
                    borderColor: showLowStockOnly ? "var(--red)" : "var(--border)",
                    background: showLowStockOnly ? "var(--red)" : "transparent",
                    color: showLowStockOnly ? "#fff" : "var(--muted)",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  <AlertTriangle size={13} /> {t("lowStockFilter", { count: lowStockIds.size })}
                </button>
                <button className="btn" onClick={openAdd}>{t("addProduct")}</button>
              </div>
            </div>
            {prodLoading && <p style={{ color: "var(--muted)" }}>{t("loadingProducts")}</p>}
            {!prodLoading && (() => {
              const q = productSearch.trim().toLowerCase();
              const bySearch = !q ? products : products.filter(p =>
                (p.name?.en || "").toLowerCase().includes(q) ||
                (p.name?.bn || "").toLowerCase().includes(q) ||
                (p.category?.name?.en || "").toLowerCase().includes(q)
              );
              const filtered = showLowStockOnly ? bySearch.filter(p => lowStockIds.has(p._id)) : bySearch;
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const page = Math.min(productPage, totalPages);
              const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
              return (
                <>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {[t("colImage"),t("colName"),t("colCategory"),t("colPrice"),t("colStock"),t("colFeatured"),t("colBestSeller"),t("colActive"),t("colActions")].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map(p => (
                          <tr key={p._id} style={s.tr}>
                            <td style={s.td}>
                              {p.images?.[0]
                                ? <img src={p.images[0]} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                                : <div style={{ width: 48, height: 48, background: "var(--parchment)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><Gem size={20} /></div>
                              }
                            </td>
                            <td style={s.td}>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{localized(p.name, language)}</div>
                            </td>
                            <td style={{ ...s.td, fontSize: 12 }}>{p.category?.name ? localized(p.category.name, language) : "—"}</td>
                            <td style={s.td}>{fmt(p.basePrice)}</td>
                            <td style={{ ...s.td, textAlign: "center" }}>
                              <span style={{ color: p.totalStock > 0 ? "var(--green)" : "var(--red)", fontWeight: 600, fontSize: 13 }}>
                                {p.totalStock}
                              </span>
                              {lowStockIds.has(p._id) && (
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 10, fontWeight: 600, color: "var(--red)", marginTop: 2 }}>
                                  <AlertTriangle size={10} /> {t("lowBadge")}
                                </span>
                              )}
                            </td>
                            <td style={{ ...s.td, textAlign: "center" }}>{p.isFeatured ? <Star size={14} fill="var(--gold)" color="var(--gold)" style={{ display: "inline-block" }} /> : "—"}</td>
                            <td style={{ ...s.td, textAlign: "center" }}>{p.isBestSeller ? <TrendingUp size={14} color="var(--gold)" style={{ display: "inline-block" }} /> : "—"}</td>
                            <td style={{ ...s.td, textAlign: "center" }}>
                              <span style={{ color: p.isActive ? "var(--green)" : "var(--red)", fontWeight: 600, fontSize: 12 }}>
                                {p.isActive ? t("yes") : t("no")}
                              </span>
                            </td>
                            <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                              <button onClick={() => openEdit(p)} style={s.editBtn}>{t("edit")}</button>
                              <button onClick={() => setConfirmDelete(p)} style={s.delBtn}>{t("delete")}</button>
                            </td>
                          </tr>
                        ))}
                        {pageItems.length === 0 && (
                          <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>{t("noProductsFound")}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={page} totalPages={totalPages} onChange={setProductPage} />
                </>
              );
            })()}
          </div>
        )}

        {tab === "categories" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={s.pageTitle}>{t("categoriesTitle")}</h2>
              <button className="btn" onClick={openAddCategory}>{t("addCategory")}</button>
            </div>
            {catLoading && <p style={{ color: "var(--muted)" }}>{t("loadingCategories")}</p>}
            {!catLoading && (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {[t("colImage"),t("colName"),t("colSlug"),t("colOrder"),t("colTypeCategory"),t("colActions")].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((c, i, arr) => (
                      <tr key={c._id} style={s.tr}>
                        <td style={s.td}>
                          {c.image
                            ? <img src={c.image} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                            : (() => { const Icon = getCategoryIcon(c.slug); return (
                              <div style={{ width: 40, height: 40, background: "var(--parchment)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}><Icon size={18} strokeWidth={1.5} /></div>
                            ); })()
                          }
                        </td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{localized(c.name, language)}</div>
                        </td>
                        <td style={{ ...s.td, fontSize: 12, fontFamily: "monospace", color: "var(--muted)" }}>{c.slug}</td>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                          <button
                            onClick={() => handleMoveCategory(c, "up")}
                            disabled={i === 0 || catReordering}
                            style={{ ...s.editBtn, background: "var(--charcoal)", opacity: i === 0 ? 0.35 : 1, marginRight: 4, display: "inline-flex", alignItems: "center" }}
                            title={t("moveUp")}
                          ><ArrowUp size={13} /></button>
                          <button
                            onClick={() => handleMoveCategory(c, "down")}
                            disabled={i === arr.length - 1 || catReordering}
                            style={{ ...s.editBtn, background: "var(--charcoal)", opacity: i === arr.length - 1 ? 0.35 : 1, display: "inline-flex", alignItems: "center" }}
                            title={t("moveDown")}
                          ><ArrowDown size={13} /></button>
                        </td>
                        <td style={{ ...s.td, textAlign: "center" }}>
                          {c.isFixed
                            ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#EDE9FE", color: "#5B21B6", fontWeight: 600 }}>{t("fixed")}</span>
                            : <span style={{ fontSize: 11, color: "var(--muted)" }}>{t("custom")}</span>
                          }
                        </td>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                          <button onClick={() => openEditCategory(c)} style={s.editBtn}>{t("edit")}</button>
                          {!c.isFixed && (
                            <button onClick={() => setCatConfirmDelete(c)} style={s.delBtn}>{t("delete")}</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>{t("noCategoriesFound")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "coupons" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>{t("couponsTitle")}</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input className="input" placeholder={t("searchCouponPlaceholder")} value={couponSearch} onChange={e => setCouponSearch(e.target.value)} style={{ width: 200 }} />
                <select className="input" value={couponStatusFilter} onChange={e => setCouponStatusFilter(e.target.value)} style={{ width: 140 }}>
                  <option value="all">{t("allStatuses")}</option>
                  <option value="active">{t("colActive")}</option>
                  <option value="inactive">{t("inactive")}</option>
                </select>
                <button className="btn" onClick={openAddCoupon}>{t("createCoupon")}</button>
              </div>
            </div>
            {couponsLoading && <p style={{ color: "var(--muted)" }}>{t("loadingCoupons")}</p>}
            {!couponsLoading && (() => {
              const q = couponSearch.trim().toLowerCase();
              let filtered = !q ? coupons : coupons.filter(c => (c.code || "").toLowerCase().includes(q) || (c.title || "").toLowerCase().includes(q));
              if (couponStatusFilter === "active") filtered = filtered.filter(c => c.isActive);
              if (couponStatusFilter === "inactive") filtered = filtered.filter(c => !c.isActive);
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const page = Math.min(couponPage, totalPages);
              const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
              return (
                <>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead><tr>{[t("colCode"),t("colTitleCol"),t("colDiscount"),t("colValidity"),t("colUsage"),t("colStatus"),t("colActions")].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {pageItems.map(c => {
                          const expired = isCouponExpired(c);
                          const upcoming = isCouponUpcoming(c);
                          return (
                            <tr key={c._id} style={s.tr}>
                              <td style={{ ...s.td, ...s.mono }}>{c.code}</td>
                              <td style={s.td}><div style={{ fontWeight: 500, fontSize: 13 }}>{c.title}</div>{c.description && <div style={{ fontSize: 11, color: "var(--muted)", maxWidth: 220 }}>{c.description}</div>}</td>
                              <td style={{ ...s.td, fontSize: 12.5 }}>{c.discountType === "percentage" ? t("percentOff", { value: c.discountValue }) : t("amountOff", { value: fmt(c.discountValue) })}{c.maximumDiscount != null && <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("maxDiscountLabel", { amount: fmt(c.maximumDiscount) })}</div>}{c.minimumPurchase > 0 && <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("minPurchaseLabel", { amount: fmt(c.minimumPurchase) })}</div>}</td>
                              <td style={{ ...s.td, fontSize: 12 }}>{fmtDate(c.startDate)} → {fmtDate(c.endDate)}{expired && <div style={{ color: "var(--red)", fontSize: 11, fontWeight: 600 }}>{t("expiredLabel")}</div>}{!expired && upcoming && <div style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600 }}>{t("upcomingLabel")}</div>}</td>
                              <td style={{ ...s.td, textAlign: "center" }}><button onClick={() => setCouponStatsTarget(c)} style={{ ...s.editBtn, background: "var(--charcoal)" }} title={t("viewUsageStatsTitle")}>{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ""}</button></td>
                              <td style={{ ...s.td, textAlign: "center" }}><button onClick={() => handleToggleCouponStatus(c)} style={{ ...s.editBtn, background: c.isActive ? "var(--green)" : "var(--muted)", marginRight: 0 }} title={t("clickToToggleTitle")}>{c.isActive ? t("colActive") : t("inactive")}</button></td>
                              <td style={{ ...s.td, whiteSpace: "nowrap" }}><button onClick={() => openEditCoupon(c)} style={s.editBtn}>{t("edit")}</button><button onClick={() => setCouponConfirmDelete(c)} style={s.delBtn}>{t("delete")}</button></td>
                            </tr>
                          );
                        })}
                        {pageItems.length === 0 && <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>{t("noCouponsFound")}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={page} totalPages={totalPages} onChange={setCouponPage} />
                </>
              );
            })()}
          </div>
        )}

        {tab === "messages" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>{t("messagesTitle")}</h2>
              <div style={{ display: "flex", gap: 8 }}>
                {["all", "unread", "read", "replied"].map(f => (
                  <button key={f} onClick={() => setMessageFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid", cursor: "pointer", fontSize: 12, fontWeight: 500, textTransform: "capitalize", borderColor: messageFilter === f ? "var(--charcoal)" : "var(--border)", background: messageFilter === f ? "var(--charcoal)" : "transparent", color: messageFilter === f ? "#fff" : "var(--muted)" }}>{t(`msg${f.charAt(0).toUpperCase()}${f.slice(1)}`)}</button>
                ))}
              </div>
            </div>
            {messagesLoading && <p style={{ color: "var(--muted)" }}>{t("loadingMessages")}</p>}
            {!messagesLoading && (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead><tr>{[t("colName"),t("colEmail"),t("colMessage"),t("colDate"),t("colStatus"),t("colActions")].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {messages
                      .filter(m => messageFilter === "all" || m.status === messageFilter)
                      .map(m => (
                        <tr key={m._id} style={{ ...s.tr, background: m.status === "unread" ? "#FFFBEB" : "transparent" }}>
                          <td style={{ ...s.td, fontWeight: m.status === "unread" ? 600 : 400 }}>{m.name}</td>
                          <td style={{ ...s.td, fontSize: 12 }}>{m.email}</td>
                          <td style={{ ...s.td, maxWidth: 300 }}>
                            <p style={{ fontSize: 13, color: "var(--charcoal)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{m.message}</p>
                          </td>
                          <td style={{ ...s.td, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(m.createdAt)}</td>
                          <td style={s.td}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, textTransform: "capitalize",
                              background: m.status === "unread" ? "#FEF9C3" : m.status === "replied" ? "#DCFCE7" : "#F3F4F6",
                              color: m.status === "unread" ? "#854D0E" : m.status === "replied" ? "#166534" : "#4B5563",
                            }}>{t(`msg${m.status.charAt(0).toUpperCase()}${m.status.slice(1)}`)}</span>
                          </td>
                          <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                            {m.status === "unread" && <button onClick={() => handleUpdateMessageStatus(m._id, "read")} style={{ ...s.editBtn, background: "var(--charcoal)" }}>{t("markRead")}</button>}
                            {m.status !== "replied" && <button onClick={() => openReplyModal(m)} style={{ ...s.editBtn, background: "var(--green)" }}>{t("reply")}</button>}
                            {m.status === "replied" && <button onClick={() => openReplyModal(m)} style={{ ...s.editBtn, background: "var(--charcoal)" }}>{t("viewReply")}</button>}
                            <button onClick={() => handleDeleteMessage(m._id)} style={s.delBtn}>{t("delete")}</button>
                          </td>
                        </tr>
                      ))}
                    {messages.filter(m => messageFilter === "all" || m.status === messageFilter).length === 0 && (
                      <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>{t("noMessagesFound")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "chats" && (
          <div>
            <h2 style={s.pageTitle}>{t("chatsTitle")}</h2>
            {conversationsLoading && <p style={{ color: "var(--muted)" }}>{t("loading")}</p>}
            {!conversationsLoading && (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead><tr>{[t("colUser"), t("colLastMessage"), t("colMessages"), t("colUpdated"), t("colActions")].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {conversations.map(c => (
                      <tr key={c._id} style={s.tr}>
                        <td style={s.td}>{c.user?.name || t("guestBadge")}</td>
                        <td style={{ ...s.td, maxWidth: 320 }}>
                          <p style={{ fontSize: 13, color: "var(--charcoal)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{c.lastMessage}</p>
                        </td>
                        <td style={s.td}>{c.messageCount}</td>
                        <td style={{ ...s.td, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(c.updatedAt)}</td>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                          <button onClick={() => openConversationDetail(c._id)} style={s.editBtn}>{t("viewChat")}</button>
                          <button onClick={() => handleDeleteConversation(c._id)} style={s.delBtn}><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                    {conversations.length === 0 && (
                      <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>{t("noChatsFound")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "notifications" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={s.pageTitle}>{t("notifications:title")}</h2>
              {alertsUnread > 0 && (
                <button type="button" onClick={handleAlertsMarkAllRead} style={{ ...s.editBtn, background: "var(--charcoal)" }}>
                  {t("notifications:markAllRead")}
                </button>
              )}
            </div>
            {alerts.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>{t("notifications:empty")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {alerts.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => handleAlertClick(n)}
                    className="panel"
                    style={{ padding: "14px 16px", cursor: "pointer", opacity: n.read ? 0.6 : 1, display: "flex", alignItems: "flex-start", gap: 10 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: "var(--charcoal)" }}>{n.title}</p>
                      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{n.message}</p>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(n.createdAt)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleAlertDelete(e, n)}
                      aria-label={t("notifications:delete")}
                      title={t("notifications:delete")}
                      style={{
                        flexShrink: 0, width: "auto", background: "none", border: "none", cursor: "pointer",
                        color: "var(--muted)", padding: 4, display: "flex",
                        alignItems: "center", justifyContent: "center", borderRadius: 4,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div>
            <h2 style={s.pageTitle}>{t("settingsTitle")}</h2>
            {settingsLoading && <p style={{ color: "var(--muted)" }}>{t("loadingSettings")}</p>}
            {!settingsLoading && settings && (
              <div style={{ ...s.tableWrap, padding: "28px 28px 32px", maxWidth: 640 }}>
                {settingsErr && <div style={s.formErr}>{settingsErr}</div>}
                {settingsMsg && <div style={{ background: "#DCFCE7", color: "#166534", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><Check size={14} /> {settingsMsg}</div>}

                <h3 style={s.sectionTitle}>{t("pricing")}</h3>
                <label style={s.label}>
                  {t("vatRate")}
                  <input
                    className="input"
                    type="number" min="0" max="100" step="0.1"
                    value={Math.round(settings.vatRate * 1000) / 10}
                    onChange={e => setVatRate(e.target.value)}
                    style={{ maxWidth: 160 }}
                  />
                </label>
                <label style={s.label}>
                  {t("defaultDeliveryCharge")}
                  <input
                    className="input"
                    type="number" min="0"
                    value={settings.defaultDeliveryCharge}
                    onChange={e => setDefaultDelivery(e.target.value)}
                    style={{ maxWidth: 160 }}
                  />
                </label>

                <h3 style={{ ...s.sectionTitle, marginTop: 24 }}>{t("districtDeliveryCharges")}</h3>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
                  {t("districtHint")}
                </p>
                {settings.districtDeliveryCharges.map((d, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <input
                      className="input"
                      placeholder={t("districtNamePlaceholder")}
                      value={d.district}
                      onChange={e => setDistrictCharge(idx, "district", e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      className="input"
                      type="number" min="0"
                      placeholder={t("chargePlaceholder")}
                      value={d.charge}
                      onChange={e => setDistrictCharge(idx, "charge", e.target.value)}
                      style={{ width: 110 }}
                    />
                    <button onClick={() => removeDistrictCharge(idx)} style={s.delBtn}>{t("remove")}</button>
                  </div>
                ))}
                <button className="btn btn-outline" onClick={addDistrictCharge} style={{ marginTop: 4, marginBottom: 24 }}>
                  {t("addDistrict")}
                </button>

                <h3 style={{ ...s.sectionTitle, marginTop: 24 }}>{t("language")}</h3>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
                  {t("defaultLanguageHint")}
                </p>
                <label style={s.label}>
                  {t("defaultLanguage")}
                  <select
                    className="input"
                    value={settings.defaultLanguage || "en"}
                    onChange={e => setSettings(s => ({ ...s, defaultLanguage: e.target.value }))}
                    style={{ maxWidth: 160 }}
                  >
                    <option value="en">{t("english")}</option>
                    <option value="bn">{t("bangla")}</option>
                  </select>
                </label>

                <h3 style={{ ...s.sectionTitle, marginTop: 24 }}>{t("bkashSectionTitle")}</h3>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
                  {t("bkashSectionHint")}
                </p>
                <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label style={s.label}>
                      {t("bkashMerchantNumberLabel")}
                      <input
                        className="input"
                        type="tel"
                        placeholder="01XXXXXXXXX"
                        value={settings.bkashMerchantNumber || ""}
                        onChange={e => setSettings(s => ({ ...s, bkashMerchantNumber: e.target.value }))}
                        style={{ maxWidth: 220 }}
                      />
                    </label>
                    <label style={s.label}>
                      {t("bkashNumberTypeLabel")}
                      <select
                        className="input"
                        value={settings.bkashNumberType || "personal"}
                        onChange={e => setSettings(s => ({ ...s, bkashNumberType: e.target.value }))}
                        style={{ maxWidth: 220 }}
                      >
                        <option value="personal">{t("bkashTypePersonalOpt")}</option>
                        <option value="merchant">{t("bkashTypeMerchantOpt")}</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div>
                  <button className="btn btn-gold" onClick={handleSaveSettings} disabled={settingsSaving}>
                    {settingsSaving ? t("saving") : t("saveSettings")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      </div>

      {orderDetail && (
        <div style={s.overlay} onClick={() => setOrderDetail(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{t("orderHash")}{orderDetail._id.slice(-6).toUpperCase()}</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <StatusBadge status={orderDetail.status} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(orderDetail.createdAt)}</span>
            </div>

            <h4 style={s.modalSubTitle}>{t("customer")}</h4>
            <p style={{ fontSize: 13, marginBottom: 4 }}>
              {orderDetail.user?.name || orderDetail.guestInfo?.name || "—"}
              {orderDetail.isGuest && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: "var(--muted-bg, #eee)", color: "var(--muted)" }}>{t("guestBadge")}</span>}
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
              {orderDetail.user?.email || orderDetail.guestInfo?.email} · {orderDetail.user?.phone || orderDetail.guestInfo?.phone}
            </p>

            <h4 style={s.modalSubTitle}>{t("deliveryAddress")}</h4>
            <p style={{ fontSize: 13, color: "var(--charcoal)", marginBottom: 16 }}>
              {orderDetail.address?.addressLine}, {orderDetail.address?.district}, {orderDetail.address?.city}
              {orderDetail.address?.phone && <> · <Phone size={12} style={{ verticalAlign: "-1px" }} /> {orderDetail.address.phone}</>}
            </p>

            <h4 style={s.modalSubTitle}>{t("items")}</h4>
            <div style={{ marginBottom: 16 }}>
              {orderDetail.items?.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span>{item.nameSnapshot || localized(item.product?.name, language)} × {item.quantity}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "var(--parchment)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: 13, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--muted)" }}>
                <span>{t("subtotal")}</span><span>{fmt(orderDetail.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--muted)" }}>
                <span>{t("vat")}</span><span>{fmt(orderDetail.vat)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "var(--muted)" }}>
                <span>{t("delivery")}</span><span>{fmt(orderDetail.deliveryCharge)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <span>{t("total")}</span><span>{fmt(orderDetail.totalAmount)}</span>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
              {t("payment", { method: orderDetail.payment?.method?.toUpperCase(), status: t(`orders:${orderDetail.payment?.status === "paid" ? "paid" : "unpaid"}`) })}
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setOrderDetail(null)}>{t("close")}</button>
            </div>
          </div>
        </div>
      )}

      {customerDetail && (
        <div style={s.overlay} onClick={closeCustomerDetail}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{customerDetail.user?.name || t("customer")}</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              {customerDetail.user?.email} {customerDetail.user?.phone && `· ${customerDetail.user.phone}`}
            </p>

            {customerDetailLoading && <p style={{ color: "var(--muted)" }}>{t("loading")}</p>}

            {!customerDetailLoading && customerDetail.user?._id && (
              <>
                <h4 style={s.modalSubTitle}>{t("orderHistoryCount", { count: customerDetail.orders.length })}</h4>
                <div style={{ marginBottom: 20, maxHeight: 220, overflowY: "auto" }}>
                  {customerDetail.orders.map(o => (
                    <div key={o._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={s.mono}>#{o._id.slice(-6).toUpperCase()}</span>
                      <span style={{ color: "var(--muted)" }}>{fmtDate(o.createdAt)}</span>
                      <span>{fmt(o.totalAmount)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  ))}
                  {customerDetail.orders.length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("noOrdersYet")}</p>
                  )}
                </div>

                <h4 style={s.modalSubTitle}>{t("adminResetPassword")}</h4>
                <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                  {t("resetPasswordHint")}
                </p>
                {resetPwUserId !== customerDetail.user._id ? (
                  <button className="btn btn-outline" onClick={() => { setResetPwUserId(customerDetail.user._id); setResetPwMsg(""); }}>
                    {t("resetThisCustomerPassword")}
                  </button>
                ) : (
                  <div>
                    {resetPwMsg && (
                      <div style={{ fontSize: 12, marginBottom: 8, color: resetPwOk ? "var(--green)" : "var(--red)", display: "flex", alignItems: "center", gap: 6 }}>
                        {resetPwOk ? <Check size={13} /> : <AlertTriangle size={13} />} {resetPwMsg}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 10 }}>
                      <input
                        className="input"
                        type="text"
                        placeholder={t("newPasswordPlaceholder")}
                        value={resetPwValue}
                        onChange={e => setResetPwValue(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn btn-gold"
                        disabled={resetPwSaving || !resetPwValue}
                        onClick={() => handleResetCustomerPassword(customerDetail.user._id)}
                      >
                        {resetPwSaving ? t("saving") : t("confirm")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={closeCustomerDetail}>{t("close")}</button>
            </div>
          </div>
        </div>
      )}

      {conversationDetail && (
        <div style={s.overlay} onClick={() => setConversationDetail(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{conversationDetail.user?.name || t("guestBadge")}</h3>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{conversationDetail.user?.email}</p>

            {conversationDetailLoading && <p style={{ color: "var(--muted)" }}>{t("loading")}</p>}
            {!conversationDetailLoading && (
              <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {conversationDetail.messages?.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      background: m.role === "user" ? "var(--gold-pale)" : "var(--cream-dark)",
                      color: "var(--ink)",
                    }}
                  >
                    {m.content}
                  </div>
                ))}
                {conversationDetail.messages?.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("noChatsFound")}</p>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setConversationDetail(null)}>{t("close")}</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{modal === "add" ? t("addNewProduct") : t("editProduct")}</h3>
            {formErr && <div style={s.formErr}>{formErr}</div>}
            <div className="admin-form-grid" style={s.formGrid}>
              <label style={s.label}>
                {t("nameEnglish")}
                <input className="input" name="nameEn" value={form.nameEn} onChange={setF} placeholder="e.g. Gold Necklace" />
              </label>
              <label style={s.label}>
                {t("nameBengali")}
                <input className="input" name="nameBn" value={form.nameBn} onChange={setF} placeholder="বাংলা নাম" />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                {t("descriptionEnglish")}
                <textarea className="input" name="descEn" value={form.descEn} onChange={setF} rows={2} placeholder={t("shortDescriptionPlaceholder")} style={{ resize: "vertical" }} />
              </label>

              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                {"বিবরণ (বাংলা)"}
                <textarea className="input" name="descBn" value={form.descBn} onChange={setF} rows={2} placeholder="বাংলা বিবরণ…" style={{ resize: "vertical" }} />
              </label>

              <div style={{ gridColumn: "1 / -1", marginTop: -8, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (!form.nameEn.trim()) { setFormErr("Please enter product name first!"); return; }
                    setFormErr("");
                    setAiLoading(true);
                    try {
                      const r = await generateDescription(
                        form.nameEn,
                        categories.find(c => c._id === form.category)?.name?.en,
                        form.basePrice
                      );
                      setForm(f => ({ ...f, nameBn: r.data.nameBn, descEn: r.data.en, descBn: r.data.bn }));
                    } catch {
                      setFormErr("AI generation failed. Please write manually.");
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  disabled={aiLoading}
                  style={{
                    padding: "8px 16px",
                    background: aiLoading ? "#ccc" : "var(--gold)",
                    color: "#2A1206",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: aiLoading ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {aiLoading ? "Generating..." : "Generate with AI"}
                </button>
                {form.descEn && !aiLoading && (
                  <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 10 }}>
                    Description ready! You can edit above.
                  </span>
                )}
              </div>
              <label style={s.label}>
                {t("category")}
                <select className="input" name="category" value={form.category} onChange={setF}>
                  <option value="">{t("selectPlaceholder")}</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name?.en || c.name}</option>
                  ))}
                </select>
              </label>
              <label style={s.label}>
                {t("basePrice")}
                <input className="input" name="basePrice" type="number" min="0" value={form.basePrice} onChange={setF} placeholder="0" />
              </label>
              <label style={s.label}>
                {t("stockQuantity")}
                <input className="input" name="totalStock" type="number" min="0" value={form.totalStock} onChange={setF} placeholder="0" />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                {t("images")}
                {form.images.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    {form.images.map((url, idx) => (
                      <div key={url + idx} style={{ position: "relative" }}>
                        <img src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                        <button
                          type="button"
                          onClick={() => removeProductImage(idx)}
                          title="Remove image"
                          style={{
                            position: "absolute", top: -6, right: -6, width: 20, height: 20,
                            borderRadius: "50%", border: "none", background: "var(--red)", color: "#fff",
                            cursor: "pointer", fontSize: 12, lineHeight: 1, display: "flex",
                            alignItems: "center", justifyContent: "center",
                          }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  className="input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleProductImageSelect}
                  disabled={imageUploading}
                />
                {imageUploading && <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("uploading")}</span>}
              </label>
              <label style={{ ...s.label, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={setF} style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
                {t("featuredOnHomepage")}
              </label>
              <label style={{ ...s.label, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="isBestSeller" checked={form.isBestSeller} onChange={setF} style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
                {t("bestSellingOnHomepage")}
              </label>
              <label style={{ ...s.label, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={setF} style={{ width: 16, height: 16, accentColor: "var(--green)" }} />
                {t("activeVisibleInStore")}
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={closeModal} disabled={formSaving}>{t("cancel")}</button>
              <button className="btn btn-gold" onClick={handleSaveProduct} disabled={formSaving || imageUploading}>
                {formSaving ? t("saving") : modal === "add" ? t("createProduct") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={s.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...s.modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, color: "var(--red)" }}>{t("deleteProductTitle")}</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>
              {t("deleteProductBody", { name: confirmDelete.name?.en })}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>{t("cancel")}</button>
              <button className="btn" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={() => handleDelete(confirmDelete._id)}>
                {t("yesDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {catModal && (
        <div style={s.overlay} onClick={closeCatModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{catModal === "add" ? t("addNewCategory") : t("editCategory")}</h3>
            {catFormErr && <div style={s.formErr}>{catFormErr}</div>}
            <div className="admin-form-grid" style={s.formGrid}>
              <label style={s.label}>
                {t("nameEnglish")}
                <input className="input" name="nameEn" value={catForm.nameEn} onChange={setCF} placeholder="e.g. Earrings" />
              </label>
              <label style={s.label}>
                {t("nameBengali")}
                <input className="input" name="nameBn" value={catForm.nameBn} onChange={setCF} placeholder="বাংলা নাম" />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                {t("slug")}
                <input className="input" name="slug" value={catForm.slug} onChange={setCF} placeholder="e.g. earrings" />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                {t("image")}
                {catForm.image && (
                  <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={catForm.image} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: 12, padding: "5px 10px" }}
                      onClick={() => {
                        if (catForm.image.startsWith("/uploads/")) {
                          setPendingDeleteCatImages(prev => [...prev, catForm.image]);
                        }
                        setCatForm(f => ({ ...f, image: "" }));
                      }}
                    >
                      {t("removeImage")}
                    </button>
                  </div>
                )}
                <input
                  className="input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleCategoryImageSelect}
                  disabled={catImageUploading}
                />
                {catImageUploading && <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("uploading")}</span>}
              </label>
              {catModal === "add" && (
                <label style={{ ...s.label, flexDirection: "row", alignItems: "center", gap: 8, gridColumn: "1 / -1" }}>
                  <input type="checkbox" name="isFixed" checked={catForm.isFixed} onChange={setCF} style={{ width: 16, height: 16, accentColor: "var(--maroon)" }} />
                  {t("fixedCategoryCheckbox")}
                </label>
              )}
              {catModal === "edit" && catForm.isFixed && (
                <p style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <Lock size={13} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{t("fixedCategoryNote")}</span>
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={closeCatModal} disabled={catFormSaving}>{t("cancel")}</button>
              <button className="btn btn-gold" onClick={handleSaveCategory} disabled={catFormSaving || catImageUploading}>
                {catFormSaving ? t("saving") : catModal === "add" ? t("createCategory") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}

      {catConfirmDelete && (
        <div style={s.overlay} onClick={() => setCatConfirmDelete(null)}>
          <div style={{ ...s.modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, color: "var(--red)" }}>{t("deleteCategoryTitle")}</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>
              {t("deleteCategoryBody", { name: catConfirmDelete.name?.en })}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setCatConfirmDelete(null)}>{t("cancel")}</button>
              <button className="btn" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={() => handleDeleteCategory(catConfirmDelete)}>
                {t("yesDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {couponModal && (
        <div style={s.overlay} onClick={closeCouponModal}>
          <div style={{ ...s.modalBox, maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{couponModal === "add" ? t("createCouponModalTitle") : t("editCouponModalTitle")}</h3>
            {couponFormErr && <div style={s.formErr}>{couponFormErr}</div>}
            <div className="admin-form-grid" style={s.formGrid}>
              <label style={s.label}>{t("couponCodeLabel")}<input className="input" name="code" value={couponForm.code} onChange={setCouponF} placeholder={t("couponCodePlaceholder")} style={{ textTransform: "uppercase" }} /></label>
              <label style={s.label}>{t("couponTitleLabel")}<input className="input" name="title" value={couponForm.title} onChange={setCouponF} placeholder={t("couponTitlePlaceholder")} /></label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>{t("couponDescriptionLabel")}<textarea className="input" name="description" value={couponForm.description} onChange={setCouponF} rows={2} placeholder={t("couponDescriptionPlaceholder")} style={{ resize: "vertical" }} /></label>
              <label style={s.label}>{t("discountTypeLabel")}<select className="input" name="discountType" value={couponForm.discountType} onChange={setCouponF}><option value="percentage">{t("percentageOption")}</option><option value="fixed">{t("fixedAmountOption")}</option></select></label>
              <label style={s.label}>{t("discountValueLabel")}<input className="input" name="discountValue" type="number" min="0" value={couponForm.discountValue} onChange={setCouponF} placeholder={couponForm.discountType === "percentage" ? t("discountValuePercentPlaceholder") : t("discountValueFixedPlaceholder")} /></label>
              <label style={s.label}>{t("minimumPurchaseLabel")}<input className="input" name="minimumPurchase" type="number" min="0" value={couponForm.minimumPurchase} onChange={setCouponF} placeholder="0" /></label>
              <label style={s.label}>{t("maximumDiscountLabel")}<input className="input" name="maximumDiscount" type="number" min="0" value={couponForm.maximumDiscount} onChange={setCouponF} placeholder={t("noCapPlaceholder")} /></label>
              <label style={s.label}>{t("usageLimitLabel")}<input className="input" name="usageLimit" type="number" min="0" value={couponForm.usageLimit} onChange={setCouponF} placeholder={t("unlimitedPlaceholder")} /></label>
              <label style={s.label}>{t("perUserLimitLabel")}<input className="input" name="perUserLimit" type="number" min="0" value={couponForm.perUserLimit} onChange={setCouponF} placeholder={t("unlimitedPlaceholder")} /></label>
              <label style={s.label}>{t("startDateLabel")}<input className="input" name="startDate" type="date" value={couponForm.startDate} onChange={setCouponF} /></label>
              <label style={s.label}>{t("endDateLabel")}<input className="input" name="endDate" type="date" value={couponForm.endDate} onChange={setCouponF} /></label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>{t("applicableCategoriesLabel")}<select className="input" name="applicableCategories" multiple value={couponForm.applicableCategories} onChange={setCouponF} style={{ height: 84 }}>{categories.map(c => <option key={c._id} value={c._id}>{c.name?.en || c.name}</option>)}</select></label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>{t("applicableProductsLabel")}<select className="input" name="applicableProducts" multiple value={couponForm.applicableProducts} onChange={setCouponF} style={{ height: 84 }}>{products.map(p => <option key={p._id} value={p._id}>{p.name?.en || p.name}</option>)}</select></label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>{t("excludedProductsLabel")}<select className="input" name="excludedProducts" multiple value={couponForm.excludedProducts} onChange={setCouponF} style={{ height: 84 }}>{products.map(p => <option key={p._id} value={p._id}>{p.name?.en || p.name}</option>)}</select></label>
              <label style={{ ...s.label, flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="isActive" checked={couponForm.isActive} onChange={setCouponF} style={{ width: 16, height: 16, accentColor: "var(--green)" }} />{t("activeCheckboxLabel")}</label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={closeCouponModal} disabled={couponFormSaving}>{t("cancel")}</button>
              <button className="btn btn-gold" onClick={handleSaveCoupon} disabled={couponFormSaving}>{couponFormSaving ? t("saving") : couponModal === "add" ? t("createCoupon") : t("saveChanges")}</button>
            </div>
          </div>
        </div>
      )}

      {couponConfirmDelete && (
        <div style={s.overlay} onClick={() => setCouponConfirmDelete(null)}>
          <div style={{ ...s.modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, color: "var(--red)" }}>{t("deleteCouponTitle")}</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>{t("deleteCouponBody", { code: couponConfirmDelete.code })}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setCouponConfirmDelete(null)}>{t("cancel")}</button>
              <button className="btn" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={() => handleDeleteCoupon(couponConfirmDelete._id)}>{t("yesDelete")}</button>
            </div>
          </div>
        </div>
      )}

      {couponStatsTarget && (
        <div style={s.overlay} onClick={() => setCouponStatsTarget(null)}>
          <div style={{ ...s.modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{t("couponUsageTitle", { code: couponStatsTarget.code })}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={s.statCard}><div style={s.statValue}>{couponStatsTarget.usedCount}</div><div style={s.statLabel}>{t("totalUses")}</div></div>
              <div style={s.statCard}><div style={s.statValue}>{couponStatsTarget.usageLimit != null ? couponStatsTarget.usageLimit : "∞"}</div><div style={s.statLabel}>{t("usageLimitLabel")}</div></div>
              <div style={s.statCard}><div style={s.statValue}>{couponStatsTarget.perUserLimit != null ? couponStatsTarget.perUserLimit : "∞"}</div><div style={s.statLabel}>{t("perUserLimitLabel")}</div></div>
              <div style={s.statCard}><div style={s.statValue}>{couponStatsTarget.usedBy?.length || 0}</div><div style={s.statLabel}>{t("uniqueCustomers")}</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn btn-outline" onClick={() => setCouponStatsTarget(null)}>{t("close")}</button></div>
          </div>
        </div>
      )}
      {replyTarget && (
        <div style={s.overlay} onClick={closeReplyModal}>
          <div style={{ ...s.modalBox, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{t("replyToTitle", { name: replyTarget.name })}</h3>
            <div style={{ background: "var(--cream-dark)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
              {replyTarget.message}
            </div>
            {replyTarget.status === "replied" && replyTarget.reply && (
              <div style={{ marginBottom: 16 }}>
                <div style={s.modalSubTitle}>{t("previousReply")}</div>
                <div style={{ fontSize: 13, color: "var(--charcoal)", whiteSpace: "pre-wrap" }}>{replyTarget.reply}</div>
              </div>
            )}
            <label style={s.label}>
              {t("yourReply")}
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={5}
                placeholder={t("replyPlaceholder")}
                style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-body)", fontSize: 13, resize: "vertical" }}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button className="btn btn-outline" onClick={closeReplyModal}>{t("cancel")}</button>
              <button className="btn" disabled={!replyText.trim() || replySending} onClick={handleSendReply}>
                {replySending ? t("sending") : t("sendReply")}
              </button>
            </div>
          </div>
        </div>
      )}

      {bkashDetail && (
        <div style={s.overlay} onClick={closeBkashDetail}>
          <div style={{ ...s.modalBox, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{t("bkashDetailTitle")}</h3>

            <div style={{ marginBottom: 14, fontSize: 13, color: "var(--muted)" }}>
              {t("orderReference")}: <span style={s.mono}>#{(bkashDetail._id || "").toString().slice(-6).toUpperCase()}</span>
              {" · "}<BkashStatusBadge status={bkashDetail.payment?.bkash?.verificationStatus || "awaiting_submission"} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <div style={s.modalSubTitle}>{t("colCustomer")}</div>
                <div style={{ fontSize: 13 }}>{bkashDetail.user?.name || bkashDetail.guestInfo?.name || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{bkashDetail.user?.email || bkashDetail.guestInfo?.email || ""}</div>
              </div>
              <div>
                <div style={s.modalSubTitle}>{t("bkashAmount")}</div>
                <div style={{ fontSize: 13 }}>{fmt(bkashDetail.payment?.amount || bkashDetail.totalAmount || 0)}</div>
              </div>
              <div>
                <div style={s.modalSubTitle}>{t("bkashColSenderNumber")}</div>
                <div style={{ ...s.mono, fontSize: 14 }}>{bkashDetail.payment?.bkash?.senderNumber || "—"}</div>
              </div>
              <div>
                <div style={s.modalSubTitle}>{t("bkashColTrxId")}</div>
                <div style={{ ...s.mono, fontSize: 14 }}>{bkashDetail.payment?.bkash?.trxId || "—"}</div>
              </div>
            </div>

            {bkashDetail.payment?.bkash?.screenshot && (
              <div style={{ marginBottom: 16 }}>
                <div style={s.modalSubTitle}>{t("attachedPhotos")}</div>
                <a href={bkashDetail.payment.bkash.screenshot} target="_blank" rel="noreferrer">
                  <img
                    src={bkashDetail.payment.bkash.screenshot}
                    alt=""
                    style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, border: "1px solid var(--border)" }}
                  />
                </a>
              </div>
            )}

            {bkashDetail.payment?.bkash?.verificationStatus === "pending_verification" ? (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                {bkashActErr && <div style={s.formErr}>{bkashActErr}</div>}
                <label style={s.label}>
                  {t("bkashRejectionReasonLabel")}
                  <textarea
                    value={bkashRejectReason}
                    onChange={e => setBkashRejectReason(e.target.value)}
                    rows={2}
                    placeholder={t("bkashRejectionReasonPlaceholder")}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-body)", fontSize: 13, resize: "vertical" }}
                  />
                </label>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                  <button className="btn btn-outline" onClick={closeBkashDetail}>{t("cancel")}</button>
                  <button
                    className="btn"
                    style={{ background: "#B91C1C", borderColor: "#B91C1C" }}
                    disabled={bkashActing}
                    onClick={() => handleBkashDecision(false)}
                  >
                    {t("bkashReject")}
                  </button>
                  <button className="btn" disabled={bkashActing} onClick={() => handleBkashDecision(true)}>
                    {bkashActing ? t("bkashSaving") : t("bkashApprove")}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button className="btn btn-outline" onClick={closeBkashDetail}>{t("close")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
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