import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { items, updateQty, removeItem } = useCart();
  const navigate = useNavigate();

  const getPrice = item => {
    if (item.variantSku && item.product?.variants) {
      const v = item.product.variants.find(v => v.sku === item.variantSku);
      if (v) return v.price;
    }
    return item.product?.basePrice || 0;
  };

  const getStock = item => {
    if (item.variantSku && item.product?.variants) {
      const v = item.product.variants.find(v => v.sku === item.variantSku);
      if (v) return v.stock;
    }
    return item.product?.totalStock || 99;
  };

  const handleQty = (item, qty, maxStock) => {
    if (qty < 1 || qty > maxStock) return;
    updateQty(item.productId, item.variantSku, qty);
  };

  const subtotal = items.reduce((s, i) => s + getPrice(i) * i.quantity, 0);
  const DELIVERY = 80;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "36px 24px 64px" }}>
      <span className="eyebrow">Shopping</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", marginTop: 4 }}>
        Your Cart
        {items.length > 0 && (
          <span style={{ fontSize: 17, fontStyle: "normal", color: "var(--muted)", marginLeft: 10, fontFamily: "var(--font-body)" }}>
            ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
        )}
      </h1>
      <div className="divider-gold">✦</div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.25 }}>🛍</div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--charcoal)", marginBottom: 8 }}>
            Your cart is empty
          </p>
          <p style={{ fontSize: 14, marginBottom: 32 }}>Discover our beautiful jewellery collections</p>
          <Link to="/" className="btn">Continue Shopping</Link>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            {items.map(item => {
              const price = getPrice(item);
              const stock = getStock(item);
              return (
                <div className="cart-item" key={`${item.productId}_${item.variantSku || ""}`}>
                  <Link to={`/products/${item.productId}`} style={{ flexShrink: 0 }}>
                    <div className="cart-thumb">
                      {item.product?.images?.[0]
                        ? <img src={item.product.images[0]} alt="" />
                        : <span style={{ fontSize: 22, opacity: 0.3 }}>💍</span>}
                    </div>
                  </Link>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.product?.name?.en}
                    </p>
                    {item.variantSku && (
                      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Variant: {item.variantSku}</p>
                    )}
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--gold-text)", fontWeight: 600, marginBottom: 10 }}>
                      ৳ {price.toLocaleString()}
                    </p>
                    <div className="qty-stepper">
                      <button className="qty-btn" onClick={() => handleQty(item, item.quantity - 1, stock)} disabled={item.quantity <= 1}>−</button>
                      <span style={{ fontSize: 14, minWidth: 32, textAlign: "center", fontWeight: 500 }}>{item.quantity}</span>
                      <button className="qty-btn" onClick={() => handleQty(item, item.quantity + 1, stock)} disabled={item.quantity >= stock}>+</button>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--charcoal)", marginBottom: 10 }}>
                      ৳ {(price * item.quantity).toLocaleString()}
                    </p>
                    <button className="remove-btn" onClick={() => removeItem(item.productId, item.variantSku)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="panel" style={{ marginBottom: 16 }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Order Summary</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14, color: "var(--muted)" }}>
              <span>Subtotal ({items.length} {items.length === 1 ? "item" : "items"})</span>
              <span>৳ {subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 14, color: "var(--muted)" }}>
              <span>Delivery (COD)</span>
              <span style={{ color: "var(--ink)", fontWeight: 600 }}>৳ {DELIVERY}</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600 }}>Estimated Total</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--gold-text)" }}>
                ৳ {(subtotal + DELIVERY).toLocaleString()}
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
              * Delivery charge waived for online payments (bKash / Bank)
            </p>
          </div>

          <button
            className="btn btn-gold"
            style={{ width: "100%", padding: 14, fontSize: 14, letterSpacing: "0.1em", marginBottom: 12 }}
            onClick={() => navigate("/checkout")}
          >
            Proceed to Checkout →
          </button>

          <p style={{ textAlign: "center" }}>
            <Link to="/" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "underline" }}>Continue Shopping</Link>
          </p>
        </>
      )}
    </div>
  );
}