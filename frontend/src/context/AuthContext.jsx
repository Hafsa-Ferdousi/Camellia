import { createContext, useContext, useState, useEffect } from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    getMe()
      .then(r => setUser(r.data))
      .catch(() => { apiLogout(); })
      .finally(() => setLoading(false));
  }, []);

  // identifier = email or username, backend accepts both
  const login = async (identifier, password) => {
    await apiLogin(identifier, password);
    const r = await getMe();
    setUser(r.data);
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
