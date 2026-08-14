import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import client from "../../api/client";
import { s, fmtDate } from "./adminShared";

export default function AdminMessagesTab({ onUnreadCountChange }) {
  const { t } = useTranslation("admin");

  const [messages, setMessages]         = useState([]);
  const [messagesLoading, setML]        = useState(false);
  const [messageFilter, setMessageFilter] = useState("all");
  const [replyTarget, setReplyTarget]   = useState(null);
  const [replyText, setReplyText]       = useState("");
  const [replySending, setReplySending] = useState(false);

  const loadMessages = useCallback(async () => {
    setML(true);
    try { const r = await client.get("/contact"); setMessages(r.data); }
    catch { setMessages([]); }
    finally { setML(false); }
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    onUnreadCountChange?.(messages.filter(m => m.status === "unread").length);
  }, [messages, onUnreadCountChange]);

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

  const filtered = messages.filter(m => messageFilter === "all" || m.status === messageFilter);

  return (
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
              {filtered.map(m => (
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
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: 32 }}>{t("noMessagesFound")}</td></tr>
              )}
            </tbody>
          </table>
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
    </div>
  );
}
