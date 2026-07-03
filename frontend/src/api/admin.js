import client from "./client";

export const getAdminStats  = ()          => client.get("/admin/stats");
export const getAllOrders    = ()          => client.get("/orders/all");
export const updateOrderStatus = (id, status) =>
  client.patch(`/orders/${id}/status`, { status });

export const getAllProducts  = ()          => client.get("/products");
export const createProduct   = (data)     => client.post("/products", data);
export const updateProduct   = (id, data) => client.put(`/products/${id}`, data);
export const deleteProduct   = (id)       => client.delete(`/products/${id}`);

export const getCategories   = ()         => client.get("/categories");