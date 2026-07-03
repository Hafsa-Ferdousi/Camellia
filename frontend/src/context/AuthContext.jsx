import { createContext, useContext, useState, useEffect } from "react";
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  verifyTwoFactorLogin as apiVerifyTwoFactorLogin,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Load user on mount if token exists ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // --- Listen for global 401 events (from axios interceptor) ---
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  // --- Login with optional 2FA ---
  const login = async (identifier, password) => {
    const data = await apiLogin(identifier, password);
    if (data.twoFactorRequired) {
      // Return the tempToken to the caller; they must call completeTwoFactorLogin
      return data;
    }
    setUser(data);
    return data;
  };

  // --- Complete 2FA login ---
  const completeTwoFactorLogin = async (tempToken, code) => {
    const data = await apiVerifyTwoFactorLogin(tempToken, code);
    setUser(data);
    return data;
  };

  // --- Logout ---
  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore server errors – we clear local state anyway
    } finally {
      setUser(null);
      localStorage.removeItem("token");
      // loading state can stay as is; we don't set loading to false because we're not fetching
    }
  };

  // --- Provide context value ---
  const value = {
    user,
    setUser, // exposed for special cases (e.g., profile updates)
    login,
    completeTwoFactorLogin,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);