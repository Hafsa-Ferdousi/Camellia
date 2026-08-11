// backend/utils/mailer.js
//
// Free-tier email sending via Gmail SMTP + nodemailer. No paid API required.
//
// SETUP:
//   1. Enable 2-Step Verification on the Gmail account you're sending from.
//   2. Google Account -> Security -> App Passwords -> generate one.
//   3. Add to backend/.env:
//        EMAIL_USER=youraddress@gmail.com
//        EMAIL_APP_PASSWORD=your16charapppassword
//
// If EMAIL_USER / EMAIL_APP_PASSWORD are missing, all send functions log a
// warning and resolve without throwing — so the rest of the app (checkout,
// registration, etc.) never breaks just because email isn't configured yet.

import nodemailer from "nodemailer";

const isConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Low-level send. Never throws — logs and resolves so callers (checkout,
 * registration, order status updates) don't fail just because email did.
 */
async function sendMail({ to, subject, text, html }) {
  if (!isConfigured) {
    console.warn(`[mailer] EMAIL_USER/EMAIL_APP_PASSWORD not set — skipping email to ${to} ("${subject}")`);
    return { sent: false, reason: "not_configured" };
  }
  try {
    await transporter.sendMail({
      from: `Camellia <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[mailer] Failed to send email to ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

// ── Order status notifications ─────────────────────────────────────────
const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export async function sendOrderStatusEmail(to, { orderId, invoiceNumber, status }) {
  if (!to) return { sent: false, reason: "no_recipient" };
  const label = STATUS_LABELS[status] || status;
  const subject = `Camellia Order Update — ${label}`;
  const text =
    `Hi,\n\n` +
    `Your Camellia order (Invoice: ${invoiceNumber || orderId}) status has been updated to: ${label}.\n\n` +
    `You can track your order anytime from the Track Order page.\n\n` +
    `Thank you for shopping with Camellia.`;
  return sendMail({ to, subject, text });
}

export async function sendPaymentConfirmedEmail(to, { orderId, invoiceNumber, amount }) {
  if (!to) return { sent: false, reason: "no_recipient" };
  const subject = `Camellia Payment Confirmed — Invoice ${invoiceNumber || orderId}`;
  const text =
    `Hi,\n\n` +
    `We've confirmed your payment of ৳${amount} for your Camellia order (Invoice: ${invoiceNumber || orderId}).\n\n` +
    `Thank you for shopping with Camellia.`;
  return sendMail({ to, subject, text });
}

export async function sendBkashStatusEmail(to, { invoiceNumber, approved, rejectionReason }) {
  if (!to) return { sent: false, reason: "no_recipient" };
  const subject = `Camellia bKash Payment ${approved ? "Verified" : "Update"} — Order ${invoiceNumber || ""}`;
  const text = approved
    ? `Hi,\n\nGood news — we've verified your bKash payment for order (Invoice: ${invoiceNumber || "N/A"}). Your order is now confirmed.\n\nThank you for shopping with Camellia.`
    : `Hi,\n\nWe couldn't verify the bKash payment submitted for order (Invoice: ${invoiceNumber || "N/A"}).\n\n` +
      `Reason: ${rejectionReason || "Details did not match our records."}\n\n` +
      `Please double check your Transaction ID and resubmit from your Order History page.\n\nThank you for your patience.`;
  return sendMail({ to, subject, text });
}

export async function sendOrderAutoCancelledEmail(to, { invoiceNumber, orderId, amount }) {
  if (!to) return { sent: false, reason: "no_recipient" };
  const subject = `Camellia Order Cancelled — Invoice ${invoiceNumber || orderId}`;
  const text =
    `Hi,\n\n` +
    `Your Camellia order (Invoice: ${invoiceNumber || orderId}) for ৳${amount} has been automatically cancelled because we didn't receive your bKash payment within 48 hours of placing the order.\n\n` +
    `No charge was made — nothing to worry about. If you'd still like these items, please place a new order and complete the bKash payment (send money + submit the Transaction ID) soon after checkout so it doesn't expire again.\n\n` +
    `If you did send the money and believe this is a mistake, please contact us with your Transaction ID and we'll sort it out right away.\n\n` +
    `Thank you for shopping with Camellia.`;
  return sendMail({ to, subject, text });
}

// ── Email verification (OTP at registration) ───────────────────────────
export async function sendVerificationOtpEmail(to, otp) {
  if (!to) return { sent: false, reason: "no_recipient" };
  const subject = "Verify your Camellia account";
  const text =
    `Hi,\n\n` +
    `Your Camellia verification code is: ${otp}\n\n` +
    `This code expires in 10 minutes. If you didn't create a Camellia account, you can ignore this email.`;
  return sendMail({ to, subject, text });
}

// ── Contact form reply ──────────────────────────────────────────────────
export async function sendContactReplyEmail(to, { name, originalMessage, reply }) {
  if (!to) return { sent: false, reason: "no_recipient" };
  const subject = "Re: Your message to Camellia";
  const text =
    `Hi ${name || ""},\n\n` +
    `Thanks for reaching out to Camellia. Here's our reply to your message:\n\n` +
    `${reply}\n\n` +
    `---\n` +
    `Your original message:\n"${originalMessage}"\n\n` +
    `Thank you for shopping with Camellia.`;
  return sendMail({ to, subject, text });
}

export default { sendMail, sendOrderStatusEmail, sendPaymentConfirmedEmail, sendBkashStatusEmail, sendOrderAutoCancelledEmail, sendVerificationOtpEmail, sendContactReplyEmail };
