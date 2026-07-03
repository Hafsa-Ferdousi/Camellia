import client from "./client";

// BUG FIX #17: All cart API calls were using wrong endpoints/methods
// Backend routes: GET /cart, POST /cart, PATCH /cart/:id, DELETE /cart/:id

export const getCart = () => client.get("/cart");

export const addToCart = (productId, quantity = 1, variantSku = null) =>
  client.post("/cart", { product: productId, variantSku, quantity });

// BUG FIX #18: updateCartItem was called with (id, qty) but also needs the cart item _id
export const updateCartItem = (cartItemId, quantity) =>
  client.patch(`/cart/${cartItemId}`, { quantity });

// BUG FIX #19: removeCartItem needs the cart item _id not the product _id
export const removeCartItem = (cartItemId) => client.delete(`/cart/${cartItemId}`);

// BUG FIX #20: checkout was in cart.js but should hit /orders/checkout
export const checkout = (address, paymentMethod) =>
  client.post("/orders/checkout", { address, paymentMethod });

export const getOrders = () => client.get("/orders");
