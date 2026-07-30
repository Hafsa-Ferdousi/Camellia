import client from "./client";

const SESSION_KEY = "camellia_chat_session";

export function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
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
