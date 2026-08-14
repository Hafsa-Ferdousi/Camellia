import { describe, test, expect, jest } from "@jest/globals";

const mockModel = jest.fn((name, schema) => ({
  modelName: name,
  schema,
}));

const mockSchema = jest.fn(function (definition, options) {
  this.definition = definition;
  this.options = options;
});

mockSchema.Types = {
  ObjectId: "ObjectId",
};

jest.unstable_mockModule("mongoose", () => ({
  default: {
    Schema: mockSchema,
    model: mockModel,
  },
}));

const Conversation = (await import("../../models/Conversation.js")).default;

describe("Conversation Model", () => {
  test("should create Conversation model", () => {
    expect(Conversation).toBeDefined();
    expect(Conversation.modelName).toBe("Conversation");
  });

  test("should have correct sessionId field", () => {
    const schema = Conversation.schema;

    expect(schema.definition.sessionId).toEqual({
      type: String,
      required: true,
      unique: true,
    });
  });

  test("should have correct user field", () => {
    const schema = Conversation.schema;

    expect(schema.definition.user).toEqual({
      type: "ObjectId",
      ref: "User",
      default: null,
    });
  });

  test("should have messages field", () => {
    const schema = Conversation.schema;

    expect(schema.definition.messages).toBeDefined();
  });

  test("should enable timestamps", () => {
    const schema = Conversation.schema;

    expect(schema.options).toEqual({
      timestamps: true,
    });
  });

  test("should define message role correctly", () => {
    const schema = Conversation.schema;

    const messages = schema.definition.messages;

    expect(messages).toBeDefined();
  });

  test("should use unique sessionId", () => {
    const schema = Conversation.schema;

    expect(schema.definition.sessionId.unique).toBe(true);
  });

  test("should require sessionId", () => {
    const schema = Conversation.schema;

    expect(schema.definition.sessionId.required).toBe(true);
  });

  test("should default user to null", () => {
    const schema = Conversation.schema;

    expect(schema.definition.user.default).toBeNull();
  });

  test("should reference User model", () => {
    const schema = Conversation.schema;

    expect(schema.definition.user.ref).toBe("User");
  });
});