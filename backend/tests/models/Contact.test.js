import { describe, test, expect } from "@jest/globals";
import mongoose from "mongoose";

import Contact from "../../models/Contact.js";

describe("Contact Model", () => {
  test("should create a valid contact", () => {
    const contact = new Contact({
      name: "  Hafsa Ferdousi  ",
      email: "  HAFSA@EXAMPLE.COM  ",
      message: "  I have a question about the website.  ",
    });

    const error = contact.validateSync();

    expect(error).toBeUndefined();

    expect(contact.name).toBe("Hafsa Ferdousi");
    expect(contact.email).toBe("hafsa@example.com");
    expect(contact.message).toBe("I have a question about the website.");
    expect(contact.status).toBe("unread");
  });

  test("should require name", () => {
    const contact = new Contact({
      email: "test@example.com",
      message: "Hello",
    });

    const error = contact.validateSync();

    expect(error.errors.name).toBeDefined();
    expect(error.errors.name.kind).toBe("required");
  });

  test("should require email", () => {
    const contact = new Contact({
      name: "Hafsa",
      message: "Hello",
    });

    const error = contact.validateSync();

    expect(error.errors.email).toBeDefined();
    expect(error.errors.email.kind).toBe("required");
  });

  test("should require message", () => {
    const contact = new Contact({
      name: "Hafsa",
      email: "hafsa@example.com",
    });

    const error = contact.validateSync();

    expect(error.errors.message).toBeDefined();
    expect(error.errors.message.kind).toBe("required");
  });

  test("should default status to unread", () => {
    const contact = new Contact({
      name: "Hafsa",
      email: "hafsa@example.com",
      message: "Hello",
    });

    expect(contact.status).toBe("unread");
  });

  test("should accept valid status values", () => {
    const statuses = ["unread", "read", "replied"];

    statuses.forEach((status) => {
      const contact = new Contact({
        name: "Hafsa",
        email: "hafsa@example.com",
        message: "Hello",
        status,
      });

      const error = contact.validateSync();

      expect(error).toBeUndefined();
    });
  });

  test("should reject invalid status", () => {
    const contact = new Contact({
      name: "Hafsa",
      email: "hafsa@example.com",
      message: "Hello",
      status: "pending",
    });

    const error = contact.validateSync();

    expect(error.errors.status).toBeDefined();
    expect(error.errors.status.kind).toBe("enum");
  });

  test("should trim name, email and message", () => {
    const contact = new Contact({
      name: "   Hafsa   ",
      email: "   hafsa@example.com   ",
      message: "   Hello there   ",
    });

    expect(contact.name).toBe("Hafsa");
    expect(contact.email).toBe("hafsa@example.com");
    expect(contact.message).toBe("Hello there");
  });

  test("should convert email to lowercase", () => {
    const contact = new Contact({
      name: "Hafsa",
      email: "HAFSA@EXAMPLE.COM",
      message: "Hello",
    });

    expect(contact.email).toBe("hafsa@example.com");
  });

  test("should allow optional reply field", () => {
    const contact = new Contact({
      name: "Hafsa",
      email: "hafsa@example.com",
      message: "Hello",
      reply: "Thank you for contacting us.",
    });

    const error = contact.validateSync();

    expect(error).toBeUndefined();
    expect(contact.reply).toBe("Thank you for contacting us.");
  });

  test("should allow optional repliedAt field", () => {
    const date = new Date();

    const contact = new Contact({
      name: "Hafsa",
      email: "hafsa@example.com",
      message: "Hello",
      repliedAt: date,
    });

    const error = contact.validateSync();

    expect(error).toBeUndefined();
    expect(contact.repliedAt).toEqual(date);
  });

  test("should trim reply", () => {
    const contact = new Contact({
      name: "Hafsa",
      email: "hafsa@example.com",
      message: "Hello",
      reply: "   Thank you   ",
    });

    expect(contact.reply).toBe("Thank you");
  });

  test("should have timestamps enabled", () => {
    expect(Contact.schema.options.timestamps).toBe(true);
  });

  test("should have createdAt and updatedAt fields", () => {
    expect(Contact.schema.path("createdAt")).toBeDefined();
    expect(Contact.schema.path("updatedAt")).toBeDefined();
  });

  test("should define all expected schema fields", () => {
    const paths = Object.keys(Contact.schema.paths);

    expect(paths).toEqual(
      expect.arrayContaining([
        "name",
        "email",
        "message",
        "status",
        "reply",
        "repliedAt",
        "createdAt",
        "updatedAt",
        "_id",
      ])
    );
  });
});