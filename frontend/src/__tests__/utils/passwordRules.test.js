import { describe, test, expect } from "@jest/globals";

import {
  PASSWORD_RULES,
  getPasswordChecklist,
  isPasswordStrong,
} from "../../utils/passwordRules";

describe("PASSWORD_RULES", () => {
  test("should contain five password rules", () => {
    expect(PASSWORD_RULES).toHaveLength(5);

    expect(PASSWORD_RULES.map((rule) => rule.key)).toEqual([
      "minLength",
      "hasUpper",
      "hasLower",
      "hasNumber",
      "hasSpecial",
    ]);
  });
});

describe("getPasswordChecklist", () => {
  test("should mark a strong password as valid", () => {
    const result = getPasswordChecklist("GoldRing@2026");

    expect(result.every((rule) => rule.met)).toBe(true);
  });

  test("should identify missing rules", () => {
    const result = getPasswordChecklist("goldring");

    expect(result.find((r) => r.key === "minLength").met).toBe(
      true
    );

    expect(result.find((r) => r.key === "hasUpper").met).toBe(
      false
    );

    expect(result.find((r) => r.key === "hasLower").met).toBe(
      true
    );

    expect(result.find((r) => r.key === "hasNumber").met).toBe(
      false
    );

    expect(result.find((r) => r.key === "hasSpecial").met).toBe(
      false
    );
  });

  test("should return all rules as false for empty password", () => {
    const result = getPasswordChecklist("");

    expect(result.every((rule) => rule.met === false)).toBe(true);
  });

  test("should use empty string by default", () => {
    const result = getPasswordChecklist();

    expect(result).toHaveLength(5);
    expect(result.every((rule) => rule.met === false)).toBe(true);
  });

  test("should accept exactly eight characters when all rules are satisfied", () => {
    const result = getPasswordChecklist("Abcd123!");

    expect(result.every((rule) => rule.met)).toBe(true);
  });
});

describe("isPasswordStrong", () => {
  test("should return true for a strong password", () => {
    expect(isPasswordStrong("GoldRing@2026")).toBe(true);
  });

  test("should return false when password is too short", () => {
    expect(isPasswordStrong("Ab1@xyz")).toBe(false);
  });

  test("should return false when uppercase is missing", () => {
    expect(isPasswordStrong("goldring@2026")).toBe(false);
  });

  test("should return false when lowercase is missing", () => {
    expect(isPasswordStrong("GOLDRING@2026")).toBe(false);
  });

  test("should return false when number is missing", () => {
    expect(isPasswordStrong("GoldRing@abcd")).toBe(false);
  });

  test("should return false when special character is missing", () => {
    expect(isPasswordStrong("GoldRing2026")).toBe(false);
  });

  test("should return false for an empty password", () => {
    expect(isPasswordStrong("")).toBe(false);
  });

  test("should return false when no password is provided", () => {
    expect(isPasswordStrong()).toBe(false);
  });
});