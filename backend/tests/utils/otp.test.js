import { jest } from "@jest/globals";

// ============================================================
// MOCK BCRYPT
// ============================================================

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));


// ============================================================
// IMPORT MOCK
// ============================================================

const { default: bcrypt } = await import("bcryptjs");


// ============================================================
// IMPORT MODULE UNDER TEST
// ============================================================

const {
  generateOtp,
  hashOtp,
  compareOtp,
  OTP_TTL_MS,
} = await import("../../utils/otp.js");


// ============================================================
// TEST SUITE
// ============================================================

describe("OTP utility", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });


  // ==========================================================
  // generateOtp()
  // ==========================================================

  test("should generate a 6-digit OTP", () => {
    const otp = generateOtp();

    expect(otp).toMatch(/^\d{6}$/);

    expect(otp).toHaveLength(6);

    const numericOtp = Number(otp);

    expect(numericOtp).toBeGreaterThanOrEqual(100000);

    expect(numericOtp).toBeLessThanOrEqual(999999);
  });


  // ==========================================================
  // generateOtp() - mocked Math.random
  // ==========================================================

  test("should generate the expected OTP based on Math.random", () => {
    const randomSpy = jest
      .spyOn(Math, "random")
      .mockReturnValue(0);

    const otp = generateOtp();

    expect(otp).toBe("100000");

    expect(randomSpy).toHaveBeenCalledTimes(1);

    randomSpy.mockRestore();
  });


  // ==========================================================
  // hashOtp()
  // ==========================================================

  test("should hash an OTP using bcrypt with salt rounds 10", async () => {
    bcrypt.hash.mockResolvedValue("hashedOtp123");

    const result = await hashOtp("123456");

    expect(result).toBe("hashedOtp123");

    expect(bcrypt.hash).toHaveBeenCalledTimes(1);

    expect(bcrypt.hash).toHaveBeenCalledWith(
      "123456",
      10
    );
  });


  // ==========================================================
  // compareOtp() - valid hash
  // ==========================================================

  test("should compare OTP against bcrypt hash", async () => {
    bcrypt.compare.mockResolvedValue(true);

    const result = await compareOtp(
      "123456",
      "hashedOtp123"
    );

    expect(result).toBe(true);

    expect(bcrypt.compare).toHaveBeenCalledTimes(1);

    expect(bcrypt.compare).toHaveBeenCalledWith(
      "123456",
      "hashedOtp123"
    );
  });


  // ==========================================================
  // compareOtp() - invalid OTP
  // ==========================================================

  test("should return false when OTP does not match", async () => {
    bcrypt.compare.mockResolvedValue(false);

    const result = await compareOtp(
      "123456",
      "wrongHash"
    );

    expect(result).toBe(false);

    expect(bcrypt.compare).toHaveBeenCalledTimes(1);

    expect(bcrypt.compare).toHaveBeenCalledWith(
      "123456",
      "wrongHash"
    );
  });


  // ==========================================================
  // compareOtp() - missing hash
  // ==========================================================

  test("should return false when hash is missing", async () => {
    const result = await compareOtp(
      "123456",
      null
    );

    expect(result).toBe(false);

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });


  // ==========================================================
  // compareOtp() - undefined hash
  // ==========================================================

  test("should return false when hash is undefined", async () => {
    const result = await compareOtp(
      "123456",
      undefined
    );

    expect(result).toBe(false);

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });


  // ==========================================================
  // OTP TTL
  // ==========================================================

  test("should have an OTP TTL of 10 minutes", () => {
    expect(OTP_TTL_MS).toBe(
      10 * 60 * 1000
    );

    expect(OTP_TTL_MS).toBe(600000);
  });

});