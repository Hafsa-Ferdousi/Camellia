import { Link } from "react-router-dom";
export default function Checkout() {
  return (
    <div className="container" style={{ padding: "60px 0", textAlign: "center" }}>
      <span className="eyebrow">Coming Soon</span>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: "12px 0 16px" }}>Checkout</h2>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>This feature is under development (Sprint 3).</p>
      <Link to="/cart" className="btn">← Back to Cart</Link>
    </div>
  );
}
