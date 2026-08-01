import client from "./client";

export const getProducts = (params = {}) => client.get("/products", { params });
export const getCategories = () => client.get("/categories");
export const getProductById = (id) => client.get(`/products/${id}`);
export const getRecommendations = (productId, limit = 4) =>
  client.get(`/products/recommendations/${productId}`, { params: { limit } });
export const searchProducts = (q, signal) =>
  client.get("/products/search", { params: { q }, signal });
