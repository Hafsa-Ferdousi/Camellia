import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCart } from "../api/cart";
import { useAuth } from "./AuthContext";

const CartContext = createContext({ count: 0, refresh: () => {} });

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!user) { setCount(0); return; }
    getCart()
      .then(r => setCount(r.data.reduce((s, i) => s + i.quantity, 0)))
      .catch(() => {});
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <CartContext.Provider value={{ count, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
