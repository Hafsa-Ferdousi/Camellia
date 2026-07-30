import axios from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";

// In dev: Vite proxy forwards /api -> http://localhost:5000/api (no CORS issues)
// In prod: set VITE_API_BASE_URL to your deployed backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const client = axios.create({
  baseURL: API_BASE_URL,
  // Needed so the httpOnly refresh-token cookie is sent/received.
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Access tokens are short-lived (15 min) and kept in memory only. When one
// expires mid-session — or on a fresh page load, since memory doesn't
// survive a reload — try a silent refresh using the httpOnly refresh cookie
// and replay the original request once, so the user is never bounced out
// just because their token aged out or the tab was reloaded.
let refreshPromise = null;

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = client
      .post("/auth/refresh")
      .then((res) => {
        setAccessToken(res.data.token);
        return res.data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const status = response?.status;
    const code = response?.data?.code;

    const isAuthEndpoint = config?.url?.startsWith("/auth/");

    if (status === 401 && code === "TOKEN_EXPIRED" && !config._retried && !isAuthEndpoint) {
      config._retried = true;
      try {
        const newToken = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${newToken}`;
        return client(config);
      } catch {
        clearAccessToken();
        window.dispatchEvent(new Event("auth:unauthorized"));
        return Promise.reject(error);
      }
    }

    // Any other 401 (invalid token, refresh itself failed, etc.) means the
    // session is genuinely over — clear it and let AuthContext react.
    if (status === 401 && getAccessToken()) {
      clearAccessToken();
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    return Promise.reject(error);
  }
);

export default client;
