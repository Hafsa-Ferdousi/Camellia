// frontend/src/pages/OrderConfirmation.jsx
import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './OrderConfirmation.css';

export default function OrderConfirmation() {
  const { state } = useLocation();
  const order = state?.order;
  const receiptRef = useRef(null);

  // Backend stores payment.method as a short code (cod | bkash | nagad | bank)
  const PAYMENT_LABELS = { cod: 'Cash on Delivery', bkash: 'bKash', nagad: 'Nagad', bank: 'Bank Transfer' };
  const paymentLabel = order
    ? (order.paymentMethod || PAYMENT_LABELS[order.payment?.method] || order.payment?.method || 'N/A')
    : 'N/A';
  const customerName = order
    ? (order.user?.name || order.guestInfo?.name || [order.firstName, order.lastName].filter(Boolean).join(' ') || 'N/A')
    : 'N/A';
  const customerEmail = order ? (order.user?.email || order.guestInfo?.email || order.email || '') : '';

  if (!order) {
    return (
      <div className="container" style={{ padding: "60px 0", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 30, margin: "12px 0 16px" }}>
          No Order Found
        </h2>
        <p style={{ color: "#888", marginBottom: 28 }}>
          Check your order history to view past orders.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/orders" className="btn btn-gold">View My Orders</Link>
          <Link to="/track-order" className="btn">Track a Guest Order</Link>
          <Link to="/" className="btn">Back to Home</Link>
        </div>
      </div>
    );
  }

  const placedDate = new Date(order.createdAt || Date.now()).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const placedTime = new Date(order.createdAt || Date.now()).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit"
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReceipt = () => {
    const receiptText = `
═══════════════════════════════════════
          CAMELLIA - RECEIPT
═══════════════════════════════════════

Order #: ${order._id || 'N/A'}
Date: ${placedDate}
Time: ${placedTime}
Customer: ${customerName}${customerEmail ? ` (${customerEmail})` : ''}

───────────────────────────────────────
ITEMS:
${order.items?.map((item, i) => 
  `  ${i+1}. ${item.nameSnapshot || 'Product'} × ${item.quantity || 1}  =  ৳${(item.price * (item.quantity || 1)).toFixed(2)}`
).join('\n') || '  No items'}

───────────────────────────────────────
Subtotal:     ৳${(order.subtotal || 0).toFixed(2)}
VAT (10%):    ৳${(order.vat || 0).toFixed(2)}
Delivery:     ৳${(order.deliveryCharge || 0).toFixed(2)}
───────────────────────────────────────
TOTAL:        ৳${(order.totalAmount || order.total || 0).toFixed(2)}
───────────────────────────────────────

Payment: ${paymentLabel}

Delivery Address:
${order.address?.streetAddress || order.address?.addressLine || 'N/A'}
${order.address?.district ? order.address.district + ', ' : ''}${order.address?.city || 'N/A'}
Phone: ${order.address?.phone || 'N/A'}

───────────────────────────────────────
Thank you for shopping at Camellia!
    est. 2019 · Cox's Bazar, Bangladesh
═══════════════════════════════════════
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${order._id || 'order'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="confirmation-page">
      <div className="confirmation-container" ref={receiptRef}>
        <div className="confirmation-header">
          <div className="success-icon">✓</div>
          <h1>Thank You!</h1>
          <p className="confirmation-subtitle">Your order has been placed successfully</p>
          <div className="order-badge">
            <span>Order #</span>
            <strong>{order._id?.slice(-8).toUpperCase() || 'N/A'}</strong>
          </div>
          <p className="order-date">
            Placed on {placedDate} at {placedTime}
          </p>
        </div>

        <div className="receipt-body">
          <div className="receipt-section">
            <h3>Order Summary</h3>
            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, index) => (
                  <tr key={index}>
                    <td>{item.nameSnapshot || 'Product'}</td>
                    <td className="text-center">{item.quantity || 1}</td>
                    <td className="text-right">৳{(item.price || 0).toFixed(2)}</td>
                    <td className="text-right">৳{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="receipt-section totals-section">
            <div className="totals-grid">
              <div className="total-row">
                <span>Subtotal</span>
                <span>৳{(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>VAT (10%)</span>
                <span>৳{(order.vat || 0).toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Delivery Charge</span>
                <span>৳{(order.deliveryCharge || 0).toFixed(2)}</span>
              </div>
              <div className="total-row grand-total">
                <span>TOTAL</span>
                <span>৳{(order.totalAmount || order.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="receipt-grid">
            <div className="receipt-section">
              <h4>Customer</h4>
              <p className="detail-value">
                {customerName}
                {customerEmail && <><br />{customerEmail}</>}
              </p>
            </div>
            <div className="receipt-section">
              <h4>Payment Method</h4>
              <p className="detail-value">{paymentLabel}</p>
            </div>
            <div className="receipt-section">
              <h4>Delivery Address</h4>
              <p className="detail-value">
                {order.address?.streetAddress || order.address?.addressLine || 'N/A'}<br />
                {order.address?.district ? `${order.address.district}, ` : ''}{order.address?.city || 'N/A'}<br />
                Phone: {order.address?.phone || 'N/A'}
              </p>
            </div>
          </div>

          <div className="receipt-section">
            <h4>Order Notes</h4>
            <p className="detail-value" style={{ fontSize: '12px', color: '#888' }}>
              • Please keep this receipt for your records.<br />
              • For any queries, contact us within 7 days.<br />
              • Cash on Delivery: Pay only after receiving the receipt.
            </p>
          </div>

          <div className="receipt-footer">
            <p className="brand-name">Camellia</p>
            <p className="brand-tagline">est. 2019 · Cox's Bazar, Bangladesh</p>
            <p className="brand-tagline">Thank you for shopping with us!</p>
          </div>
        </div>

        <div className="confirmation-actions">
          <button onClick={handlePrint} className="btn btn-print">
            🖨️ Print Receipt
          </button>
          <button onClick={handleDownloadReceipt} className="btn btn-download">
            ⬇️ Download Receipt
          </button>
          <Link to={order.user ? "/orders" : `/track-order?orderId=${order._id}`} className="btn btn-gold">
            📦 {order.user ? "View My Orders" : "Track This Order"}
          </Link>
          <Link to="/" className="btn btn-secondary">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}