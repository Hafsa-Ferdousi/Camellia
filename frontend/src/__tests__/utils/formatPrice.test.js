import { describe, test, expect } from "@jest/globals";
import { formatPrice } from "../../utils/formatPrice";

describe("formatPrice", () => {
  test("should format price using English locale by default", () => {
    expect(formatPrice(1234, "en")).toBe("1,234");
  });

  test("should format price using Bangla locale", () => {
    expect(formatPrice(1234, "bn")).toBe("১,২৩৪");
  });

  test("should format decimals correctly", () => {
    expect(formatPrice(1234.567, "en", 2)).toBe("1,234.57");
  });

  test("should format Bangla price with decimals", () => {
    expect(formatPrice(1234.567, "bn", 2)).toBe("১,২৩৪.৫৭");
  });

  test("should use zero decimals by default", () => {
    expect(formatPrice(1234.99, "en")).toBe("1,235");
  });

  test("should return 0 for invalid amount", () => {
    expect(formatPrice("invalid", "en")).toBe("0");
  });

  test("should return 0 for null amount", () => {
    expect(formatPrice(null, "en")).toBe("0");
  });

  test("should return 0 for undefined amount", () => {
    expect(formatPrice(undefined, "en")).toBe("0");
  });

  test("should convert numeric strings to numbers", () => {
    expect(formatPrice("5000", "en")).toBe("5,000");
  });

  test("should use English locale for non-Bangla languages", () => {
    expect(formatPrice(5000, "fr")).toBe("5,000");
  });

  test("should respect custom decimal places", () => {
    expect(formatPrice(99.999, "en", 3)).toBe("99.999");
  });

  test("should format zero correctly", () => {
    expect(formatPrice(0, "en")).toBe("0");
  });
});