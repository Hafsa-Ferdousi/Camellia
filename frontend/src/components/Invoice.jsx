// frontend/src/components/Invoice.jsx
import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

const GOLD = '#b8935a';
const GOLD_DARK = '#8a6d3f';
const ACCENT_DARK = '#5c4430';
const INK = '#1f1f1f';
const MUTED = '#6b6b6b';
const LINE = '#e3ddd3';
const PANEL = '#faf7f2';

const Invoice = ({ order }) => {
  const invoiceRef = useRef();

  const downloadPDF = () => {
    const element = invoiceRef.current;
    const opt = {
      margin: 0,
      filename: `Invoice_${order.guestOrderId || order.invoiceNumber || order._id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all'] },
    };

    // html2pdf can still spawn a stray extra page from sub-pixel rounding
    // even when the content visually fits on one sheet — so we generate
    // the PDF, then explicitly strip any page beyond the first before saving.
    html2pdf()
      .set(opt)
      .from(element)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = totalPages; i > 1; i--) {
          pdf.deletePage(i);
        }
      })
      .save();
  };

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'N/A';

  const money = (n) =>
    `৳ ${Number(n || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Company info
  const companyName = 'Camellia Jewelry & Wedding Accessories';
  const companyAddress = "Cox's Bazar, Bangladesh";
  const companyContact = 'camelliajewelry.com  •  +880 1XXX-XXXXXX';

  // Customer info
  const customerName = order?.guestInfo?.name || order?.user?.name || 'N/A';
  const customerAddress = order?.address?.addressLine || '';
  const customerCity = order?.address?.city || '';
  const customerDistrict = order?.address?.district || '';
  const customerPhone = order?.address?.phone || order?.guestInfo?.phone || '';
  const customerEmail = order?.guestInfo?.email || order?.user?.email || '';
  const fullAddress =
    [customerAddress, customerCity, customerDistrict].filter(Boolean).join(', ') || 'N/A';

  // Invoice meta
  const displayId =
    order?.guestOrderId || order?.invoiceNumber || order?._id?.slice(-8).toUpperCase() || 'N/A';
  const invoiceDate = formatDate(order?.createdAt);
  const orderStatus = order?.status
    ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
    : 'N/A';

  const paymentLabel =
    {
      cod: 'Cash on Delivery',
      bkash: 'bKash',
      nagad: 'Nagad',
      bank: 'Bank Transfer',
    }[order?.payment?.method] ||
    order?.paymentMethod ||
    'N/A';

  const items = order?.items || [];
  const subtotal = Number(order?.subtotal || 0);
  const vat = Number(order?.vat || 0);
  const delivery = Number(order?.deliveryCharge || 0);
  const discount = Number(order?.discountAmount || 0);
  const total = Number(order?.totalAmount || order?.total || 0);
  const vatRate = subtotal > 0 && vat > 0 ? Math.round((vat / subtotal) * 100) : null;

  return (
    <div>
      <button
        onClick={downloadPDF}
        className="btn btn-gold"
        style={{ marginRight: '10px' }}
      >
        ⬇️ Download PDF Invoice
      </button>

      {/* ============ PRINTABLE INVOICE (A4, single page) ============ */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div
          ref={invoiceRef}
          style={{
            width: '210mm',
            minHeight: '297mm',
            maxHeight: '297mm',
            overflow: 'hidden',
            padding: '12mm 16mm',
            background: '#ffffff',
            fontFamily:
              "'Helvetica Neue', Arial, 'Segoe UI', sans-serif",
            fontSize: '10px',
            color: INK,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* === HEADER === */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: '14px',
              marginBottom: '16px',
              borderBottom: `3px solid ${GOLD}`,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontSize: '30px',
                  fontWeight: 400,
                  color: INK,
                  margin: 0,
                  letterSpacing: '4px',
                }}
              >
                INVOICE
              </h1>
              <p
                style={{
                  fontSize: '9px',
                  color: GOLD_DARK,
                  margin: '4px 0 0',
                  letterSpacing: '1px',
                  fontWeight: 600,
                }}
              >
                #{displayId}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: INK }}>
                {companyName}
              </p>
              <p style={{ fontSize: '9px', color: MUTED, margin: '3px 0 0' }}>
                {companyAddress}
              </p>
              <p style={{ fontSize: '8.5px', color: MUTED, margin: '2px 0 0' }}>
                {companyContact}
              </p>
            </div>
          </div>

          {/* === BILL TO / INVOICE INFO === */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '8px',
                  color: GOLD_DARK,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 700,
                  margin: '0 0 5px',
                }}
              >
                Bill To
              </p>
              <p style={{ fontWeight: 700, fontSize: '11.5px', margin: 0, color: INK }}>
                {customerName}
              </p>
              <p style={{ fontSize: '9px', color: MUTED, margin: '3px 0 0', lineHeight: 1.5 }}>
                {fullAddress}
              </p>
              {customerPhone && (
                <p style={{ fontSize: '9px', color: MUTED, margin: '2px 0 0' }}>
                  Tel: {customerPhone}
                </p>
              )}
              {customerEmail && (
                <p style={{ fontSize: '9px', color: MUTED, margin: '2px 0 0' }}>
                  {customerEmail}
                </p>
              )}
            </div>

            <div
              style={{
                background: PANEL,
                border: `1px solid ${LINE}`,
                borderRadius: '4px',
                padding: '10px 14px',
                height: 'fit-content',
              }}
            >
              {[
                ['Invoice Date', invoiceDate],
                ['Order Status', orderStatus],
                ['Payment Method', paymentLabel],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: i === 0 ? '0 0 6px' : '6px 0 0',
                    marginTop: i === 0 ? 0 : '6px',
                    borderTop: i === 0 ? 'none' : `1px solid ${LINE}`,
                  }}
                >
                  <span style={{ fontSize: '8.5px', color: MUTED, fontWeight: 600 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '9.5px', color: INK, fontWeight: 700 }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* === ITEMS TABLE === */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '10px',
            }}
          >
            <thead>
              <tr style={{ background: ACCENT_DARK }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '7px 10px',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#fff',
                    fontWeight: 700,
                    width: '48px',
                    textAlign: 'center',
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '7px 10px',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '7px 10px',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#fff',
                    fontWeight: 700,
                    width: '80px',
                  }}
                >
                  Unit Price
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '7px 10px',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#fff',
                    fontWeight: 700,
                    width: '85px',
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{ background: idx % 2 === 0 ? '#ffffff' : PANEL }}
                  >
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '9px',
                        textAlign: 'center',
                        borderBottom: `1px solid ${LINE}`,
                      }}
                    >
                      {item.quantity || 1}
                    </td>
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '9px',
                        borderBottom: `1px solid ${LINE}`,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{item.nameSnapshot || 'Product'}</div>
                      {item.details && (
                        <div style={{ fontSize: '7.5px', color: MUTED, marginTop: '1px' }}>
                          {item.details}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '9px',
                        textAlign: 'right',
                        borderBottom: `1px solid ${LINE}`,
                      }}
                    >
                      {money(item.price)}
                    </td>
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '9px',
                        textAlign: 'right',
                        fontWeight: 700,
                        borderBottom: `1px solid ${LINE}`,
                      }}
                    >
                      {money((item.price || 0) * (item.quantity || 1))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: '14px 10px',
                      fontSize: '9px',
                      color: MUTED,
                      textAlign: 'center',
                      borderBottom: `1px solid ${LINE}`,
                    }}
                  >
                    No items found for this order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* === TOTALS === */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
            <div style={{ width: '220px' }}>
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label={`VAT${vatRate ? ` (${vatRate}%)` : ''}`} value={money(vat)} />
              <Row label="Delivery Charge" value={money(delivery)} />
              {discount > 0 && (
                <Row label="Discount" value={`- ${money(discount)}`} negative />
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  marginTop: '6px',
                  background: ACCENT_DARK,
                  borderRadius: '3px',
                }}
              >
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.5px',
                  }}
                >
                  TOTAL DUE
                </span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: GOLD }}>
                  {money(total)}
                </span>
              </div>
            </div>
          </div>

          {/* === FOOTER === */}
          <div
            style={{
              textAlign: 'center',
              paddingTop: '10px',
              marginTop: 'auto',
              borderTop: `2px solid ${GOLD}`,
            }}
          >
            <p
              style={{
                fontSize: '11px',
                color: INK,
                margin: 0,
                fontWeight: 700,
                letterSpacing: '1px',
              }}
            >
              THANK YOU FOR YOUR PURCHASE
            </p>
            <p style={{ fontSize: '8px', color: MUTED, margin: '4px 0 0' }}>
              {companyName} — {companyAddress}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small helper for a totals row — keeps label/value perfectly aligned
const Row = ({ label, value, negative }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '4px 10px',
      fontSize: '9px',
      color: negative ? '#c0392b' : MUTED,
    }}
  >
    <span>{label}</span>
    <span style={{ fontWeight: 600 }}>{value}</span>
  </div>
);

export default Invoice;
