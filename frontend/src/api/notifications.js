import client from "./client";

export const getNotifications = () => client.get("/notifications");

export const markAsRead = (id) => client.patch(`/notifications/${id}/read`);

export const markAllAsRead = () => client.patch("/notifications/read-all");
