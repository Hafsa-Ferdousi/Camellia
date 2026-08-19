import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK CONTROLLER
// ======================================================

const mockGetPublicPricing = jest.fn();

jest.unstable_mockModule(
  "../../controllers/settingsController.js",
  () => ({
    getPublicPricing: mockGetPublicPricing,
  })
);

// ======================================================
// IMPORT ROUTER AFTER MOCK
// ======================================================

const { default: settingsRouter } =
  await import("../../routes/settingsRoutes.js");

// ======================================================
// APP
// ======================================================

const app = express();

app.use(express.json());

app.use("/settings", settingsRouter);

// ======================================================
// SETUP
// ======================================================

beforeEach(() => {
  jest.clearAllMocks();

  mockGetPublicPricing.mockImplementation(
    (req, res) => {
      res.json({
        deliveryFee: 60,
        vatRate: 5,
      });
    }
  );
});

// ======================================================
// TESTS
// ======================================================

describe("Settings Routes", () => {
  // ----------------------------------------------------
  // 1. GET /settings/pricing
  // ----------------------------------------------------

  test("should return public pricing", async () => {
    const response = await request(app)
      .get("/settings/pricing")
      .expect(200);

    expect(response.body).toEqual({
      deliveryFee: 60,
      vatRate: 5,
    });

    expect(
      mockGetPublicPricing
    ).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------
  // 2. Controller should receive request
  // ----------------------------------------------------

  test("should call getPublicPricing controller", async () => {
    await request(app)
      .get("/settings/pricing")
      .expect(200);

    expect(
      mockGetPublicPricing
    ).toHaveBeenCalled();
  });

  // ----------------------------------------------------
  // 3. Should use GET method
  // ----------------------------------------------------

  test("should support GET /pricing", async () => {
    await request(app)
      .get("/settings/pricing")
      .expect(200);

    expect(
      mockGetPublicPricing
    ).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------
  // 4. POST should return 404
  // ----------------------------------------------------

  test("should return 404 for POST /settings/pricing", async () => {
    await request(app)
      .post("/settings/pricing")
      .send({
        deliveryFee: 100,
        vatRate: 10,
      })
      .expect(404);

    expect(
      mockGetPublicPricing
    ).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------
  // 5. PUT should return 404
  // ----------------------------------------------------

  test("should return 404 for PUT /settings/pricing", async () => {
    await request(app)
      .put("/settings/pricing")
      .send({
        deliveryFee: 100,
      })
      .expect(404);

    expect(
      mockGetPublicPricing
    ).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------
  // 6. PATCH should return 404
  // ----------------------------------------------------

  test("should return 404 for PATCH /settings/pricing", async () => {
    await request(app)
      .patch("/settings/pricing")
      .send({
        deliveryFee: 100,
      })
      .expect(404);

    expect(
      mockGetPublicPricing
    ).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------
  // 7. DELETE should return 404
  // ----------------------------------------------------

  test("should return 404 for DELETE /settings/pricing", async () => {
    await request(app)
      .delete("/settings/pricing")
      .expect(404);

    expect(
      mockGetPublicPricing
    ).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------
  // 8. Unknown route
  // ----------------------------------------------------

  test("should return 404 for unknown settings route", async () => {
    await request(app)
      .get("/settings/unknown")
      .expect(404);

    expect(
      mockGetPublicPricing
    ).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------
  // 9. Missing pricing path
  // ----------------------------------------------------

  test("should return 404 for GET /settings", async () => {
    await request(app)
      .get("/settings")
      .expect(404);

    expect(
      mockGetPublicPricing
    ).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------
  // 10. Controller error should propagate
  // ----------------------------------------------------

  test("should return 500 when controller throws an error", async () => {
    mockGetPublicPricing.mockImplementation(
      (req, res) => {
        throw new Error(
          "Failed to load pricing"
        );
      }
    );

    const response = await request(app)
      .get("/settings/pricing")
      .expect(500);

    expect(response.text).toContain(
      "Failed to load pricing"
    );

    expect(
      mockGetPublicPricing
    ).toHaveBeenCalledTimes(1);
  });
});