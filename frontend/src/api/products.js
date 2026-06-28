import client from "./client";

export const getProducts = (params = {}) => client.get("/products", { params });
export const getCategories = () => client.get("/categories");
export const getProductById = (id) => client.get(`/products/${id}`);
