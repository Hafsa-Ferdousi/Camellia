import { describe, test, expect } from "@jest/globals";
import { localized } from "../../utils/localized";

describe("localized", () => {
  test("should return Bangla jewellery name when available", () => {
    const field = {
      en: "Gold Necklace",
      bn: "সোনার হার",
    };

    expect(localized(field, "bn")).toBe("সোনার হার");
  });

  test("should return English jewellery name when Bangla translation is missing", () => {
    const field = {
      en: "Diamond Ring",
    };

    expect(localized(field, "bn")).toBe("Diamond Ring");
  });

  test("should return English when requested language is unavailable", () => {
    const field = {
      en: "Pearl Earrings",
      bn: "মুক্তার কানের দুল",
    };

    expect(localized(field, "fr")).toBe("Pearl Earrings");
  });

  test("should return English jewellery name for English language", () => {
    const field = {
      en: "Silver Bracelet",
      bn: "রূপার ব্রেসলেট",
    };

    expect(localized(field, "en")).toBe("Silver Bracelet");
  });

  test("should return empty string when field is undefined", () => {
    expect(localized(undefined, "bn")).toBe("");
  });

  test("should return empty string when field is null", () => {
    expect(localized(null, "bn")).toBe("");
  });

  test("should return empty string when no translation exists", () => {
    expect(localized({}, "bn")).toBe("");
  });

  test("should fall back to English when Bangla value is empty", () => {
    const field = {
      en: "Ruby Necklace",
      bn: "",
    };

    expect(localized(field, "bn")).toBe("Ruby Necklace");
  });

  test("should return Bangla jewellery name when both translations exist", () => {
    const field = {
      en: "Gold Earrings",
      bn: "সোনার কানের দুল",
    };

    expect(localized(field, "bn")).toBe("সোনার কানের দুল");
  });
});