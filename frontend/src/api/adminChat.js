import client from "./client";

const SESSION_KEY = "camellia_admin_ai_session";

const generateSessionId = () => `admin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export function getAdminAssistantSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function startNewAdminAssistantSession() {
  const id = generateSessionId();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

export function setActiveAdminAssistantSessionId(sessionId) {
  localStorage.setItem(SESSION_KEY, sessionId);
}

export const sendAdminAssistantMessage = (sessionId, message) =>
  client.post("/admin/ai-assistant/message", { sessionId, message });

export const getAdminAssistantHistory = (sessionId) =>
  client.get(`/admin/ai-assistant/history/${sessionId}`);

export const getAdminAssistantConversations = () =>
  client.get("/admin/ai-assistant/conversations");
