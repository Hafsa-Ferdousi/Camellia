import axios from "axios";

// In dev: Vite proxy forwards /api -> http://localhost:5000/api (no CORS issues)
// In prod: set VITE_API_BASE_URL to your deployed backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
