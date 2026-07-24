import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
} from "../api/admin";
import {
  getAllCoupons,
  createCoupon as createCouponApi,
  updateCoupon as updateCouponApi,
  deleteCoupon as deleteCouponApi,
  setCouponStatus,
} from "../api/coupons";

// ── helpers ──────────────────────────────────────────────────
const STATUS_COLORS = {
  pending:    { bg: "#FEF9C3", color: "#854D0E" },
  confirmed:  { bg: "#DBEAFE", color: "#1E40AF" },
  processing: { bg: "#EDE9FE", color: "#5B21B6" },
  shipped:    { bg: "#CFFAFE", color: "#0E7490" },
  delivered:  { bg: "#DCFCE7", color: "#166534" },
  cancelled:  { bg: "#FEE2E2", color: "#991B1B" },
};
const ORDER_STATUSES = ["pending","confirmed","processing","shipped","delivered","cancelled"];

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || { bg: "#F3F4F6", color: "#374151" };
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      textTransform: "capitalize", whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
};

const fmt = (n) => `৳${Number(n).toLocaleString("en-BD")}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
const fmtDayLabel = (isoDate) => new Date(isoDate).toLocaleDateString("en-BD", { weekday: "short" });

// Simple dependency-free bar chart — no charting library in this project.
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
  const total = Math.max(1, Object.values(data).reduce((a, b) => a + b, 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 4px 0" }}>
      {Object.entries(data).map(([status, count]) => {
        const c = STATUS_COLORS[status] || { bg: "#F3F4F6", color: "#374151" };
        return (
          <div key={status}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span style={{ textTransform: "capitalize", color: "var(--muted)" }}>{status}</span>
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
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{ ...pagBtnStyle, opacity: page === 1 ? 0.4 : 1 }}
      >← Prev</button>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>Page {page} of {totalPages}</span>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        style={{ ...pagBtnStyle, opacity: page === totalPages ? 0.4 : 1 }}
      >Next →</button>
    </div>
  );
};
const pagBtnStyle = { padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--ivory)", cursor: "pointer", fontSize: 12 };

// ── blank product form ────────────────────────────────────────
const BLANK_PRODUCT = {
  nameEn: "", nameBn: "",
  descEn: "", descBn: "",
  category: "", basePrice: "", totalStock: "",
  images: "", isFeatured: false, isActive: true,
};

// ── blank category form ─────────────────────────────────────────
const BLANK_CATEGORY = { nameEn: "", nameBn: "", slug: "", image: "", isFixed: false };

// ── blank coupon form ────────────────────────────────────────────
const BLANK_COUPON = {
  code: "", title: "", description: "",
  discountType: "percentage", discountValue: "",
  minimumPurchase: "", maximumDiscount: "",
  usageLimit: "", perUserLimit: "",
  startDate: "", endDate: "",
  applicableProducts: [], applicableCategories: [], excludedProducts: [],
  isActive: true,
};

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const isCouponExpired = (c) => new Date(c.endDate) < new Date();
const isCouponUpcoming = (c) => new Date(c.startDate) > new Date();

const slugify = (str) =>
  (str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ═══════════════════════════════════════════════════════════════
export default function Admin() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  // overview
  const [stats, setStats]       = useState(null);
  const [statsErr, setStatsErr] = useState("");

  // orders
  const [orders, setOrders]           = useState([]);
  const [ordersLoading, setOL]        = useState(false);
  const [statusUpdating, setSU]       = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPage, setOrderPage]     = useState(1);
  const [orderDetail, setOrderDetail] = useState(null); // selected order for detail modal

  // customers
  const [customers, setCustomers]         = useState([]);
  const [customersLoading, setCustL]      = useState(false);
  const [customerFilter, setCustomerFilter] = useState("all"); // all | registered | guest
  const [customerDetail, setCustomerDetail]   = useState(null); // { user, orders } | null
  const [customerDetailLoading, setCDL]       = useState(false);
  const [resetPwUserId, setResetPwUserId]     = useState(null);
  const [resetPwValue, setResetPwValue]       = useState("");
  const [resetPwMsg, setResetPwMsg]           = useState("");
  const [resetPwSaving, setResetPwSaving]     = useState(false);

  // products
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [prodLoading, setPL]          = useState(false);
  const [modal, setModal]             = useState(null); // null | "add" | "edit"
  const [editTarget, setEditTarget]   = useState(null);
  const [form, setForm]               = useState(BLANK_PRODUCT);
  const [formErr, setFormErr]         = useState("");
  const [formSaving, setFormSaving]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage]     = useState(1);

  // settings
  const [settings, setSettings]           = useState(null);
  const [settingsLoading, setSTL]         = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg]     = useState("");
  const [settingsErr, setSettingsErr]     = useState("");

  const PAGE_SIZE = 10;

  // categories
  const [catLoading, setCL]               = useState(false);
  const [catModal, setCatModal]           = useState(null); // null | "add" | "edit"
  const [catEditTarget, setCatEditTarget] = useState(null);
  const [catForm, setCatForm]             = useState(BLANK_CATEGORY);
  const [catFormErr, setCatFormErr]       = useState("");
  const [catFormSaving, setCatFormSaving] = useState(false);
  const [catConfirmDelete, setCatConfirmDelete] = useState(null);
  const [catReordering, setCatReordering] = useState(null); // category _id currently being moved

  // coupons
  const [coupons, setCoupons]             = useState([]);
  const [couponsLoading, setCoL]           = useState(false);
  const [couponSearch, setCouponSearch]     = useState("");
  const [couponStatusFilter, setCouponStatusFilter] = useState("all"); // all | active | inactive
  const [couponModal, setCouponModal]       = useState(null); // null | "add" | "edit"
  const [couponEditTarget, setCouponEditTarget] = useState(null);
  const [couponForm, setCouponForm]         = useState(BLANK_COUPON);
  const [couponFormErr, setCouponFormErr]   = useState("");
  const [couponFormSaving, setCouponFormSaving] = useState(false);
  const [couponConfirmDelete, setCouponConfirmDelete] = useState(null);
  const [couponStatsTarget, setCouponStatsTarget] = useState(null); // coupon shown in usage-stats modal
  const [couponPage, setCouponPage]         = useState(1);

  // ── data loaders ────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const r = await getAdminStats();
      setStats(r.data);
    } catch {
      setStatsErr("Could not load stats.");
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOL(true);
    try {
      const r = await getAllOrders();
      setOrders(r.data);
    } finally { setOL(false); }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustL(true);
    try {
      const r = await getCustomers();
      setCustomers(r.data);
    } finally { setCustL(false); }
  }, []);

  const loadProducts = useCallback(async () => {
    setPL(true);
    try {
      const [pr, cr] = await Promise.all([getAllProducts(), getCategories()]);
      setProducts(pr.data);
      setCategories(cr.data);
    } finally { setPL(false); }
  }, []);

  const loadCategories = useCallback(async () => {
    setCL(true);
    try {
      const r = await getCategories();
      setCategories(r.data);
    } finally { setCL(false); }
  }, []);

  const loadSettings = useCallback(async () => {
    setSTL(true);
    try {
      const r = await getAdminSettings();
      setSettings(r.data);
    } finally { setSTL(false); }
  }, []);

  const loadCoupons = useCallback(async () => {
    setCoL(true);
    try {
      const [cr, pr, catr] = await Promise.all([getAllCoupons(), getAllProducts(), getCategories()]);
      setCoupons(cr.data);
      setProducts(pr.data);
      setCategories(catr.data);
    } finally { setCoL(false); }
  }, []);

  useEffect(() => {
    if (tab === "overview")   loadStats();
    if (tab === "orders")     loadOrders();
    if (tab === "customers")  loadCustomers();
    if (tab === "products")   loadProducts();
    if (tab === "categories") loadCategories();
    if (tab === "settings")   loadSettings();
    if (tab === "coupons")    loadCoupons();
  }, [tab, loadStats, loadOrders, loadCustomers, loadProducts, loadCategories, loadSettings, loadCoupons]);

  // Reset to page 1 whenever the underlying filtered set changes.
  useEffect(() => { setOrderPage(1); }, [orderSearch, orderStatusFilter]);
  useEffect(() => { setProductPage(1); }, [productSearch]);
  useEffect(() => { setCouponPage(1); }, [couponSearch, couponStatusFilter]);

  // ── customer detail / admin reset-password ─────────────────────
  const openCustomerDetail = async (c) => {
    if (c.type === "guest") return; // no account to drill into
    setCDL(true);
    setCustomerDetail({ user: { name: c.name, email: c.email }, orders: [] }); // placeholder while loading
    try {
      const r = await getCustomerDetail(c._id);
      setCustomerDetail(r.data);
    } catch {
      setCustomerDetail(null);
    } finally {
      setCDL(false);
    }
  };
  const closeCustomerDetail = () => {
    setCustomerDetail(null);
    setResetPwUserId(null);
    setResetPwValue("");
    setResetPwMsg("");
  };
  const handleResetCustomerPassword = async (userId) => {
    setResetPwSaving(true);
    setResetPwMsg("");
    try {
      await resetCustomerPassword(userId, resetPwValue);
      setResetPwMsg("✓ Password reset successfully.");
      setResetPwValue("");
    } catch (err) {
      setResetPwMsg(err.response?.data?.message || "Could not reset password.");
    } finally {
      setResetPwSaving(false);
    }
  };

  // ── settings form helpers ───────────────────────────────────────
  const setVatRate = (pct) => setSettings(s => ({ ...s, vatRate: Number(pct) / 100 }));
  const setDefaultDelivery = (v) => setSettings(s => ({ ...s, defaultDeliveryCharge: Number(v) }));
  const setDistrictCharge = (idx, field, value) => setSettings(s => ({
    ...s,
    districtDeliveryCharges: s.districtDeliveryCharges.map((d, i) =>
      i === idx ? { ...d, [field]: field === "charge" ? Number(value) : value } : d
    ),
  }));
  const addDistrictCharge = () => setSettings(s => ({
    ...s,
    districtDeliveryCharges: [...s.districtDeliveryCharges, { district: "", charge: 0 }],
  }));
  const removeDistrictCharge = (idx) => setSettings(s => ({
    ...s,
    districtDeliveryCharges: s.districtDeliveryCharges.filter((_, i) => i !== idx),
  }));
  const handleSaveSettings = async () => {
    if (settings.districtDeliveryCharges.some(d => !d.district.trim())) {
      setSettingsErr("Every district row needs a name (or remove it).");
      return;
    }
    setSettingsErr(""); setSettingsMsg(""); setSettingsSaving(true);
    try {
      const r = await updateAdminSettings(settings);
      setSettings(r.data);
      setSettingsMsg("✓ Settings saved.");
    } catch (err) {
      setSettingsErr(err.response?.data?.message || "Save failed.");
    } finally {
      setSettingsSaving(false);
    }
  };

  // ── order status update ─────────────────────────────────────
  const handleStatusChange = async (orderId, newStatus) => {
    setSU(orderId);
    try {
      const r = await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o._id === orderId ? r.data : o));
    } catch { /* keep old */ } finally { setSU(null); }
  };

  // ── product form helpers ─────────────────────────────────────
  const openAdd = () => {
    setForm({ ...BLANK_PRODUCT, category: categories[0]?._id || "" });
    setEditTarget(null);
    setFormErr("");
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
      images:     (p.images || []).join(", "),
      isFeatured: p.isFeatured || false,
      isActive:   p.isActive !== false,
    });
    setEditTarget(p);
    setFormErr("");
    setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditTarget(null); };

  const setF = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const buildPayload = () => ({
    name:        { en: form.nameEn.trim(), bn: form.nameBn.trim() },
    description: { en: form.descEn.trim(), bn: form.descBn.trim() },
    category:    form.category,
    basePrice:   Number(form.basePrice),
    totalStock:  Number(form.totalStock) || 0,
    images:      form.images.split(",").map(s => s.trim()).filter(Boolean),
    isFeatured:  form.isFeatured,
    isActive:    form.isActive,
  });

  const handleSaveProduct = async () => {
    if (!form.nameEn.trim()) return setFormErr("Product name (English) is required.");
    if (!form.category)      return setFormErr("Please select a category.");
    if (!form.basePrice || isNaN(Number(form.basePrice))) return setFormErr("Enter a valid base price.");
    if (form.totalStock === "" || isNaN(Number(form.totalStock)) || Number(form.totalStock) < 0)
      return setFormErr("Enter a valid stock quantity.");
    setFormErr(""); setFormSaving(true);
    try {
      if (modal === "add") {
        const r = await createProduct(buildPayload());
        setProducts(prev => [r.data, ...prev]);
      } else {
        const r = await updateProduct(editTarget._id, buildPayload());
        setProducts(prev => prev.map(p => p._id === editTarget._id ? r.data : p));
      }
      closeModal();
    } catch (err) {
      setFormErr(err.response?.data?.message || "Save failed.");
    } finally { setFormSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch { /* ignore */ }
    setConfirmDelete(null);
  };

  // ── category form helpers ───────────────────────────────────────
  const openAddCategory = () => {
    setCatForm(BLANK_CATEGORY);
    setCatEditTarget(null);
    setCatFormErr("");
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
    setCatModal("edit");
  };

  const closeCatModal = () => { setCatModal(null); setCatEditTarget(null); };

  const setCF = (e) => {
    const { name, value, type, checked } = e.target;
    setCatForm(f => {
      const next = { ...f, [name]: type === "checkbox" ? checked : value };
      // Auto-fill the slug from the English name while adding, unless the
      // admin has already typed a slug of their own.
      if (name === "nameEn" && catModal === "add" && (!f.slug || f.slug === slugify(f.nameEn))) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSaveCategory = async () => {
    if (!catForm.nameEn.trim()) return setCatFormErr("Category name (English) is required.");
    if (!catForm.slug.trim())   return setCatFormErr("Slug is required.");
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
      closeCatModal();
    } catch (err) {
      setCatFormErr(err.response?.data?.message || "Save failed.");
    } finally { setCatFormSaving(false); }
  };

  const handleDeleteCategory = async (cat) => {
    try {
      await deleteCategory(cat._id);
      setCategories(prev => prev.filter(c => c._id !== cat._id));
    } catch (err) {
      setCatFormErr(err.response?.data?.message || "Delete failed.");
    }
    setCatConfirmDelete(null);
  };

  // Swaps sortOrder with the adjacent category and persists both, so the
  // ordering shown in the customer-facing category section can be curated.
  const handleMoveCategory = async (cat, direction) => {
    const sorted = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const idx = sorted.findIndex(c => c._id === cat._id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];
    setCatReordering(a._id);
    try {
      const [ra, rb] = await Promise.all([
        updateCategory(a._id, { sortOrder: b.sortOrder }),
        updateCategory(b._id, { sortOrder: a.sortOrder }),
      ]);
      setCategories(prev => {
        const next = prev.map(c => {
          if (c._id === ra.data._id) return ra.data;
          if (c._id === rb.data._id) return rb.data;
          return c;
        });
        return next.sort((x, y) => (x.sortOrder || 0) - (y.sortOrder || 0));
      });
    } finally {
      setCatReordering(null);
    }
  };

  // ── coupon form helpers ──────────────────────────────────────────
  const openAddCoupon = () => {
    setCouponForm(BLANK_COUPON);
    setCouponEditTarget(null);
    setCouponFormErr("");
    setCouponModal("add");
  };

  const openEditCoupon = (c) => {
    setCouponForm({
      code: c.code || "",
      title: c.title || "",
      description: c.description || "",
      discountType: c.discountType || "percentage",
      discountValue: c.discountValue ?? "",
      minimumPurchase: c.minimumPurchase ?? "",
      maximumDiscount: c.maximumDiscount ?? "",
      usageLimit: c.usageLimit ?? "",
      perUserLimit: c.perUserLimit ?? "",
      startDate: toDateInput(c.startDate),
      endDate: toDateInput(c.endDate),
      applicableProducts: (c.applicableProducts || []).map(p => p._id || p),
      applicableCategories: (c.applicableCategories || []).map(cat => cat._id || cat),
      excludedProducts: (c.excludedProducts || []).map(p => p._id || p),
      isActive: c.isActive !== false,
    });
    setCouponEditTarget(c);
    setCouponFormErr("");
    setCouponModal("edit");
  };

  const closeCouponModal = () => { setCouponModal(null); setCouponEditTarget(null); };

  const setCouponF = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "select-multiple") {
      const values = Array.from(e.target.selectedOptions).map(o => o.value);
      setCouponForm(f => ({ ...f, [name]: values }));
      return;
    }
    setCouponForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const buildCouponPayload = () => ({
    code: couponForm.code.trim().toUpperCase(),
    title: couponForm.title.trim(),
    description: couponForm.description.trim(),
    discountType: couponForm.discountType,
    discountValue: Number(couponForm.discountValue),
    minimumPurchase: couponForm.minimumPurchase === "" ? 0 : Number(couponForm.minimumPurchase),
    maximumDiscount: couponForm.maximumDiscount === "" ? null : Number(couponForm.maximumDiscount),
    usageLimit: couponForm.usageLimit === "" ? null : Number(couponForm.usageLimit),
    perUserLimit: couponForm.perUserLimit === "" ? null : Number(couponForm.perUserLimit),
    startDate: couponForm.startDate,
    endDate: couponForm.endDate,
    applicableProducts: couponForm.applicableProducts,
    applicableCategories: couponForm.applicableCategories,
    excludedProducts: couponForm.excludedProducts,
    isActive: couponForm.isActive,
  });

  const handleSaveCoupon = async () => {
    if (!couponForm.code.trim())  return setCouponFormErr("Coupon code is required.");
    if (!couponForm.title.trim()) return setCouponFormErr("Title is required.");
    if (!couponForm.discountValue || isNaN(Number(couponForm.discountValue)) || Number(couponForm.discountValue) <= 0)
      return setCouponFormErr("Enter a valid discount value.");
    if (couponForm.discountType === "percentage" && Number(couponForm.discountValue) > 100)
      return setCouponFormErr("Percentage discount cannot exceed 100.");
    if (!couponForm.startDate || !couponForm.endDate)
      return setCouponFormErr("Start and end dates are required.");
    if (new Date(couponForm.startDate) >= new Date(couponForm.endDate))
      return setCouponFormErr("End date must be after start date.");

    setCouponFormErr(""); setCouponFormSaving(true);
    try {
      if (couponModal === "add") {
        const r = await createCouponApi(buildCouponPayload());
        setCoupons(prev => [r.data, ...prev]);
      } else {
        const r = await updateCouponApi(couponEditTarget._id, buildCouponPayload());
        setCoupons(prev => prev.map(c => c._id === couponEditTarget._id ? r.data : c));
      }
      closeCouponModal();
    } catch (err) {
      setCouponFormErr(err.response?.data?.message || "Save failed.");
    } finally { setCouponFormSaving(false); }
  };

  const handleDeleteCoupon = async (id) => {
    try {
      await deleteCouponApi(id);
      setCoupons(prev => prev.filter(c => c._id !== id));
    } catch { /* ignore */ }
    setCouponConfirmDelete(null);
  };

  const handleToggleCouponStatus = async (c) => {
    try {
      const r = await setCouponStatus(c._id, !c.isActive);
      setCoupons(prev => prev.map(x => x._id === c._id ? r.data : x));
    } catch { /* ignore */ }
  };

  // ── guards ───────────────────────────────────────────────────
  if (authLoading) return <div style={s.center}>Loading…</div>;
  if (!user || user.role !== "admin") return null;

  // ════════════════════════════════════════════════════════════
  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <Link to="/" className="admin-sidebar-logo" style={{ textDecoration: "none" }}>Camellia</Link>
        <div className="admin-sidebar-role">Admin Panel</div>
        {[
          { id: "overview",   label: "📊  Overview" },
          { id: "orders",     label: "📦  Orders" },
          { id: "customers",  label: "👥  Customers" },
          { id: "products",   label: "💎  Products" },
          { id: "categories", label: "🏷️  Categories" },
          { id: "coupons",    label: "🎟️  Coupons" },
          { id: "settings",   label: "⚙️  Settings" },
        ].map(t => (
          <button
            key={t.id}
            className={`admin-nav-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginTop: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
          <button
            className="admin-nav-btn"
            onClick={() => navigate("/")}
            style={{ opacity: 0.55, fontSize: 12 }}
          >
            ← Back to Store
          </button>
          <button
            className="admin-nav-btn admin-logout-btn"
            onClick={async () => { await logout(); navigate("/"); }}
            style={{ fontSize: 12.5 }}
          >
            ⎋  Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="admin-main">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <h2 style={s.pageTitle}>Overview</h2>
            {statsErr && <p style={s.err}>{statsErr}</p>}
            {!stats && !statsErr && <p style={{ color: "var(--muted)" }}>Loading…</p>}
            {stats && (
              <>
                {/* Stat cards */}
                <div className="admin-stat-grid" style={s.statGrid}>
                  {[
                    { label: "Total Revenue",  value: fmt(stats.totalRevenue),  icon: "💰" },
                    { label: "Total Orders",   value: stats.totalOrders,         icon: "📦" },
                    { label: "Customers",      value: stats.totalUsers,          icon: "👥" },
                    { label: "Active Products",value: stats.totalProducts,       icon: "💎" },
                  ].map(c => (
                    <div key={c.label} style={s.statCard}>
                      <div style={s.statIcon}>{c.icon}</div>
                      <div style={s.statValue}>{c.value}</div>
                      <div style={s.statLabel}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Charts */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 32 }} className="admin-chart-grid">
                  <div style={s.chartCard}>
                    <h3 style={s.sectionTitle}>Revenue — Last 7 Days</h3>
                    <RevenueTrendChart data={stats.revenueTrend} />
                  </div>
                  <div style={s.chartCard}>
                    <h3 style={s.sectionTitle}>Orders by Status</h3>
                    <StatusBreakdownChart data={stats.statusCounts} />
                  </div>
                </div>

                {/* Recent orders */}
                <h3 style={{ ...s.sectionTitle, marginTop: 32 }}>Recent Orders</h3>
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["Order ID","Customer","Date","Amount","Status"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map(o => (
                        <tr key={o._id} style={{ ...s.tr, cursor: "pointer" }} onClick={() => setOrderDetail(o)}>
                          <td style={s.td}><span style={s.mono}>#{o._id.slice(-6).toUpperCase()}</span></td>
                          <td style={s.td}>{o.user?.name || o.guestInfo?.name || "—"}{o.isGuest && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: "var(--muted-bg, #eee)", color: "var(--muted)" }}>Guest</span>}<br/><span style={{ fontSize: 12, color: "var(--muted)" }}>{o.user?.email || o.guestInfo?.email}</span></td>
                          <td style={s.td}>{fmtDate(o.createdAt)}</td>
                          <td style={s.td}>{fmt(o.totalAmount)}</td>
                          <td style={s.td}><StatusBadge status={o.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === "orders" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>All Orders</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  className="input"
                  placeholder="Search order ID, name, or email…"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  style={{ width: 240 }}
                />
                <select className="input" value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} style={{ width: 160 }}>
                  <option value="all">All statuses</option>
                  {ORDER_STATUSES.map(st => (
                    <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            {ordersLoading && <p style={{ color: "var(--muted)" }}>Loading orders…</p>}
            {!ordersLoading && (() => {
              const q = orderSearch.trim().toLowerCase();
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
                          {["Order ID","Customer","Date","Items","Amount","Payment","Status","Update"].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map(o => (
                          <tr key={o._id} style={s.tr}>
                            <td style={{ ...s.td, cursor: "pointer" }} onClick={() => setOrderDetail(o)}><span style={s.mono}>#{o._id.slice(-6).toUpperCase()}</span></td>
                            <td style={{ ...s.td, cursor: "pointer" }} onClick={() => setOrderDetail(o)}>
                              <div style={{ fontSize: 13 }}>{o.user?.name || o.guestInfo?.name || "—"}{o.isGuest && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: "var(--muted-bg, #eee)", color: "var(--muted)" }}>Guest</span>}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{o.address?.city}</div>
                            </td>
                            <td style={s.td}><span style={{ fontSize: 12 }}>{fmtDate(o.createdAt)}</span></td>
                            <td style={{ ...s.td, textAlign: "center" }}>{o.items?.length}</td>
                            <td style={s.td}>{fmt(o.totalAmount)}</td>
                            <td style={s.td}>
                              <div style={{ fontSize: 12 }}>{o.payment?.method?.toUpperCase()}</div>
                              <div style={{ fontSize: 11, color: o.payment?.status === "paid" ? "var(--green)" : "var(--muted)" }}>
                                {o.payment?.status}
                              </div>
                            </td>
                            <td style={s.td}><StatusBadge status={o.status} /></td>
                            <td style={s.td}>
                              <select
                                value={o.status}
                                disabled={statusUpdating === o._id}
                                onChange={e => handleStatusChange(o._id, e.target.value)}
                                style={s.select}
                              >
                                {ORDER_STATUSES.map(st => (
                                  <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                        {pageItems.length === 0 && (
                          <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>No orders match.</td></tr>
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

        {/* ── CUSTOMERS ── */}
        {tab === "customers" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>Customers</h2>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "all", label: `All (${customers.length})` },
                  { id: "registered", label: `Registered (${customers.filter(c => c.type === "registered" || c.type === "admin").length})` },
                  { id: "guest", label: `Guest (${customers.filter(c => c.type === "guest").length})` },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setCustomerFilter(f.id)}
                    style={{
                      padding: "6px 14px", borderRadius: 20,
                      border: "1.5px solid", cursor: "pointer", fontSize: 12, fontWeight: 500,
                      borderColor: customerFilter === f.id ? "var(--charcoal)" : "var(--border)",
                      background: customerFilter === f.id ? "var(--charcoal)" : "transparent",
                      color: customerFilter === f.id ? "#fff" : "var(--muted)",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {customersLoading && <p style={{ color: "var(--muted)" }}>Loading customers…</p>}
            {!customersLoading && (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Customer", "Type", "Contact", "Orders", "Total Spent", "Joined / Last Order"].map(h => (
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
                              {c.type === "admin" ? "Admin" : c.type === "guest" ? "Guest" : "Registered"}
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
                              {c.joinedAt ? `Joined ${fmtDate(c.joinedAt)}` : "No account"}
                            </div>
                            {c.lastOrderAt && (
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>Last order {fmtDate(c.lastOrderAt)}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    {customers.length === 0 && (
                      <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>No customers yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {tab === "products" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>Products</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  className="input"
                  placeholder="Search products…"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  style={{ width: 220 }}
                />
                <button className="btn" onClick={openAdd}>+ Add Product</button>
              </div>
            </div>
            {prodLoading && <p style={{ color: "var(--muted)" }}>Loading products…</p>}
            {!prodLoading && (() => {
              const q = productSearch.trim().toLowerCase();
              const filtered = !q ? products : products.filter(p =>
                (p.name?.en || "").toLowerCase().includes(q) ||
                (p.name?.bn || "").toLowerCase().includes(q) ||
                (p.category?.name?.en || "").toLowerCase().includes(q)
              );
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const page = Math.min(productPage, totalPages);
              const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
              return (
                <>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {["Image","Name","Category","Price","Stock","Featured","Active","Actions"].map(h => (
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
                                : <div style={{ width: 48, height: 48, background: "var(--parchment)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💎</div>
                              }
                            </td>
                            <td style={s.td}>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name?.en}</div>
                              {p.name?.bn && <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.name.bn}</div>}
                            </td>
                            <td style={{ ...s.td, fontSize: 12 }}>{p.category?.name?.en || "—"}</td>
                            <td style={s.td}>{fmt(p.basePrice)}</td>
                            <td style={{ ...s.td, textAlign: "center" }}>
                              <span style={{ color: p.totalStock > 0 ? "var(--green)" : "var(--red)", fontWeight: 600, fontSize: 13 }}>
                                {p.totalStock}
                              </span>
                            </td>
                            <td style={{ ...s.td, textAlign: "center" }}>{p.isFeatured ? "⭐" : "—"}</td>
                            <td style={{ ...s.td, textAlign: "center" }}>
                              <span style={{ color: p.isActive ? "var(--green)" : "var(--red)", fontWeight: 600, fontSize: 12 }}>
                                {p.isActive ? "Yes" : "No"}
                              </span>
                            </td>
                            <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                              <button onClick={() => openEdit(p)} style={s.editBtn}>Edit</button>
                              <button onClick={() => setConfirmDelete(p)} style={s.delBtn}>Delete</button>
                            </td>
                          </tr>
                        ))}
                        {pageItems.length === 0 && (
                          <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>No products found.</td></tr>
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

        {/* ── CATEGORIES ── */}
        {tab === "categories" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={s.pageTitle}>Categories</h2>
              <button className="btn" onClick={openAddCategory}>+ Add Category</button>
            </div>
            {catLoading && <p style={{ color: "var(--muted)" }}>Loading categories…</p>}
            {!catLoading && (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Image","Name","Slug","Order","Type","Actions"].map(h => (
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
                            : <div style={{ width: 40, height: 40, background: "var(--parchment)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏷️</div>
                          }
                        </td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name?.en}</div>
                          {c.name?.bn && <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.name.bn}</div>}
                        </td>
                        <td style={{ ...s.td, fontSize: 12, fontFamily: "monospace", color: "var(--muted)" }}>{c.slug}</td>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                          <button
                            onClick={() => handleMoveCategory(c, "up")}
                            disabled={i === 0 || catReordering}
                            style={{ ...s.editBtn, background: "var(--charcoal)", opacity: i === 0 ? 0.35 : 1, marginRight: 4 }}
                            title="Move up"
                          >↑</button>
                          <button
                            onClick={() => handleMoveCategory(c, "down")}
                            disabled={i === arr.length - 1 || catReordering}
                            style={{ ...s.editBtn, background: "var(--charcoal)", opacity: i === arr.length - 1 ? 0.35 : 1 }}
                            title="Move down"
                          >↓</button>
                        </td>
                        <td style={{ ...s.td, textAlign: "center" }}>
                          {c.isFixed
                            ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#EDE9FE", color: "#5B21B6", fontWeight: 600 }}>Fixed</span>
                            : <span style={{ fontSize: 11, color: "var(--muted)" }}>Custom</span>
                          }
                        </td>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                          <button onClick={() => openEditCategory(c)} style={s.editBtn}>Edit</button>
                          {!c.isFixed && (
                            <button onClick={() => setCatConfirmDelete(c)} style={s.delBtn}>Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>No categories found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── COUPONS ── */}
        {tab === "coupons" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <h2 style={s.pageTitle}>Coupons</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  className="input"
                  placeholder="Search code or title…"
                  value={couponSearch}
                  onChange={e => setCouponSearch(e.target.value)}
                  style={{ width: 200 }}
                />
                <select className="input" value={couponStatusFilter} onChange={e => setCouponStatusFilter(e.target.value)} style={{ width: 140 }}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button className="btn" onClick={openAddCoupon}>+ Create Coupon</button>
              </div>
            </div>
            {couponsLoading && <p style={{ color: "var(--muted)" }}>Loading coupons…</p>}
            {!couponsLoading && (() => {
              const q = couponSearch.trim().toLowerCase();
              let filtered = !q ? coupons : coupons.filter(c =>
                (c.code || "").toLowerCase().includes(q) || (c.title || "").toLowerCase().includes(q)
              );
              if (couponStatusFilter === "active")   filtered = filtered.filter(c => c.isActive);
              if (couponStatusFilter === "inactive") filtered = filtered.filter(c => !c.isActive);

              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const page = Math.min(couponPage, totalPages);
              const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

              return (
                <>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {["Code","Title","Discount","Validity","Usage","Status","Actions"].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map(c => {
                          const expired = isCouponExpired(c);
                          const upcoming = isCouponUpcoming(c);
                          return (
                            <tr key={c._id} style={s.tr}>
                              <td style={{ ...s.td, ...s.mono }}>{c.code}</td>
                              <td style={s.td}>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{c.title}</div>
                                {c.description && <div style={{ fontSize: 11, color: "var(--muted)", maxWidth: 220 }}>{c.description}</div>}
                              </td>
                              <td style={{ ...s.td, fontSize: 12.5 }}>
                                {c.discountType === "percentage" ? `${c.discountValue}% OFF` : `${fmt(c.discountValue)} OFF`}
                                {c.maximumDiscount != null && <div style={{ fontSize: 11, color: "var(--muted)" }}>Max {fmt(c.maximumDiscount)}</div>}
                                {c.minimumPurchase > 0 && <div style={{ fontSize: 11, color: "var(--muted)" }}>Min {fmt(c.minimumPurchase)}</div>}
                              </td>
                              <td style={{ ...s.td, fontSize: 12 }}>
                                {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
                                {expired && <div style={{ color: "var(--red)", fontSize: 11, fontWeight: 600 }}>Expired</div>}
                                {!expired && upcoming && <div style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600 }}>Upcoming</div>}
                              </td>
                              <td style={{ ...s.td, textAlign: "center" }}>
                                <button
                                  onClick={() => setCouponStatsTarget(c)}
                                  style={{ ...s.editBtn, background: "var(--charcoal)" }}
                                  title="View usage stats"
                                >
                                  {c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                                </button>
                              </td>
                              <td style={{ ...s.td, textAlign: "center" }}>
                                <button
                                  onClick={() => handleToggleCouponStatus(c)}
                                  style={{
                                    ...s.editBtn,
                                    background: c.isActive ? "var(--green)" : "var(--muted)",
                                    marginRight: 0,
                                  }}
                                  title="Click to toggle"
                                >
                                  {c.isActive ? "Active" : "Inactive"}
                                </button>
                              </td>
                              <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                                <button onClick={() => openEditCoupon(c)} style={s.editBtn}>Edit</button>
                                <button onClick={() => setCouponConfirmDelete(c)} style={s.delBtn}>Delete</button>
                              </td>
                            </tr>
                          );
                        })}
                        {pageItems.length === 0 && (
                          <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>No coupons found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={page} totalPages={totalPages} onChange={setCouponPage} />
                </>
              );
            })()}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div>
            <h2 style={s.pageTitle}>Settings</h2>
            {settingsLoading && <p style={{ color: "var(--muted)" }}>Loading settings…</p>}
            {!settingsLoading && settings && (
              <div style={{ ...s.tableWrap, padding: "28px 28px 32px", maxWidth: 640 }}>
                {settingsErr && <div style={s.formErr}>{settingsErr}</div>}
                {settingsMsg && <div style={{ background: "#DCFCE7", color: "#166534", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{settingsMsg}</div>}

                <h3 style={s.sectionTitle}>Pricing</h3>
                <label style={s.label}>
                  VAT Rate (%)
                  <input
                    className="input"
                    type="number" min="0" max="100" step="0.1"
                    value={Math.round(settings.vatRate * 1000) / 10}
                    onChange={e => setVatRate(e.target.value)}
                    style={{ maxWidth: 160 }}
                  />
                </label>
                <label style={s.label}>
                  Default Delivery Charge (৳)
                  <input
                    className="input"
                    type="number" min="0"
                    value={settings.defaultDeliveryCharge}
                    onChange={e => setDefaultDelivery(e.target.value)}
                    style={{ maxWidth: 160 }}
                  />
                </label>

                <h3 style={{ ...s.sectionTitle, marginTop: 24 }}>District Delivery Charges</h3>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
                  Districts not listed here use the default delivery charge above.
                </p>
                {settings.districtDeliveryCharges.map((d, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <input
                      className="input"
                      placeholder="District name"
                      value={d.district}
                      onChange={e => setDistrictCharge(idx, "district", e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      className="input"
                      type="number" min="0"
                      placeholder="Charge"
                      value={d.charge}
                      onChange={e => setDistrictCharge(idx, "charge", e.target.value)}
                      style={{ width: 110 }}
                    />
                    <button onClick={() => removeDistrictCharge(idx)} style={s.delBtn}>Remove</button>
                  </div>
                ))}
                <button className="btn btn-outline" onClick={addDistrictCharge} style={{ marginTop: 4, marginBottom: 24 }}>
                  + Add District
                </button>

                <div>
                  <button className="btn btn-gold" onClick={handleSaveSettings} disabled={settingsSaving}>
                    {settingsSaving ? "Saving…" : "Save Settings"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── ORDER DETAIL MODAL ── */}
      {orderDetail && (
        <div style={s.overlay} onClick={() => setOrderDetail(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Order #{orderDetail._id.slice(-6).toUpperCase()}</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <StatusBadge status={orderDetail.status} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(orderDetail.createdAt)}</span>
            </div>

            <h4 style={s.modalSubTitle}>Customer</h4>
            <p style={{ fontSize: 13, marginBottom: 4 }}>
              {orderDetail.user?.name || orderDetail.guestInfo?.name || "—"}
              {orderDetail.isGuest && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: "var(--muted-bg, #eee)", color: "var(--muted)" }}>Guest</span>}
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
              {orderDetail.user?.email || orderDetail.guestInfo?.email} · {orderDetail.user?.phone || orderDetail.guestInfo?.phone}
            </p>

            <h4 style={s.modalSubTitle}>Delivery Address</h4>
            <p style={{ fontSize: 13, color: "var(--charcoal)", marginBottom: 16 }}>
              {orderDetail.address?.addressLine}, {orderDetail.address?.district}, {orderDetail.address?.city}
              {orderDetail.address?.phone && <> · 📞 {orderDetail.address.phone}</>}
            </p>

            <h4 style={s.modalSubTitle}>Items</h4>
            <div style={{ marginBottom: 16 }}>
              {orderDetail.items?.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span>{item.nameSnapshot || item.product?.name?.en} × {item.quantity}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--parchment)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: 13, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--muted)" }}>
                <span>Subtotal</span><span>{fmt(orderDetail.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--muted)" }}>
                <span>VAT</span><span>{fmt(orderDetail.vat)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "var(--muted)" }}>
                <span>Delivery</span><span>{fmt(orderDetail.deliveryCharge)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <span>Total</span><span>{fmt(orderDetail.totalAmount)}</span>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
              Payment: {orderDetail.payment?.method?.toUpperCase()} · {orderDetail.payment?.status}
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setOrderDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER DETAIL MODAL ── */}
      {customerDetail && (
        <div style={s.overlay} onClick={closeCustomerDetail}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{customerDetail.user?.name || "Customer"}</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              {customerDetail.user?.email} {customerDetail.user?.phone && `· ${customerDetail.user.phone}`}
            </p>

            {customerDetailLoading && <p style={{ color: "var(--muted)" }}>Loading…</p>}

            {!customerDetailLoading && customerDetail.user?._id && (
              <>
                <h4 style={s.modalSubTitle}>Order History ({customerDetail.orders.length})</h4>
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
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>No orders yet.</p>
                  )}
                </div>

                <h4 style={s.modalSubTitle}>Admin: Reset Password</h4>
                <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                  Use this if the customer can't reset their own password (e.g. forgot their security answer too — there's no email service to fall back on).
                </p>
                {resetPwUserId !== customerDetail.user._id ? (
                  <button className="btn btn-outline" onClick={() => { setResetPwUserId(customerDetail.user._id); setResetPwMsg(""); }}>
                    Reset This Customer's Password
                  </button>
                ) : (
                  <div>
                    {resetPwMsg && <div style={{ fontSize: 12, marginBottom: 8, color: resetPwMsg.startsWith("✓") ? "var(--green)" : "var(--red)" }}>{resetPwMsg}</div>}
                    <div style={{ display: "flex", gap: 10 }}>
                      <input
                        className="input"
                        type="text"
                        placeholder="New password"
                        value={resetPwValue}
                        onChange={e => setResetPwValue(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn btn-gold"
                        disabled={resetPwSaving || !resetPwValue}
                        onClick={() => handleResetCustomerPassword(customerDetail.user._id)}
                      >
                        {resetPwSaving ? "Saving…" : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={closeCustomerDetail}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCT MODAL ── */}
      {modal && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{modal === "add" ? "Add New Product" : "Edit Product"}</h3>

            {formErr && <div style={s.formErr}>{formErr}</div>}

            <div className="admin-form-grid" style={s.formGrid}>
              <label style={s.label}>
                Name (English) *
                <input className="input" name="nameEn" value={form.nameEn} onChange={setF} placeholder="e.g. Gold Necklace" />
              </label>
              <label style={s.label}>
                Name (Bengali)
                <input className="input" name="nameBn" value={form.nameBn} onChange={setF} placeholder="বাংলা নাম" />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Description (English)
                <textarea className="input" name="descEn" value={form.descEn} onChange={setF} rows={2} placeholder="Short description…" style={{ resize: "vertical" }} />
              </label>
              <label style={s.label}>
                Category *
                <select className="input" name="category" value={form.category} onChange={setF}>
                  <option value="">— select —</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name?.en || c.name}</option>
                  ))}
                </select>
              </label>
              <label style={s.label}>
                Base Price (৳) *
                <input className="input" name="basePrice" type="number" min="0" value={form.basePrice} onChange={setF} placeholder="0" />
              </label>
              <label style={s.label}>
                Stock Quantity *
                <input className="input" name="totalStock" type="number" min="0" value={form.totalStock} onChange={setF} placeholder="0" />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Image URLs <span style={{ color: "var(--faint)", fontWeight: 400 }}>(comma-separated)</span>
                <input className="input" name="images" value={form.images} onChange={setF} placeholder="/products/image.jpg, https://..." />
              </label>
              <label style={{ ...s.label, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={setF} style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
                Featured on homepage
              </label>
              <label style={{ ...s.label, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={setF} style={{ width: 16, height: 16, accentColor: "var(--green)" }} />
                Active (visible in store)
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={closeModal} disabled={formSaving}>Cancel</button>
              <button className="btn btn-gold" onClick={handleSaveProduct} disabled={formSaving}>
                {formSaving ? "Saving…" : modal === "add" ? "Create Product" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE MODAL ── */}
      {confirmDelete && (
        <div style={s.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...s.modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, color: "var(--red)" }}>Delete Product?</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>
              "<strong>{confirmDelete.name?.en}</strong>" will be hidden from the store. This cannot be undone easily.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={() => handleDelete(confirmDelete._id)}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── CATEGORY MODAL ── */}
      {catModal && (
        <div style={s.overlay} onClick={closeCatModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{catModal === "add" ? "Add New Category" : "Edit Category"}</h3>

            {catFormErr && <div style={s.formErr}>{catFormErr}</div>}

            <div className="admin-form-grid" style={s.formGrid}>
              <label style={s.label}>
                Name (English) *
                <input className="input" name="nameEn" value={catForm.nameEn} onChange={setCF} placeholder="e.g. Earrings" />
              </label>
              <label style={s.label}>
                Name (Bengali)
                <input className="input" name="nameBn" value={catForm.nameBn} onChange={setCF} placeholder="বাংলা নাম" />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Slug *
                <input className="input" name="slug" value={catForm.slug} onChange={setCF} placeholder="e.g. earrings" />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Image URL
                <input className="input" name="image" value={catForm.image} onChange={setCF} placeholder="/categories/earrings.jpg" />
              </label>
              {catModal === "add" && (
                <label style={{ ...s.label, flexDirection: "row", alignItems: "center", gap: 8, gridColumn: "1 / -1" }}>
                  <input type="checkbox" name="isFixed" checked={catForm.isFixed} onChange={setCF} style={{ width: 16, height: 16, accentColor: "var(--maroon)" }} />
                  Fixed category (cannot be deleted later)
                </label>
              )}
              {catModal === "edit" && catForm.isFixed && (
                <p style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 8 }}>
                  🔒 This is a fixed category and cannot be deleted. Its name, slug, and image can still be edited.
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={closeCatModal} disabled={catFormSaving}>Cancel</button>
              <button className="btn btn-gold" onClick={handleSaveCategory} disabled={catFormSaving}>
                {catFormSaving ? "Saving…" : catModal === "add" ? "Create Category" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE CATEGORY MODAL ── */}
      {catConfirmDelete && (
        <div style={s.overlay} onClick={() => setCatConfirmDelete(null)}>
          <div style={{ ...s.modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, color: "var(--red)" }}>Delete Category?</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>
              "<strong>{catConfirmDelete.name?.en}</strong>" will be removed. Products already in this category will keep their reference to it.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setCatConfirmDelete(null)}>Cancel</button>
              <button className="btn" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={() => handleDeleteCategory(catConfirmDelete)}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COUPON MODAL ── */}
      {couponModal && (
        <div style={s.overlay} onClick={closeCouponModal}>
          <div style={{ ...s.modalBox, maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{couponModal === "add" ? "Create Coupon" : "Edit Coupon"}</h3>

            {couponFormErr && <div style={s.formErr}>{couponFormErr}</div>}

            <div className="admin-form-grid" style={s.formGrid}>
              <label style={s.label}>
                Coupon Code *
                <input className="input" name="code" value={couponForm.code} onChange={setCouponF} placeholder="e.g. EID2026" style={{ textTransform: "uppercase" }} />
              </label>
              <label style={s.label}>
                Title *
                <input className="input" name="title" value={couponForm.title} onChange={setCouponF} placeholder="e.g. Eid Offer" />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Description
                <textarea className="input" name="description" value={couponForm.description} onChange={setCouponF} rows={2} placeholder="Shown to customers…" style={{ resize: "vertical" }} />
              </label>

              <label style={s.label}>
                Discount Type *
                <select className="input" name="discountType" value={couponForm.discountType} onChange={setCouponF}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (৳)</option>
                </select>
              </label>
              <label style={s.label}>
                Discount Value *
                <input className="input" name="discountValue" type="number" min="0" value={couponForm.discountValue} onChange={setCouponF} placeholder={couponForm.discountType === "percentage" ? "e.g. 20" : "e.g. 500"} />
              </label>

              <label style={s.label}>
                Minimum Purchase (৳)
                <input className="input" name="minimumPurchase" type="number" min="0" value={couponForm.minimumPurchase} onChange={setCouponF} placeholder="0" />
              </label>
              <label style={s.label}>
                Maximum Discount (৳) <span style={{ color: "var(--faint)", fontWeight: 400 }}>(percentage cap)</span>
                <input className="input" name="maximumDiscount" type="number" min="0" value={couponForm.maximumDiscount} onChange={setCouponF} placeholder="No cap" />
              </label>

              <label style={s.label}>
                Usage Limit <span style={{ color: "var(--faint)", fontWeight: 400 }}>(total uses)</span>
                <input className="input" name="usageLimit" type="number" min="0" value={couponForm.usageLimit} onChange={setCouponF} placeholder="Unlimited" />
              </label>
              <label style={s.label}>
                Per-User Limit
                <input className="input" name="perUserLimit" type="number" min="0" value={couponForm.perUserLimit} onChange={setCouponF} placeholder="Unlimited" />
              </label>

              <label style={s.label}>
                Start Date *
                <input className="input" name="startDate" type="date" value={couponForm.startDate} onChange={setCouponF} />
              </label>
              <label style={s.label}>
                End Date *
                <input className="input" name="endDate" type="date" value={couponForm.endDate} onChange={setCouponF} />
              </label>

              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Applicable Categories <span style={{ color: "var(--faint)", fontWeight: 400 }}>(empty = all categories)</span>
                <select className="input" name="applicableCategories" multiple value={couponForm.applicableCategories} onChange={setCouponF} style={{ height: 84 }}>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name?.en || c.name}</option>
                  ))}
                </select>
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Applicable Products <span style={{ color: "var(--faint)", fontWeight: 400 }}>(empty = all products)</span>
                <select className="input" name="applicableProducts" multiple value={couponForm.applicableProducts} onChange={setCouponF} style={{ height: 84 }}>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name?.en || p.name}</option>
                  ))}
                </select>
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Excluded Products
                <select className="input" name="excludedProducts" multiple value={couponForm.excludedProducts} onChange={setCouponF} style={{ height: 84 }}>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name?.en || p.name}</option>
                  ))}
                </select>
              </label>

              <label style={{ ...s.label, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="isActive" checked={couponForm.isActive} onChange={setCouponF} style={{ width: 16, height: 16, accentColor: "var(--green)" }} />
                Active
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={closeCouponModal} disabled={couponFormSaving}>Cancel</button>
              <button className="btn btn-gold" onClick={handleSaveCoupon} disabled={couponFormSaving}>
                {couponFormSaving ? "Saving…" : couponModal === "add" ? "Create Coupon" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE COUPON MODAL ── */}
      {couponConfirmDelete && (
        <div style={s.overlay} onClick={() => setCouponConfirmDelete(null)}>
          <div style={{ ...s.modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, color: "var(--red)" }}>Delete Coupon?</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>
              "<strong>{couponConfirmDelete.code}</strong>" will be permanently deleted. Customers will no longer be able to apply it.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setCouponConfirmDelete(null)}>Cancel</button>
              <button className="btn" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={() => handleDeleteCoupon(couponConfirmDelete._id)}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COUPON USAGE STATS MODAL ── */}
      {couponStatsTarget && (
        <div style={s.overlay} onClick={() => setCouponStatsTarget(null)}>
          <div style={{ ...s.modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Usage — {couponStatsTarget.code}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={s.statCard}>
                <div style={s.statValue}>{couponStatsTarget.usedCount}</div>
                <div style={s.statLabel}>Total Uses</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statValue}>{couponStatsTarget.usageLimit != null ? couponStatsTarget.usageLimit : "∞"}</div>
                <div style={s.statLabel}>Usage Limit</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statValue}>{couponStatsTarget.perUserLimit != null ? couponStatsTarget.perUserLimit : "∞"}</div>
                <div style={s.statLabel}>Per-User Limit</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statValue}>{couponStatsTarget.usedBy?.length || 0}</div>
                <div style={s.statLabel}>Unique Customers</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setCouponStatsTarget(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── inline styles ─────────────────────────────────────────────
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