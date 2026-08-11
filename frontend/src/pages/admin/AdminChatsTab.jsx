import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { getAllConversations, getConversationById, deleteConversation as deleteConversationApi } from "../../api/admin";
import { s, fmtDate } from "./adminShared";

export default function AdminChatsTab() {
  const { t } = useTranslation("admin");

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConvL]  = useState(false);
  const [conversationDetail, setConversationDetail] = useState(null);
  const [conversationDetailLoading, setConvDL] = useState(false);

  const loadConversations = useCallback(async () => {
    setConvL(true);
    try { const r = await getAllConversations(); setConversations(r.data); }
    catch { setConversations([]); }
    finally { setConvL(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

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

  return (
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
    </div>
  );
}
