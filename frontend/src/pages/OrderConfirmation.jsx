// frontend/src/pages/OrderConfirmation.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Printer, Package, Loader2 } from 'lucide-react';
import './OrderConfirmation.css';
import Invoice from '../components/Invoice';
import BkashPaymentPanel from '../components/BkashPaymentPanel';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getOrderById, guestLookupOrder } from '../api/cart';

export default function OrderConfirmation() {
  const { t } = useTranslation('orders');
  const { language } = useLanguage();
  const { state } = useLocation();
  const { orderId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(state?.order || null);
  const [emailInput, setEmailInput] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  // Guests reloading a bookmarked /order-confirmation/:orderId link need to
  // re-prove ownership with the email used at checkout (no account = no
  // session to check against). Registered users skip this — getOrderById
  // is ownership-checked server-side against their login.
  const [needsGuestEmail, setNeedsGuestEmail] = useState(false);
  const receiptRef = useRef(null);

  // If we only have an :orderId (page was reloaded/bookmarked, no nav
  // state), fetch the order fresh from the server.
  useEffect(() => {
    if (order || !orderId || authLoading) return;

    if (user) {
      getOrderById(orderId)
        .then(({ data }) => setOrder(data))
        .catch(() => setLookupError(t('noOrderFound')));
      return;
    }

    // Guest: try the email carried over in the URL first (from the
    // "View Full Details" link on /track-order); otherwise ask for it.
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get('email');
    if (urlEmail) {
      lookupGuestOrder(orderId, urlEmail);
    } else {
      setNeedsGuestEmail(true);
    }
  }, [orderId, user, authLoading]);

  const lookupGuestOrder = async (id, email) => {
    setLookupLoading(true);
    setLookupError('');
    try {
      const { data } = await guestLookupOrder({ orderId: id, email });
      if (data.orders?.length > 0) {
        setOrder(data.orders[0]);
        setNeedsGuestEmail(false);
      } else {
        setLookupError(t('noOrderForIdEmail'));
      }
    } catch (err) {
      setLookupError(err.response?.data?.message || t('noOrderForIdEmail'));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleGuestEmailSubmit = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    lookupGuestOrder(orderId, emailInput.trim());
  };

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

  // Guest reloaded a bookmarked link with no email in the URL — ask for it
  // before fetching, rather than silently failing.
  if (!order && needsGuestEmail) {
    return (
      <div className="container" style={{ paddingTop: 60, paddingBottom: 60, textAlign: "center" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 26, margin: "12px 0 16px" }}>
          {t('confirmEmailTitle')}
        </h2>
        <p style={{ color: "#555", marginBottom: 24 }}>
          {t('confirmEmailSub')}
        </p>
        <form onSubmit={handleGuestEmailSubmit} style={{ maxWidth: 340, margin: "0 auto" }}>
          <input
            type="email"
            required
            autoFocus
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder={t('emailPlaceholderExample')}
            style={{
              width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
              borderRadius: 6, fontSize: 14, marginBottom: 12, boxSizing: "border-box",
            }}
          />
          {lookupError && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{lookupError}</p>}
          <button type="submit" className="btn btn-gold" disabled={lookupLoading} style={{ width: "100%" }}>
            {lookupLoading ? t('searching') : t('findMyOrder')}
          </button>
        </form>
      </div>
    );
  }

  if (!order && (lookupLoading || (orderId && !lookupError && !authLoading))) {
    return (
      <div style={{ padding: "80px 0", textAlign: "center", color: "var(--muted)" }}>
        <Loader2 size={32} strokeWidth={1.5} className="spin" style={{ marginBottom: 12 }} />
        <div>{t('searching')}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container" style={{ paddingTop: 60, paddingBottom: 60, textAlign: "center" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 30, margin: "12px 0 16px" }}>
          {t('noOrderFound')}
        </h2>
        <p style={{ color: "#555", marginBottom: 28 }}>
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
            <strong style={{ fontSize: '20px', color: '#c9a84c' }}>{displayOrderId}</strong>
            <br />
            <span style={{ fontSize: '12px', color: '#888' }}>{t('invoiceHash')}</span>
            <span style={{ fontSize: '12px', color: '#888' }}>{displayInvoiceNumber}</span>
          </div>
          <p className="order-date">
            {t('placedOn', { date: placedDate, time: placedTime })}
          </p>
        </div>

        {order.payment?.method === 'bkash' && (
          <div className="bkash-payment-section" style={{ padding: '0 4px' }}>
            <BkashPaymentPanel
              order={order}
              guestEmail={!order.user ? (order.guestInfo?.email || order.email) : undefined}
              onUpdated={(payment) => setOrder((prev) => ({ ...prev, payment }))}
            />
          </div>
        )}

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
