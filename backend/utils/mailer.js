// backend/utils/mailer.js
//
// Email sending via the Gmail API (OAuth2), using your own free Gmail
// account — sends over HTTPS instead of raw SMTP, since Render's free tier
// blocks outbound SMTP ports (25/465/587) entirely, and avoids third-party
// ESPs (Brevo, SendGrid, etc.) that gate new free accounts behind manual
// review before they'll send anything.
//
// SETUP (see README/chat history for the full walkthrough):
//   1. Google Cloud Console -> create a project -> enable the Gmail API.
//   2. OAuth consent screen -> External -> add yourself as a test user.
//   3. Credentials -> Create OAuth client ID -> Web application -> add
//      redirect URI https://developers.google.com/oauthplayground.
//   4. OAuth Playground (developers.google.com/oauthplayground) -> gear icon
//      -> "Use your own OAuth credentials" -> paste Client ID/Secret ->
//      authorize scope https://www.googleapis.com/auth/gmail.send -> log in
//      with the sending Gmail account -> exchange for a refresh token.
//   5. Add to backend/.env:
//        EMAIL_USER=youraddress@gmail.com   (the authorized account)
//        GMAIL_CLIENT_ID=your_client_id
//        GMAIL_CLIENT_SECRET=your_client_secret
//        GMAIL_REFRESH_TOKEN=your_refresh_token
//
// If any of these are missing, all send functions log a warning and resolve
// without throwing — so the rest of the app (checkout, registration, etc.)
// never breaks just because email isn't configured yet.

const isConfigured = !!(
  process.env.EMAIL_USER &&
  process.env.GMAIL_CLIENT_ID &&
  process.env.GMAIL_CLIENT_SECRET &&
  process.env.GMAIL_REFRESH_TOKEN
);

// Access tokens are short-lived (~1hr); cache and reuse until near expiry
// instead of exchanging the refresh token on every single send.
let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) {
    return cachedAccessToken;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Gmail token refresh ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  cachedAccessToken = data.access_token;
  // Refresh a minute early so we never send with an about-to-expire token.
  cachedAccessTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedAccessToken;
}

function base64url(str) {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildRawMessage({ to, subject, text, html }) {
  const from = `Camellia <${process.env.EMAIL_USER}>`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;

  if (!html) {
    const message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      text,
    ].join("\r\n");
    return base64url(message);
  }

  const boundary = "camellia_boundary_" + Date.now();
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");
  return base64url(message);
}

/**
 * Low-level send. Never throws — logs and resolves so callers (checkout,
 * registration, order status updates) don't fail just because email did.
 */
async function sendMail({ to, subject, text, html }) {
  if (!isConfigured) {
    console.warn(`[mailer] Gmail API env vars not set — skipping email to ${to} ("${subject}")`);
    return { sent: false, reason: "not_configured" };
  }
  try {
    const accessToken = await getAccessToken();
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ raw: buildRawMessage({ to, subject, text, html }) }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gmail API ${res.status}: ${body}`);
    }
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

// ── Return/exchange status update ───────────────────────────────────────
// Guests have no in-app notification bell to fall back on (see
// refundController.js's updateRefundStatus), so this is the ONLY way a
// guest customer ever finds out their return/exchange status changed.
export async function sendRefundStatusEmail(to, { itemName, requestType, status, adminNote }) {
  if (!to) return { sent: false, reason: "no_recipient" };
  const kind = requestType === "exchange" ? "exchange" : "return";
  const subject = `Camellia ${kind === "exchange" ? "Exchange" : "Return"} Update — ${itemName || "Your item"}`;
  const text =
    status === "approved"
      ? `Hi,\n\nGood news — your ${kind} request for "${itemName}" has been approved.\n\nThank you for your patience.`
      : status === "rejected"
      ? `Hi,\n\nWe're sorry, but your ${kind} request for "${itemName}" was not approved.${adminNote ? `\n\nReason: ${adminNote}` : ""}\n\n` +
        `If you'd like to discuss this or submit a new request, please contact us or visit the Track Order page.`
      : `Hi,\n\nYour ${kind} for "${itemName}" has been processed on our end.\n\nThank you for shopping with Camellia.`;
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

// ── Password reset (admin-initiated) ────────────────────────────────────
export async function sendPasswordResetByAdminEmail(to, { newPassword }) {
  if (!to) return { sent: false, reason: "no_recipient" };
  const subject = "Your Camellia password has been reset";
  const text =
    `Hi,\n\n` +
    `An administrator has reset your Camellia account password.\n\n` +
    `Your new temporary password is: ${newPassword}\n\n` +
    `Please log in and change this to a strong password of your own as soon as possible — go to Settings > Change Password once you're signed in.\n\n` +
    `If you did not request this change, please contact us immediately.`;
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

export default { sendMail, sendOrderStatusEmail, sendPaymentConfirmedEmail, sendBkashStatusEmail, sendRefundStatusEmail, sendOrderAutoCancelledEmail, sendVerificationOtpEmail, sendPasswordResetByAdminEmail, sendContactReplyEmail };