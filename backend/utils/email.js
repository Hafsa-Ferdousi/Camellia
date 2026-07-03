import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

/**
 * Sends an email if SMTP_* env vars are configured. Otherwise (local dev /
 * no mail server set up yet) it just logs the content clearly to the
 * console so the flow can still be tested end-to-end.
 */
export async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();

  if (!t) {
    console.log("\n──────── 📧  EMAIL (SMTP not configured — logging only) ────────");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text || html);
    console.log("──────────────────────────────────────────────────────────────\n");
    return { delivered: false, reason: "smtp_not_configured" };
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || "Camellia <no-reply@camellia.example>",
    to,
    subject,
    html,
    text,
  });
  return { delivered: true };
}

export function verificationEmailContent(link, otp) {
  return {
    subject: "Verify your Camellia account",
    html: `<p>Welcome to Camellia! Please confirm your email address.</p>
           <p>Click to verify: <a href="${link}">${link}</a></p>
           <p>Or enter this code on the verification page: <strong style="font-size:20px; letter-spacing:4px;">${otp}</strong></p>
           <p>The link expires in 24 hours; the code expires in 10 minutes.</p>`,
    text: `Welcome to Camellia! Verify your email: ${link} (expires in 24 hours)\nOr enter this code: ${otp} (expires in 10 minutes)`,
  };
}

export function passwordResetEmailContent(link, otp) {
  return {
    subject: "Reset your Camellia password",
    html: `<p>We received a request to reset your password.</p>
           <p>Click to reset: <a href="${link}">${link}</a></p>
           <p>Or enter this code on the reset page: <strong style="font-size:20px; letter-spacing:4px;">${otp}</strong></p>
           <p>The link expires in 1 hour; the code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
    text: `Reset your password: ${link} (expires in 1 hour)\nOr enter this code: ${otp} (expires in 10 minutes). If you didn't request this, ignore this email.`,
  };
}
