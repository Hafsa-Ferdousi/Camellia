import {
  PASSWORD_RULES,
  validatePasswordStrength,
} from "../../utils/validators.js";


// ============================================================
// PASSWORD_RULES
// ============================================================

describe("PASSWORD_RULES", () => {

  test("should contain exactly five password rules", () => {
    expect(PASSWORD_RULES).toHaveLength(5);
  });


  test("should contain all expected rule keys", () => {
    expect(PASSWORD_RULES.map((rule) => rule.key)).toEqual([
      "minLength",
      "hasUpper",
      "hasLower",
      "hasNumber",
      "hasSpecial",
    ]);
  });


  test("should contain all expected labels", () => {
    expect(PASSWORD_RULES.map((rule) => rule.label)).toEqual([
      "At least 8 characters",
      "One uppercase letter",
      "One lowercase letter",
      "One number",
      "One special character (@#$%^&*!)",
    ]);
  });


  test("should validate minimum length rule", () => {
    const rule = PASSWORD_RULES.find(
      (r) => r.key === "minLength"
    );

    expect(rule.test("Abcdef1!")).toBe(true);
    expect(rule.test("Ab1!")).toBe(false);
  });


  test("should validate uppercase rule", () => {
    const rule = PASSWORD_RULES.find(
      (r) => r.key === "hasUpper"
    );

    expect(rule.test("Abcdef1!")).toBe(true);
    expect(rule.test("abcdef1!")).toBe(false);
  });


  test("should validate lowercase rule", () => {
    const rule = PASSWORD_RULES.find(
      (r) => r.key === "hasLower"
    );

    expect(rule.test("Abcdef1!")).toBe(true);
    expect(rule.test("ABCDEFG1!")).toBe(false);
  });


  test("should validate number rule", () => {
    const rule = PASSWORD_RULES.find(
      (r) => r.key === "hasNumber"
    );

    expect(rule.test("Abcdef1!")).toBe(true);
    expect(rule.test("Abcdefgh!")).toBe(false);
  });


  test("should validate special character rule", () => {
    const rule = PASSWORD_RULES.find(
      (r) => r.key === "hasSpecial"
    );

    expect(rule.test("Abcdef1!")).toBe(true);
    expect(rule.test("Abcdef12")).toBe(false);
  });

});


// ============================================================
// validatePasswordStrength
// ============================================================

describe("validatePasswordStrength", () => {

  test("should reject empty password", () => {
    expect(
      validatePasswordStrength("")
    ).toEqual({
      valid: false,
      message: "Password is required.",
    });
  });


  test("should reject undefined password", () => {
    expect(
      validatePasswordStrength(undefined)
    ).toEqual({
      valid: false,
      message: "Password is required.",
    });
  });


  test("should reject null password", () => {
    expect(
      validatePasswordStrength(null)
    ).toEqual({
      valid: false,
      message: "Password is required.",
    });
  });


  test("should reject password shorter than 8 characters", () => {
    expect(
      validatePasswordStrength("Ab1!")
    ).toEqual({
      valid: false,
      message:
        "Password must include: at least 8 characters.",
    });
  });


  test("should reject password without uppercase", () => {
    expect(
      validatePasswordStrength("abcdefg1!")
    ).toEqual({
      valid: false,
      message:
        "Password must include: one uppercase letter.",
    });
  });


  test("should reject password without lowercase", () => {
    expect(
      validatePasswordStrength("ABCDEFG1!")
    ).toEqual({
      valid: false,
      message:
        "Password must include: one lowercase letter.",
    });
  });


  test("should reject password without number", () => {
    expect(
      validatePasswordStrength("Abcdefgh!")
    ).toEqual({
      valid: false,
      message:
        "Password must include: one number.",
    });
  });


  test("should reject password without special character", () => {
    expect(
      validatePasswordStrength("Abcdefg1")
    ).toEqual({
      valid: false,
      message:
        "Password must include: one special character (@#$%^&*!).",
    });
  });


  test("should accept a valid password", () => {
    expect(
      validatePasswordStrength("Camellia1!")
    ).toEqual({
      valid: true,
      message: "",
    });
  });


  test("should accept exactly 8 characters when all rules pass", () => {
    expect(
      validatePasswordStrength("Abcdef1!")
    ).toEqual({
      valid: true,
      message: "",
    });
  });


  test("should report the first failed rule", () => {
    expect(
      validatePasswordStrength("abcdefg")
    ).toEqual({
      valid: false,
      message:
        "Password must include: at least 8 characters.",
    });
  });


  test.each([
    "@",
    "#",
    "$",
    "%",
    "^",
    "&",
    "*",
    "!",
  ])(
    "should accept supported special character %s",
    (specialCharacter) => {
      const password = `Abcdefg1${specialCharacter}`;

      expect(
        validatePasswordStrength(password)
      ).toEqual({
        valid: true,
        message: "",
      });
    }
  );

});