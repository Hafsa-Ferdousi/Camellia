// frontend/src/components/Invoice.jsx
import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

const Invoice = ({ order }) => {
  const invoiceRef = useRef();

  const downloadPDF = () => {
    const element = invoiceRef.current;
    const opt = {
      margin:       0.5,
      filename:     `Invoice_${order._id}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, letterRendering: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div>
      <button onClick={downloadPDF} className="btn btn-gold" style={{ marginRight: '10px' }}>
        ⬇️ Download PDF Invoice
      </button>

      {/* Hidden Invoice Design (only visible when generating PDF) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={invoiceRef} style={{ width: '700px', padding: '30px', background: '#fff', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ textAlign: 'center', color: '#c9a84c' }}>CAMELLIA</h1>
          <p style={{ textAlign: 'center' }}>Invoice #{order._id?.slice(-8).toUpperCase()}</p>
          <hr />
          <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Payment:</strong> {order.paymentMethod}</p>
          <h3>Customer Details</h3>
          <p>{order.address?.firstName} {order.address?.lastName}</p>
          <p>{order.address?.streetAddress}, {order.address?.city}</p>
          <p>Phone: {order.address?.phone}</p>
          <hr />
          <h3>Order Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={{ textAlign: 'left' }}>Item</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                  <td>{item.nameSnapshot}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>৳{item.price.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>৳{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr />
          <div style={{ textAlign: 'right' }}>
            <p><strong>Subtotal:</strong> ৳{order.subtotal.toFixed(2)}</p>
            <p><strong>VAT (10%):</strong> ৳{order.vat.toFixed(2)}</p>
            <p><strong>Delivery:</strong> ৳{order.deliveryCharge.toFixed(2)}</p>
            <h2>Total: ৳{order.totalAmount.toFixed(2)}</h2>
          </div>
          <hr />
          <p style={{ textAlign: 'center', color: '#888', fontSize: '12px' }}>Thank you for shopping at Camellia!</p>
        </div>
      </div>
    </div>
  );
};

export default Invoice;