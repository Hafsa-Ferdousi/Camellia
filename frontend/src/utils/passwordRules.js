export const PASSWORD_RULES = [
  { key: "minLength", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "hasUpper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "hasLower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "hasNumber", label: "One number", test: (p) => /\d/.test(p) },
  { key: "hasSpecial", label: "One special character (@#$%^&*!)", test: (p) => /[@#$%^&*!]/.test(p) },
];

export const getPasswordChecklist = (password = "") =>
  PASSWORD_RULES.map((rule) => ({ key: rule.key, label: rule.label, met: rule.test(password) }));

export const isPasswordStrong = (password = "") => PASSWORD_RULES.every((rule) => rule.test(password));