import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
} from "@jest/globals";

/* =========================================================
   MOCK EXPRESS-RATE-LIMIT
========================================================= */

const rateLimitMock = jest.fn((config) => {
  const middleware = jest.fn((req, res, next) => {
    next();
  });

  middleware.config = config;

  return middleware;
});

jest.unstable_mockModule("express-rate-limit", () => ({
  default: rateLimitMock,
}));

/* =========================================================
   IMPORT AFTER MOCK
========================================================= */

const {
  apiLimiter,
  loginLimiter,
  sensitiveActionLimiter,
  guestLookupLimiter,
  chatLimiter,
} = await import("../../middleware/rateLimiters.js");

/* =========================================================
   TEST SUITE
========================================================= */

describe("rateLimiters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =======================================================
     BASIC EXPORT TESTS
  ======================================================= */

  describe("Exports", () => {
    test("should export apiLimiter", () => {
      expect(apiLimiter).toBeDefined();
      expect(typeof apiLimiter).toBe("function");
    });

    test("should export loginLimiter", () => {
      expect(loginLimiter).toBeDefined();
      expect(typeof loginLimiter).toBe("function");
    });

    test("should export sensitiveActionLimiter", () => {
      expect(sensitiveActionLimiter).toBeDefined();
      expect(typeof sensitiveActionLimiter).toBe("function");
    });

    test("should export guestLookupLimiter", () => {
      expect(guestLookupLimiter).toBeDefined();
      expect(typeof guestLookupLimiter).toBe("function");
    });

    test("should export chatLimiter", () => {
      expect(chatLimiter).toBeDefined();
      expect(typeof chatLimiter).toBe("function");
    });
  });

  /* =======================================================
     RATE LIMIT CONFIGURATION
  ======================================================= */

  describe("Rate limiter configuration", () => {
    test("should create exactly five rate limiters", () => {
      expect(rateLimitMock).toHaveBeenCalledTimes(5);
    });

    test("apiLimiter should have correct configuration", () => {
      expect(apiLimiter.config).toEqual({
        windowMs: 15 * 60 * 1000,
        limit: 300,
        standardHeaders: true,
        legacyHeaders: false,
      });
    });

    test("loginLimiter should have correct configuration", () => {
      expect(loginLimiter.config).toEqual({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          message:
            "Too many login attempts. Please try again in a few minutes.",
        },
      });
    });

    test("sensitiveActionLimiter should have correct configuration", () => {
      expect(sensitiveActionLimiter.config).toEqual({
        windowMs: 60 * 60 * 1000,
        limit: 6,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          message: "Too many requests. Please try again later.",
        },
      });
    });

    test("guestLookupLimiter should have correct configuration", () => {
      expect(guestLookupLimiter.config).toEqual({
        windowMs: 15 * 60 * 1000,
        limit: 15,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          message: "Too many lookup attempts. Please try again later.",
        },
      });
    });

    test("chatLimiter should have correct configuration", () => {
      expect(chatLimiter.config).toEqual({
        windowMs: 60 * 1000,
        limit: 15,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          message:
            "You're sending messages too quickly. Please slow down.",
        },
      });
    });
  });

  /* =======================================================
     WINDOW TIME TESTS
  ======================================================= */

  describe("Window duration", () => {
    test("apiLimiter should use 15 minute window", () => {
      expect(apiLimiter.config.windowMs).toBe(
        15 * 60 * 1000
      );
    });

    test("loginLimiter should use 15 minute window", () => {
      expect(loginLimiter.config.windowMs).toBe(
        15 * 60 * 1000
      );
    });

    test("sensitiveActionLimiter should use 1 hour window", () => {
      expect(sensitiveActionLimiter.config.windowMs).toBe(
        60 * 60 * 1000
      );
    });

    test("guestLookupLimiter should use 15 minute window", () => {
      expect(guestLookupLimiter.config.windowMs).toBe(
        15 * 60 * 1000
      );
    });

    test("chatLimiter should use 1 minute window", () => {
      expect(chatLimiter.config.windowMs).toBe(
        60 * 1000
      );
    });
  });

  /* =======================================================
     LIMIT VALUES
  ======================================================= */

  describe("Request limits", () => {
    test("apiLimiter should allow 300 requests", () => {
      expect(apiLimiter.config.limit).toBe(300);
    });

    test("loginLimiter should allow 10 requests", () => {
      expect(loginLimiter.config.limit).toBe(10);
    });

    test("sensitiveActionLimiter should allow 6 requests", () => {
      expect(sensitiveActionLimiter.config.limit).toBe(6);
    });

    test("guestLookupLimiter should allow 15 requests", () => {
      expect(guestLookupLimiter.config.limit).toBe(15);
    });

    test("chatLimiter should allow 15 requests", () => {
      expect(chatLimiter.config.limit).toBe(15);
    });
  });

  /* =======================================================
     HEADERS
  ======================================================= */

  describe("Rate limit headers", () => {
    test("apiLimiter should use standard headers", () => {
      expect(apiLimiter.config.standardHeaders).toBe(true);
    });

    test("loginLimiter should use standard headers", () => {
      expect(loginLimiter.config.standardHeaders).toBe(true);
    });

    test("sensitiveActionLimiter should use standard headers", () => {
      expect(
        sensitiveActionLimiter.config.standardHeaders
      ).toBe(true);
    });

    test("guestLookupLimiter should use standard headers", () => {
      expect(
        guestLookupLimiter.config.standardHeaders
      ).toBe(true);
    });

    test("chatLimiter should use standard headers", () => {
      expect(chatLimiter.config.standardHeaders).toBe(true);
    });

    test("all limiters should disable legacy headers", () => {
      expect(apiLimiter.config.legacyHeaders).toBe(false);
      expect(loginLimiter.config.legacyHeaders).toBe(false);
      expect(
        sensitiveActionLimiter.config.legacyHeaders
      ).toBe(false);
      expect(
        guestLookupLimiter.config.legacyHeaders
      ).toBe(false);
      expect(chatLimiter.config.legacyHeaders).toBe(false);
    });
  });

  /* =======================================================
     CUSTOM ERROR MESSAGES
  ======================================================= */

  describe("Custom messages", () => {
    test("loginLimiter should have correct message", () => {
      expect(loginLimiter.config.message).toEqual({
        message:
          "Too many login attempts. Please try again in a few minutes.",
      });
    });

    test("sensitiveActionLimiter should have correct message", () => {
      expect(sensitiveActionLimiter.config.message).toEqual({
        message: "Too many requests. Please try again later.",
      });
    });

    test("guestLookupLimiter should have correct message", () => {
      expect(guestLookupLimiter.config.message).toEqual({
        message: "Too many lookup attempts. Please try again later.",
      });
    });

    test("chatLimiter should have correct message", () => {
      expect(chatLimiter.config.message).toEqual({
        message:
          "You're sending messages too quickly. Please slow down.",
      });
    });

    test("apiLimiter should not have a custom message", () => {
      expect(apiLimiter.config.message).toBeUndefined();
    });
  });

  /* =======================================================
     MIDDLEWARE BEHAVIOR
  ======================================================= */

  describe("Middleware behavior", () => {
    test("apiLimiter should call next", () => {
      const req = {};
      const res = {};
      const next = jest.fn();

      apiLimiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test("loginLimiter should call next", () => {
      const req = {};
      const res = {};
      const next = jest.fn();

      loginLimiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test("sensitiveActionLimiter should call next", () => {
      const req = {};
      const res = {};
      const next = jest.fn();

      sensitiveActionLimiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test("guestLookupLimiter should call next", () => {
      const req = {};
      const res = {};
      const next = jest.fn();

      guestLookupLimiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test("chatLimiter should call next", () => {
      const req = {};
      const res = {};
      const next = jest.fn();

      chatLimiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});