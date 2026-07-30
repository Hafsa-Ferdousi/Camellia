// frontend/src/components/Invoice.jsx
import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Invoice = ({ order }) => {
  const { t } = useTranslation(['orders', 'common']);
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
      <button onClick={downloadPDF} className="btn btn-gold" style={{ marginRight: '10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Download size={15} strokeWidth={2} /> {t('downloadPdfInvoice')}
      </button>

      {/* Hidden Invoice Design (only visible when generating PDF) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={invoiceRef} style={{ width: '700px', padding: '30px', background: '#fff', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ textAlign: 'center', color: '#c9a84c' }}>{t('common:brand').toUpperCase()}</h1>
          <p style={{ textAlign: 'center' }}>{t('invoiceHash')}{order._id?.slice(-8).toUpperCase()}</p>
          <hr />
          <p><strong>{t('dateColon')}</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>{t('paymentColon')}</strong> {order.paymentMethod}</p>
          <h3>{t('customerDetails')}</h3>
          <p>{order.address?.firstName} {order.address?.lastName}</p>
          <p>{order.address?.streetAddress}, {order.address?.city}</p>
          <p>{t('phone', { phone: order.address?.phone })}</p>
          <hr />
          <h3>{t('orderItems')}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={{ textAlign: 'left' }}>{t('item')}</th>
                <th style={{ textAlign: 'right' }}>{t('qty')}</th>
                <th style={{ textAlign: 'right' }}>{t('price')}</th>
                <th style={{ textAlign: 'right' }}>{t('total')}</th>
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
            <p><strong>{t('subtotal')}:</strong> ৳{order.subtotal.toFixed(2)}</p>
            <p><strong>{t('vat')}:</strong> ৳{order.vat.toFixed(2)}</p>
            <p><strong>{t('deliveryCharge')}:</strong> ৳{order.deliveryCharge.toFixed(2)}</p>
            <h2>{t('total')}: ৳{order.totalAmount.toFixed(2)}</h2>
          </div>
          <hr />
          <p style={{ textAlign: 'center', color: '#888', fontSize: '12px' }}>{t('thankYouShoppingCamellia')}</p>
        </div>
      </div>
    </div>
  );
};

export default Invoice;