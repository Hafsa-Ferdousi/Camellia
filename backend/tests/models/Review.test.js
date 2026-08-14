import mongoose from "mongoose";
import Review from "../../models/Review.js";

describe("Review Model Unit Tests", () => {
  // --------------------------------------------------
  // Helper function
  // --------------------------------------------------
  const validReviewData = () => ({
    product: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    userName: "Hafsa",
    rating: 5,
    comment: "Excellent product!",
  });

  // --------------------------------------------------
  // 1. Valid Review
  // --------------------------------------------------
  test("should create a valid review", () => {
    const review = new Review(validReviewData());

    const error = review.validateSync();

    expect(error).toBeUndefined();
    expect(review.userName).toBe("Hafsa");
    expect(review.rating).toBe(5);
    expect(review.comment).toBe("Excellent product!");
  });

  // --------------------------------------------------
  // 2. product is required
  // --------------------------------------------------
  test("should fail when product is missing", () => {
    const data = validReviewData();

    delete data.product;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.product).toBeDefined();
  });

  // --------------------------------------------------
  // 3. user is optional
  // --------------------------------------------------
  test("should allow user to be omitted for guest reviews", () => {
    const data = validReviewData();

    delete data.user;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();
    expect(review.user).toBeNull();
  });

  // --------------------------------------------------
  // 4. user defaults to null
  // --------------------------------------------------
  test("should set user to null by default", () => {
    const data = validReviewData();

    delete data.user;

    const review = new Review(data);

    expect(review.user).toBeNull();
  });

  // --------------------------------------------------
  // 5. guestName is optional
  // --------------------------------------------------
  test("should allow guestName to be omitted", () => {
    const data = validReviewData();

    delete data.guestName;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // 6. guestName can be provided
  // --------------------------------------------------
  test("should accept guestName", () => {
    const data = validReviewData();

    delete data.user;

    data.guestName = "Guest Customer";

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();
    expect(review.guestName).toBe("Guest Customer");
  });

  // --------------------------------------------------
  // 7. guestEmail is optional
  // --------------------------------------------------
  test("should allow guestEmail to be omitted", () => {
    const data = validReviewData();

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // 8. guestEmail can be provided
  // --------------------------------------------------
  test("should accept guestEmail", () => {
    const data = validReviewData();

    delete data.user;

    data.guestName = "Guest User";
    data.guestEmail = "guest@example.com";

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();
    expect(review.guestEmail).toBe("guest@example.com");
  });

  // --------------------------------------------------
  // 9. userName is required
  // --------------------------------------------------
  test("should fail when userName is missing", () => {
    const data = validReviewData();

    delete data.userName;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.userName).toBeDefined();
  });

  // --------------------------------------------------
  // 10. rating is required
  // --------------------------------------------------
  test("should fail when rating is missing", () => {
    const data = validReviewData();

    delete data.rating;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.rating).toBeDefined();
  });

  // --------------------------------------------------
  // 11. comment is required
  // --------------------------------------------------
  test("should fail when comment is missing", () => {
    const data = validReviewData();

    delete data.comment;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.comment).toBeDefined();
  });

  // --------------------------------------------------
  // 12. rating minimum = 1
  // --------------------------------------------------
  test("should fail when rating is less than 1", () => {
    const data = validReviewData();

    data.rating = 0;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.rating).toBeDefined();
  });

  // --------------------------------------------------
  // 13. rating maximum = 5
  // --------------------------------------------------
  test("should fail when rating is greater than 5", () => {
    const data = validReviewData();

    data.rating = 6;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.rating).toBeDefined();
  });

  // --------------------------------------------------
  // 14. rating = 1 is valid
  // --------------------------------------------------
  test("should allow rating of 1", () => {
    const data = validReviewData();

    data.rating = 1;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // 15. rating = 5 is valid
  // --------------------------------------------------
  test("should allow rating of 5", () => {
    const data = validReviewData();

    data.rating = 5;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // 16. comment trim
  // --------------------------------------------------
  test("should trim whitespace from comment", () => {
    const data = validReviewData();

    data.comment = "   Great product!   ";

    const review = new Review(data);

    expect(review.comment).toBe("Great product!");
  });

  // --------------------------------------------------
  // 17. comment can contain normal text
  // --------------------------------------------------
  test("should accept a normal comment", () => {
    const data = validReviewData();

    data.comment = "The product quality is very good.";

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();
    expect(review.comment).toBe(
      "The product quality is very good."
    );
  });

  // --------------------------------------------------
  // 18. Valid product ObjectId
  // --------------------------------------------------
  test("should accept a valid product ObjectId", () => {
    const productId = new mongoose.Types.ObjectId();

    const data = validReviewData();

    data.product = productId;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();

    expect(review.product.toString()).toBe(
      productId.toString()
    );
  });

  // --------------------------------------------------
  // 19. Invalid product ObjectId
  // --------------------------------------------------
  test("should fail when product is an invalid ObjectId", () => {
    const data = validReviewData();

    data.product = "invalid-product-id";

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.product).toBeDefined();
  });

  // --------------------------------------------------
  // 20. Valid user ObjectId
  // --------------------------------------------------
  test("should accept a valid user ObjectId", () => {
    const userId = new mongoose.Types.ObjectId();

    const data = validReviewData();

    data.user = userId;

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();

    expect(review.user.toString()).toBe(
      userId.toString()
    );
  });

  // --------------------------------------------------
  // 21. Invalid user ObjectId
  // --------------------------------------------------
  test("should fail when user is an invalid ObjectId", () => {
    const data = validReviewData();

    data.user = "invalid-user-id";

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.user).toBeDefined();
  });

  // --------------------------------------------------
  // 22. Guest review without user
  // --------------------------------------------------
  test("should create a valid guest review without user", () => {
    const data = {
      product: new mongoose.Types.ObjectId(),
      user: null,
      guestName: "Guest Customer",
      guestEmail: "guest@example.com",
      userName: "Guest Customer",
      rating: 4,
      comment: "Good product.",
    };

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();
    expect(review.user).toBeNull();
    expect(review.guestName).toBe("Guest Customer");
    expect(review.guestEmail).toBe("guest@example.com");
  });

  // --------------------------------------------------
  // 23. Logged-in user review
  // --------------------------------------------------
  test("should create a valid logged-in user review", () => {
    const data = {
      product: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      userName: "Registered User",
      rating: 5,
      comment: "Amazing product!",
    };

    const review = new Review(data);
    const error = review.validateSync();

    expect(error).toBeUndefined();
    expect(review.user).toBeDefined();
    expect(review.userName).toBe("Registered User");
  });

  // --------------------------------------------------
  // 24. Default guestName
  // --------------------------------------------------
  test("should set guestName to null by default", () => {
    const review = new Review(validReviewData());

    expect(review.guestName).toBeNull();
  });

  // --------------------------------------------------
  // 25. Default guestEmail
  // --------------------------------------------------
  test("should set guestEmail to null by default", () => {
    const review = new Review(validReviewData());

    expect(review.guestEmail).toBeNull();
  });

  // --------------------------------------------------
  // 26. Product reference
  // --------------------------------------------------
  test("should reference Product model", () => {
    const productPath = Review.schema.path("product");

    expect(productPath.options.ref).toBe("Product");
  });

  // --------------------------------------------------
  // 27. User reference
  // --------------------------------------------------
  test("should reference User model", () => {
    const userPath = Review.schema.path("user");

    expect(userPath.options.ref).toBe("User");
  });

  // --------------------------------------------------
  // 28. Required fields
  // --------------------------------------------------
  test("should have the correct required fields", () => {
    const schema = Review.schema;

    expect(schema.path("product").isRequired).toBe(true);
    expect(schema.path("user").isRequired).toBe(false);
    expect(schema.path("userName").isRequired).toBe(true);
    expect(schema.path("rating").isRequired).toBe(true);
    expect(schema.path("comment").isRequired).toBe(true);
  });

  // --------------------------------------------------
  // 29. Rating min and max
  // --------------------------------------------------
  test("should have rating min 1 and max 5", () => {
    const ratingPath = Review.schema.path("rating");

    expect(ratingPath.options.min).toBe(1);
    expect(ratingPath.options.max).toBe(5);
  });

  // --------------------------------------------------
  // 30. Timestamps
  // --------------------------------------------------
  test("should have createdAt and updatedAt timestamps", () => {
    expect(Review.schema.path("createdAt")).toBeDefined();
    expect(Review.schema.path("updatedAt")).toBeDefined();
  });

  // --------------------------------------------------
  // 31. Product + User unique index
  // --------------------------------------------------
  test("should have unique sparse index for product and user", () => {
    const indexes = Review.schema.indexes();

    const index = indexes.find(([fields, options]) => {
      return (
        fields.product === 1 &&
        fields.user === 1 &&
        options.unique === true &&
        options.sparse === true
      );
    });

    expect(index).toBeDefined();
  });

  // --------------------------------------------------
  // 32. Product + Guest Email unique index
  // --------------------------------------------------
  test("should have unique sparse index for product and guestEmail", () => {
    const indexes = Review.schema.indexes();

    const index = indexes.find(([fields, options]) => {
      return (
        fields.product === 1 &&
        fields.guestEmail === 1 &&
        options.unique === true &&
        options.sparse === true
      );
    });

    expect(index).toBeDefined();
  });

  // --------------------------------------------------
  // 33. Model name
  // --------------------------------------------------
  test("should use Review as the model name", () => {
    expect(Review.modelName).toBe("Review");
  });

  // --------------------------------------------------
  // 34. Schema should contain all expected fields
  // --------------------------------------------------
  test("should contain all expected fields", () => {
    const schema = Review.schema;

    expect(schema.path("product")).toBeDefined();
    expect(schema.path("user")).toBeDefined();
    expect(schema.path("guestName")).toBeDefined();
    expect(schema.path("guestEmail")).toBeDefined();
    expect(schema.path("userName")).toBeDefined();
    expect(schema.path("rating")).toBeDefined();
    expect(schema.path("comment")).toBeDefined();
    expect(schema.path("createdAt")).toBeDefined();
    expect(schema.path("updatedAt")).toBeDefined();
  });
});