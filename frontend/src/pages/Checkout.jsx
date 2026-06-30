import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { addToCart, checkout as checkoutApi } from "../api/cart";

export default function Checkout() {
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState({ addressLine: "", city: "", phone: "" });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getPrice = item => {
    if (item.variantSku && item.product?.variants) {
      const v = item.product.variants.find(v => v.sku === item.variantSku);
      if (v) return v.price;
    }
    return item.product?.basePrice || 0;
  };
  const subtotal = items.reduce((s, i) => s + getPrice(i) * i.quantity, 0);
  const deliveryCharge = paymentMethod === "cod" ? 80 : 0;

  // ── Not logged in: prompt login/register before paying ──
  if (!user) {
    return (
      <div style={{ maxWidth: 460, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
        <span className="eyebrow">One Last Step</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, margin: "10px 0 12px" }}>
          Login to Complete Your Purchase
        </h2>
        <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>
          Your cart is saved. Please log in or create an account to confirm delivery details and pay.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link to="/login" state={{ from: "/checkout" }} className="btn btn-gold">Login</Link>
          <Link to="/register" state={{ from: "/checkout" }} className="btn">Register</Link>
        </div>
        <p style={{ marginTop: 24 }}>
          <Link to="/cart" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "underline" }}>← Back to Cart</Link>
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: "60px 0", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: 20 }}>Your cart is empty.</p>
        <Link to="/" className="btn">Continue Shopping</Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      // sync local guest cart into the server cart, then checkout
      for (const item of items) {
        await addToCart(item.productId, item.quantity, item.variantSku);
      }
      const { data: order } = await checkoutApi(address, paymentMethod);
      clearCart();
      navigate("/order-confirmation", { state: { order } });
    } catch (err) {
      setError(err.response?.data?.message || "Could not place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "40px 24px 64px", maxWidth: 640 }}>
      <span className="eyebrow">Checkout</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontStyle: "italic", marginTop: 4 }}>
        Delivery & Payment
      </h1>
      <div className="divider-gold">✦</div>

      {error && (
        <div style={{ background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" }}>
          {error}
        </div>
      )}

      <form onSubmit={handlePlaceOrder}>
        <label className="form-label">
          Address *
          <input className="input" required value={address.addressLine}
            onChange={e => setAddress(a => ({ ...a, addressLine: e.target.value }))}
            placeholder="House, Road, Area" />
        </label>
        <label className="form-label">
          City *
          <input className="input" required value={address.city}
            onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
            placeholder="e.g. Dhaka" />
        </label>
        <label className="form-label">
          Phone *
          <input className="input" required value={address.phone}
            onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))}
            placeholder="01XXXXXXXXX" />
        </label>

        <p className="form-label" style={{ marginTop: 8 }}>Payment Method</p>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[["cod", "Cash on Delivery"], ["bkash", "bKash"], ["bank", "Bank Transfer"]].map(([val, label]) => (
            <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="radio" name="payment" value={val} checked={paymentMethod === val}
                onChange={() => setPaymentMethod(val)} />
              {label}
            </label>
          ))}
        </div>

        <div className="panel" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
            <span>Subtotal</span><span>৳ {subtotal.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
            <span>Delivery</span><span>{deliveryCharge ? `৳ ${deliveryCharge}` : "Free"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            <span>Total</span><span>৳ {(subtotal + deliveryCharge).toLocaleString()}</span>
          </div>
        </div>

        <button className="btn btn-gold" type="submit" disabled={loading} style={{ width: "100%", padding: 14 }}>
          {loading ? "Placing Order…" : "Place Order"}
        </button>
      </form>
    </div>
  );
}