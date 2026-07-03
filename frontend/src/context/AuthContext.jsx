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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    getMe()
      .then(r => setUser(r.data))
      .catch(() => { localStorage.removeItem("token"); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  // The axios interceptor fires this when a request comes back 401 that a
  // silent refresh couldn't fix, so we stay in sync even outside a
  // deliberate logout() call — e.g. the refresh token itself has expired.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  // identifier = email or username, backend accepts both.
  // Resolves to { twoFactorRequired: true, tempToken } if the account has
  // 2FA enabled — the caller (Login page) should then prompt for a code and
  // call completeTwoFactorLogin. Otherwise the user is now logged in.
  const login = async (identifier, password) => {
    const data = await apiLogin(identifier, password);
    if (data.twoFactorRequired) return data;
    setUser(data);
    return data;
  };

  const completeTwoFactorLogin = async (tempToken, code) => {
    const data = await apiVerifyTwoFactorLogin(tempToken, code);
    setUser(data);
    return data;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, completeTwoFactorLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
