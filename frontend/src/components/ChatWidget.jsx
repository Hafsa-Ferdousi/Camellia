import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Menu, Plus } from "lucide-react";
import {
  sendChatMessage,
  getChatHistory,
  getUserConversations,
  getSessionId,
  startNewSession,
  setActiveSessionId,
} from "../api/chat";
import { useAuth } from "../context/AuthContext";

export default function ChatWidget() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeSessionId, setActiveSessionIdState] = useState(getSessionId());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bodyRef = useRef(null);

  // Restore whatever conversation is currently active so reopening the
  // widget (or reloading the page) doesn't lose history the backend has.
  const loadHistory = useCallback(() => {
    const sessionId = getSessionId();
    setActiveSessionIdState(sessionId);
    setHistoryLoaded(false);
    getChatHistory(sessionId)
      .then(({ data }) => {
        setMessages(data.messages.map((m) => ({ role: m.role, content: m.content })));
      })
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoaded(true));
  }, []);

  // The account's full list of past conversations, for the history sidebar —
  // guests have no account to attach history to, so there's nothing to list.
  const loadConversations = useCallback(() => {
    if (!user) {
      setConversations([]);
      return;
    }
    getUserConversations()
      .then(({ data }) => setConversations(data))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // A login/logout elsewhere in the app starts a fresh session id (see
  // AuthContext) — reload so this browser never keeps showing the previous
  // person's conversation after the identity underneath it changes.
  useEffect(() => {
    const onReset = () => { loadHistory(); loadConversations(); };
    window.addEventListener("chat:session-reset", onReset);
    return () => window.removeEventListener("chat:session-reset", onReset);
  }, [loadHistory, loadConversations]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, open]);

  function handleNewChat() {
    const sessionId = startNewSession();
    setActiveSessionIdState(sessionId);
    setMessages([]);
    setHistoryLoaded(true);
    setSidebarOpen(false);
  }

  function handleSelectConversation(sessionId) {
    if (sessionId === activeSessionId) { setSidebarOpen(false); return; }
    setActiveSessionId(sessionId);
    setActiveSessionIdState(sessionId);
    setHistoryLoaded(false);
    getChatHistory(sessionId)
      .then(({ data }) => setMessages(data.messages.map((m) => ({ role: m.role, content: m.content }))))
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoaded(true));
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
      const { data } = await sendChatMessage(activeSessionId, text);
      setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
      // A brand-new conversation just got its first turn — refresh the
      // sidebar so it shows up without waiting for the widget to reopen.
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

  const showSidebarToggle = !!user;

  return (
    <div style={s.root}>
      {open && (
        <div style={s.panel}>
          <div style={s.header}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {showSidebarToggle && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen((o) => !o)}
                  style={s.iconBtn}
                  aria-label={t("chatHistory", "Chat history")}
                  aria-expanded={sidebarOpen}
                >
                  <Menu size={16} />
                </button>
              )}
              <span style={s.headerTitle}>{isAdmin ? t("chatTitleAdmin", "Store assistant") : t("chatTitle", "Chat with us")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {showSidebarToggle && (
                <button
                  type="button"
                  onClick={handleNewChat}
                  style={s.iconBtn}
                  aria-label={t("chatNew", "New chat")}
                  title={t("chatNew", "New chat")}
                >
                  <Plus size={16} />
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} style={s.closeBtn} aria-label="Close chat">
                ×
              </button>
            </div>
          </div>

          {/* Body + sidebar share this positioning context so the sidebar can
              overlay in from the left without resizing (and thus shifting)
              the panel itself — the panel is anchored to the bottom-right
              corner, so a width change would visibly jump the whole widget. */}
          <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div ref={bodyRef} style={s.body}>
              {historyLoaded && messages.length === 0 && (
                <p style={s.emptyState}>
                  {isAdmin
                    ? t("chatGreetingAdmin", "Hi! Ask me about orders, inventory, or sales.")
                    : t("chatGreeting", "Hi! Ask me about products, orders, or shipping.")}
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    ...s.bubble,
                    ...(m.role === "user" ? s.bubbleUser : s.bubbleModel),
                  }}
                >
                  {m.content}
                </div>
              ))}
              {sending && <div style={{ ...s.bubble, ...s.bubbleModel }}>…</div>}
            </div>

            <form onSubmit={handleSend} style={s.inputRow}>
              <input
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

            {showSidebarToggle && sidebarOpen && (
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
                            ...(c.sessionId === activeSessionId ? s.sidebarItemActive : {}),
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
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={s.toggleBtn}
        aria-label={isAdmin ? t("chatTitleAdmin", "Store assistant") : t("chatTitle", "Chat with us")}
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}

const s = {
  root: { position: "fixed", bottom: 24, right: 24, zIndex: 1000 },
  toggleBtn: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    border: "none",
    background: "var(--maroon, #B3430A)",
    color: "var(--gold-pale, #FCEFC7)",
    fontSize: 24,
    cursor: "pointer",
    boxShadow: "var(--shadow-lg, 0 8px 32px rgba(138,67,0,0.16))",
  },
  panel: {
    position: "absolute",
    bottom: 68,
    right: 0,
    width: 320,
    maxWidth: "calc(100vw - 32px)",
    maxHeight: 440,
    display: "flex",
    flexDirection: "column",
    background: "var(--ivory, #FFFDF7)",
    border: "1px solid var(--border, #E8D9C0)",
    borderRadius: "var(--radius-lg, 12px)",
    boxShadow: "var(--shadow-lg, 0 8px 32px rgba(138,67,0,0.16))",
    overflow: "hidden",
  },
  header: {
    background: "var(--maroon, #B3430A)",
    color: "var(--gold-pale, #FCEFC7)",
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  headerTitle: { fontFamily: "var(--font-display, serif)", fontSize: 18, fontStyle: "italic" },
  closeBtn: { background: "none", border: "none", color: "inherit", fontSize: 20, cursor: "pointer", lineHeight: 1 },
  iconBtn: {
    background: "none",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
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
    maxWidth: 220,
    zIndex: 5,
    borderRight: "1px solid var(--border, #E8D9C0)",
    display: "flex",
    flexDirection: "column",
    background: "var(--cream, #FBF6EC)",
    boxShadow: "4px 0 12px rgba(0,0,0,0.12)",
    overflow: "hidden",
  },
  newChatBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    margin: 8,
    padding: "8px 10px",
    background: "var(--gold, #E8A317)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  sidebarList: { flex: 1, overflowY: "auto", padding: "0 6px 8px" },
  sidebarEmpty: { color: "var(--muted, #6B5B4E)", fontSize: 12, padding: "8px 6px", textAlign: "center" },
  sidebarItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "none",
    border: "none",
    borderRadius: 6,
    padding: "8px 8px",
    fontSize: 12.5,
    color: "var(--ink, #2D2D2D)",
    cursor: "pointer",
    marginBottom: 2,
  },
  sidebarItemActive: { background: "var(--gold-pale, #FCEFC7)", fontWeight: 600 },
  body: { flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 200 },
  emptyState: { color: "var(--muted, #6B5B4E)", fontSize: 13, textAlign: "center", marginTop: 24 },
  bubble: { maxWidth: "85%", padding: "8px 12px", borderRadius: 10, fontSize: 13.5, lineHeight: 1.5 },
  bubbleUser: { alignSelf: "flex-end", background: "var(--gold-pale, #FCEFC7)", color: "var(--ink, #2D2D2D)" },
  bubbleModel: { alignSelf: "flex-start", background: "var(--cream-dark, #F5ECD8)", color: "var(--ink, #2D2D2D)" },
  inputRow: { display: "flex", borderTop: "1px solid var(--border, #E8D9C0)", padding: 8, gap: 6, flexShrink: 0 },
  input: {
    flex: 1,
    border: "1px solid var(--border, #E8D9C0)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13.5,
    outline: "none",
  },
  sendBtn: {
    background: "var(--gold, #E8A317)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
  },
};
