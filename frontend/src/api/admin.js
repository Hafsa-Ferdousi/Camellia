import client from "./client";

export const getAdminStats  = ()          => client.get("/admin/stats");
export const getCustomers   = ()          => client.get("/admin/customers");
export const getCustomerDetail = (userId) => client.get(`/admin/customers/${userId}`);
export const resetCustomerPassword = (userId, newPassword) =>
  client.post(`/admin/customers/${userId}/reset-password`, { newPassword });
export const getAllOrders    = ()          => client.get("/orders/all");
export const updateOrderStatus = (id, status) =>
  client.patch(`/orders/${id}/status`, { status });

export const getAdminSettings = ()        => client.get("/admin/settings");
export const updateAdminSettings = (data) => client.put("/admin/settings", data);

export const getLowStockProducts = (threshold) =>
  client.get("/admin/products/low-stock", { params: threshold ? { threshold } : {} });
export const exportSalesCSV = (params) =>
  client.get("/admin/sales/export", { params, responseType: "blob" });

export const getAllProducts  = ()          => client.get("/products/admin/all");
export const createProduct   = (data)     => client.post("/products", data);
export const updateProduct   = (id, data) => client.put(`/products/${id}`, data);
export const deleteProduct   = (id)       => client.delete(`/products/${id}`);

export const getCategories   = ()         => client.get("/categories");
export const createCategory  = (data)     => client.post("/categories", data);
export const updateCategory  = (id, data) => client.put(`/categories/${id}`, data);
export const deleteCategory  = (id)       => client.delete(`/categories/${id}`);

export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return client.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const deleteUploadedImage = (url) => client.delete("/upload", { data: { url } });