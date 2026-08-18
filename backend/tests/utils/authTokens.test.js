import { jest } from "@jest/globals";


// ============================================================
// MOCK JSONWEBTOKEN
// ============================================================

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
  },
}));


// ============================================================
// IMPORT MOCK
// ============================================================

const { default: jwt } = await import("jsonwebtoken");


// ============================================================
// IMPORT MODULE UNDER TEST
// ============================================================

const {
  ACCESS_TOKEN_EXPIRES,
  generateAccessToken,
  generateTwoFactorTempToken,
  generateRawToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} = await import("../../utils/tokens.js");


// ============================================================
// TEST SUITE
// ============================================================

describe("auth token utilities", () => {

  const originalEnv = process.env;


  beforeEach(() => {
    jest.clearAllMocks();

    process.env = {
      ...originalEnv,
      JWT_SECRET: "test-secret",
      JWT_ACCESS_EXPIRES: "15m",
      NODE_ENV: "test",
    };
  });


  afterAll(() => {
    process.env = originalEnv;
  });


  // ============================================================
  // ACCESS TOKEN
  // ============================================================

  test("should generate an access token with correct payload and expiry", () => {

    jwt.sign.mockReturnValue("access-token-123");


    const result = generateAccessToken("user123");


    expect(result).toBe("access-token-123");


    expect(jwt.sign).toHaveBeenCalledTimes(1);


    expect(jwt.sign).toHaveBeenCalledWith(
      {
        id: "user123",
        type: "access",
      },
      "test-secret",
      {
        expiresIn: ACCESS_TOKEN_EXPIRES,
      }
    );
  });


  // ============================================================
  // ACCESS TOKEN WITH DIFFERENT USER ID
  // ============================================================

  test("should include the supplied user id in access token", () => {

    jwt.sign.mockReturnValue("another-access-token");


    const result = generateAccessToken("user456");


    expect(result).toBe("another-access-token");


    expect(jwt.sign).toHaveBeenCalledWith(
      {
        id: "user456",
        type: "access",
      },
      "test-secret",
      {
        expiresIn: ACCESS_TOKEN_EXPIRES,
      }
    );
  });


  // ============================================================
  // TWO FACTOR TEMP TOKEN
  // ============================================================

  test("should generate a 2FA pending token with 5 minute expiry", () => {

    jwt.sign.mockReturnValue("2fa-temp-token");


    const result = generateTwoFactorTempToken("user123");


    expect(result).toBe("2fa-temp-token");


    expect(jwt.sign).toHaveBeenCalledTimes(1);


    expect(jwt.sign).toHaveBeenCalledWith(
      {
        id: "user123",
        type: "2fa_pending",
      },
      "test-secret",
      {
        expiresIn: "5m",
      }
    );
  });


  // ============================================================
  // RAW REFRESH TOKEN
  // ============================================================

  test("should generate a high-entropy raw refresh token", () => {

    const token = generateRawToken();


    expect(typeof token).toBe("string");


    // 32 random bytes converted to hexadecimal
    // = 64 hexadecimal characters
    expect(token).toHaveLength(64);


    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });


  // ============================================================
  // RAW TOKENS SHOULD BE DIFFERENT
  // ============================================================

  test("should generate different raw tokens on separate calls", () => {

    const token1 = generateRawToken();

    const token2 = generateRawToken();


    expect(token1).toHaveLength(64);

    expect(token2).toHaveLength(64);

    expect(token1).not.toBe(token2);
  });


  // ============================================================
  // HASH TOKEN
  // ============================================================

  test("should generate a SHA-256 hash of a raw token", () => {

    const rawToken = "test-refresh-token";


    const hash = hashToken(rawToken);


    expect(typeof hash).toBe("string");


    // SHA-256 hexadecimal digest = 64 characters
    expect(hash).toHaveLength(64);


    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });


  // ============================================================
  // HASH TOKEN DETERMINISTIC
  // ============================================================

  test("should generate the same hash for the same raw token", () => {

    const rawToken = "same-refresh-token";


    const hash1 = hashToken(rawToken);

    const hash2 = hashToken(rawToken);


    expect(hash1).toBe(hash2);
  });


  // ============================================================
  // DIFFERENT TOKENS SHOULD HAVE DIFFERENT HASHES
  // ============================================================

  test("should generate different hashes for different tokens", () => {

    const hash1 = hashToken("token-one");

    const hash2 = hashToken("token-two");


    expect(hash1).not.toBe(hash2);
  });


  // ============================================================
  // CONSTANTS
  // ============================================================

  test("should define refresh token constants correctly", () => {

    expect(REFRESH_TOKEN_TTL_MS).toBe(
      7 * 24 * 60 * 60 * 1000
    );


    expect(REFRESH_TOKEN_TTL_MS).toBe(
      604800000
    );


    expect(REFRESH_COOKIE_NAME).toBe(
      "refreshToken"
    );
  });


  // ============================================================
  // COOKIE OPTIONS - TEST ENVIRONMENT
  // ============================================================

  test("should return correct refresh cookie options in non-production", () => {

    process.env.NODE_ENV = "test";


    const options = refreshCookieOptions();


    expect(options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 604800000,
    });
  });


  // ============================================================
  // COOKIE OPTIONS - PRODUCTION
  // ============================================================

  test("should set secure cookie in production", () => {

    process.env.NODE_ENV = "production";


    const options = refreshCookieOptions();


    expect(options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 604800000,
    });
  });


  // ============================================================
  // COOKIE OPTIONS - NEW OBJECT EACH TIME
  // ============================================================

  test("should return a new cookie options object on each call", () => {

    const options1 = refreshCookieOptions();

    const options2 = refreshCookieOptions();


    expect(options1).not.toBe(options2);


    expect(options1).toEqual(options2);
  });


  // ============================================================
  // ACCESS TOKEN DEFAULT EXPIRY
  // ============================================================

  test("should use the configured access token expiry", () => {

    expect(ACCESS_TOKEN_EXPIRES).toBe(
      "15m"
    );
  });

});