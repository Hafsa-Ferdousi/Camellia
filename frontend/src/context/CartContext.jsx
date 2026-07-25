import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
} from "../api/cart";

const STORAGE_KEY = "camellia_guest_cart";
const CartContext = createContext(null);

function loadGuestCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveGuestCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// A cart line is uniquely identified by productId
const lineKey = (productId) => `${productId}`;

// Normalizes a server CartItem (has _id, populated product, quantity) into
// the same shape used for guest cart lines, plus the server _id needed to
// target updates/removal.
const fromServerItem = (item) => ({
  productId: item.product._id,
  quantity: item.quantity,
  product: item.product,
  cartItemId: item._id,
});

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState(loadGuestCart);
  const [mergeDroppedCount, setMergeDroppedCount] = useState(0);
  const mergedForUserRef = useRef(null);

  // Guest cart persists to localStorage; a logged-in cart's source of truth
  // is the server, so it isn't written back to localStorage.
  useEffect(() => {
    if (!user) saveGuestCart(items);
  }, [items, user]);

  // When a user logs in, push whatever was sitting in the guest cart into
  // their account cart on the server once, then switch over to the
  // server-backed cart from then on. Logging out drops back to whatever's
  // in the guest cart storage (starts empty unless something's left there).
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      mergedForUserRef.current = null;
      setItems(loadGuestCart());
      return;
    }

    if (mergedForUserRef.current === user._id) return;
    mergedForUserRef.current = user._id;

    (async () => {
      const guestItems = loadGuestCart();
      let dropped = 0;
      for (const line of guestItems) {
        try {
          await apiAddToCart(line.productId, line.quantity);
        } catch {
          // Product went out of stock/inactive since it was added as a
          // guest — drop that line rather than block the merge, but tell
          // the user so it isn't a silent loss.
          dropped += 1;
        }
      }
      if (dropped > 0) setMergeDroppedCount(dropped);
      localStorage.removeItem(STORAGE_KEY);

      try {
        const res = await getCart();
        setItems(res.data.map(fromServerItem));
      } catch {
        setItems([]);
      }
    })();
  }, [user, authLoading]);

  const addItem = useCallback((product, quantity = 1) => {
    if (user) {
      apiAddToCart(product._id, quantity)
        .then((res) => {
          const line = fromServerItem(res.data);
          setItems((prev) => {
            const key = lineKey(product._id);
            const existing = prev.find((i) => lineKey(i.productId) === key);
            return existing
              ? prev.map((i) => (lineKey(i.productId) === key ? line : i))
              : [...prev, line];
          });
        })
        .catch(() => {});
      return;
    }
    setItems((prev) => {
      const key = lineKey(product._id);
      const existing = prev.find((i) => lineKey(i.productId) === key);
      if (existing) {
        return prev.map((i) =>
          lineKey(i.productId) === key
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { productId: product._id, quantity, product }];
    });
  }, [user]);

  const updateQty = useCallback((productId, quantity) => {
    if (quantity < 1) return;
    if (user) {
      setItems((prev) => {
        const line = prev.find((i) => lineKey(i.productId) === lineKey(productId));
        if (line?.cartItemId) {
          apiUpdateCartItem(line.cartItemId, quantity)
            .then((res) => {
              const updated = fromServerItem(res.data);
              setItems((cur) => cur.map((i) => (lineKey(i.productId) === lineKey(productId) ? updated : i)));
            })
            .catch(() => {});
        }
        return prev;
      });
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        lineKey(i.productId) === lineKey(productId) ? { ...i, quantity } : i
      )
    );
  }, [user]);

  const removeItem = useCallback((productId) => {
    if (user) {
      setItems((prev) => {
        const line = prev.find((i) => lineKey(i.productId) === lineKey(productId));
        if (line?.cartItemId) {
          apiRemoveCartItem(line.cartItemId).catch(() => {});
        }
        return prev.filter((i) => lineKey(i.productId) !== lineKey(productId));
      });
      return;
    }
    setItems((prev) => prev.filter((i) => lineKey(i.productId) !== lineKey(productId)));
  }, [user]);

  const clearCart = useCallback(() => {
    setItems([]);
    if (!user) localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const count = items.reduce((s, i) => s + i.quantity, 0);

  // Re-fetches the server cart — useful after checkout empties it server-side.
  const refresh = useCallback(() => {
    if (!user) return;
    getCart()
      .then((res) => setItems(res.data.map(fromServerItem)))
      .catch(() => {});
  }, [user]);

  const dismissMergeNotice = useCallback(() => setMergeDroppedCount(0), []);

  return (
    <CartContext.Provider value={{ items, count, addItem, updateQty, removeItem, clearCart, refresh, mergeDroppedCount, dismissMergeNotice }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
