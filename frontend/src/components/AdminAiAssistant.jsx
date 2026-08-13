import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Menu, Plus, X } from "lucide-react";
import {
  sendAdminAssistantMessage,
  getAdminAssistantHistory,
  getAdminAssistantConversations,
  getAdminAssistantSessionId,
  startNewAdminAssistantSession,
  setActiveAdminAssistantSessionId,
} from "../api/adminChat";

// Admin-only store-management chatbot, opened from the admin sidebar as a
// drawer that overlays whatever tab is currently active — it never
// navigates away from the dashboard view underneath it. This component is
// only ever mounted inside Admin.jsx, which is itself gated by
// <ProtectedRoute adminOnly> and its own `user.role !== "admin"` guard, so
// no extra auth check is needed here; the backend independently enforces
// admin-only access on /api/admin/ai-assistant/* via protect + adminOnly.
export default function AdminAiAssistant({ open, onClose, title }) {
  const { t } = useTranslation("common");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [sessionId, setSessionId] = useState(getAdminAssistantSessionId());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  const loadHistory = useCallback((id) => {
    setHistoryLoaded(false);
    getAdminAssistantHistory(id)
      .then(({ data }) => setMessages(data.messages.map((m) => ({ role: m.role, content: m.content }))))
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoaded(true));
  }, []);

  const loadConversations = useCallback(() => {
    getAdminAssistantConversations()
      .then(({ data }) => setConversations(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      loadHistory(sessionId);
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleNewChat() {
    const id = startNewAdminAssistantSession();
    setSessionId(id);
    setMessages([]);
    setHistoryLoaded(true);
    setSidebarOpen(false);
  }

  function handleSelectConversation(id) {
    if (id === sessionId) { setSidebarOpen(false); return; }
    setActiveAdminAssistantSessionId(id);
    setSessionId(id);
    loadHistory(id);
    setSidebarOpen(false);
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const isFirstMessage = messages.length === 0;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const { data } = await sendAdminAssistantMessage(sessionId, text);
      setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
      // A brand-new conversation just got its first turn — refresh the
      // history list so it shows up without waiting for the drawer to reopen.
      if (isFirstMessage) loadConversations();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", content: t("chatError", "Sorry, something went wrong. Please try again.") },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div style={s.backdrop} onClick={onClose} />
      <div style={s.drawer} role="dialog" aria-modal="true" aria-label={title}>
        <div style={s.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              style={s.iconBtn}
              aria-label={t("chatHistory", "Chat history")}
              aria-expanded={sidebarOpen}
            >
              <Menu size={17} />
            </button>
            <Bot size={17} />
            <span style={s.headerTitle}>{title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              onClick={handleNewChat}
              style={s.iconBtn}
              aria-label={t("chatNew", "New chat")}
              title={t("chatNew", "New chat")}
            >
              <Plus size={16} />
            </button>
            <button type="button" onClick={onClose} style={s.iconBtn} aria-label={t("closeChat", { defaultValue: "Close" })}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body + sidebar share this positioning context so the history
            sidebar can overlay in from the left without resizing the
            drawer itself. */}
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div ref={bodyRef} style={s.body}>
            {historyLoaded && messages.length === 0 && (
              <p style={s.emptyState}>{t("chatGreetingAdmin", "Hi! Ask me about orders, inventory, or sales.")}</p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ ...s.bubble, ...(m.role === "user" ? s.bubbleUser : s.bubbleModel) }}>
                {m.content}
              </div>
            ))}
            {sending && <div style={{ ...s.bubble, ...s.bubbleModel }}>…</div>}
          </div>

          <form onSubmit={handleSend} style={s.inputRow}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chatPlaceholder", "Type a message…")}
              style={s.input}
              disabled={sending}
            />
            <button type="submit" style={s.sendBtn} disabled={sending || !input.trim()}>
              {t("chatSend", "Send")}
            </button>
          </form>

          {sidebarOpen && (
            <>
              <div style={s.sidebarBackdrop} onClick={() => setSidebarOpen(false)} />
              <div style={s.sidebar}>
                <button type="button" onClick={handleNewChat} style={s.newChatBtn}>
                  <Plus size={14} /> {t("chatNew", "New chat")}
                </button>
                <div style={s.sidebarList}>
                  {conversations.length === 0 ? (
                    <p style={s.sidebarEmpty}>{t("chatNoHistory", "No past conversations yet.")}</p>
                  ) : (
                    conversations.map((c) => (
                      <button
                        key={c.sessionId}
                        type="button"
                        onClick={() => handleSelectConversation(c.sessionId)}
                        style={{
                          ...s.sidebarItem,
                          ...(c.sessionId === sessionId ? s.sidebarItemActive : {}),
                        }}
                      >
                        {c.title}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const s = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(28,10,15,0.45)",
    zIndex: 1000,
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: 380,
    maxWidth: "calc(100vw - 32px)",
    zIndex: 1001,
    display: "flex",
    flexDirection: "column",
    background: "var(--ivory)",
    borderLeft: "1px solid rgba(244,196,48,0.25)",
    boxShadow: "-4px 0 24px rgba(0,0,0,0.25)",
  },
  header: {
    background: "linear-gradient(135deg, var(--maroon-dark) 0%, var(--maroon) 55%, var(--maroon-dark) 100%)",
    color: "var(--gold-pale, #FCEFC7)",
    padding: "16px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  headerTitle: { fontFamily: "var(--font-display)", fontSize: 17, fontStyle: "italic" },
  iconBtn: {
    background: "none",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    borderRadius: 6,
  },
  sidebarBackdrop: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.15)",
    zIndex: 4,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: "78%",
    maxWidth: 260,
    zIndex: 5,
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    background: "var(--cream)",
    boxShadow: "4px 0 12px rgba(0,0,0,0.12)",
    overflow: "hidden",
  },
  newChatBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    margin: 10,
    padding: "9px 12px",
    background: "var(--gold)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  sidebarList: { flex: 1, overflowY: "auto", padding: "0 8px 8px" },
  sidebarEmpty: { color: "var(--muted)", fontSize: 12.5, padding: "8px 6px", textAlign: "center" },
  sidebarItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "none",
    border: "none",
    borderRadius: 6,
    padding: "9px 10px",
    fontSize: 13,
    color: "var(--ink, #2D2D2D)",
    cursor: "pointer",
    marginBottom: 2,
  },
  sidebarItemActive: { background: "var(--gold-pale, #FCEFC7)", fontWeight: 600 },
  body: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 },
  emptyState: { color: "var(--muted)", fontSize: 13.5, textAlign: "center", marginTop: 32 },
  bubble: { maxWidth: "88%", padding: "9px 13px", borderRadius: 10, fontSize: 13.5, lineHeight: 1.55 },
  bubbleUser: { alignSelf: "flex-end", background: "var(--gold-pale, #FCEFC7)", color: "var(--ink, #2D2D2D)" },
  bubbleModel: { alignSelf: "flex-start", background: "var(--cream-dark)", color: "var(--ink, #2D2D2D)" },
  inputRow: { display: "flex", borderTop: "1px solid var(--border)", padding: 12, gap: 8, flexShrink: 0 },
  input: {
    flex: 1,
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13.5,
    outline: "none",
  },
  sendBtn: {
    background: "var(--gold)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};
