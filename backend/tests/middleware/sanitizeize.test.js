import {
  describe,
  test,
  expect,
  jest,
} from "@jest/globals";

/* =========================================================
   IMPORT SANITIZE MIDDLEWARE
   Supports both:
   export const sanitizeInputs = ...
   AND
   export default sanitizeInputs
========================================================= */

const sanitizeModule =
  await import("../../middleware/sanitize.js");

const sanitizeInputs =
  sanitizeModule.sanitizeInputs ||
  sanitizeModule.default;

/* =========================================================
   CHECK EXPORT
========================================================= */

if (typeof sanitizeInputs !== "function") {
  throw new TypeError(
    `sanitizeInputs is not a function. Available exports: ${Object.keys(
      sanitizeModule
    ).join(", ")}`
  );
}

/* =========================================================
   HELPERS
========================================================= */

const createResponse = () => ({});

/* =========================================================
   TEST SUITE
========================================================= */

describe("sanitizeInputs", () => {
  /* =======================================================
     BASIC
  ======================================================= */

  test("should call next", () => {
    const req = {
      body: {},
      query: {},
      params: {},
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("should keep normal body fields", () => {
    const req = {
      body: {
        name: "Hafsa",
        email: "hafsa@example.com",
        age: 22,
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      name: "Hafsa",
      email: "hafsa@example.com",
      age: 22,
    });

    expect(next).toHaveBeenCalledTimes(1);
  });

  /* =======================================================
     DOLLAR KEYS
  ======================================================= */

  test("should remove keys starting with $", () => {
    const req = {
      body: {
        username: "hafsa",
        $where: "malicious",
        $ne: null,
        $gt: 10,
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      username: "hafsa",
    });

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("should remove Mongo operators from nested objects", () => {
    const req = {
      body: {
        user: {
          name: "Hafsa",
          $ne: null,
          $gt: 10,
          $where: "malicious",
        },
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      user: {
        name: "Hafsa",
      },
    });
  });

  /* =======================================================
     DOT KEYS
  ======================================================= */

  test("should remove keys containing dots", () => {
    const req = {
      body: {
        username: "hafsa",
        "user.email": "attacker@example.com",
        email: "real@example.com",
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      username: "hafsa",
      email: "real@example.com",
    });
  });

  test("should remove nested keys containing dots", () => {
    const req = {
      body: {
        user: {
          name: "Hafsa",
          "profile.email": "bad@example.com",
        },
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      user: {
        name: "Hafsa",
      },
    });
  });

  /* =======================================================
     DEEPLY NESTED OBJECTS
  ======================================================= */

  test("should recursively sanitize deeply nested objects", () => {
    const req = {
      body: {
        user: {
          profile: {
            account: {
              name: "Hafsa",
              email: "hafsa@example.com",
              $where: "bad",
              "email.address": "bad@example.com",
            },
          },
        },
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      user: {
        profile: {
          account: {
            name: "Hafsa",
            email: "hafsa@example.com",
          },
        },
      },
    });
  });

  /* =======================================================
     ARRAYS
  ======================================================= */

  test("should sanitize objects inside arrays", () => {
    const req = {
      body: {
        users: [
          {
            name: "Hafsa",
            $where: "bad",
          },
          {
            name: "Suchi",
            "user.email": "bad@example.com",
          },
        ],
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      users: [
        {
          name: "Hafsa",
        },
        {
          name: "Suchi",
        },
      ],
    });
  });

  test("should sanitize nested arrays", () => {
    const req = {
      body: {
        data: [
          {
            items: [
              {
                name: "Product",
                $ne: null,
                "product.id": "123",
              },
            ],
          },
        ],
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      data: [
        {
          items: [
            {
              name: "Product",
            },
          ],
        },
      ],
    });
  });

  test("should preserve normal array values", () => {
    const req = {
      body: {
        tags: [
          "electronics",
          "mobile",
          "laptop",
        ],
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      tags: [
        "electronics",
        "mobile",
        "laptop",
      ],
    });
  });

  /* =======================================================
     QUERY
  ======================================================= */

  test("should sanitize req.query", () => {
    const req = {
      query: {
        search: "phone",
        page: "1",
        $where: "bad",
        "user.email": "bad",
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.query).toEqual({
      search: "phone",
      page: "1",
    });

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("should recursively sanitize req.query", () => {
    const req = {
      query: {
        filter: {
          category: "phone",
          $ne: null,
          "product.price": {
            $gt: 100,
          },
        },
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.query).toEqual({
      filter: {
        category: "phone",
      },
    });
  });

  /* =======================================================
     PARAMS
  ======================================================= */

  test("should sanitize req.params", () => {
    const req = {
      params: {
        id: "123",
        name: "phone",
        $where: "bad",
        "user.id": "bad",
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.params).toEqual({
      id: "123",
      name: "phone",
    });
  });

  /* =======================================================
     BODY + QUERY + PARAMS
  ======================================================= */

  test("should sanitize body, query, and params together", () => {
    const req = {
      body: {
        username: "Hafsa",
        $where: "bad",
      },

      query: {
        search: "phone",
        $ne: null,
      },

      params: {
        id: "123",
        "user.id": "bad",
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      username: "Hafsa",
    });

    expect(req.query).toEqual({
      search: "phone",
    });

    expect(req.params).toEqual({
      id: "123",
    });

    expect(next).toHaveBeenCalledTimes(1);
  });

  /* =======================================================
     PRIMITIVE VALUES
  ======================================================= */

  test("should preserve string values", () => {
    const req = {
      body: {
        value: "hello",
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body.value).toBe("hello");
  });

  test("should preserve number values", () => {
    const req = {
      body: {
        value: 12345,
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body.value).toBe(12345);
  });

  test("should preserve boolean values", () => {
    const req = {
      body: {
        active: true,
        disabled: false,
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      active: true,
      disabled: false,
    });
  });

  test("should preserve null values", () => {
    const req = {
      body: {
        value: null,
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      value: null,
    });
  });

  /* =======================================================
     EMPTY OBJECTS
  ======================================================= */

  test("should handle empty body", () => {
    const req = {
      body: {},
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({});
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("should handle empty query", () => {
    const req = {
      query: {},
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.query).toEqual({});
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("should handle empty params", () => {
    const req = {
      params: {},
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.params).toEqual({});
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("should handle missing body, query, and params", () => {
    const req = {};

    const res = createResponse();
    const next = jest.fn();

    expect(() => {
      sanitizeInputs(req, res, next);
    }).not.toThrow();

    expect(next).toHaveBeenCalledTimes(1);
  });

  /* =======================================================
     MONGO INJECTION
  ======================================================= */

  test("should remove Mongo injection from guestInfo", () => {
    const req = {
      body: {
        guestInfo: {
          email: {
            $ne: null,
          },
        },
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      guestInfo: {
        email: {},
      },
    });

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("should remove dot notation injection", () => {
    const req = {
      body: {
        "guestInfo.email": {
          $ne: null,
        },
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({});

    expect(next).toHaveBeenCalledTimes(1);
  });

  /* =======================================================
     MIXED ATTACK PAYLOAD
  ======================================================= */

  test("should remove mixed Mongo injection payload", () => {
    const req = {
      body: {
        username: "Hafsa",

        $where: "malicious",

        "account.email": "attacker@example.com",

        account: {
          email: "hafsa@example.com",
          $ne: null,

          profile: {
            "$gt": 100,
            "profile.name": "bad",
            name: "Hafsa",
          },
        },

        users: [
          {
            name: "Hafsa",
            $where: "bad",
          },
          {
            "user.email": "bad",
            role: "customer",
          },
        ],
      },
    };

    const res = createResponse();
    const next = jest.fn();

    sanitizeInputs(req, res, next);

    expect(req.body).toEqual({
      username: "Hafsa",

      account: {
        email: "hafsa@example.com",

        profile: {
          name: "Hafsa",
        },
      },

      users: [
        {
          name: "Hafsa",
        },
        {
          role: "customer",
        },
      ],
    });

    expect(next).toHaveBeenCalledTimes(1);
  });
});