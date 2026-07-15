export const SECURITY_QUESTIONS = [
  "What was your childhood nickname?",
  "What is the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What city were you born in?",
  "What was your favorite food as a child?",
];

export const normalizeAnswer = (answer) => String(answer || "").trim().toLowerCase();
