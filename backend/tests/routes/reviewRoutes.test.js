import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK MODELS
// ======================================================

const mockReviewFind = jest.fn();
const mockReviewFindOne = jest.fn();
const mockReviewExists = jest.fn();
const mockReviewCreate = jest.fn();

const mockProductFindById = jest.fn();

const mockOrderExists = jest.fn();

// ======================================================
// MOCK REVIEW MODEL
// ======================================================

jest.unstable_mockModule(
  "../../models/Review.js",
  () => ({
    default: {
      find: mockReviewFind,
      findOne: mockReviewFindOne,
      exists: mockReviewExists,
      create: mockReviewCreate,
    },
  })
);

// ======================================================
// MOCK PRODUCT MODEL
// ======================================================

jest.unstable_mockModule(
  "../../models/Product.js",
  () => ({
    default: {
      findById: mockProductFindById,
    },
  })
);

// ======================================================
// MOCK ORDER MODEL
// ======================================================

jest.unstable_mockModule(
  "../../models/Order.js",
  () => ({
    default: {
      exists: mockOrderExists,
    },
  })
);

// ======================================================
// MOCK AUTH MIDDLEWARE
// ======================================================

const mockOptionalAuth = jest.fn(
  (req, res, next) => {
    // Default request = guest
    delete req.user;
    next();
  }
);

jest.unstable_mockModule(
  "../../middleware/authMiddleware.js",
  () => ({
    optionalAuth: mockOptionalAuth,
  })
);

// ======================================================
// IMPORT ROUTER AFTER MOCKS
// ======================================================

const { default: reviewRouter } =
  await import("../../routes/reviewRoutes.js");

// ======================================================
// TEST APP
// ======================================================

const app = express();

app.use(express.json());

app.use("/reviews", reviewRouter);

// ======================================================
// TEST HELPERS
// ======================================================

function createProduct(overrides = {}) {
  return {
    _id: "product123",
    name: "Gold Necklace",
    averageRating: 4,
    totalReviews: 2,
    save: jest.fn().mockResolvedValue(),
    ...overrides,
  };
}

function createReview(overrides = {}) {
  return {
    _id: "review123",
    product: "product123",
    user: "user123",
    userName: "Test User",
    guestName: null,
    guestEmail: null,
    rating: 5,
    comment: "Beautiful jewellery!",
    createdAt: new Date(),
    ...overrides,
  };
}

// ======================================================
// AUTH HELPERS
// ======================================================

function setGuestAuth() {
  mockOptionalAuth.mockImplementation(
    (req, res, next) => {
      delete req.user;
      next();
    }
  );
}

function setAuthenticatedUser(
  user = {
    _id: "user123",
    name: "Test User",
    email: "user@example.com",
  }
) {
  mockOptionalAuth.mockImplementation(
    (req, res, next) => {
      req.user = user;
      next();
    }
  );
}

// ======================================================
// GET REVIEW MOCK
// ======================================================

function mockReviewList(reviews = []) {
  const limit = jest
    .fn()
    .mockResolvedValue(reviews);

  const sort = jest
    .fn()
    .mockReturnValue({
      limit,
    });

  mockReviewFind.mockReturnValue({
    sort,
  });

  return {
    sort,
    limit,
  };
}

// ======================================================
// POST REVIEW MOCK
// ======================================================

function mockReviewsForAverage(
  reviews = []
) {
  mockReviewFind.mockResolvedValue(
    reviews
  );
}

// ======================================================
// DEFAULT SETUP
// ======================================================

beforeEach(() => {
  jest.clearAllMocks();

  // Always reset authentication to guest
  setGuestAuth();

  mockProductFindById.mockResolvedValue(
    createProduct()
  );

  mockReviewFindOne.mockResolvedValue(
    null
  );

  mockReviewExists.mockResolvedValue(
    false
  );

  mockOrderExists.mockResolvedValue(
    true
  );

  mockReviewCreate.mockResolvedValue(
    createReview()
  );

  mockReviewList([]);
});

// ======================================================
// TEST SUITE
// ======================================================

describe("Review Routes", () => {
  // ====================================================
  // GET REVIEWS
  // ====================================================

  describe("GET /reviews/:productId", () => {
    test("should return reviews for a product", async () => {
      const reviews = [
        createReview({
          rating: 5,
          comment: "Excellent product",
        }),
        createReview({
          _id: "review456",
          rating: 4,
          comment: "Very good",
        }),
      ];

      mockReviewList(reviews);

      mockProductFindById.mockResolvedValue(
        createProduct({
          averageRating: 4.5,
          totalReviews: 2,
        })
      );

      const response = await request(app)
        .get("/reviews/product123")
        .expect(200);

      expect(
        response.body.reviews
      ).toHaveLength(2);

      expect(
        response.body.reviews[0]
      ).toMatchObject({
        _id: "review123",
        product: "product123",
        rating: 5,
        comment: "Excellent product",
      });

      expect(
        response.body.reviews[1]
      ).toMatchObject({
        _id: "review456",
        product: "product123",
        rating: 4,
        comment: "Very good",
      });

      expect(
        response.body.averageRating
      ).toBe(4.5);

      expect(
        response.body.totalReviews
      ).toBe(2);
    });

    test("should query reviews using product ID", async () => {
      mockReviewList([]);

      await request(app)
        .get("/reviews/product456")
        .expect(200);

      expect(
        mockReviewFind
      ).toHaveBeenCalledWith({
        product: "product456",
      });
    });

    test("should sort reviews by newest first", async () => {
      const { sort } =
        mockReviewList([]);

      await request(app)
        .get("/reviews/product123")
        .expect(200);

      expect(sort).toHaveBeenCalledWith({
        createdAt: -1,
      });
    });

    test("should limit reviews to 20", async () => {
      const { limit } =
        mockReviewList([]);

      await request(app)
        .get("/reviews/product123")
        .expect(200);

      expect(limit).toHaveBeenCalledWith(
        20
      );
    });

    test("should return zero values when product has no rating data", async () => {
      mockReviewList([]);

      mockProductFindById.mockResolvedValue({
        _id: "product123",
      });

      const response = await request(app)
        .get("/reviews/product123")
        .expect(200);

      expect(response.body).toEqual({
        reviews: [],
        averageRating: 0,
        totalReviews: 0,
      });
    });

    test("should handle database errors", async () => {
      mockReviewFind.mockImplementation(
        () => {
          throw new Error(
            "Failed to load reviews"
          );
        }
      );

      const response = await request(app)
        .get("/reviews/product123")
        .expect(500);

      expect(response.body).toEqual({
        message:
          "Failed to load reviews",
      });
    });
  });

  // ====================================================
  // GUEST ELIGIBILITY
  // ====================================================

  describe(
    "GET /reviews/:productId/eligibility",
    () => {
      beforeEach(() => {
        setGuestAuth();
      });

      test("should require email for guest users", async () => {
        const response = await request(app)
          .get(
            "/reviews/product123/eligibility"
          )
          .expect(200);

        expect(response.body).toEqual({
          eligible: false,
          reason: "email_required",
        });
      });

      test("should reject invalid guest email without @", async () => {
        const response = await request(app)
          .get(
            "/reviews/product123/eligibility"
          )
          .query({
            email: "invalid-email",
          })
          .expect(200);

        expect(response.body).toEqual({
          eligible: false,
          reason: "email_required",
        });
      });

      test("should return eligible for guest with delivered purchase", async () => {
        mockReviewExists.mockResolvedValue(
          false
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        const response = await request(app)
          .get(
            "/reviews/product123/eligibility"
          )
          .query({
            email:
              "guest@example.com",
          })
          .expect(200);

        expect(response.body).toEqual({
          eligible: true,
          reason: null,
        });
      });

      test("should normalize guest email", async () => {
        mockReviewExists.mockResolvedValue(
          false
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        await request(app)
          .get(
            "/reviews/product123/eligibility"
          )
          .query({
            email:
              "  Guest@Example.COM  ",
          })
          .expect(200);

        expect(
          mockReviewExists
        ).toHaveBeenCalledWith({
          product: "product123",
          guestEmail:
            "guest@example.com",
        });
      });

      test("should return already_reviewed for guest", async () => {
        mockReviewExists.mockResolvedValue(
          true
        );

        const response = await request(app)
          .get(
            "/reviews/product123/eligibility"
          )
          .query({
            email:
              "guest@example.com",
          })
          .expect(200);

        expect(response.body).toEqual({
          eligible: false,
          reason: "already_reviewed",
        });

        expect(
          mockOrderExists
        ).not.toHaveBeenCalled();
      });

      test("should return not_purchased for guest without delivered order", async () => {
        mockReviewExists.mockResolvedValue(
          false
        );

        mockOrderExists.mockResolvedValue(
          false
        );

        const response = await request(app)
          .get(
            "/reviews/product123/eligibility"
          )
          .query({
            email:
              "guest@example.com",
          })
          .expect(200);

        expect(response.body).toEqual({
          eligible: false,
          reason: "not_purchased",
        });
      });
    }
  );

  // ====================================================
  // AUTHENTICATED ELIGIBILITY
  // ====================================================

  describe(
    "GET /reviews/:productId/eligibility - authenticated",
    () => {
      beforeEach(() => {
        setAuthenticatedUser();
      });

      test("should return eligible for logged-in user with delivered purchase", async () => {
        mockReviewExists.mockResolvedValue(
          false
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        const response = await request(app)
          .get(
            "/reviews/product123/eligibility"
          )
          .expect(200);

        expect(response.body).toEqual({
          eligible: true,
          reason: null,
        });
      });

      test("should check existing review for logged-in user", async () => {
        mockReviewExists.mockResolvedValue(
          false
        );

        await request(app)
          .get(
            "/reviews/product456/eligibility"
          )
          .expect(200);

        expect(
          mockReviewExists
        ).toHaveBeenCalledWith({
          product: "product456",
          user: "user123",
        });
      });

      test("should return already_reviewed for logged-in user", async () => {
        mockReviewExists.mockResolvedValue(
          true
        );

        const response = await request(app)
          .get(
            "/reviews/product123/eligibility"
          )
          .expect(200);

        expect(response.body).toEqual({
          eligible: false,
          reason: "already_reviewed",
        });

        expect(
          mockOrderExists
        ).not.toHaveBeenCalled();
      });

      test("should return not_purchased for logged-in user", async () => {
        mockReviewExists.mockResolvedValue(
          false
        );

        mockOrderExists.mockResolvedValue(
          false
        );

        const response = await request(app)
          .get(
            "/reviews/product123/eligibility"
          )
          .expect(200);

        expect(response.body).toEqual({
          eligible: false,
          reason: "not_purchased",
        });
      });
    }
  );

  // ====================================================
  // GUEST POST REVIEW
  // ====================================================

  describe(
    "POST /reviews/:productId - guest",
    () => {
      beforeEach(() => {
        setGuestAuth();
      });

      test("should create a guest review", async () => {
        const product =
          createProduct();

        mockProductFindById.mockResolvedValue(
          product
        );

        mockReviewFindOne.mockResolvedValue(
          null
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        const review =
          createReview({
            user: null,
            guestName: "Guest User",
            guestEmail:
              "guest@example.com",
            userName: "Guest User",
            rating: 5,
            comment:
              "Beautiful necklace!",
          });

        mockReviewCreate.mockResolvedValue(
          review
        );

        mockReviewsForAverage([
          {
            rating: 5,
          },
          {
            rating: 4,
          },
          {
            rating: 5,
          },
        ]);

        const response = await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment:
              "Beautiful necklace!",
            guestName: "Guest User",
            guestEmail:
              "guest@example.com",
          })
          .expect(201);

        expect(
          mockReviewCreate
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            product: "product123",
            user: null,
            guestName: "Guest User",
            guestEmail:
              "guest@example.com",
            userName: "Guest User",
            rating: 5,
            comment:
              "Beautiful necklace!",
          })
        );

        expect(
          response.body.message
        ).toBe(
          "Review submitted successfully!"
        );

        expect(
          response.body.averageRating
        ).toBeCloseTo(14 / 3);

        expect(
          response.body.totalReviews
        ).toBe(3);
      });

      test("should require guest name", async () => {
        const response = await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment: "Great product",
            guestEmail:
              "guest@example.com",
          })
          .expect(400);

        expect(response.body).toEqual({
          message:
            "Guest name and email are required.",
        });

        expect(
          mockReviewCreate
        ).not.toHaveBeenCalled();
      });

      test("should require guest email", async () => {
        const response = await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment: "Great product",
            guestName: "Guest",
          })
          .expect(400);

        expect(response.body).toEqual({
          message:
            "Guest name and email are required.",
        });

        expect(
          mockReviewCreate
        ).not.toHaveBeenCalled();
      });

      test("should reject invalid guest email", async () => {
        const response = await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment: "Great product",
            guestName: "Guest",
            guestEmail:
              "invalid@email",
          })
          .expect(400);

        expect(response.body).toEqual({
          message:
            "Please enter a valid email address.",
        });

        expect(
          mockReviewCreate
        ).not.toHaveBeenCalled();
      });

      test("should normalize guest email", async () => {
        mockProductFindById.mockResolvedValue(
          createProduct()
        );

        mockReviewFindOne.mockResolvedValue(
          null
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        mockReviewCreate.mockResolvedValue(
          createReview({
            user: null,
            guestName:
              "Guest User",
            guestEmail:
              "guest@example.com",
          })
        );

        mockReviewsForAverage([
          {
            rating: 5,
          },
        ]);

        await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment: "Great!",
            guestName:
              " Guest User ",
            guestEmail:
              " Guest@Example.COM ",
          })
          .expect(201);

        expect(
          mockReviewFindOne
        ).toHaveBeenCalledWith({
          product: "product123",
          guestEmail:
            "guest@example.com",
        });

        expect(
          mockReviewCreate
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            guestName:
              "Guest User",
            guestEmail:
              "guest@example.com",
          })
        );
      });

      test("should reject guest who has not received product", async () => {
        mockOrderExists.mockResolvedValue(
          false
        );

        const response = await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment: "Great product",
            guestName:
              "Guest User",
            guestEmail:
              "guest@example.com",
          })
          .expect(403);

        expect(response.body).toEqual({
          message:
            "Only customers who have received this product can leave a review.",
        });

        expect(
          mockReviewCreate
        ).not.toHaveBeenCalled();
      });

      test("should reject guest who already reviewed", async () => {
        mockReviewFindOne.mockResolvedValue(
          createReview({
            user: null,
            guestEmail:
              "guest@example.com",
          })
        );

        const response = await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment:
              "Another review",
            guestName: "Guest User",
            guestEmail:
              "guest@example.com",
          })
          .expect(400);

        // IMPORTANT:
        // Guest branch returns this exact message.
        expect(response.body).toEqual({
          message:
            "You have already reviewed this product with this email.",
        });

        expect(
          mockOrderExists
        ).not.toHaveBeenCalled();

        expect(
          mockReviewCreate
        ).not.toHaveBeenCalled();
      });
    }
  );

  // ====================================================
  // AUTHENTICATED POST REVIEW
  // ====================================================

  describe(
    "POST /reviews/:productId - authenticated",
    () => {
      beforeEach(() => {
        setAuthenticatedUser();
      });

      test("should create review for logged-in user", async () => {
        mockProductFindById.mockResolvedValue(
          createProduct()
        );

        mockReviewFindOne.mockResolvedValue(
          null
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        mockReviewCreate.mockResolvedValue(
          createReview({
            user: "user123",
            userName: "Test User",
            guestName: null,
            guestEmail: null,
            rating: 5,
            comment: "Excellent!",
          })
        );

        mockReviewsForAverage([
          {
            rating: 5,
          },
        ]);

        const response = await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment: "Excellent!",
          })
          .expect(201);

        expect(
          mockReviewCreate
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            product: "product123",
            user: "user123",
            userName: "Test User",
            guestName: null,
            guestEmail: null,
            rating: 5,
            comment: "Excellent!",
          })
        );

        expect(
          response.body.message
        ).toBe(
          "Review submitted successfully!"
        );
      });

      test("should use User as fallback name", async () => {
        setAuthenticatedUser({
          _id: "user123",
          name: undefined,
        });

        mockProductFindById.mockResolvedValue(
          createProduct()
        );

        mockReviewFindOne.mockResolvedValue(
          null
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        mockReviewCreate.mockResolvedValue(
          createReview({
            userName: "User",
          })
        );

        mockReviewsForAverage([
          {
            rating: 5,
          },
        ]);

        await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment:
              "Great product",
          })
          .expect(201);

        expect(
          mockReviewCreate
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userName: "User",
          })
        );
      });

      test("should reject logged-in user who already reviewed", async () => {
        mockReviewFindOne.mockResolvedValue(
          createReview({
            user: "user123",
          })
        );

        const response = await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment:
              "Another review",
          })
          .expect(400);

        expect(response.body).toEqual({
          message:
            "You have already reviewed this product.",
        });

        expect(
          mockOrderExists
        ).not.toHaveBeenCalled();

        expect(
          mockReviewCreate
        ).not.toHaveBeenCalled();
      });

      test("should reject logged-in user without delivered purchase", async () => {
        mockReviewFindOne.mockResolvedValue(
          null
        );

        mockOrderExists.mockResolvedValue(
          false
        );

        const response = await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment:
              "Great product",
          })
          .expect(403);

        expect(response.body).toEqual({
          message:
            "Only customers who have received this product can leave a review.",
        });

        expect(
          mockReviewCreate
        ).not.toHaveBeenCalled();
      });
    }
  );

  // ====================================================
  // INPUT VALIDATION
  // ====================================================

  describe("Review validation", () => {
    beforeEach(() => {
      setGuestAuth();
    });

    test("should reject missing rating", async () => {
      const response = await request(app)
        .post(
          "/reviews/product123"
        )
        .send({
          comment: "Great product",
          guestName: "Guest",
          guestEmail:
            "guest@example.com",
        })
        .expect(400);

      expect(response.body).toEqual({
        message:
          "Rating and comment are required.",
      });
    });

    test("should reject missing comment", async () => {
      const response = await request(app)
        .post(
          "/reviews/product123"
        )
        .send({
          rating: 5,
          guestName: "Guest",
          guestEmail:
            "guest@example.com",
        })
        .expect(400);

      expect(response.body).toEqual({
        message:
          "Rating and comment are required.",
      });
    });

    test("should reject rating below 1", async () => {
      const response = await request(app)
        .post(
          "/reviews/product123"
        )
        .send({
          rating: 0,
          comment: "Bad",
          guestName: "Guest",
          guestEmail:
            "guest@example.com",
        })
        .expect(400);

      expect(response.body).toEqual({
        message:
          "Rating and comment are required.",
      });
    });

    test("should reject rating above 5", async () => {
      const response = await request(app)
        .post(
          "/reviews/product123"
        )
        .send({
          rating: 6,
          comment: "Excellent",
          guestName: "Guest",
          guestEmail:
            "guest@example.com",
        })
        .expect(400);

      expect(response.body).toEqual({
        message:
          "Rating must be between 1 and 5.",
      });
    });

    test("should reject non-existing product", async () => {
      mockProductFindById.mockResolvedValue(
        null
      );

      const response = await request(app)
        .post(
          "/reviews/nonexistent"
        )
        .send({
          rating: 5,
          comment: "Great product",
          guestName: "Guest",
          guestEmail:
            "guest@example.com",
        })
        .expect(404);

      expect(response.body).toEqual({
        message: "Product not found.",
      });

      expect(
        mockReviewCreate
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // REVIEW CREATION / RATING
  // ====================================================

  describe(
    "Review creation and rating calculation",
    () => {
      beforeEach(() => {
        setGuestAuth();
      });

      test("should trim review comment", async () => {
        mockProductFindById.mockResolvedValue(
          createProduct()
        );

        mockReviewFindOne.mockResolvedValue(
          null
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        mockReviewCreate.mockResolvedValue(
          createReview({
            comment:
              "Beautiful product",
          })
        );

        mockReviewsForAverage([
          {
            rating: 5,
          },
        ]);

        await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment:
              "   Beautiful product   ",
            guestName: "Guest",
            guestEmail:
              "guest@example.com",
          })
          .expect(201);

        expect(
          mockReviewCreate
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            comment:
              "Beautiful product",
          })
        );
      });

      test("should convert rating to Number", async () => {
        mockProductFindById.mockResolvedValue(
          createProduct()
        );

        mockReviewFindOne.mockResolvedValue(
          null
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        mockReviewCreate.mockResolvedValue(
          createReview({
            rating: 5,
          })
        );

        mockReviewsForAverage([
          {
            rating: 5,
          },
        ]);

        await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: "5",
            comment: "Excellent",
            guestName: "Guest",
            guestEmail:
              "guest@example.com",
          })
          .expect(201);

        expect(
          mockReviewCreate
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            rating: 5,
          })
        );
      });

      test("should update product average rating", async () => {
        const product =
          createProduct();

        mockProductFindById.mockResolvedValue(
          product
        );

        mockReviewFindOne.mockResolvedValue(
          null
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        mockReviewCreate.mockResolvedValue(
          createReview()
        );

        mockReviewsForAverage([
          {
            rating: 5,
          },
          {
            rating: 4,
          },
          {
            rating: 3,
          },
        ]);

        await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment: "Excellent",
            guestName: "Guest",
            guestEmail:
              "guest@example.com",
          })
          .expect(201);

        expect(
          product.averageRating
        ).toBe(4);

        expect(
          product.totalReviews
        ).toBe(3);

        expect(
          product.save
        ).toHaveBeenCalledTimes(1);
      });

      test("should return updated rating information", async () => {
        const product =
          createProduct();

        mockProductFindById.mockResolvedValue(
          product
        );

        mockReviewFindOne.mockResolvedValue(
          null
        );

        mockOrderExists.mockResolvedValue(
          true
        );

        mockReviewCreate.mockResolvedValue(
          createReview()
        );

        mockReviewsForAverage([
          {
            rating: 5,
          },
          {
            rating: 5,
          },
        ]);

        const response = await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment: "Amazing",
            guestName: "Guest",
            guestEmail:
              "guest@example.com",
          })
          .expect(201);

        expect(
          response.body.averageRating
        ).toBe(5);

        expect(
          response.body.totalReviews
        ).toBe(2);
      });
    }
  );

  // ====================================================
  // DELIVERED PURCHASE
  // ====================================================

  describe(
    "Delivered purchase verification",
    () => {
      test("should require delivered order for guest", async () => {
        setGuestAuth();

        mockOrderExists.mockResolvedValue(
          false
        );

        await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment: "Nice",
            guestName: "Guest",
            guestEmail:
              "guest@example.com",
          })
          .expect(403);

        expect(
          mockOrderExists
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "delivered",
            "items.product":
              "product123",
            isGuest: true,
          })
        );
      });

      test("should require delivered order for authenticated user", async () => {
        setAuthenticatedUser();

        mockReviewFindOne.mockResolvedValue(
          null
        );

        mockOrderExists.mockResolvedValue(
          false
        );

        await request(app)
          .post(
            "/reviews/product123"
          )
          .send({
            rating: 5,
            comment: "Nice",
          })
          .expect(403);

        expect(
          mockOrderExists
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "delivered",
            "items.product":
              "product123",
            user: "user123",
          })
        );
      });
    }
  );

  // ====================================================
  // DUPLICATE KEY
  // ====================================================

  describe("Duplicate review handling", () => {
    beforeEach(() => {
      setGuestAuth();
    });

    test("should return 400 for Mongo duplicate key error", async () => {
      mockReviewCreate.mockRejectedValue({
        code: 11000,
      });

      mockProductFindById.mockResolvedValue(
        createProduct()
      );

      mockReviewFindOne.mockResolvedValue(
        null
      );

      mockOrderExists.mockResolvedValue(
        true
      );

      const response = await request(app)
        .post(
          "/reviews/product123"
        )
        .send({
          rating: 5,
          comment: "Excellent",
          guestName: "Guest",
          guestEmail:
            "guest@example.com",
        })
        .expect(400);

      expect(response.body).toEqual({
        message:
          "You have already reviewed this product.",
      });
    });
  });

  // ====================================================
  // INVALID ROUTES
  // ====================================================

  describe("Invalid routes and methods", () => {
    test("should return 404 for PUT /reviews/:productId", async () => {
      await request(app)
        .put("/reviews/product123")
        .send({
          rating: 5,
        })
        .expect(404);
    });

    test("should return 404 for DELETE /reviews/:productId", async () => {
      await request(app)
        .delete("/reviews/product123")
        .expect(404);
    });

    test("should return 404 for POST eligibility route", async () => {
      await request(app)
        .post(
          "/reviews/product123/eligibility"
        )
        .send({})
        .expect(404);
    });

    test("should return 404 for unknown review route", async () => {
      await request(app)
        .get(
          "/reviews/product123/unknown"
        )
        .expect(404);
    });
  });

  // ====================================================
  // ERROR HANDLING
  // ====================================================

  describe("Error handling", () => {
    test("should return 500 when eligibility check fails", async () => {
      setGuestAuth();

      mockReviewExists.mockRejectedValue(
        new Error(
          "Eligibility database error"
        )
      );

      const response = await request(app)
        .get(
          "/reviews/product123/eligibility"
        )
        .query({
          email:
            "guest@example.com",
        })
        .expect(500);

      expect(response.body).toEqual({
        message:
          "Eligibility database error",
      });
    });

    test("should return 500 when product lookup fails", async () => {
      setGuestAuth();

      mockProductFindById.mockRejectedValue(
        new Error(
          "Product database error"
        )
      );

      const response = await request(app)
        .post(
          "/reviews/product123"
        )
        .send({
          rating: 5,
          comment: "Great",
          guestName: "Guest",
          guestEmail:
            "guest@example.com",
        })
        .expect(500);

      expect(response.body).toEqual({
        message:
          "Product database error",
      });
    });

    test("should return 500 when review creation fails", async () => {
      setGuestAuth();

      mockProductFindById.mockResolvedValue(
        createProduct()
      );

      mockReviewFindOne.mockResolvedValue(
        null
      );

      mockOrderExists.mockResolvedValue(
        true
      );

      mockReviewCreate.mockRejectedValue(
        new Error(
          "Review creation failed"
        )
      );

      const response = await request(app)
        .post(
          "/reviews/product123"
        )
        .send({
          rating: 5,
          comment: "Great",
          guestName: "Guest",
          guestEmail:
            "guest@example.com",
        })
        .expect(500);

      expect(response.body).toEqual({
        message:
          "Review creation failed",
      });
    });
  });
});