import {
  SECURITY_QUESTIONS,
  normalizeAnswer,
} from "../../utils/securityQuestions.js";


// ============================================================
// SECURITY QUESTIONS
// ============================================================

describe("SECURITY_QUESTIONS", () => {

  test("should contain all expected security questions", () => {
    expect(SECURITY_QUESTIONS).toEqual([
      "What was your childhood nickname?",
      "What is the name of your first pet?",
      "What is your mother's maiden name?",
      "What was the name of your first school?",
      "What city were you born in?",
      "What was your favorite food as a child?",
    ]);
  });


  test("should contain exactly 6 security questions", () => {
    expect(SECURITY_QUESTIONS).toHaveLength(6);
  });


  test("should contain only non-empty string questions", () => {
    expect(
      SECURITY_QUESTIONS.every(
        (question) =>
          typeof question === "string" &&
          question.trim().length > 0
      )
    ).toBe(true);
  });

});


// ============================================================
// normalizeAnswer
// ============================================================

describe("normalizeAnswer", () => {

  test("should trim whitespace and convert answer to lowercase", () => {
    expect(
      normalizeAnswer("  Blue  ")
    ).toBe("blue");
  });


  test("should normalize uppercase and mixed-case answers", () => {
    expect(
      normalizeAnswer("DhAkA")
    ).toBe("dhaka");
  });


  test("should return empty string for null", () => {
    expect(
      normalizeAnswer(null)
    ).toBe("");
  });


  test("should return empty string for undefined", () => {
    expect(
      normalizeAnswer(undefined)
    ).toBe("");
  });


  test("should return empty string for empty string", () => {
    expect(
      normalizeAnswer("")
    ).toBe("");
  });


  test("should convert numbers to strings", () => {
    expect(
      normalizeAnswer(123456)
    ).toBe("123456");
  });


  test("should handle strings containing internal spaces", () => {
    expect(
      normalizeAnswer("  New York  ")
    ).toBe("new york");
  });

});