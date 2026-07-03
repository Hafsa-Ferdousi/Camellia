import axios from "axios";

// In dev: Vite proxy forwards /api -> http://localhost:5000/api (no CORS issues)
// In prod: set VITE_API_BASE_URL to your deployed backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const client = axios.create({
  baseURL: API_BASE_URL,
<<<<<<< HEAD
  // Needed so the httpOnly refresh-token cookie is sent/received.
  withCredentials: true,
=======
>>>>>>> develop
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

<<<<<<< HEAD
// Access tokens are short-lived (15 min). When one expires mid-session, try
// a silent refresh using the httpOnly refresh cookie and replay the
// original request once, so the user is never bounced out just because
// their token aged out under them.
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = client
      .post("/auth/refresh")
      .then((res) => {
        localStorage.setItem("token", res.data.token);
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
        localStorage.removeItem("token");
        window.dispatchEvent(new Event("auth:unauthorized"));
        return Promise.reject(error);
      }
    }

    // Any other 401 (invalid token, refresh itself failed, etc.) means the
    // session is genuinely over — clear it and let AuthContext react.
    if (status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    return Promise.reject(error);
  }
);

=======
>>>>>>> develop
export default client;
