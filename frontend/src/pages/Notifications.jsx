import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getNotifications, markAsRead, markAllAsRead } from "../api/notifications";
import Seo from "../components/Seo";

export default function Notifications() {
  const { t } = useTranslation("notifications");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getNotifications()
      .then(({ data }) => setNotifications(data.notifications))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleMarkRead = async (id) => {
    setNotifications((list) => list.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try { await markAsRead(id); } catch { /* best-effort */ }
  };

  const handleMarkAllRead = async () => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    try { await markAllAsRead(); } catch { /* best-effort */ }
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 24px 64px" }}>
      <Seo title={t("title")} noindex />
      <span className="eyebrow">{t("title")}</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", marginTop: 4 }}>
        {t("title")}
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("subtitle")}</p>
      <div className="divider-gold">✦</div>

      {hasUnread && (
        <button type="button" className="btn" onClick={handleMarkAllRead} style={{ padding: "8px 16px", fontSize: 13, marginBottom: 16 }}>
          {t("markAllRead")}
        </button>
      )}

      {loading && <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("loading")}</p>}

      {!loading && notifications.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("empty")}</p>
      )}

      {!loading && notifications.map((n) => (
        <div
          key={n._id}
          className="panel"
          style={{ marginBottom: 12, opacity: n.read ? 0.7 : 1, cursor: n.read ? "default" : "pointer" }}
          onClick={() => !n.read && handleMarkRead(n._id)}
        >
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{n.title}</p>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{n.message}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {new Date(n.createdAt).toLocaleString()}
            </span>
            {n.order && (
              <Link to="/orders" style={{ fontSize: 12, color: "var(--maroon)", fontWeight: 600 }}>
                {t("viewOrder")}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
