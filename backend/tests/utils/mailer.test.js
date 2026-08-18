import { jest } from "@jest/globals";


// ============================================================
// HELPERS
// ============================================================

const loadMailer = async ({
  emailUser = "",
  emailPassword = "",
} = {}) => {
  process.env.EMAIL_USER = emailUser;
  process.env.EMAIL_APP_PASSWORD = emailPassword;

  jest.resetModules();

  const sendMailMock = jest.fn();

  jest.unstable_mockModule("nodemailer", () => ({
    default: {
      createTransport: jest.fn(() => ({
        sendMail: sendMailMock,
      })),
    },
  }));

  const mailer = await import("../../utils/mailer.js");

  return {
    mailer,
    sendMailMock,
  };
};


// ============================================================
// TEST SUITE
// ============================================================

describe("mailer", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env = {
      ...originalEnv,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });


  // ============================================================
  // NOT CONFIGURED
  // ============================================================

  test("should skip email when email configuration is missing", async () => {
    const { mailer, sendMailMock } = await loadMailer({
      emailUser: "",
      emailPassword: "",
    });

    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const result = await mailer.sendVerificationOtpEmail(
      "customer@example.com",
      "123456"
    );

    expect(result).toEqual({
      sent: false,
      reason: "not_configured",
    });

    expect(sendMailMock).not.toHaveBeenCalled();

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[mailer] EMAIL_USER/EMAIL_APP_PASSWORD not set"
      )
    );
  });


  // ============================================================
  // NO RECIPIENT
  // ============================================================

  test("should return no_recipient when recipient is missing", async () => {
    const { mailer, sendMailMock } = await loadMailer({
      emailUser: "camellia@gmail.com",
      emailPassword: "app-password",
    });

    const result = await mailer.sendVerificationOtpEmail(
      "",
      "123456"
    );

    expect(result).toEqual({
      sent: false,
      reason: "no_recipient",
    });

    expect(sendMailMock).not.toHaveBeenCalled();
  });


  // ============================================================
  // SUCCESSFUL ORDER STATUS EMAIL
  // ============================================================

  test("should send order status email successfully", async () => {
    const { mailer, sendMailMock } = await loadMailer({
      emailUser: "camellia@gmail.com",
      emailPassword: "app-password",
    });

    sendMailMock.mockResolvedValue({
      messageId: "message123",
    });

    const result = await mailer.sendOrderStatusEmail(
      "customer@example.com",
      {
        orderId: "ORDER123",
        invoiceNumber: "INV-001",
        status: "shipped",
      }
    );

    expect(result).toEqual({
      sent: true,
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);

    expect(sendMailMock).toHaveBeenCalledWith({
      from: "Camellia <camellia@gmail.com>",
      to: "customer@example.com",
      subject: "Camellia Order Update — Shipped",
      text: expect.stringContaining(
        "Invoice: INV-001"
      ),
      html: undefined,
    });
  });


  // ============================================================
  // UNKNOWN STATUS + ORDER ID FALLBACK
  // ============================================================

  test("should use status value directly and orderId when invoice number is missing", async () => {
    const { mailer, sendMailMock } = await loadMailer({
      emailUser: "camellia@gmail.com",
      emailPassword: "app-password",
    });

    sendMailMock.mockResolvedValue({});

    const result = await mailer.sendOrderStatusEmail(
      "customer@example.com",
      {
        orderId: "ORDER999",
        status: "returned",
      }
    );

    expect(result).toEqual({
      sent: true,
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "customer@example.com",
        subject: "Camellia Order Update — returned",
        text: expect.stringContaining(
          "Invoice: ORDER999"
        ),
      })
    );
  });


  // ============================================================
  // PAYMENT CONFIRMATION
  // ============================================================

  test("should send payment confirmation email", async () => {
    const { mailer, sendMailMock } = await loadMailer({
      emailUser: "camellia@gmail.com",
      emailPassword: "app-password",
    });

    sendMailMock.mockResolvedValue({});

    const result = await mailer.sendPaymentConfirmedEmail(
      "customer@example.com",
      {
        orderId: "ORDER123",
        invoiceNumber: "INV-123",
        amount: 2500,
      }
    );

    expect(result).toEqual({
      sent: true,
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: "Camellia <camellia@gmail.com>",
      to: "customer@example.com",
      subject:
        "Camellia Payment Confirmed — Invoice INV-123",
      text: expect.stringContaining(
        "We've confirmed your payment of ৳2500"
      ),
      html: undefined,
    });
  });


  // ============================================================
  // VERIFICATION OTP
  // ============================================================

  test("should send verification OTP email", async () => {
    const { mailer, sendMailMock } = await loadMailer({
      emailUser: "camellia@gmail.com",
      emailPassword: "app-password",
    });

    sendMailMock.mockResolvedValue({});

    const result = await mailer.sendVerificationOtpEmail(
      "customer@example.com",
      "987654"
    );

    expect(result).toEqual({
      sent: true,
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: "Camellia <camellia@gmail.com>",
      to: "customer@example.com",
      subject: "Verify your Camellia account",
      text: expect.stringContaining(
        "Your Camellia verification code is: 987654"
      ),
      html: undefined,
    });
  });


  // ============================================================
  // CONTACT REPLY
  // ============================================================

  test("should send contact reply email", async () => {
    const { mailer, sendMailMock } = await loadMailer({
      emailUser: "camellia@gmail.com",
      emailPassword: "app-password",
    });

    sendMailMock.mockResolvedValue({});

    const result = await mailer.sendContactReplyEmail(
      "customer@example.com",
      {
        name: "Hafsa",
        originalMessage: "I need help with my order.",
        reply: "Sure, we can help you.",
      }
    );

    expect(result).toEqual({
      sent: true,
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: "Camellia <camellia@gmail.com>",
      to: "customer@example.com",
      subject: "Re: Your message to Camellia",
      text: expect.stringContaining(
        "Hi Hafsa"
      ),
      html: undefined,
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(
          "Sure, we can help you."
        ),
      })
    );
  });


  // ============================================================
  // CONTACT REPLY DEFAULT NAME
  // ============================================================

  test("should handle missing contact name", async () => {
    const { mailer, sendMailMock } = await loadMailer({
      emailUser: "camellia@gmail.com",
      emailPassword: "app-password",
    });

    sendMailMock.mockResolvedValue({});

    const result = await mailer.sendContactReplyEmail(
      "customer@example.com",
      {
        originalMessage: "Hello",
        reply: "Thanks for contacting us.",
      }
    );

    expect(result).toEqual({
      sent: true,
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(
          "Hi ,"
        ),
      })
    );
  });


  // ============================================================
  // PAYMENT FALLBACK TO ORDER ID
  // ============================================================

  test("should use orderId when invoice number is missing in payment email", async () => {
    const { mailer, sendMailMock } = await loadMailer({
      emailUser: "camellia@gmail.com",
      emailPassword: "app-password",
    });

    sendMailMock.mockResolvedValue({});

    const result = await mailer.sendPaymentConfirmedEmail(
      "customer@example.com",
      {
        orderId: "ORDER-456",
        amount: 1000,
      }
    );

    expect(result).toEqual({
      sent: true,
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject:
          "Camellia Payment Confirmed — Invoice ORDER-456",
      })
    );
  });


  // ============================================================
  // SEND ERROR
  // ============================================================

  test("should catch sendMail errors and return failed result", async () => {
    const { mailer, sendMailMock } = await loadMailer({
      emailUser: "camellia@gmail.com",
      emailPassword: "app-password",
    });

    sendMailMock.mockRejectedValue(
      new Error("SMTP connection failed")
    );

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await mailer.sendVerificationOtpEmail(
      "customer@example.com",
      "123456"
    );

    expect(result).toEqual({
      sent: false,
      reason: "SMTP connection failed",
    });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[mailer] Failed to send email"
      ),
      "SMTP connection failed"
    );
  });


  // ============================================================
  // DEFAULT EXPORT
  // ============================================================

  test("should expose all mailer functions through default export", async () => {
    const { mailer } = await loadMailer({
      emailUser: "camellia@gmail.com",
      emailPassword: "app-password",
    });

    expect(mailer.default).toBeDefined();

    expect(mailer.default.sendMail).toBeDefined();

    expect(
      mailer.default.sendOrderStatusEmail
    ).toBeDefined();

    expect(
      mailer.default.sendPaymentConfirmedEmail
    ).toBeDefined();

    expect(
      mailer.default.sendVerificationOtpEmail
    ).toBeDefined();

    expect(
      mailer.default.sendContactReplyEmail
    ).toBeDefined();
  });
});