import { describe, test, expect } from "@jest/globals";
import { SECURITY_QUESTIONS } from "../../utils/securityQuestions";

describe("SECURITY_QUESTIONS", () => {
  test("should contain all security questions", () => {
    expect(SECURITY_QUESTIONS).toHaveLength(6);
  });

  test("should contain the expected security questions", () => {
    expect(SECURITY_QUESTIONS).toEqual([
      "What was your childhood nickname?",
      "What is the name of your first pet?",
      "What is your mother's maiden name?",
      "What was the name of your first school?",
      "What city were you born in?",
      "What was your favorite food as a child?",
    ]);
  });

  test("should contain only string values", () => {
    SECURITY_QUESTIONS.forEach((question) => {
      expect(typeof question).toBe("string");
    });
  });

  test("should not contain empty questions", () => {
    SECURITY_QUESTIONS.forEach((question) => {
      expect(question.trim()).not.toBe("");
    });
  });

  test("should not contain duplicate questions", () => {
    const uniqueQuestions = new Set(SECURITY_QUESTIONS);

    expect(uniqueQuestions.size).toBe(
      SECURITY_QUESTIONS.length
    );
  });
});