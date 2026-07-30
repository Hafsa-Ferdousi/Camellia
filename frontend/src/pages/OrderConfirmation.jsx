// frontend/src/pages/OrderConfirmation.jsx
import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Printer, Download, Package } from 'lucide-react';
import './OrderConfirmation.css';
import Invoice from '../components/Invoice';
import { useLanguage } from '../context/LanguageContext';

export default function OrderConfirmation() {
  const { t } = useTranslation('orders');
  const { language } = useLanguage();
  const { state } = useLocation();
  const order = state?.order;
  const receiptRef = useRef(null);

  // Backend stores payment.method as a short code (cod | bkash | nagad | bank)
  const PAYMENT_LABELS = { cod: t('paymentCod'), bkash: t('paymentBkash'), nagad: t('paymentNagad'), bank: t('paymentBank') };
  const paymentLabel = order
    ? (order.paymentMethod || PAYMENT_LABELS[order.payment?.method] || order.payment?.method || t('notAvailable'))
    : t('notAvailable');
  const customerName = order
    ? (order.user?.name || order.guestInfo?.name || [order.firstName, order.lastName].filter(Boolean).join(' ') || t('notAvailable'))
    : t('notAvailable');
  const customerEmail = order ? (order.user?.email || order.guestInfo?.email || order.email || '') : '';

  if (!order) {
    return (
      <div className="container" style={{ padding: "60px 0", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 30, margin: "12px 0 16px" }}>
          {t('noOrderFound')}
        </h2>
        <p style={{ color: "#888", marginBottom: 28 }}>
          {t('checkHistory')}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/orders" className="btn btn-gold">{t('viewMyOrders')}</Link>
          <Link to="/track-order" className="btn">{t('trackGuestOrder')}</Link>
          <Link to="/" className="btn">{t('backToHome')}</Link>
        </div>
      </div>
    );
  }

  const dateLocale = language === "bn" ? "bn-BD" : "en-GB";
  const placedDate = new Date(order.createdAt || Date.now()).toLocaleDateString(dateLocale, {
    day: "numeric", month: "long", year: "numeric",
  });

  const placedTime = new Date(order.createdAt || Date.now()).toLocaleTimeString(dateLocale, {
    hour: "2-digit", minute: "2-digit"
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReceipt = () => {
    const invoiceNumberDisplay = order.invoiceNumber || order._id || t('notAvailable');
    const receiptText = `
═══════════════════════════════════════
          ${t('receiptTitle')}
═══════════════════════════════════════

${t('invoiceHash')}: ${invoiceNumberDisplay}
${t('dateColon')} ${placedDate}
${t('timeColon')} ${placedTime}
${t('customerColon')} ${customerName}${customerEmail ? ` (${customerEmail})` : ''}

───────────────────────────────────────
${t('itemsColon')}
${order.items?.map((item, i) =>
  `  ${i+1}. ${item.nameSnapshot || t('productFallback')} × ${item.quantity || 1}  =  ৳${(item.price * (item.quantity || 1)).toFixed(2)}`
).join('\n') || `  ${t('noItemsLabel')}`}

───────────────────────────────────────
${t('subtotal')}:     ৳${(order.subtotal || 0).toFixed(2)}
${t('vat')}:    ৳${(order.vat || 0).toFixed(2)}
${t('deliveryCharge')}:     ৳${(order.deliveryCharge || 0).toFixed(2)}
───────────────────────────────────────
${t('grandTotal')}:        ৳${(order.totalAmount || order.total || 0).toFixed(2)}
───────────────────────────────────────

${t('paymentColon')} ${paymentLabel}

${t('deliveryAddressColon')}
${order.address?.streetAddress || order.address?.addressLine || t('notAvailable')}
${order.address?.district ? order.address.district + ', ' : ''}${order.address?.city || t('notAvailable')}
${t('phone', { phone: order.address?.phone || t('notAvailable') })}

───────────────────────────────────────
${t('thankYouShoppingCamellia')}
    ${t('brandTagline')}
═══════════════════════════════════════
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${invoiceNumberDisplay}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="confirmation-page">
      <div className="confirmation-container" ref={receiptRef}>
        <div className="confirmation-header">
          <div className="success-icon"><Check size={36} strokeWidth={3} /></div>
          <h1>{t('thankYou')}</h1>
          <p className="confirmation-subtitle">{t('orderPlaced')}</p>
          <div className="order-badge">
            <span>{t('orderHash')}</span>
            <strong>{order._id?.slice(-8).toUpperCase() || t('notAvailable')}</strong>
            <span>{t('invoiceHash')}</span>
            <strong>{order.invoiceNumber || order._id?.slice(-8).toUpperCase() || t('notAvailable')}</strong>
          </div>
          <p className="order-date">
            {t('placedOn', { date: placedDate, time: placedTime })}
          </p>
        </div>

        <div className="receipt-body">
          <div className="receipt-section">
            <h3>{t('orderSummary')}</h3>
            <table className="receipt-table">
              <thead>
                <tr>
                  <th>{t('item')}</th>
                  <th>{t('qty')}</th>
                  <th className="text-right">{t('price')}</th>
                  <th className="text-right">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, index) => (
                  <tr key={index}>
                    <td>{item.nameSnapshot || t('productFallback')}</td>
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
                <span>{t('subtotal')}</span>
                <span>৳{(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>{t('vat')}</span>
                <span>৳{(order.vat || 0).toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>{t('deliveryCharge')}</span>
                <span>৳{(order.deliveryCharge || 0).toFixed(2)}</span>
              </div>
              <div className="total-row grand-total">
                <span>{t('grandTotal')}</span>
                <span>৳{(order.totalAmount || order.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="receipt-grid">
            <div className="receipt-section">
              <h4>{t('customer')}</h4>
              <p className="detail-value">
                {customerName}
                {customerEmail && <><br />{customerEmail}</>}
              </p>
            </div>
            <div className="receipt-section">
              <h4>{t('paymentMethod')}</h4>
              <p className="detail-value">{paymentLabel}</p>
            </div>
            <div className="receipt-section">
              <h4>{t('deliveryAddress')}</h4>
              <p className="detail-value">
                {order.address?.streetAddress || order.address?.addressLine || t('notAvailable')}<br />
                {order.address?.district ? `${order.address.district}, ` : ''}{order.address?.city || t('notAvailable')}<br />
                {t('phone', { phone: order.address?.phone || t('notAvailable') })}
              </p>
            </div>
          </div>

          <div className="receipt-section">
            <h4>{t('orderNotes')}</h4>
            <p className="detail-value" style={{ fontSize: '12px', color: '#888' }}>
              {t('noteKeepReceipt')}<br />
              {t('noteQueries')}<br />
              {t('noteCod')}
            </p>
          </div>

          <div className="receipt-footer">
            <p className="brand-name">Camellia</p>
            <p className="brand-tagline">{t('brandTagline')}</p>
            <p className="brand-tagline">{t('thankYouShopping')}</p>
          </div>
        </div>

        <div className="confirmation-actions">
          <Invoice order={order} />
          <button onClick={handlePrint} className="btn btn-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Printer size={15} /> {t('printReceipt')}
          </button>
          <button onClick={handleDownloadReceipt} className="btn btn-download" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> {t('downloadReceipt')}
          </button>
          <Link to={order.user ? "/orders" : `/track-order?orderId=${order._id}`} className="btn btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {!order.user && <Package size={15} />} {order.user ? t('viewMyOrders') : t('trackThisOrder')}
          </Link>
          <Link to="/" className="btn btn-secondary">
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    </div>
  );
}