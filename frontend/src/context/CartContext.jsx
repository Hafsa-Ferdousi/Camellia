import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "camellia_guest_cart";
const CartContext = createContext(null);

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// A cart line is uniquely identified by productId
const lineKey = (productId) => `${productId}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => { saveCart(items); }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      const key = lineKey(product._id);
      const existing = prev.find(i => lineKey(i.productId) === key);
      if (existing) {
        return prev.map(i =>
          lineKey(i.productId) === key
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { productId: product._id, quantity, product }];
    });
  }, []);

  const updateQty = useCallback((productId, quantity) => {
    if (quantity < 1) return;
    setItems(prev =>
      prev.map(i =>
        lineKey(i.productId) === lineKey(productId)
          ? { ...i, quantity }
          : i
      )
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => lineKey(i.productId) !== lineKey(productId)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const refresh = useCallback(() => {}, []); // kept for old call sites

  return (
    <CartContext.Provider value={{ items, count, addItem, updateQty, removeItem, clearCart, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);