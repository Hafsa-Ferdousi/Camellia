import { jest } from "@jest/globals";

// ======================================================
// MOCK API CLIENT
// ======================================================

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

// ======================================================
// MOCK TOKEN STORE
// ======================================================

const mockSetAccessToken = jest.fn();
const mockClearAccessToken = jest.fn();

// ======================================================
// MOCK MODULES
// ======================================================

jest.unstable_mockModule("../../api/client.js", () => ({
  default: mockClient,
}));

jest.unstable_mockModule("../../api/tokenStore.js", () => ({
  setAccessToken: mockSetAccessToken,
  clearAccessToken: mockClearAccessToken,
}));

// ======================================================
// IMPORT AUTH API AFTER MOCKING
// ======================================================

const {
  register,
  login,
  verifyTwoFactorLogin,
  logout,
  getMe,
  deleteAccount,
  updateProfile,
  updateAddress,
  getSecurityQuestion,
  resetPasswordWithAnswer,
  setupTwoFactor,
  confirmTwoFactorSetup,
  disableTwoFactor,
  verifyEmailOtp,
  resendEmailOtp,
} = await import("../../api/auth.js");

// ======================================================
// TEST SUITE
// ======================================================

describe("Auth API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================
  // REGISTER
  // ====================================================

  describe("register", () => {
    test("should send POST request to /auth/register", async () => {
      const data = {
        username: "hafsa",
        email: "hafsa@example.com",
        password: "Password123",
      };

      const response = {
        data: {
          message: "Registration successful",
        },
      };

      mockClient.post.mockResolvedValue(response);

      const result = await register(data);

      expect(mockClient.post).toHaveBeenCalledTimes(1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/register",
        data
      );

      expect(result).toEqual(response);
    });

    test("should propagate registration error", async () => {
      const error = new Error("Registration failed");

      mockClient.post.mockRejectedValue(error);

      await expect(
        register({
          username: "test",
          email: "test@example.com",
          password: "Password123",
        })
      ).rejects.toThrow("Registration failed");
    });
  });

  // ====================================================
  // LOGIN
  // ====================================================

  describe("login", () => {
    test("should login using email when identifier contains @", async () => {
      const response = {
        data: {
          token: "access-token-123",
          user: {
            id: "user123",
            email: "hafsa@example.com",
          },
        },
      };

      mockClient.post.mockResolvedValue(response);

      const result = await login(
        "hafsa@example.com",
        "Password123"
      );

      expect(mockClient.post).toHaveBeenCalledTimes(1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/login",
        {
          email: "hafsa@example.com",
          password: "Password123",
        }
      );

      expect(mockSetAccessToken).toHaveBeenCalledTimes(1);

      expect(mockSetAccessToken).toHaveBeenCalledWith(
        "access-token-123"
      );

      expect(result).toEqual(response.data);
    });

    test("should login using username when identifier does not contain @", async () => {
      const response = {
        data: {
          token: "username-token-456",
          user: {
            id: "user456",
            username: "hafsa",
          },
        },
      };

      mockClient.post.mockResolvedValue(response);

      const result = await login(
        "hafsa",
        "Password123"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/login",
        {
          username: "hafsa",
          password: "Password123",
        }
      );

      expect(mockSetAccessToken).toHaveBeenCalledWith(
        "username-token-456"
      );

      expect(result).toEqual(response.data);
    });

    test("should return 2FA response without storing access token", async () => {
      const response = {
        data: {
          twoFactorRequired: true,
          tempToken: "temporary-token-123",
        },
      };

      mockClient.post.mockResolvedValue(response);

      const result = await login(
        "hafsa@example.com",
        "Password123"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/login",
        {
          email: "hafsa@example.com",
          password: "Password123",
        }
      );

      expect(result).toEqual(response.data);

      expect(
        mockSetAccessToken
      ).not.toHaveBeenCalled();
    });

    test("should propagate login error", async () => {
      const error = new Error("Invalid credentials");

      mockClient.post.mockRejectedValue(error);

      await expect(
        login(
          "hafsa@example.com",
          "wrong-password"
        )
      ).rejects.toThrow("Invalid credentials");

      expect(
        mockSetAccessToken
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // VERIFY TWO FACTOR LOGIN
  // ====================================================

  describe("verifyTwoFactorLogin", () => {
    test("should verify 2FA code and store access token", async () => {
      const response = {
        data: {
          token: "verified-access-token",
          user: {
            id: "user123",
          },
        },
      };

      mockClient.post.mockResolvedValue(response);

      const result = await verifyTwoFactorLogin(
        "temp-token-123",
        "123456"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/2fa/verify",
        {
          tempToken: "temp-token-123",
          code: "123456",
        }
      );

      expect(mockSetAccessToken).toHaveBeenCalledWith(
        "verified-access-token"
      );

      expect(result).toEqual(response.data);
    });

    test("should propagate 2FA verification error", async () => {
      const error = new Error("Invalid verification code");

      mockClient.post.mockRejectedValue(error);

      await expect(
        verifyTwoFactorLogin(
          "temp-token",
          "000000"
        )
      ).rejects.toThrow(
        "Invalid verification code"
      );

      expect(
        mockSetAccessToken
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // LOGOUT
  // ====================================================

  describe("logout", () => {
    test("should clear access token and call logout endpoint", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          message: "Logged out",
        },
      });

      await logout();

      expect(
        mockClearAccessToken
      ).toHaveBeenCalledTimes(1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/logout"
      );
    });

    test("should clear token even when logout API fails", async () => {
      mockClient.post.mockRejectedValue(
        new Error("Logout request failed")
      );

      await expect(logout()).resolves.toBeUndefined();

      expect(
        mockClearAccessToken
      ).toHaveBeenCalledTimes(1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/logout"
      );
    });
  });

  // ====================================================
  // GET CURRENT USER
  // ====================================================

  describe("getMe", () => {
    test("should send GET request to /auth/me", async () => {
      const response = {
        data: {
          id: "user123",
          username: "hafsa",
          email: "hafsa@example.com",
        },
      };

      mockClient.get.mockResolvedValue(response);

      const result = await getMe();

      expect(mockClient.get).toHaveBeenCalledWith(
        "/auth/me"
      );

      expect(result).toEqual(response);
    });

    test("should propagate getMe error", async () => {
      const error = new Error(
        "Unauthorized"
      );

      mockClient.get.mockRejectedValue(error);

      await expect(
        getMe()
      ).rejects.toThrow("Unauthorized");
    });
  });

  // ====================================================
  // DELETE ACCOUNT
  // ====================================================

  describe("deleteAccount", () => {
    test("should send DELETE request with password", async () => {
      mockClient.delete.mockResolvedValue({
        data: {
          message: "Account deleted",
        },
      });

      await deleteAccount("Password123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/auth/me",
        {
          data: {
            password: "Password123",
          },
        }
      );
    });

    test("should propagate delete account error", async () => {
      const error = new Error(
        "Incorrect password"
      );

      mockClient.delete.mockRejectedValue(error);

      await expect(
        deleteAccount("wrong-password")
      ).rejects.toThrow("Incorrect password");
    });
  });

  // ====================================================
  // UPDATE PROFILE
  // ====================================================

  describe("updateProfile", () => {
    test("should send PATCH request with profile data", async () => {
      const data = {
        username: "hafsa_updated",
        name: "Hafsa Ferdousi",
      };

      mockClient.patch.mockResolvedValue({
        data,
      });

      await updateProfile(data);

      expect(mockClient.patch).toHaveBeenCalledWith(
        "/auth/me",
        data
      );
    });
  });

  // ====================================================
  // UPDATE ADDRESS
  // ====================================================

  describe("updateAddress", () => {
    test("should send PUT request with address data", async () => {
      const address = {
        street: "Dhaka",
        city: "Dhaka",
        country: "Bangladesh",
      };

      mockClient.put.mockResolvedValue({
        data: address,
      });

      await updateAddress(address);

      expect(mockClient.put).toHaveBeenCalledWith(
        "/auth/me/address",
        address
      );
    });
  });

  // ====================================================
  // SECURITY QUESTION
  // ====================================================

  describe("getSecurityQuestion", () => {
    test("should send POST request with identifier", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          question: "What is your favorite color?",
        },
      });

      await getSecurityQuestion(
        "hafsa@example.com"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/forgot-password/question",
        {
          identifier: "hafsa@example.com",
        }
      );
    });

    test("should support username as identifier", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          question: "What is your favorite color?",
        },
      });

      await getSecurityQuestion("hafsa");

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/forgot-password/question",
        {
          identifier: "hafsa",
        }
      );
    });
  });

  // ====================================================
  // RESET PASSWORD
  // ====================================================

  describe("resetPasswordWithAnswer", () => {
    test("should send POST request with identifier, answer and password", async () => {
      await resetPasswordWithAnswer(
        "hafsa@example.com",
        "blue",
        "NewPassword123"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/forgot-password/reset",
        {
          identifier: "hafsa@example.com",
          answer: "blue",
          password: "NewPassword123",
        }
      );
    });

    test("should propagate reset password error", async () => {
      const error = new Error(
        "Invalid security answer"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        resetPasswordWithAnswer(
          "hafsa@example.com",
          "wrong",
          "NewPassword123"
        )
      ).rejects.toThrow(
        "Invalid security answer"
      );
    });
  });

  // ====================================================
  // TWO FACTOR SETUP
  // ====================================================

  describe("setupTwoFactor", () => {
    test("should send POST request to setup 2FA", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          secret: "secret-key",
          qrCode: "qr-code-data",
        },
      });

      await setupTwoFactor();

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/2fa/setup"
      );
    });
  });

  // ====================================================
  // CONFIRM TWO FACTOR SETUP
  // ====================================================

  describe("confirmTwoFactorSetup", () => {
    test("should send POST request with verification code", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          message: "2FA enabled",
        },
      });

      await confirmTwoFactorSetup(
        "123456"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/2fa/verify-setup",
        {
          code: "123456",
        }
      );
    });

    test("should propagate verification error", async () => {
      const error = new Error(
        "Invalid 2FA code"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        confirmTwoFactorSetup("000000")
      ).rejects.toThrow(
        "Invalid 2FA code"
      );
    });
  });

  // ====================================================
  // DISABLE TWO FACTOR
  // ====================================================

  describe("disableTwoFactor", () => {
    test("should send POST request with password", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          message: "2FA disabled",
        },
      });

      await disableTwoFactor(
        "Password123"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/2fa/disable",
        {
          password: "Password123",
        }
      );
    });

    test("should propagate disable 2FA error", async () => {
      const error = new Error(
        "Invalid password"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        disableTwoFactor("wrong-password")
      ).rejects.toThrow(
        "Invalid password"
      );
    });
  });

  // ====================================================
  // VERIFY EMAIL OTP
  // ====================================================

  describe("verifyEmailOtp", () => {
    test("should send POST request with email and OTP", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          message: "Email verified",
        },
      });

      await verifyEmailOtp(
        "hafsa@example.com",
        "123456"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/verify-email",
        {
          email: "hafsa@example.com",
          otp: "123456",
        }
      );
    });

    test("should propagate email verification error", async () => {
      const error = new Error(
        "Invalid OTP"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        verifyEmailOtp(
          "hafsa@example.com",
          "000000"
        )
      ).rejects.toThrow("Invalid OTP");
    });
  });

  // ====================================================
  // RESEND EMAIL OTP
  // ====================================================

  describe("resendEmailOtp", () => {
    test("should send POST request with email", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          message: "OTP sent",
        },
      });

      await resendEmailOtp(
        "hafsa@example.com"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/auth/resend-otp",
        {
          email: "hafsa@example.com",
        }
      );
    });

    test("should propagate resend OTP error", async () => {
      const error = new Error(
        "Unable to send OTP"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        resendEmailOtp(
          "hafsa@example.com"
        )
      ).rejects.toThrow(
        "Unable to send OTP"
      );
    });
  });
});