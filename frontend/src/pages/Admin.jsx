import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAdminStats,
  getAllOrders,
  updateOrderStatus,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
} from "../api/admin";

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

// ── blank product form ────────────────────────────────────────
const BLANK_PRODUCT = {
  nameEn: "", nameBn: "",
  descEn: "", descBn: "",
  category: "", basePrice: "",
  images: "", isFeatured: false, isActive: true,
};

// ═══════════════════════════════════════════════════════════════
export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  // overview
  const [stats, setStats]       = useState(null);
  const [statsErr, setStatsErr] = useState("");

  // orders
  const [orders, setOrders]           = useState([]);
  const [ordersLoading, setOL]        = useState(false);
  const [statusUpdating, setSU]       = useState(null);

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

  // ── auth guard ──────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

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

  const loadProducts = useCallback(async () => {
    setPL(true);
    try {
      const [pr, cr] = await Promise.all([getAllProducts(), getCategories()]);
      setProducts(pr.data);
      setCategories(cr.data);
    } finally { setPL(false); }
  }, []);

  useEffect(() => {
    if (tab === "overview") loadStats();
    if (tab === "orders")   loadOrders();
    if (tab === "products") loadProducts();
  }, [tab, loadStats, loadOrders, loadProducts]);

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
    images:      form.images.split(",").map(s => s.trim()).filter(Boolean),
    isFeatured:  form.isFeatured,
    isActive:    form.isActive,
  });

  const handleSaveProduct = async () => {
    if (!form.nameEn.trim()) return setFormErr("Product name (English) is required.");
    if (!form.category)      return setFormErr("Please select a category.");
    if (!form.basePrice || isNaN(Number(form.basePrice))) return setFormErr("Enter a valid base price.");
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

  // ── guards ───────────────────────────────────────────────────
  if (authLoading) return <div style={s.center}>Loading…</div>;
  if (!user || user.role !== "admin") return null;

  // ════════════════════════════════════════════════════════════
  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">Camellia</div>
        <div className="admin-sidebar-role">Admin Panel</div>
        {[
          { id: "overview", label: "📊  Overview" },
          { id: "orders",   label: "📦  Orders" },
          { id: "products", label: "💎  Products" },
        ].map(t => (
          <button
            key={t.id}
            className={`admin-nav-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginTop: "auto", padding: "0 20px 20px" }}>
          <button
            className="admin-nav-btn"
            onClick={() => navigate("/")}
            style={{ opacity: 0.55, fontSize: 12 }}
          >
            ← Back to Store
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
                <div style={s.statGrid}>
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
                        <tr key={o._id} style={s.tr}>
                          <td style={s.td}><span style={s.mono}>#{o._id.slice(-6).toUpperCase()}</span></td>
                          <td style={s.td}>{o.user?.name || "—"}<br/><span style={{ fontSize: 12, color: "var(--muted)" }}>{o.user?.email}</span></td>
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
            <h2 style={s.pageTitle}>All Orders</h2>
            {ordersLoading && <p style={{ color: "var(--muted)" }}>Loading orders…</p>}
            {!ordersLoading && (
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
                    {orders.map(o => (
                      <tr key={o._id} style={s.tr}>
                        <td style={s.td}><span style={s.mono}>#{o._id.slice(-6).toUpperCase()}</span></td>
                        <td style={s.td}>
                          <div style={{ fontSize: 13 }}>{o.user?.name || "—"}</div>
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
                    {orders.length === 0 && (
                      <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>No orders yet.</td></tr>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={s.pageTitle}>Products</h2>
              <button className="btn" onClick={openAdd}>+ Add Product</button>
            </div>
            {prodLoading && <p style={{ color: "var(--muted)" }}>Loading products…</p>}
            {!prodLoading && (
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
                    {products.map(p => (
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
                    {products.length === 0 && (
                      <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>No products found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── PRODUCT MODAL ── */}
      {modal && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{modal === "add" ? "Add New Product" : "Edit Product"}</h3>

            {formErr && <div style={s.formErr}>{formErr}</div>}

            <div style={s.formGrid}>
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
  formGrid:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" },
  label:        { display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--muted)", marginBottom: 14, fontWeight: 500 },
  formErr:      { background: "#FEE2E2", color: "var(--red)", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 },
};