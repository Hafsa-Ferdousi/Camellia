// frontend/src/components/QrCodeImage.jsx
import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Renders a QR code for any text value (here: a bKash number) — generated
// entirely client-side, no external API call. Scanning it with a phone
// camera just surfaces the encoded number for the customer to copy/dial;
// it is NOT a bKash "Scan & Pay" merchant QR, since that requires bKash's
// own Payment Gateway integration, which this manual-transfer flow doesn't use.
export default function QrCodeImage({ value, size = 140, alt = "QR code" }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!value) { setDataUrl(null); return; }
    setError(false);
    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: "#2A1A1F", light: "#FFFFFF" } })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [value, size]);

  if (!value) return null;
  if (error) return null;
  if (!dataUrl) {
    return <div style={{ width: size, height: size, background: "#F3F4F6", borderRadius: 8 }} />;
  }
  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      style={{ borderRadius: 8, border: "1px solid var(--border)", background: "#fff", padding: 6 }}
    />
  );
}
