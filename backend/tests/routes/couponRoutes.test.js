import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK CONTROLLERS
// ======================================================

const mockCreateCoupon = jest.fn();
const mockGetCoupons = jest.fn();
const mockGetCouponById = jest.fn();
const mockUpdateCoupon = jest.fn();
const mockDeleteCoupon = jest.fn();
const mockSetCouponStatus = jest.fn();
const mockValidateCoupon = jest.fn();

// ======================================================
// MOCK AUTH MIDDLEWARE
// ======================================================

const mockProtect = jest.fn((req, res, next) => {
  req.user = {
    id: "admin123",
    email: "admin@camellia.com",
    role: "admin",
  };

  next();
});

const mockAdminOnly = jest.fn((req, res, next) => {
  next();
});

const mockOptionalAuth = jest.fn((req, res, next) => {
  req.user = {
    id: "customer123",
    email: "customer@example.com",
    role: "customer",
  };

  next();
});

// ======================================================
// MOCK CONTROLLER MODULE
// ======================================================

jest.unstable_mockModule(
  "../../controllers/couponController.js",
  () => ({
    createCoupon: mockCreateCoupon,
    getCoupons: mockGetCoupons,
    getCouponById: mockGetCouponById,
    updateCoupon: mockUpdateCoupon,
    deleteCoupon: mockDeleteCoupon,
    setCouponStatus: mockSetCouponStatus,
    validateCoupon: mockValidateCoupon,
  })
);

// ======================================================
// MOCK AUTH MODULE
// ======================================================

jest.unstable_mockModule(
  "../../middleware/authMiddleware.js",
  () => ({
    protect: mockProtect,
    adminOnly: mockAdminOnly,
    optionalAuth: mockOptionalAuth,
  })
);

// ======================================================
// IMPORT ROUTERS AFTER MOCKING
// ======================================================

const {
  adminCouponRouter,
  customerCouponRouter,
} = await import(
  "../../routes/couponRoutes.js"
);

// ======================================================
// ADMIN TEST APP
// ======================================================

const adminApp = express();

adminApp.use(express.json());

adminApp.use(
  "/api/admin/coupons",
  adminCouponRouter
);

// ======================================================
// CUSTOMER TEST APP
// ======================================================

const customerApp = express();

customerApp.use(express.json());

customerApp.use(
  "/api/coupons",
  customerCouponRouter
);

// ======================================================
// DEFAULT CONTROLLER RESPONSES
// ======================================================

function setupControllerMocks() {
  // ----------------------------------------------------
  // CREATE COUPON
  // ----------------------------------------------------

  mockCreateCoupon.mockImplementation(
    (req, res) => {
      res.status(201).json({
        success: true,
        coupon: req.body,
      });
    }
  );

  // ----------------------------------------------------
  // GET COUPONS
  // ----------------------------------------------------

  mockGetCoupons.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        coupons: [
          {
            _id: "coupon123",
            code: "WELCOME10",
            discount: 10,
          },
        ],
      });
    }
  );

  // ----------------------------------------------------
  // GET COUPON BY ID
  // ----------------------------------------------------

  mockGetCouponById.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        couponId: req.params.id,
      });
    }
  );

  // ----------------------------------------------------
  // UPDATE COUPON
  // ----------------------------------------------------

  mockUpdateCoupon.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        couponId: req.params.id,
        coupon: req.body,
      });
    }
  );

  // ----------------------------------------------------
  // DELETE COUPON
  // ----------------------------------------------------

  mockDeleteCoupon.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Coupon deleted",
        couponId: req.params.id,
      });
    }
  );

  // ----------------------------------------------------
  // SET COUPON STATUS
  // ----------------------------------------------------

  mockSetCouponStatus.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Coupon status updated",
        couponId: req.params.id,
        status: req.body.status,
      });
    }
  );

  // ----------------------------------------------------
  // VALIDATE COUPON
  // ----------------------------------------------------

  mockValidateCoupon.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        valid: true,
        code: req.body.code,
      });
    }
  );
}

// ======================================================
// TEST SUITE
// ======================================================

describe("Coupon Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setupControllerMocks();
  });

  // ====================================================
  // ADMIN ROUTER MIDDLEWARE
  // ====================================================

  describe("Admin coupon middleware", () => {
    test("should use protect middleware", async () => {
      await request(adminApp)
        .get("/api/admin/coupons")
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });

    test("should use adminOnly middleware", async () => {
      await request(adminApp)
        .get("/api/admin/coupons")
        .expect(200);

      expect(
        mockAdminOnly
      ).toHaveBeenCalledTimes(1);
    });

    test("should execute protect before adminOnly", async () => {
      const order = [];

      mockProtect.mockImplementation(
        (req, res, next) => {
          order.push("protect");
          next();
        }
      );

      mockAdminOnly.mockImplementation(
        (req, res, next) => {
          order.push("adminOnly");
          next();
        }
      );

      await request(adminApp)
        .get("/api/admin/coupons")
        .expect(200);

      expect(order).toEqual([
        "protect",
        "adminOnly",
      ]);
    });
  });

  // ====================================================
  // CREATE COUPON
  // ====================================================

  describe("POST /api/admin/coupons", () => {
    test("should call createCoupon controller", async () => {
      const coupon = {
        code: "WELCOME10",
        discountType: "percentage",
        discountValue: 10,
      };

      const response = await request(adminApp)
        .post("/api/admin/coupons")
        .send(coupon)
        .expect(201);

      expect(
        mockCreateCoupon
      ).toHaveBeenCalledTimes(1);

      expect(response.body.coupon).toEqual(
        coupon
      );
    });

    test("should pass request body to controller", async () => {
      const coupon = {
        code: "SUMMER20",
        discountType: "percentage",
        discountValue: 20,
      };

      await request(adminApp)
        .post("/api/admin/coupons")
        .send(coupon)
        .expect(201);

      const [req] =
        mockCreateCoupon.mock.calls[0];

      expect(req.body).toEqual(coupon);
    });
  });

  // ====================================================
  // GET COUPONS
  // ====================================================

  describe("GET /api/admin/coupons", () => {
    test("should call getCoupons controller", async () => {
      const response = await request(adminApp)
        .get("/api/admin/coupons")
        .expect(200);

      expect(
        mockGetCoupons
      ).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        coupons: [
          {
            _id: "coupon123",
            code: "WELCOME10",
            discount: 10,
          },
        ],
      });
    });
  });

  // ====================================================
  // GET COUPON BY ID
  // ====================================================

  describe("GET /api/admin/coupons/:id", () => {
    test("should call getCouponById controller", async () => {
      const response = await request(adminApp)
        .get(
          "/api/admin/coupons/coupon123"
        )
        .expect(200);

      expect(
        mockGetCouponById
      ).toHaveBeenCalledTimes(1);

      expect(
        response.body.couponId
      ).toBe("coupon123");
    });

    test("should pass coupon ID from URL", async () => {
      await request(adminApp)
        .get(
          "/api/admin/coupons/jewellery10"
        )
        .expect(200);

      const [req] =
        mockGetCouponById.mock.calls[0];

      expect(req.params.id).toBe(
        "jewellery10"
      );
    });
  });

  // ====================================================
  // UPDATE COUPON
  // ====================================================

  describe("PUT /api/admin/coupons/:id", () => {
    test("should call updateCoupon controller", async () => {
      const coupon = {
        discountValue: 15,
      };

      const response = await request(adminApp)
        .put(
          "/api/admin/coupons/coupon123"
        )
        .send(coupon)
        .expect(200);

      expect(
        mockUpdateCoupon
      ).toHaveBeenCalledTimes(1);

      expect(
        response.body.couponId
      ).toBe("coupon123");

      expect(response.body.coupon).toEqual(
        coupon
      );
    });

    test("should pass ID and body to controller", async () => {
      const coupon = {
        discountValue: 25,
        isActive: true,
      };

      await request(adminApp)
        .put(
          "/api/admin/coupons/coupon456"
        )
        .send(coupon)
        .expect(200);

      const [req] =
        mockUpdateCoupon.mock.calls[0];

      expect(req.params.id).toBe(
        "coupon456"
      );

      expect(req.body).toEqual(coupon);
    });
  });

  // ====================================================
  // DELETE COUPON
  // ====================================================

  describe("DELETE /api/admin/coupons/:id", () => {
    test("should call deleteCoupon controller", async () => {
      const response = await request(adminApp)
        .delete(
          "/api/admin/coupons/coupon123"
        )
        .expect(200);

      expect(
        mockDeleteCoupon
      ).toHaveBeenCalledTimes(1);

      expect(
        response.body.message
      ).toBe("Coupon deleted");

      expect(
        response.body.couponId
      ).toBe("coupon123");
    });

    test("should pass coupon ID to controller", async () => {
      await request(adminApp)
        .delete(
          "/api/admin/coupons/coupon789"
        )
        .expect(200);

      const [req] =
        mockDeleteCoupon.mock.calls[0];

      expect(req.params.id).toBe(
        "coupon789"
      );
    });
  });

  // ====================================================
  // SET COUPON STATUS
  // ====================================================

  describe(
    "PATCH /api/admin/coupons/:id/status",
    () => {
      test("should call setCouponStatus controller", async () => {
        const response =
          await request(adminApp)
            .patch(
              "/api/admin/coupons/coupon123/status"
            )
            .send({
              status: "active",
            })
            .expect(200);

        expect(
          mockSetCouponStatus
        ).toHaveBeenCalledTimes(1);

        expect(
          response.body.couponId
        ).toBe("coupon123");

        expect(
          response.body.status
        ).toBe("active");
      });

      test("should pass status to controller", async () => {
        await request(adminApp)
          .patch(
            "/api/admin/coupons/coupon456/status"
          )
          .send({
            status: "inactive",
          })
          .expect(200);

        const [req] =
          mockSetCouponStatus.mock.calls[0];

        expect(req.params.id).toBe(
          "coupon456"
        );

        expect(req.body.status).toBe(
          "inactive"
        );
      });
    }
  );

  // ====================================================
  // CUSTOMER VALIDATION
  // ====================================================

  describe(
    "POST /api/coupons/validate",
    () => {
      test("should call optionalAuth middleware", async () => {
        await request(customerApp)
          .post("/api/coupons/validate")
          .send({
            code: "WELCOME10",
          })
          .expect(200);

        expect(
          mockOptionalAuth
        ).toHaveBeenCalledTimes(1);
      });

      test("should call validateCoupon controller", async () => {
        const response =
          await request(customerApp)
            .post("/api/coupons/validate")
            .send({
              code: "WELCOME10",
              cartTotal: 2500,
            })
            .expect(200);

        expect(
          mockValidateCoupon
        ).toHaveBeenCalledTimes(1);

        expect(response.body).toEqual({
          success: true,
          valid: true,
          code: "WELCOME10",
        });
      });

      test("should pass request body to controller", async () => {
        const couponData = {
          code: "JEWELLERY15",
          cartTotal: 5000,
          guestEmail:
            "guest@example.com",
        };

        await request(customerApp)
          .post("/api/coupons/validate")
          .send(couponData)
          .expect(200);

        const [req] =
          mockValidateCoupon.mock.calls[0];

        expect(req.body).toEqual(
          couponData
        );
      });

      test("should pass authenticated user to controller", async () => {
        await request(customerApp)
          .post("/api/coupons/validate")
          .send({
            code: "WELCOME10",
          })
          .expect(200);

        const [req] =
          mockValidateCoupon.mock.calls[0];

        expect(req.user).toEqual({
          id: "customer123",
          email:
            "customer@example.com",
          role: "customer",
        });
      });
    }
  );

  // ====================================================
  // INVALID ADMIN METHODS
  // ====================================================

  describe("Invalid admin HTTP methods", () => {
    test("should return 404 for PATCH /api/admin/coupons", async () => {
      await request(adminApp)
        .patch("/api/admin/coupons")
        .send({
          code: "TEST10",
        })
        .expect(404);

      expect(
        mockCreateCoupon
      ).not.toHaveBeenCalled();

      expect(
        mockGetCoupons
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for POST /api/admin/coupons/:id", async () => {
      await request(adminApp)
        .post(
          "/api/admin/coupons/coupon123"
        )
        .send({
          code: "TEST10",
        })
        .expect(404);

      expect(
        mockGetCouponById
      ).not.toHaveBeenCalled();

      expect(
        mockUpdateCoupon
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for GET status endpoint", async () => {
      await request(adminApp)
        .get(
          "/api/admin/coupons/coupon123/status"
        )
        .expect(404);

      expect(
        mockSetCouponStatus
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // CUSTOMER ROUTE IS SEPARATE FROM ADMIN
  // ====================================================

  describe("Customer/Admin separation", () => {
    test("customer validation should not use admin middleware", async () => {
      await request(customerApp)
        .post("/api/coupons/validate")
        .send({
          code: "WELCOME10",
        })
        .expect(200);

      expect(
        mockProtect
      ).not.toHaveBeenCalled();

      expect(
        mockAdminOnly
      ).not.toHaveBeenCalled();

      expect(
        mockOptionalAuth
      ).toHaveBeenCalledTimes(1);
    });

    test("admin routes should not call optionalAuth", async () => {
      await request(adminApp)
        .get("/api/admin/coupons")
        .expect(200);

      expect(
        mockOptionalAuth
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // UNKNOWN ROUTES
  // ====================================================

  describe("Unknown routes", () => {
    test("should return 404 for unknown admin coupon route", async () => {
      await request(adminApp)
        .get(
          "/api/admin/coupons/unknown/path"
        )
        .expect(404);
    });

    test("should return 404 for unknown customer coupon route", async () => {
      await request(customerApp)
        .get("/api/coupons/unknown")
        .expect(404);
    });
  });

  // ====================================================
  // CONTROLLER ERROR HANDLING
  // ====================================================

  describe("Controller errors", () => {
    test("should handle getCoupons error", async () => {
      mockGetCoupons.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to load coupons"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/api/admin/coupons",
        adminCouponRouter
      );

      errorApp.use(
        (err, req, res, next) => {
          res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      );

      const response = await request(errorApp)
        .get("/api/admin/coupons")
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to load coupons",
      });
    });

    test("should handle validateCoupon error", async () => {
      mockValidateCoupon.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Coupon validation failed"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/api/coupons",
        customerCouponRouter
      );

      errorApp.use(
        (err, req, res, next) => {
          res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      );

      const response = await request(errorApp)
        .post("/api/coupons/validate")
        .send({
          code: "INVALID10",
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message:
          "Coupon validation failed",
      });
    });
  });
});