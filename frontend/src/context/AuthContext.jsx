import { createContext, useContext, useState, useEffect } from "react";
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  verifyTwoFactorLogin as apiVerifyTwoFactorLogin,
  deleteAccount as apiDeleteAccount,
} from "../api/auth";
import { refreshAccessToken } from "../api/client";
import { clearAccessToken } from "../api/tokenStore";
import { resetChatSession } from "../api/chat";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The access token lives in memory only, so it's gone on every fresh page
  // load — re-establish the session here using the httpOnly refresh cookie
  // before asking who's logged in. A rejected refresh just means there's no
  // valid session (guest), not an error.
  //
  // The refresh cookie itself is httpOnly (unreadable here), but a
  // same-lifecycle, non-secret "hasSession" cookie is set/cleared alongside
  // it specifically so this check can skip the call for a visitor who was
  // never logged in — otherwise every first-time guest page load fires a
  // request that's guaranteed to 401.
  useEffect(() => {
    if (!document.cookie.includes("hasSession=1")) {
      setUser(null);
      setLoading(false);
      return;
    }
    refreshAccessToken()
      .then(() => getMe())
      .then(r => setUser(r.data))
      .catch(() => { clearAccessToken(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  // The axios interceptor fires this when a request comes back 401 that a
  // silent refresh couldn't fix, so we stay in sync even outside a
  // deliberate logout() call — e.g. the refresh token itself has expired.
  useEffect(() => {
    const onUnauthorized = () => { setUser(null); resetChatSession(); };
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
    resetChatSession();
    return data;
  };

  const completeTwoFactorLogin = async (tempToken, code) => {
    const data = await apiVerifyTwoFactorLogin(tempToken, code);
    setUser(data);
    resetChatSession();
    return data;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    resetChatSession();
  };

  const deleteAccount = async (password) => {
    await apiDeleteAccount(password);
    clearAccessToken();
    setUser(null);
    resetChatSession();
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, completeTwoFactorLogin, logout, deleteAccount, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
