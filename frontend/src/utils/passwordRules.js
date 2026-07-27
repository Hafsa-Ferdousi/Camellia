export const PASSWORD_RULES = [
  { key: "minLength", labelKey: "ruleMinLength", test: (p) => p.length >= 8 },
  { key: "hasUpper", labelKey: "ruleHasUpper", test: (p) => /[A-Z]/.test(p) },
  { key: "hasLower", labelKey: "ruleHasLower", test: (p) => /[a-z]/.test(p) },
  { key: "hasNumber", labelKey: "ruleHasNumber", test: (p) => /\d/.test(p) },
  { key: "hasSpecial", labelKey: "ruleHasSpecial", test: (p) => /[@#$%^&*!]/.test(p) },
];

export const getPasswordChecklist = (password = "") =>
  PASSWORD_RULES.map((rule) => ({ key: rule.key, labelKey: rule.labelKey, met: rule.test(password) }));

export const isPasswordStrong = (password = "") => PASSWORD_RULES.every((rule) => rule.test(password));