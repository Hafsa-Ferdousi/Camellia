import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
} from "@jest/globals";

/* =========================================================
   MOCK JSONWEBTOKEN
========================================================= */

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: jest.fn(),
  },
}));

/* =========================================================
   MOCK USER MODEL
========================================================= */

jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

/* =========================================================
   IMPORT AFTER MOCKS
========================================================= */

const jwt = (await import("jsonwebtoken")).default;

const User = (await import("../../models/User.js")).default;

const {
  protect,
  optionalAuth,
  adminOnly,
} = await import("../../middleware/authMiddleware.js");

/* =========================================================
   HELPERS
========================================================= */

const createResponse = () => {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

/* =========================================================
   TEST SUITE
========================================================= */

describe("authMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =======================================================
     PROTECT
  ======================================================= */

  describe("protect", () => {
    test("should reject request when authorization header is missing", async () => {
      const req = {
        headers: {},
      };

      const res = createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        message: "Not authorized, no token",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject request when authorization is not Bearer", async () => {
      const req = {
        headers: {
          authorization: "Basic abc123",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        message: "Not authorized, no token",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject request when Bearer token is missing", async () => {
      const req = {
        headers: {
          authorization: "Bearer",
        },
      };

      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        message: "Not authorized, invalid token",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject token when token type is not access", async () => {
      jwt.verify.mockReturnValue({
        id: "user123",
        type: "refresh",
      });

      const req = {
        headers: {
          authorization: "Bearer refresh-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(
        "refresh-token",
        process.env.JWT_SECRET
      );

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        message: "Not authorized, invalid token",
      });

      expect(User.findById).not.toHaveBeenCalled();

      expect(next).not.toHaveBeenCalled();
    });

    test("should authenticate valid access token", async () => {
      jwt.verify.mockReturnValue({
        id: "user123",
        type: "access",
      });

      const user = {
        _id: "user123",
        name: "Hafsa",
        email: "hafsa@example.com",
        role: "customer",
      };

      const selectMock = jest.fn().mockResolvedValue(user);

      User.findById.mockReturnValue({
        select: selectMock,
      });

      const req = {
        headers: {
          authorization: "Bearer valid-access-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(
        "valid-access-token",
        process.env.JWT_SECRET
      );

      expect(User.findById).toHaveBeenCalledWith("user123");

      expect(selectMock).toHaveBeenCalledWith("-password");

      expect(req.user).toEqual(user);

      expect(next).toHaveBeenCalledTimes(1);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test("should reject when user does not exist", async () => {
      jwt.verify.mockReturnValue({
        id: "unknown-user",
        type: "access",
      });

      const selectMock = jest.fn().mockResolvedValue(null);

      User.findById.mockReturnValue({
        select: selectMock,
      });

      const req = {
        headers: {
          authorization: "Bearer valid-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(User.findById).toHaveBeenCalledWith("unknown-user");

      expect(selectMock).toHaveBeenCalledWith("-password");

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        message: "User not found",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should return TOKEN_EXPIRED when access token is expired", async () => {
      const error = new Error("Token expired");
      error.name = "TokenExpiredError";

      jwt.verify.mockImplementation(() => {
        throw error;
      });

      const req = {
        headers: {
          authorization: "Bearer expired-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        message: "Access token expired",
        code: "TOKEN_EXPIRED",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject invalid JWT token", async () => {
      const error = new Error("Invalid token");
      error.name = "JsonWebTokenError";

      jwt.verify.mockImplementation(() => {
        throw error;
      });

      const req = {
        headers: {
          authorization: "Bearer invalid-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        message: "Not authorized, invalid token",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject when database lookup throws an error", async () => {
      jwt.verify.mockReturnValue({
        id: "user123",
        type: "access",
      });

      User.findById.mockReturnValue({
        select: jest
          .fn()
          .mockRejectedValue(new Error("Database error")),
      });

      const req = {
        headers: {
          authorization: "Bearer valid-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        message: "Not authorized, invalid token",
      });

      expect(next).not.toHaveBeenCalled();
    });
  });

  /* =======================================================
     OPTIONAL AUTH
  ======================================================= */

  describe("optionalAuth", () => {
    test("should allow guest when authorization header is missing", async () => {
      const req = {
        headers: {},
      };

      const res = createResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      expect(req.user).toBeUndefined();

      expect(jwt.verify).not.toHaveBeenCalled();
    });

    test("should allow guest when authorization is not Bearer", async () => {
      const req = {
        headers: {
          authorization: "Basic abc123",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      expect(req.user).toBeUndefined();

      expect(jwt.verify).not.toHaveBeenCalled();
    });

    test("should populate req.user for valid access token", async () => {
      jwt.verify.mockReturnValue({
        id: "user123",
        type: "access",
      });

      const user = {
        _id: "user123",
        name: "Hafsa",
        email: "hafsa@example.com",
        role: "customer",
      };

      const selectMock = jest.fn().mockResolvedValue(user);

      User.findById.mockReturnValue({
        select: selectMock,
      });

      const req = {
        headers: {
          authorization: "Bearer valid-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(
        "valid-token",
        process.env.JWT_SECRET
      );

      expect(User.findById).toHaveBeenCalledWith("user123");

      expect(selectMock).toHaveBeenCalledWith("-password");

      expect(req.user).toEqual(user);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test("should not authenticate refresh token", async () => {
      jwt.verify.mockReturnValue({
        id: "user123",
        type: "refresh",
      });

      const req = {
        headers: {
          authorization: "Bearer refresh-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(jwt.verify).toHaveBeenCalled();

      expect(User.findById).not.toHaveBeenCalled();

      expect(req.user).toBeUndefined();

      expect(next).toHaveBeenCalledTimes(1);
    });

    test("should treat invalid token as guest", async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const req = {
        headers: {
          authorization: "Bearer invalid-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();

      expect(next).toHaveBeenCalledTimes(1);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test("should treat expired token as guest", async () => {
      const error = new Error("Token expired");
      error.name = "TokenExpiredError";

      jwt.verify.mockImplementation(() => {
        throw error;
      });

      const req = {
        headers: {
          authorization: "Bearer expired-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();

      expect(next).toHaveBeenCalledTimes(1);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test("should continue as guest when user is not found", async () => {
      jwt.verify.mockReturnValue({
        id: "missing-user",
        type: "access",
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = {
        headers: {
          authorization: "Bearer valid-token",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();

      expect(next).toHaveBeenCalledTimes(1);

      expect(res.status).not.toHaveBeenCalled();
    });
  });

  /* =======================================================
     ADMIN ONLY
  ======================================================= */

  describe("adminOnly", () => {
    test("should allow admin user", () => {
      const req = {
        user: {
          _id: "admin123",
          role: "admin",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      adminOnly(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test("should reject customer user", () => {
      const req = {
        user: {
          _id: "user123",
          role: "customer",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);

      expect(res.json).toHaveBeenCalledWith({
        message: "Admin access required",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject request when req.user is missing", () => {
      const req = {};

      const res = createResponse();
      const next = jest.fn();

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);

      expect(res.json).toHaveBeenCalledWith({
        message: "Admin access required",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject user with undefined role", () => {
      const req = {
        user: {
          _id: "user123",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);

      expect(res.json).toHaveBeenCalledWith({
        message: "Admin access required",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject user with null role", () => {
      const req = {
        user: {
          _id: "user123",
          role: null,
        },
      };

      const res = createResponse();
      const next = jest.fn();

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);

      expect(res.json).toHaveBeenCalledWith({
        message: "Admin access required",
      });

      expect(next).not.toHaveBeenCalled();
    });
  });
});