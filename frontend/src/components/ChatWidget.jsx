import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { sendChatMessage, getChatHistory, getSessionId } from "../api/chat";

export default function ChatWidget() {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bodyRef = useRef(null);

  // Restore any prior conversation for this session so reopening the widget
  // (or reloading the page) doesn't lose history the backend already has.
  const loadHistory = useCallback(() => {
    setHistoryLoaded(false);
    getChatHistory(getSessionId())
      .then(({ data }) => {
        setMessages(data.messages.map((m) => ({ role: m.role, content: m.content })));
      })
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoaded(true));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // A login/logout elsewhere in the app starts a fresh session id (see
  // AuthContext) — reload so this browser never keeps showing the previous
  // person's conversation after the identity underneath it changes.
  useEffect(() => {
    window.addEventListener("chat:session-reset", loadHistory);
    return () => window.removeEventListener("chat:session-reset", loadHistory);
  }, [loadHistory]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, open]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const { data } = await sendChatMessage(getSessionId(), text);
      setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", content: t("chatError", "Sorry, something went wrong. Please try again.") },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={s.root}>
      {open && (
        <div style={s.panel}>
          <div style={s.header}>
            <span style={s.headerTitle}>{t("chatTitle", "Chat with us")}</span>
            <button type="button" onClick={() => setOpen(false)} style={s.closeBtn} aria-label="Close chat">
              ×
            </button>
          </div>

          <div ref={bodyRef} style={s.body}>
            {historyLoaded && messages.length === 0 && (
              <p style={s.emptyState}>
                {t("chatGreeting", "Hi! Ask me about products, orders, or shipping.")}
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
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={s.toggleBtn}
        aria-label={t("chatTitle", "Chat with us")}
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
    background: "var(--maroon, #6B1F2A)",
    color: "var(--gold-pale, #F5E6C3)",
    fontSize: 24,
    cursor: "pointer",
    boxShadow: "var(--shadow-lg, 0 8px 32px rgba(107,31,42,0.16))",
  },
  panel: {
    position: "absolute",
    bottom: 68,
    right: 0,
    width: 320,
    maxHeight: 440,
    display: "flex",
    flexDirection: "column",
    background: "var(--ivory, #FFFDF7)",
    border: "1px solid var(--border, #E8D9C0)",
    borderRadius: "var(--radius-lg, 12px)",
    boxShadow: "var(--shadow-lg, 0 8px 32px rgba(107,31,42,0.16))",
    overflow: "hidden",
  },
  header: {
    background: "var(--maroon, #6B1F2A)",
    color: "var(--gold-pale, #F5E6C3)",
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontFamily: "var(--font-display, serif)", fontSize: 18, fontStyle: "italic" },
  closeBtn: { background: "none", border: "none", color: "inherit", fontSize: 20, cursor: "pointer", lineHeight: 1 },
  body: { flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 200 },
  emptyState: { color: "var(--muted, #6B5B4E)", fontSize: 13, textAlign: "center", marginTop: 24 },
  bubble: { maxWidth: "85%", padding: "8px 12px", borderRadius: 10, fontSize: 13.5, lineHeight: 1.5 },
  bubbleUser: { alignSelf: "flex-end", background: "var(--gold-pale, #F5E6C3)", color: "var(--ink, #2D2D2D)" },
  bubbleModel: { alignSelf: "flex-start", background: "var(--cream-dark, #F5ECD8)", color: "var(--ink, #2D2D2D)" },
  inputRow: { display: "flex", borderTop: "1px solid var(--border, #E8D9C0)", padding: 8, gap: 6 },
  input: {
    flex: 1,
    border: "1px solid var(--border, #E8D9C0)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13.5,
    outline: "none",
  },
  sendBtn: {
    background: "var(--gold, #B8860B)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
  },
};
