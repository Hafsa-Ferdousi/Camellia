import client from "./client";

export const register = (data) => client.post("/auth/register", data);

export const login = async (identifier, password) => {
  // identifier can be email or username — backend accepts both
  const payload = identifier.includes("@")
    ? { email: identifier, password }
    : { username: identifier, password };
  const res = await client.post("/auth/login", payload);
  localStorage.setItem("token", res.data.token);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
};

export const getMe = () => client.get("/auth/me");
