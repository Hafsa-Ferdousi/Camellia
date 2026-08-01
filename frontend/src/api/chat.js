import client from "./client";

const SESSION_KEY = "camellia_chat_session";

const generateSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Starts a brand-new conversation (the "New chat" button) — a fresh sessionId
// becomes the active one; the backend creates its Conversation doc lazily on
// the first message, same as any other session.
export function startNewSession() {
  const id = generateSessionId();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

// Switches the active session to an existing conversation, e.g. one picked
// from the history sidebar.
export function setActiveSessionId(sessionId) {
  localStorage.setItem(SESSION_KEY, sessionId);
}

// Called whenever the logged-in identity changes (login, logout, 2FA
// completion) so a chat started under one account/guest never bleeds into
// the next person using the same browser — see AuthContext.
export function resetChatSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("chat:session-reset"));
}

export const sendChatMessage = (sessionId, message) =>
  client.post("/chat/message", { sessionId, message });

export const getChatHistory = (sessionId) =>
  client.get(`/chat/history/${sessionId}`);

export const getUserConversations = () =>
  client.get("/chat/conversations");
