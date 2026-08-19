import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK CONTROLLERS
// ======================================================

const mockRegisterUser = jest.fn();
const mockLoginUser = jest.fn();
const mockVerifyTwoFactorLogin = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockLogoutUser = jest.fn();
const mockGetMe = jest.fn();
const mockUpdateProfile = jest.fn();
const mockUpdateDefaultAddress = jest.fn();
const mockDeleteAccount = jest.fn();

const mockGetSecurityQuestion = jest.fn();
const mockResetPasswordWithAnswer = jest.fn();

const mockSetupTwoFactor = jest.fn();
const mockVerifyTwoFactorSetup = jest.fn();
const mockDisableTwoFactor = jest.fn();

const mockVerifyEmailOtp = jest.fn();
const mockResendEmailOtp = jest.fn();

// ======================================================
// MOCK MIDDLEWARE
// ======================================================

const mockProtect = jest.fn((req, res, next) => {
  req.user = {
    id: "user123",
    email: "customer@example.com",
  };

  next();
});

const mockLoginLimiter = jest.fn((req, res, next) => {
  next();
});

const mockSensitiveActionLimiter = jest.fn(
  (req, res, next) => {
    next();
  }
);

// ======================================================
// MOCK AUTH CONTROLLER
// ======================================================

jest.unstable_mockModule(
  "../../controllers/authController.js",
  () => ({
    registerUser: mockRegisterUser,
    loginUser: mockLoginUser,
    verifyTwoFactorLogin:
      mockVerifyTwoFactorLogin,
    refreshAccessToken:
      mockRefreshAccessToken,
    logoutUser: mockLogoutUser,
    getMe: mockGetMe,
    updateProfile: mockUpdateProfile,
    updateDefaultAddress:
      mockUpdateDefaultAddress,
    deleteAccount: mockDeleteAccount,

    getSecurityQuestion:
      mockGetSecurityQuestion,
    resetPasswordWithAnswer:
      mockResetPasswordWithAnswer,

    setupTwoFactor: mockSetupTwoFactor,
    verifyTwoFactorSetup:
      mockVerifyTwoFactorSetup,
    disableTwoFactor:
      mockDisableTwoFactor,

    verifyEmailOtp: mockVerifyEmailOtp,
    resendEmailOtp: mockResendEmailOtp,
  })
);

// ======================================================
// MOCK AUTH MIDDLEWARE
// ======================================================

jest.unstable_mockModule(
  "../../middleware/authMiddleware.js",
  () => ({
    protect: mockProtect,
  })
);

// ======================================================
// MOCK RATE LIMITERS
// ======================================================

jest.unstable_mockModule(
  "../../middleware/rateLimiters.js",
  () => ({
    loginLimiter: mockLoginLimiter,
    sensitiveActionLimiter:
      mockSensitiveActionLimiter,
  })
);

// ======================================================
// IMPORT ROUTER AFTER MOCKING
// ======================================================

const { default: authRouter } =
  await import("../../routes/authRoutes.js");

// ======================================================
// TEST APP
// ======================================================

const app = express();

app.use(express.json());

app.use("/auth", authRouter);

// ======================================================
// DEFAULT CONTROLLER RESPONSES
// ======================================================

function setupControllerMocks() {
  mockRegisterUser.mockImplementation(
    (req, res) => {
      res.status(201).json({
        success: true,
        message: "User registered",
      });
    }
  );

  mockLoginUser.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Login successful",
      });
    }
  );

  mockVerifyTwoFactorLogin.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "2FA verified",
      });
    }
  );

  mockRefreshAccessToken.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Token refreshed",
      });
    }
  );

  mockLogoutUser.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Logged out",
      });
    }
  );

  mockGetMe.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        user: req.user,
      });
    }
  );

  mockUpdateProfile.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        user: req.body,
      });
    }
  );

  mockUpdateDefaultAddress.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        address: req.body,
      });
    }
  );

  mockDeleteAccount.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Account deleted",
      });
    }
  );

  mockGetSecurityQuestion.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        question:
          "What is the name of your first pet?",
      });
    }
  );

  mockResetPasswordWithAnswer.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Password reset",
      });
    }
  );

  mockSetupTwoFactor.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "2FA setup started",
      });
    }
  );

  mockVerifyTwoFactorSetup.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "2FA setup verified",
      });
    }
  );

  mockDisableTwoFactor.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "2FA disabled",
      });
    }
  );

  mockVerifyEmailOtp.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Email verified",
      });
    }
  );

  mockResendEmailOtp.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "OTP sent",
      });
    }
  );
}

// ======================================================
// TEST SUITE
// ======================================================

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setupControllerMocks();
  });

  // ====================================================
  // REGISTER
  // ====================================================

  describe("POST /auth/register", () => {
    test("should call registerUser", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({
          name: "Test Customer",
          email: "customer@example.com",
          password: "Password123!",
        })
        .expect(201);

      expect(
        mockRegisterUser
      ).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        message: "User registered",
      });
    });

    test("should use sensitiveActionLimiter", async () => {
      await request(app)
        .post("/auth/register")
        .send({
          email: "customer@example.com",
          password: "Password123!",
        })
        .expect(201);

      expect(
        mockSensitiveActionLimiter
      ).toHaveBeenCalled();
    });
  });

  // ====================================================
  // LOGIN
  // ====================================================

  describe("POST /auth/login", () => {
    test("should call loginUser", async () => {
      await request(app)
        .post("/auth/login")
        .send({
          email: "customer@example.com",
          password: "Password123!",
        })
        .expect(200);

      expect(
        mockLoginUser
      ).toHaveBeenCalledTimes(1);
    });

    test("should use loginLimiter", async () => {
      await request(app)
        .post("/auth/login")
        .send({
          email: "customer@example.com",
          password: "Password123!",
        })
        .expect(200);

      expect(
        mockLoginLimiter
      ).toHaveBeenCalled();
    });
  });

  // ====================================================
  // 2FA LOGIN
  // ====================================================

  describe("POST /auth/2fa/verify", () => {
    test("should call verifyTwoFactorLogin", async () => {
      await request(app)
        .post("/auth/2fa/verify")
        .send({
          tempToken: "temporary-token",
          code: "123456",
        })
        .expect(200);

      expect(
        mockVerifyTwoFactorLogin
      ).toHaveBeenCalledTimes(1);
    });

    test("should use loginLimiter", async () => {
      await request(app)
        .post("/auth/2fa/verify")
        .send({
          tempToken: "temporary-token",
          code: "123456",
        })
        .expect(200);

      expect(
        mockLoginLimiter
      ).toHaveBeenCalled();
    });
  });

  // ====================================================
  // REFRESH
  // ====================================================

  describe("POST /auth/refresh", () => {
    test("should call refreshAccessToken", async () => {
      await request(app)
        .post("/auth/refresh")
        .expect(200);

      expect(
        mockRefreshAccessToken
      ).toHaveBeenCalledTimes(1);
    });
  });

  // ====================================================
  // LOGOUT
  // ====================================================

  describe("POST /auth/logout", () => {
    test("should call logoutUser", async () => {
      await request(app)
        .post("/auth/logout")
        .expect(200);

      expect(
        mockLogoutUser
      ).toHaveBeenCalledTimes(1);
    });
  });

  // ====================================================
  // GET ME
  // ====================================================

  describe("GET /auth/me", () => {
    test("should require authentication", async () => {
      const response = await request(app)
        .get("/auth/me")
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();

      expect(
        mockGetMe
      ).toHaveBeenCalledTimes(1);

      expect(response.body.user.id).toBe(
        "user123"
      );
    });
  });

  // ====================================================
  // UPDATE PROFILE
  // ====================================================

  describe("PATCH /auth/me", () => {
    test("should require authentication and update profile", async () => {
      const profile = {
        name: "Updated Customer",
        phone: "01700000000",
      };

      const response = await request(app)
        .patch("/auth/me")
        .send(profile)
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();

      expect(
        mockUpdateProfile
      ).toHaveBeenCalledTimes(1);

      expect(response.body.user).toEqual(
        profile
      );
    });
  });

  // ====================================================
  // DEFAULT ADDRESS
  // ====================================================

  describe("PUT /auth/me/address", () => {
    test("should require authentication", async () => {
      const address = {
        street: "Dhanmondi",
        city: "Dhaka",
        country: "Bangladesh",
      };

      const response = await request(app)
        .put("/auth/me/address")
        .send(address)
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();

      expect(
        mockUpdateDefaultAddress
      ).toHaveBeenCalledTimes(1);

      expect(response.body.address).toEqual(
        address
      );
    });
  });

  // ====================================================
  // DELETE ACCOUNT
  // ====================================================

  describe("DELETE /auth/me", () => {
    test("should require authentication", async () => {
      await request(app)
        .delete("/auth/me")
        .send({
          password: "Password123!",
        })
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();

      expect(
        mockDeleteAccount
      ).toHaveBeenCalledTimes(1);
    });

    test("should use sensitiveActionLimiter", async () => {
      await request(app)
        .delete("/auth/me")
        .send({
          password: "Password123!",
        })
        .expect(200);

      expect(
        mockSensitiveActionLimiter
      ).toHaveBeenCalled();
    });
  });

  // ====================================================
  // EMAIL VERIFICATION
  // ====================================================

  describe("POST /auth/verify-email", () => {
    test("should call verifyEmailOtp", async () => {
      await request(app)
        .post("/auth/verify-email")
        .send({
          email: "customer@example.com",
          otp: "123456",
        })
        .expect(200);

      expect(
        mockVerifyEmailOtp
      ).toHaveBeenCalledTimes(1);
    });

    test("should use sensitiveActionLimiter", async () => {
      await request(app)
        .post("/auth/verify-email")
        .send({
          email: "customer@example.com",
          otp: "123456",
        })
        .expect(200);

      expect(
        mockSensitiveActionLimiter
      ).toHaveBeenCalled();
    });
  });

  // ====================================================
  // RESEND OTP
  // ====================================================

  describe("POST /auth/resend-otp", () => {
    test("should call resendEmailOtp", async () => {
      await request(app)
        .post("/auth/resend-otp")
        .send({
          email: "customer@example.com",
        })
        .expect(200);

      expect(
        mockResendEmailOtp
      ).toHaveBeenCalledTimes(1);
    });

    test("should use sensitiveActionLimiter", async () => {
      await request(app)
        .post("/auth/resend-otp")
        .send({
          email: "customer@example.com",
        })
        .expect(200);

      expect(
        mockSensitiveActionLimiter
      ).toHaveBeenCalled();
    });
  });

  // ====================================================
  // SECURITY QUESTION
  // ====================================================

  describe(
    "POST /auth/forgot-password/question",
    () => {
      test("should call getSecurityQuestion", async () => {
        const response = await request(app)
          .post(
            "/auth/forgot-password/question"
          )
          .send({
            email:
              "customer@example.com",
          })
          .expect(200);

        expect(
          mockGetSecurityQuestion
        ).toHaveBeenCalledTimes(1);

        expect(
          response.body.question
        ).toBe(
          "What is the name of your first pet?"
        );
      });

      test("should use sensitiveActionLimiter", async () => {
        await request(app)
          .post(
            "/auth/forgot-password/question"
          )
          .send({
            email:
              "customer@example.com",
          })
          .expect(200);

        expect(
          mockSensitiveActionLimiter
        ).toHaveBeenCalled();
      });
    }
  );

  // ====================================================
  // PASSWORD RESET
  // ====================================================

  describe(
    "POST /auth/forgot-password/reset",
    () => {
      test("should call resetPasswordWithAnswer", async () => {
        await request(app)
          .post(
            "/auth/forgot-password/reset"
          )
          .send({
            email:
              "customer@example.com",
            answer: "Buddy",
            newPassword:
              "NewPassword123!",
          })
          .expect(200);

        expect(
          mockResetPasswordWithAnswer
        ).toHaveBeenCalledTimes(1);
      });

      test("should use sensitiveActionLimiter", async () => {
        await request(app)
          .post(
            "/auth/forgot-password/reset"
          )
          .send({
            email:
              "customer@example.com",
            answer: "Buddy",
            newPassword:
              "NewPassword123!",
          })
          .expect(200);

        expect(
          mockSensitiveActionLimiter
        ).toHaveBeenCalled();
      });
    }
  );

  // ====================================================
  // 2FA SETUP
  // ====================================================

  describe("POST /auth/2fa/setup", () => {
    test("should require authentication", async () => {
      await request(app)
        .post("/auth/2fa/setup")
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();

      expect(
        mockSetupTwoFactor
      ).toHaveBeenCalledTimes(1);
    });
  });

  // ====================================================
  // 2FA VERIFY SETUP
  // ====================================================

  describe(
    "POST /auth/2fa/verify-setup",
    () => {
      test("should require authentication", async () => {
        await request(app)
          .post(
            "/auth/2fa/verify-setup"
          )
          .send({
            code: "123456",
          })
          .expect(200);

        expect(
          mockProtect
        ).toHaveBeenCalled();

        expect(
          mockVerifyTwoFactorSetup
        ).toHaveBeenCalledTimes(1);
      });
    }
  );

  // ====================================================
  // 2FA DISABLE
  // ====================================================

  describe("POST /auth/2fa/disable", () => {
    test("should require authentication", async () => {
      await request(app)
        .post("/auth/2fa/disable")
        .send({
          code: "123456",
        })
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();

      expect(
        mockDisableTwoFactor
      ).toHaveBeenCalledTimes(1);
    });
  });

  // ====================================================
  // PROTECTED ROUTE CHECK
  // ====================================================

  describe("Protected routes", () => {
    test("should use protect middleware for /me", async () => {
      await request(app)
        .get("/auth/me")
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();
    });

    test("should use protect middleware for profile update", async () => {
      await request(app)
        .patch("/auth/me")
        .send({
          name: "Customer",
        })
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();
    });

    test("should use protect middleware for address update", async () => {
      await request(app)
        .put("/auth/me/address")
        .send({
          city: "Dhaka",
        })
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();
    });

    test("should use protect middleware for account deletion", async () => {
      await request(app)
        .delete("/auth/me")
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();
    });

    test("should use protect middleware for 2FA setup", async () => {
      await request(app)
        .post("/auth/2fa/setup")
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();
    });

    test("should use protect middleware for 2FA setup verification", async () => {
      await request(app)
        .post(
          "/auth/2fa/verify-setup"
        )
        .send({
          code: "123456",
        })
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();
    });

    test("should use protect middleware for 2FA disable", async () => {
      await request(app)
        .post("/auth/2fa/disable")
        .send({
          code: "123456",
        })
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalled();
    });
  });

  // ====================================================
  // INVALID HTTP METHODS
  // ====================================================

  describe("Invalid HTTP methods", () => {
    test("should return 404 for GET /auth/login", async () => {
      await request(app)
        .get("/auth/login")
        .expect(404);

      expect(
        mockLoginUser
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for GET /auth/register", async () => {
      await request(app)
        .get("/auth/register")
        .expect(404);

      expect(
        mockRegisterUser
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for GET /auth/logout", async () => {
      await request(app)
        .get("/auth/logout")
        .expect(404);

      expect(
        mockLogoutUser
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for POST /auth/me", async () => {
      await request(app)
        .post("/auth/me")
        .expect(404);

      expect(
        mockGetMe
      ).not.toHaveBeenCalled();

      expect(
        mockUpdateProfile
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // UNKNOWN ROUTES
  // ====================================================

  describe("Unknown routes", () => {
    test("should return 404 for unknown auth route", async () => {
      await request(app)
        .get("/auth/unknown")
        .expect(404);
    });
  });
});