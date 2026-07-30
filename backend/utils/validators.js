export const PASSWORD_RULES = [
  { key: "minLength", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "hasUpper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "hasLower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "hasNumber", label: "One number", test: (p) => /\d/.test(p) },
  { key: "hasSpecial", label: "One special character (@#$%^&*!)", test: (p) => /[@#$%^&*!]/.test(p) },
];

export function validatePasswordStrength(password) {
  if (!password) return { valid: false, message: "Password is required." };
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  if (failed) {
    return { valid: false, message: `Password must include: ${failed.label.toLowerCase()}.` };
  }
  return { valid: true, message: "" };
}