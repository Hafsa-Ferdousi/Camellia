import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { s, fmtDate } from "./adminShared";

// Purely presentational — the underlying alerts list/handlers live in Admin.jsx
// because the header bell dropdown needs the exact same state (a single
// source of truth, not a second independent poll/fetch).
export default function AdminNotificationsTab({ alerts, alertsUnread, onMarkAllRead, onAlertClick, onAlertDelete }) {
  const { t } = useTranslation(["admin", "notifications"]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={s.pageTitle}>{t("notifications:title")}</h2>
        {alertsUnread > 0 && (
          <button type="button" onClick={onMarkAllRead} style={{ ...s.editBtn, background: "var(--charcoal)" }}>
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
              onClick={() => onAlertClick(n)}
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
                onClick={(e) => onAlertDelete(e, n)}
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
  );
}
