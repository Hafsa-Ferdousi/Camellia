import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

// ============================================================
// ESM MOCKS — MUST COME BEFORE DYNAMIC IMPORTS
// ============================================================

jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/CartItem.js", () => ({
  default: {
    deleteMany: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Wishlist.js", () => ({
  default: {
    deleteMany: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Review.js", () => ({
  default: {
    deleteMany: jest.fn(),
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: jest.fn(),
    sign: jest.fn(),
  },
}));

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

jest.unstable_mockModule("speakeasy", () => ({
  default: {
    generateSecret: jest.fn(),
    totp: {
      verify: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("qrcode", () => ({
  default: {
    toDataURL: jest.fn(),
  },
}));

jest.unstable_mockModule("../../utils/mailer.js", () => ({
  sendVerificationOtpEmail: jest.fn(),
}));

jest.unstable_mockModule("../../utils/tokens.js", () => ({
  generateAccessToken: jest.fn(),
  generateTwoFactorTempToken: jest.fn(),
  generateRawToken: jest.fn(),
  hashToken: jest.fn(),

  REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,

  REFRESH_COOKIE_NAME: "refreshToken",

  refreshCookieOptions: jest.fn(() => ({
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  })),
}));

jest.unstable_mockModule("../../utils/otp.js", () => ({
  generateOtp: jest.fn(),
  hashOtp: jest.fn(),
  compareOtp: jest.fn(),

  OTP_TTL_MS: 10 * 60 * 1000,
}));

jest.unstable_mockModule("../../utils/notifyAdmins.js", () => ({
  notifyAdmins: jest.fn(),
}));

jest.unstable_mockModule("../../utils/validators.js", () => ({
  validatePasswordStrength: jest.fn(),
}));

// ============================================================
// DYNAMIC IMPORTS
// ============================================================

const { default: User } =
  await import("../../models/User.js");

const { default: CartItem } =
  await import("../../models/CartItem.js");

const { default: Wishlist } =
  await import("../../models/Wishlist.js");

const { default: Review } =
  await import("../../models/Review.js");

const { default: jwt } =
  await import("jsonwebtoken");

const { default: bcrypt } =
  await import("bcryptjs");

const { default: speakeasy } =
  await import("speakeasy");

const { default: qrcode } =
  await import("qrcode");

const { sendVerificationOtpEmail } =
  await import("../../utils/mailer.js");

const tokenUtils =
  await import("../../utils/tokens.js");

const otpUtils =
  await import("../../utils/otp.js");

const notifyAdminUtils =
  await import("../../utils/notifyAdmins.js");

const validatorUtils =
  await import("../../utils/validators.js");

// ============================================================
// CONTROLLER IMPORT — AFTER ALL MOCKS
// ============================================================

const {
  registerUser,
  loginUser,
  verifyTwoFactorLogin,
  refreshAccessToken,
  logoutUser,
  getSecurityQuestion,
  resetPasswordWithAnswer,
  getMe,
  updateProfile,
  updateDefaultAddress,
  deleteAccount,
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  verifyEmailOtp,
  resendEmailOtp,
} = await import("../../controllers/authController.js");

// ============================================================
// TEST SUITE
// ============================================================

describe("Auth Controller", () => {
  let mockReq;
  let mockRes;
  let mockUser;

  // ============================================================
  // MONGOOSE QUERY MOCK
  // ============================================================

  const mockQuery = (value) => ({
    select: jest.fn().mockResolvedValue(value),
  });

  // ============================================================
  // BEFORE EACH
  // ============================================================

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},

      headers: {
        "user-agent": "test-agent",
      },

      cookies: {},

      user: {
        _id: "user123",
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    mockUser = {
      _id: "user123",

      username: "testuser",
      name: "Test User",
      email: "test@example.com",

      password: "hashedPassword",

      phone: "01700000000",

      role: "user",

      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorTempSecret: undefined,

      isEmailVerified: true,

      preferredLanguage: "en",
      notificationsEnabled: true,

      addresses: [
        {
          addressLine: "123 Main Road",
          district: "Dhaka",
          city: "Dhaka",
          phone: "01700000000",
          isDefault: true,
        },
      ],

      // IMPORTANT:
      // This MUST match one of the actual SECURITY_QUESTIONS.
      securityQuestion:
        "What is the name of your first pet?",

      securityAnswerHash: "hashedAnswer",

      refreshTokens: [],

      isLocked: jest.fn().mockReturnValue(false),

      matchPassword: jest.fn(),

      registerFailedLogin: jest.fn(),

      resetLoginAttempts: jest.fn(),

      save: jest.fn().mockResolvedValue(true),

      deleteOne: jest.fn().mockResolvedValue(true),
    };

    // ========================================================
    // DEFAULT MOCK VALUES
    // ========================================================

    validatorUtils.validatePasswordStrength.mockReturnValue({
      valid: true,
      message: "",
    });

    bcrypt.hash.mockResolvedValue("hashedAnswer");

    bcrypt.compare.mockResolvedValue(true);

    otpUtils.generateOtp.mockReturnValue("123456");

    otpUtils.hashOtp.mockResolvedValue("hashedOtp");

    otpUtils.compareOtp.mockResolvedValue(true);

    sendVerificationOtpEmail.mockResolvedValue(true);

    tokenUtils.generateAccessToken.mockReturnValue(
      "accessToken123"
    );

    tokenUtils.generateTwoFactorTempToken.mockReturnValue(
      "tempToken123"
    );

    tokenUtils.generateRawToken.mockReturnValue(
      "rawRefreshToken"
    );

    tokenUtils.hashToken.mockReturnValue(
      "hashedRefresh"
    );

    speakeasy.generateSecret.mockReturnValue({
      base32: "SECRETBASE32",
      otpauth_url: "otpauth://test",
    });

    speakeasy.totp.verify.mockReturnValue(true);

    qrcode.toDataURL.mockResolvedValue(
      "data:image/png;base64,test"
    );

    notifyAdminUtils.notifyAdmins.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // REGISTER USER
  // ============================================================

  describe("registerUser", () => {
    test("1. should successfully register a new user", async () => {
      mockReq.body = {
        username: "newuser",
        name: "New User",
        email: "new@example.com",
        password: "StrongPass123!",
        phone: "01711111111",

        securityQuestion:
          "What is the name of your first pet?",

        securityAnswer: "Fluffy",

        addressLine: "House 10",
        district: "Dhaka",
        city: "Dhaka",
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);

      await registerUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "Account created. Check your email for a verification code.",
        email: "new@example.com",
      });

      expect(User.create).toHaveBeenCalled();

      expect(sendVerificationOtpEmail).toHaveBeenCalledWith(
        "new@example.com",
        "123456"
      );
    });

    test(
      "2. should reject registration when required fields are missing",
      async () => {
        mockReq.body = {
          username: "newuser",
          email: "new@example.com",
        };

        await registerUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "Username, name, email, password, security question, answer and shipping address are required.",
        });
      }
    );

    test(
      "3. should reject duplicate email or username",
      async () => {
        mockReq.body = {
          username: "testuser",
          name: "Test User",
          email: "test@example.com",
          password: "StrongPass123!",

          securityQuestion:
            "What is the name of your first pet?",

          securityAnswer: "Fluffy",

          addressLine: "House 10",
          district: "Dhaka",
          city: "Dhaka",
        };

        User.findOne.mockResolvedValue(mockUser);

        await registerUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "User with this email or username already exists",
        });
      }
    );

    test(
      "4. should reject weak password",
      async () => {
        mockReq.body = {
          username: "newuser",
          name: "New User",
          email: "new@example.com",
          password: "weak",

          securityQuestion:
            "What is the name of your first pet?",

          securityAnswer: "Fluffy",

          addressLine: "House 10",
          district: "Dhaka",
          city: "Dhaka",
        };

        validatorUtils.validatePasswordStrength.mockReturnValue({
          valid: false,
          message: "Password is too weak",
        });

        User.findOne.mockResolvedValue(null);

        await registerUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Password is too weak",
        });
      }
    );

    test(
      "5. should reject invalid security question",
      async () => {
        mockReq.body = {
          username: "newuser",
          name: "New User",
          email: "new@example.com",
          password: "StrongPass123!",

          securityQuestion: "Invalid Question",

          securityAnswer: "Fluffy",

          addressLine: "House 10",
          district: "Dhaka",
          city: "Dhaka",
        };

        User.findOne.mockResolvedValue(null);

        await registerUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "Please choose a valid security question.",
        });
      }
    );

    test(
      "6. should handle database errors",
      async () => {
        mockReq.body = {
          username: "newuser",
          name: "New User",
          email: "new@example.com",
          password: "StrongPass123!",

          securityQuestion:
            "What is the name of your first pet?",

          securityAnswer: "Fluffy",

          addressLine: "House 10",
          district: "Dhaka",
          city: "Dhaka",
        };

        User.findOne.mockRejectedValue(
          new Error("Database error")
        );

        await registerUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Database error",
        });
      }
    );
  });

  // ============================================================
  // LOGIN
  // ============================================================

  describe("loginUser", () => {
    test(
      "7. should login successfully with valid credentials",
      async () => {
        mockReq.body = {
          email: "test@example.com",
          password: "correctPassword",
        };

        mockUser.matchPassword.mockResolvedValue(true);

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        await loginUser(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            _id: "user123",
            email: "test@example.com",
            token: "accessToken123",
          })
        );

        expect(mockRes.cookie).toHaveBeenCalled();

        expect(mockUser.save).toHaveBeenCalled();
      }
    );

    test(
      "8. should reject missing email or username",
      async () => {
        mockReq.body = {
          password: "password",
        };

        await loginUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "Email/username and password are required.",
        });
      }
    );

    test(
      "9. should reject nonexistent user",
      async () => {
        mockReq.body = {
          email: "missing@example.com",
          password: "password",
        };

        User.findOne.mockReturnValue(
          mockQuery(null)
        );

        await loginUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Invalid credentials",
        });
      }
    );

    test(
      "10. should reject incorrect password",
      async () => {
        mockReq.body = {
          email: "test@example.com",
          password: "wrongPassword",
        };

        mockUser.matchPassword.mockResolvedValue(false);

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        await loginUser(mockReq, mockRes);

        expect(
          mockUser.registerFailedLogin
        ).toHaveBeenCalled();

        expect(mockRes.status).toHaveBeenCalledWith(401);

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Invalid credentials",
        });
      }
    );

    test(
      "11. should reject locked account",
      async () => {
        mockReq.body = {
          email: "test@example.com",
          password: "password",
        };

        mockUser.isLocked.mockReturnValue(true);

        mockUser.lockUntil = new Date(
          Date.now() + 300000
        );

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        await loginUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(423);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining(
              "Account temporarily locked"
            ),
          })
        );
      }
    );

    test(
      "12. should reject unverified email",
      async () => {
        mockReq.body = {
          email: "test@example.com",
          password: "correctPassword",
        };

        mockUser.matchPassword.mockResolvedValue(true);

        mockUser.isEmailVerified = false;

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        await loginUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(403);

        expect(mockRes.json).toHaveBeenCalledWith({
          code: "EMAIL_NOT_VERIFIED",
          message:
            "Please verify your email before logging in.",
          email: "test@example.com",
        });
      }
    );

    test(
      "13. should require 2FA when enabled",
      async () => {
        mockReq.body = {
          email: "test@example.com",
          password: "correctPassword",
        };

        mockUser.matchPassword.mockResolvedValue(true);

        mockUser.twoFactorEnabled = true;

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        await loginUser(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          twoFactorRequired: true,
          tempToken: "tempToken123",
        });
      }
    );
  });

  // ============================================================
  // VERIFY 2FA LOGIN
  // ============================================================

  describe("verifyTwoFactorLogin", () => {
    test(
      "14. should successfully verify 2FA login",
      async () => {
        mockReq.body = {
          tempToken: "validTempToken",
          code: "123456",
        };

        jwt.verify.mockReturnValue({
          id: "user123",
          type: "2fa_pending",
        });

        mockUser.twoFactorEnabled = true;
        mockUser.twoFactorSecret = "SECRETBASE32";

        User.findById.mockReturnValue(
          mockQuery(mockUser)
        );

        speakeasy.totp.verify.mockReturnValue(true);

        await verifyTwoFactorLogin(
          mockReq,
          mockRes
        );

        expect(jwt.verify).toHaveBeenCalledWith(
          "validTempToken",
          process.env.JWT_SECRET
        );

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            token: "accessToken123",
          })
        );
      }
    );

    test(
      "15. should reject invalid temporary token",
      async () => {
        mockReq.body = {
          tempToken: "invalidToken",
          code: "123456",
        };

        jwt.verify.mockImplementation(() => {
          throw new Error("Invalid token");
        });

        await verifyTwoFactorLogin(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(401);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "2FA session expired. Please log in again.",
        });
      }
    );

    test(
      "16. should reject incorrect token type",
      async () => {
        mockReq.body = {
          tempToken: "wrongTypeToken",
          code: "123456",
        };

        jwt.verify.mockReturnValue({
          id: "user123",
          type: "access",
        });

        await verifyTwoFactorLogin(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(401);

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Invalid 2FA session.",
        });
      }
    );

    test(
      "17. should reject user without 2FA enabled",
      async () => {
        mockReq.body = {
          tempToken: "validToken",
          code: "123456",
        };

        jwt.verify.mockReturnValue({
          id: "user123",
          type: "2fa_pending",
        });

        mockUser.twoFactorEnabled = false;

        User.findById.mockReturnValue(
          mockQuery(mockUser)
        );

        await verifyTwoFactorLogin(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(401);

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Invalid 2FA session.",
        });
      }
    );

    test(
      "18. should reject incorrect authentication code",
      async () => {
        mockReq.body = {
          tempToken: "validToken",
          code: "999999",
        };

        jwt.verify.mockReturnValue({
          id: "user123",
          type: "2fa_pending",
        });

        mockUser.twoFactorEnabled = true;
        mockUser.twoFactorSecret = "SECRETBASE32";

        User.findById.mockReturnValue(
          mockQuery(mockUser)
        );

        speakeasy.totp.verify.mockReturnValue(false);

        await verifyTwoFactorLogin(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(401);

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Incorrect authentication code.",
        });
      }
    );

    test(
      "19. should reject missing temp token or code",
      async () => {
        mockReq.body = {
          tempToken: "token",
        };

        await verifyTwoFactorLogin(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Temp token and code are required.",
        });
      }
    );
  });

  // ============================================================
  // REFRESH TOKEN
  // ============================================================

  describe("refreshAccessToken", () => {
    test(
      "20. should refresh access token successfully",
      async () => {
        mockReq.cookies = {
          refreshToken: "validRefreshToken",
        };

        mockUser.refreshTokens = [
          {
            tokenHash: "hashedRefresh",
            expiresAt: new Date(
              Date.now() + 600000
            ),
          },
        ];

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        await refreshAccessToken(
          mockReq,
          mockRes
        );

        expect(mockRes.json).toHaveBeenCalledWith({
          token: "accessToken123",
        });

        expect(mockRes.cookie).toHaveBeenCalled();
      }
    );

    test(
      "21. should reject missing refresh token",
      async () => {
        mockReq.cookies = {};

        await refreshAccessToken(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(401);

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "No refresh token.",
        });
      }
    );

    test(
      "22. should reject invalid refresh token",
      async () => {
        mockReq.cookies = {
          refreshToken: "invalidRefreshToken",
        };

        User.findOne.mockReturnValue(
          mockQuery(null)
        );

        await refreshAccessToken(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(401);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "Refresh token invalid. Please log in again.",
        });

        expect(mockRes.clearCookie).toHaveBeenCalled();
      }
    );

    test(
      "23. should reject expired refresh token",
      async () => {
        mockReq.cookies = {
          refreshToken: "expiredRefreshToken",
        };

        mockUser.refreshTokens = [
          {
            tokenHash: "hashedRefresh",
            expiresAt: new Date(
              Date.now() - 1000
            ),
          },
        ];

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        await refreshAccessToken(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(401);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "Refresh token expired. Please log in again.",
        });

        expect(mockRes.clearCookie).toHaveBeenCalled();
      }
    );
  });

  // ============================================================
  // LOGOUT
  // ============================================================

  describe("logoutUser", () => {
    test(
      "24. should logout successfully",
      async () => {
        mockReq.cookies = {
          refreshToken: "refreshToken123",
        };

        await logoutUser(
          mockReq,
          mockRes
        );

        expect(User.updateOne).toHaveBeenCalled();

        expect(mockRes.clearCookie).toHaveBeenCalled();

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Logged out.",
        });
      }
    );

    test(
      "25. should logout even without refresh token",
      async () => {
        mockReq.cookies = {};

        await logoutUser(
          mockReq,
          mockRes
        );

        expect(User.updateOne).not.toHaveBeenCalled();

        expect(mockRes.clearCookie).toHaveBeenCalled();

        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Logged out.",
        });
      }
    );
  });

  // ============================================================
  // SECURITY QUESTION
  // ============================================================

  describe("getSecurityQuestion", () => {
    test(
      "26. should return security question",
      async () => {
        mockReq.body = {
          identifier: "test@example.com",
        };

        User.findOne.mockResolvedValue(mockUser);

        await getSecurityQuestion(
          mockReq,
          mockRes
        );

        expect(mockRes.json).toHaveBeenCalledWith({
          question:
            "What is the name of your first pet?",
        });
      }
    );

    test(
      "27. should reject missing identifier",
      async () => {
        mockReq.body = {};

        await getSecurityQuestion(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "Email or username is required.",
        });
      }
    );

    test(
      "28. should return fake question for unknown user",
      async () => {
        mockReq.body = {
          identifier: "unknown@example.com",
        };

        User.findOne.mockResolvedValue(null);

        await getSecurityQuestion(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).not.toHaveBeenCalledWith(404);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            question: expect.any(String),
          })
        );
      }
    );
  });

  // ============================================================
  // PASSWORD RESET
  // ============================================================

  describe("resetPasswordWithAnswer", () => {
    test(
      "29. should reset password successfully",
      async () => {
        mockReq.body = {
          identifier: "test@example.com",
          answer: "Fluffy",
          password: "NewStrongPass123!",
        };

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        bcrypt.compare.mockResolvedValue(true);

        await resetPasswordWithAnswer(
          mockReq,
          mockRes
        );

        expect(mockUser.password).toBe(
          "NewStrongPass123!"
        );

        expect(mockUser.refreshTokens).toEqual([]);

        expect(mockUser.save).toHaveBeenCalled();

        expect(
          mockRes.clearCookie
        ).toHaveBeenCalled();

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "Password reset successfully. Please log in with your new password.",
        });
      }
    );

    test(
      "30. should reject missing reset fields",
      async () => {
        mockReq.body = {
          identifier: "test@example.com",
        };

        await resetPasswordWithAnswer(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "Identifier, security answer, and new password are required.",
        });
      }
    );

    test(
      "31. should reject nonexistent user",
      async () => {
        mockReq.body = {
          identifier: "missing@example.com",
          answer: "Fluffy",
          password: "NewStrongPass123!",
        };

        User.findOne.mockReturnValue(
          mockQuery(null)
        );

        await resetPasswordWithAnswer(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "Incorrect answer. Please try again.",
        });
      }
    );

    test(
      "32. should reject incorrect security answer",
      async () => {
        mockReq.body = {
          identifier: "test@example.com",
          answer: "WrongAnswer",
          password: "NewStrongPass123!",
        };

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        bcrypt.compare.mockResolvedValue(false);

        await resetPasswordWithAnswer(
          mockReq,
          mockRes
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);

        expect(mockRes.json).toHaveBeenCalledWith({
          message:
            "Incorrect answer. Please try again.",
        });
      }
    );
  });

  // ============================================================
  // GET ME
  // ============================================================

  describe("getMe", () => {
    test(
      "33. should return current user profile",
      async () => {
        mockReq.user = mockUser;

        await getMe(
          mockReq,
          mockRes
        );

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            _id: "user123",
            username: "testuser",
            name: "Test User",
            email: "test@example.com",
            role: "user",
          })
        );
      }
    );

    test(
      "34. should not expose sensitive fields",
      async () => {
        mockReq.user = mockUser;

        await getMe(
          mockReq,
          mockRes
        );

        const response =
          mockRes.json.mock.calls[0][0];

        expect(response).not.toHaveProperty(
          "password"
        );

        expect(response).not.toHaveProperty(
          "refreshTokens"
        );
      }
    );
  });

  // ============================================================
  // UPDATE PROFILE
  // ============================================================

  describe("updateProfile", () => {
    test(
      "35. should update profile successfully",
      async () => {
        mockReq.body = {
          name: "Updated Name",
          phone: "01888888888",
          preferredLanguage: "bn",
          notificationsEnabled: false,
        };

        User.findById.mockResolvedValue(
          mockUser
        );

        await updateProfile(
          mockReq,
          mockRes
        );

        expect(mockUser.name).toBe(
          "Updated Name"
        );

        expect(mockUser.phone).toBe(
          "01888888888"
        );

        expect(
          mockUser.preferredLanguage
        ).toBe("bn");

        expect(
          mockUser.notificationsEnabled
        ).toBe(false);

        expect(
          mockUser.save
        ).toHaveBeenCalled();

        expect(
          mockRes.json
        ).toHaveBeenCalled();
      }
    );

    test(
      "36. should reject invalid preferred language",
      async () => {
        mockReq.body = {
          preferredLanguage: "fr",
        };

        User.findById.mockResolvedValue(
          mockUser
        );

        await updateProfile(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(400);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Invalid preferred language.",
        });
      }
    );
  });

  // ============================================================
  // UPDATE DEFAULT ADDRESS
  // ============================================================

  describe("updateDefaultAddress", () => {
    test(
      "37. should update default address",
      async () => {
        mockReq.body = {
          addressLine: "New House",
          district: "Chittagong",
          city: "Chittagong",
          phone: "01999999999",
        };

        User.findById.mockResolvedValue(
          mockUser
        );

        await updateDefaultAddress(
          mockReq,
          mockRes
        );

        expect(
          mockUser.addresses[0]
        ).toEqual({
          addressLine: "New House",
          district: "Chittagong",
          city: "Chittagong",
          phone: "01999999999",
          isDefault: true,
        });

        expect(
          mockUser.save
        ).toHaveBeenCalled();

        expect(
          mockRes.json
        ).toHaveBeenCalled();
      }
    );

    test(
      "38. should reject missing address fields",
      async () => {
        mockReq.body = {
          addressLine: "House",
          district: "Dhaka",
        };

        await updateDefaultAddress(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(400);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Address line, district, city, and phone are required.",
        });
      }
    );
  });

  // ============================================================
  // DELETE ACCOUNT
  // ============================================================

  describe("deleteAccount", () => {
    test(
      "39. should delete account successfully",
      async () => {
        mockReq.body = {
          password: "correctPassword",
        };

        mockUser.matchPassword.mockResolvedValue(
          true
        );

        User.findById.mockReturnValue(
          mockQuery(mockUser)
        );

        CartItem.deleteMany.mockResolvedValue({
          deletedCount: 1,
        });

        Wishlist.deleteMany.mockResolvedValue({
          deletedCount: 1,
        });

        Review.deleteMany.mockResolvedValue({
          deletedCount: 1,
        });

        await deleteAccount(
          mockReq,
          mockRes
        );

        expect(
          CartItem.deleteMany
        ).toHaveBeenCalledWith({
          user: "user123",
        });

        expect(
          Wishlist.deleteMany
        ).toHaveBeenCalledWith({
          user: "user123",
        });

        expect(
          Review.deleteMany
        ).toHaveBeenCalledWith({
          user: "user123",
        });

        expect(
          mockUser.deleteOne
        ).toHaveBeenCalled();

        expect(
          mockRes.clearCookie
        ).toHaveBeenCalled();

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Your account has been deleted.",
        });
      }
    );

    test(
      "40. should reject incorrect password",
      async () => {
        mockReq.body = {
          password: "wrongPassword",
        };

        mockUser.matchPassword.mockResolvedValue(
          false
        );

        User.findById.mockReturnValue(
          mockQuery(mockUser)
        );

        await deleteAccount(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(401);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message: "Incorrect password.",
        });

        expect(
          mockUser.deleteOne
        ).not.toHaveBeenCalled();
      }
    );
  });

  // ============================================================
  // SETUP 2FA
  // ============================================================

  describe("setupTwoFactor", () => {
    test(
      "41. should generate 2FA secret and QR code",
      async () => {
        mockUser.twoFactorEnabled = false;

        User.findById.mockResolvedValue(
          mockUser
        );

        await setupTwoFactor(
          mockReq,
          mockRes
        );

        expect(
          speakeasy.generateSecret
        ).toHaveBeenCalled();

        expect(
          mockUser.twoFactorTempSecret
        ).toBe("SECRETBASE32");

        expect(
          mockUser.save
        ).toHaveBeenCalled();

        expect(
          qrcode.toDataURL
        ).toHaveBeenCalledWith(
          "otpauth://test"
        );

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          qrCodeDataUrl:
            "data:image/png;base64,test",
          secret: "SECRETBASE32",
        });
      }
    );

    test(
      "42. should reject when 2FA already enabled",
      async () => {
        mockUser.twoFactorEnabled = true;

        User.findById.mockResolvedValue(
          mockUser
        );

        await setupTwoFactor(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(400);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Two-factor authentication is already enabled.",
        });
      }
    );
  });

  // ============================================================
  // VERIFY 2FA SETUP
  // ============================================================

  describe("verifyTwoFactorSetup", () => {
    test(
      "43. should successfully enable 2FA",
      async () => {
        mockReq.body = {
          code: "123456",
        };

        mockUser.twoFactorTempSecret =
          "SECRETBASE32";

        User.findById.mockReturnValue(
          mockQuery(mockUser)
        );

        speakeasy.totp.verify.mockReturnValue(
          true
        );

        await verifyTwoFactorSetup(
          mockReq,
          mockRes
        );

        expect(
          mockUser.twoFactorSecret
        ).toBe("SECRETBASE32");

        expect(
          mockUser.twoFactorTempSecret
        ).toBeUndefined();

        expect(
          mockUser.twoFactorEnabled
        ).toBe(true);

        expect(
          mockUser.save
        ).toHaveBeenCalled();

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Two-factor authentication is now enabled.",
        });
      }
    );

    test(
      "44. should reject when setup is not in progress",
      async () => {
        mockUser.twoFactorTempSecret =
          undefined;

        User.findById.mockReturnValue(
          mockQuery(mockUser)
        );

        await verifyTwoFactorSetup(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(400);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "No two-factor setup in progress. Start setup again.",
        });
      }
    );

    test(
      "45. should reject incorrect setup code",
      async () => {
        mockReq.body = {
          code: "999999",
        };

        mockUser.twoFactorTempSecret =
          "SECRETBASE32";

        User.findById.mockReturnValue(
          mockQuery(mockUser)
        );

        speakeasy.totp.verify.mockReturnValue(
          false
        );

        await verifyTwoFactorSetup(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(400);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Incorrect code. Please try again.",
        });
      }
    );
  });

  // ============================================================
  // DISABLE 2FA
  // ============================================================

  describe("disableTwoFactor", () => {
    test(
      "46. should disable 2FA successfully",
      async () => {
        mockReq.body = {
          password: "correctPassword",
        };

        mockUser.twoFactorEnabled = true;
        mockUser.twoFactorSecret = "SECRET";
        mockUser.twoFactorTempSecret = "TEMP";

        mockUser.matchPassword.mockResolvedValue(
          true
        );

        User.findById.mockReturnValue(
          mockQuery(mockUser)
        );

        await disableTwoFactor(
          mockReq,
          mockRes
        );

        expect(
          mockUser.twoFactorEnabled
        ).toBe(false);

        expect(
          mockUser.twoFactorSecret
        ).toBeUndefined();

        expect(
          mockUser.twoFactorTempSecret
        ).toBeUndefined();

        expect(
          mockUser.save
        ).toHaveBeenCalled();

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Two-factor authentication disabled.",
        });
      }
    );

    test(
      "47. should reject incorrect password",
      async () => {
        mockReq.body = {
          password: "wrongPassword",
        };

        mockUser.matchPassword.mockResolvedValue(
          false
        );

        User.findById.mockReturnValue(
          mockQuery(mockUser)
        );

        await disableTwoFactor(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(401);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message: "Incorrect password.",
        });
      }
    );
  });

  // ============================================================
  // VERIFY EMAIL OTP
  // ============================================================

  describe("verifyEmailOtp", () => {
    test(
      "48. should successfully verify email OTP",
      async () => {
        mockReq.body = {
          email: "test@example.com",
          otp: "123456",
        };

        mockUser.isEmailVerified = false;

        mockUser.emailOtpHash =
          "hashedOtp";

        mockUser.emailOtpExpiry =
          new Date(
            Date.now() + 600000
          );

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        otpUtils.compareOtp.mockResolvedValue(
          true
        );

        await verifyEmailOtp(
          mockReq,
          mockRes
        );

        expect(
          mockUser.isEmailVerified
        ).toBe(true);

        expect(
          mockUser.emailOtpHash
        ).toBeUndefined();

        expect(
          mockUser.emailOtpExpiry
        ).toBeUndefined();

        expect(
          mockUser.save
        ).toHaveBeenCalled();

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Email verified. You can now log in.",
        });

        expect(
          notifyAdminUtils.notifyAdmins
        ).toHaveBeenCalled();
      }
    );

    test(
      "49. should reject missing email or OTP",
      async () => {
        mockReq.body = {
          email: "test@example.com",
        };

        await verifyEmailOtp(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(400);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Email and code are required.",
        });
      }
    );

    test(
      "50. should reject unknown email",
      async () => {
        mockReq.body = {
          email: "missing@example.com",
          otp: "123456",
        };

        User.findOne.mockReturnValue(
          mockQuery(null)
        );

        await verifyEmailOtp(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(400);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Invalid email or code.",
        });
      }
    );

    test(
      "51. should reject expired OTP",
      async () => {
        mockReq.body = {
          email: "test@example.com",
          otp: "123456",
        };

        mockUser.isEmailVerified = false;

        mockUser.emailOtpExpiry =
          new Date(
            Date.now() - 1000
          );

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        await verifyEmailOtp(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(400);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "This code has expired. Please request a new one.",
        });
      }
    );

    test(
      "52. should reject invalid OTP",
      async () => {
        mockReq.body = {
          email: "test@example.com",
          otp: "999999",
        };

        mockUser.isEmailVerified = false;

        mockUser.emailOtpExpiry =
          new Date(
            Date.now() + 600000
          );

        User.findOne.mockReturnValue(
          mockQuery(mockUser)
        );

        otpUtils.compareOtp.mockResolvedValue(
          false
        );

        await verifyEmailOtp(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(400);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "Invalid or incorrect code.",
        });
      }
    );
  });

  // ============================================================
  // RESEND EMAIL OTP
  // ============================================================

  describe("resendEmailOtp", () => {
    test(
      "53. should resend OTP for unverified user",
      async () => {
        mockReq.body = {
          email: "test@example.com",
        };

        mockUser.isEmailVerified = false;

        User.findOne.mockResolvedValue(
          mockUser
        );

        await resendEmailOtp(
          mockReq,
          mockRes
        );

        expect(
          otpUtils.generateOtp
        ).toHaveBeenCalled();

        expect(
          otpUtils.hashOtp
        ).toHaveBeenCalledWith(
          "123456"
        );

        expect(
          mockUser.save
        ).toHaveBeenCalled();

        expect(
          sendVerificationOtpEmail
        ).toHaveBeenCalledWith(
          "test@example.com",
          "123456"
        );

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "If that account needs verification, a new code has been sent.",
        });
      }
    );

    test(
      "54. should return generic response for unknown email",
      async () => {
        mockReq.body = {
          email: "unknown@example.com",
        };

        User.findOne.mockResolvedValue(null);

        await resendEmailOtp(
          mockReq,
          mockRes
        );

        expect(
          sendVerificationOtpEmail
        ).not.toHaveBeenCalled();

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "If that account needs verification, a new code has been sent.",
        });
      }
    );

    test(
      "55. should return generic response for already verified user",
      async () => {
        mockReq.body = {
          email: "test@example.com",
        };

        mockUser.isEmailVerified = true;

        User.findOne.mockResolvedValue(
          mockUser
        );

        await resendEmailOtp(
          mockReq,
          mockRes
        );

        expect(
          sendVerificationOtpEmail
        ).not.toHaveBeenCalled();

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message:
            "If that account needs verification, a new code has been sent.",
        });
      }
    );

    test(
      "56. should reject missing email",
      async () => {
        mockReq.body = {};

        await resendEmailOtp(
          mockReq,
          mockRes
        );

        expect(
          mockRes.status
        ).toHaveBeenCalledWith(400);

        expect(
          mockRes.json
        ).toHaveBeenCalledWith({
          message: "Email is required.",
        });
      }
    );
  });
});