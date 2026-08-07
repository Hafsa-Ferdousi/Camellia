// frontend/src/pages/OrderConfirmation.jsx
import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Printer, Package } from 'lucide-react';
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

  // ✅ Get the best display ID: guestOrderId > invoiceNumber > _id (fallback)
  const displayOrderId = order?.guestOrderId || order?.invoiceNumber || order?._id?.slice(-8).toUpperCase() || t('notAvailable');
  const displayInvoiceNumber = order?.invoiceNumber || order?._id?.slice(-8).toUpperCase() || t('notAvailable');

  if (!order) {
    return (
      <div className="container" style={{ padding: "60px 0", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, margin: "12px 0 16px" }}>
          {t('noOrderFound')}
        </h2>
        <p style={{ color: "var(--muted)", marginBottom: 28 }}>
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

  // ✅ For track link: use guestOrderId if available, otherwise fallback to _id
  const trackIdentifier = order.guestOrderId || order._id;

  return (
    <div className="confirmation-page">
      <div className="confirmation-container" ref={receiptRef}>
        <div className="confirmation-header">
          <div className="success-icon"><Check size={36} strokeWidth={3} /></div>
          <h1>{t('thankYou')}</h1>
          <p className="confirmation-subtitle">{t('orderPlaced')}</p>
          <div className="order-badge">
            <span>{t('orderHash')}</span>
            {/* ✅ Show friendly Order ID */}
            <strong style={{ fontSize: '20px', color: 'var(--gold-text)' }}>{displayOrderId}</strong>
            <br />
            <span style={{ fontSize: '12px', color: 'var(--faint)' }}>{t('invoiceHash')}</span>
            <span style={{ fontSize: '12px', color: 'var(--faint)' }}>{displayInvoiceNumber}</span>
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
            <p className="detail-value" style={{ fontSize: '12px', color: 'var(--faint)' }}>
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
          {/* ✅ Use guestOrderId for tracking link */}
          <Link
            to={order.user ? "/orders" : `/track-order?orderId=${trackIdentifier}`}
            className="btn btn-print"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {!order.user && <Package size={15} />} {order.user ? t('viewMyOrders') : t('trackThisOrder')}
          </Link>
          <Link to="/" className="btn btn-gold">
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    </div>
  );
}
