import { describe, test, expect, jest } from "@jest/globals";

const mockSchema = jest.fn();
const mockModel = jest.fn();

jest.unstable_mockModule("mongoose", () => ({
  default: {
    Schema: mockSchema,
    model: mockModel,
  },
}));

const mongoose = (await import("mongoose")).default;

// Import after mongoose is mocked
await import("../../models/Category.js");

describe("Category Model", () => {
  test("should create Category schema", () => {
    expect(mockSchema).toHaveBeenCalledTimes(1);
  });

  test("should create Category mongoose model", () => {
    expect(mockModel).toHaveBeenCalledWith(
      "Category",
      expect.anything()
    );
  });

  test("should define required name.en field", () => {
    const schemaDefinition = mockSchema.mock.calls[0][0];

    expect(schemaDefinition.name.en).toEqual({
      type: String,
      required: true,
    });
  });

  test("should define optional name.bn field", () => {
    const schemaDefinition = mockSchema.mock.calls[0][0];

    expect(schemaDefinition.name.bn).toEqual({
      type: String,
    });
  });

  test("should define slug as required and unique", () => {
    const schemaDefinition = mockSchema.mock.calls[0][0];

    expect(schemaDefinition.slug).toEqual({
      type: String,
      required: true,
      unique: true,
    });
  });

  test("should define isFixed with default false", () => {
    const schemaDefinition = mockSchema.mock.calls[0][0];

    expect(schemaDefinition.isFixed).toEqual({
      type: Boolean,
      default: false,
    });
  });

  test("should define sortOrder with default 0", () => {
    const schemaDefinition = mockSchema.mock.calls[0][0];

    expect(schemaDefinition.sortOrder).toEqual({
      type: Number,
      default: 0,
    });
  });

  test("should define optional image field", () => {
    const schemaDefinition = mockSchema.mock.calls[0][0];

    expect(schemaDefinition.image).toEqual({
      type: String,
    });
  });

  test("should enable timestamps", () => {
    const schemaOptions = mockSchema.mock.calls[0][1];

    expect(schemaOptions).toEqual({
      timestamps: true,
    });
  });

  test("should export Category model", () => {
    expect(mockModel).toHaveBeenCalledWith(
      "Category",
      expect.anything()
    );
  });

  test("should have exactly six top-level schema fields", () => {
    const schemaDefinition = mockSchema.mock.calls[0][0];

    expect(Object.keys(schemaDefinition)).toEqual([
      "name",
      "slug",
      "isFixed",
      "sortOrder",
      "image",
    ]);
  });
});