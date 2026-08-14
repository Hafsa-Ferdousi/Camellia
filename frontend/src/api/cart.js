import client from "./client";

// BUG FIX #17: All cart API calls were using wrong endpoints/methods
// Backend routes: GET /cart, POST /cart, PATCH /cart/:id, DELETE /cart/:id

export const getCart = () => client.get("/cart");

export const addToCart = (productId, quantity = 1) =>
  client.post("/cart", { product: productId, quantity });

// BUG FIX #18: updateCartItem was called with (id, qty) but also needs the cart item _id
export const updateCartItem = (cartItemId, quantity) =>
  client.patch(`/cart/${cartItemId}`, { quantity });

// BUG FIX #19: removeCartItem needs the cart item _id not the product _id
export const removeCartItem = (cartItemId) => client.delete(`/cart/${cartItemId}`);

// BUG FIX #20: checkout was in cart.js but should hit /orders/checkout
// items: [{ productId, quantity }] — cart lives client-side, sent directly (same shape as guestCheckout)
export const checkout = (items, address, paymentMethod, couponCode) =>
  client.post("/orders/checkout", { items, address, paymentMethod, couponCode: couponCode || undefined });

export const getOrders = () => client.get("/orders");
export const getOrderById = (orderId) => client.get(`/orders/${orderId}`);
// Guest checkout — no account required. items: [{ productId, quantity }]
export const guestCheckout = (items, address, paymentMethod, guestInfo, couponCode) =>
  client.post("/orders/guest-checkout", { items, address, paymentMethod, guestInfo, couponCode: couponCode || undefined });

// Guest order tracking — no account required. Looks an order up by email
// plus either the order ID or the phone number used at checkout.
export const guestLookupOrder = ({ email, orderId, phone, name }) =>
  client.post("/orders/guest-lookup", { email, orderId, phone, name });