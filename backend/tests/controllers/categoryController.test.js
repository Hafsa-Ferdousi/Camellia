import { describe, test, expect, jest, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../../models/Category.js", () => ({
  default: {
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findById: jest.fn(),
  },
}));

const Category = (await import("../../models/Category.js")).default;

const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = await import("../../controllers/categoryController.js");


const mockResponse = () => {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};


beforeEach(() => {
  jest.clearAllMocks();
});


/* =========================================================
   GET CATEGORIES
========================================================= */

describe("getCategories", () => {

  test("should return all categories sorted by sortOrder", async () => {
    const categories = [
      {
        _id: "cat1",
        name: "Electronics",
        sortOrder: 1,
      },
      {
        _id: "cat2",
        name: "Clothing",
        sortOrder: 2,
      },
    ];

    const sort = jest.fn().mockResolvedValue(categories);

    Category.find.mockReturnValue({
      sort,
    });

    const req = {};
    const res = mockResponse();

    await getCategories(req, res);

    expect(Category.find).toHaveBeenCalled();

    expect(sort).toHaveBeenCalledWith({
      sortOrder: 1,
    });

    expect(res.json).toHaveBeenCalledWith(categories);
  });


  test("should return empty array when no categories exist", async () => {
    const sort = jest.fn().mockResolvedValue([]);

    Category.find.mockReturnValue({
      sort,
    });

    const req = {};
    const res = mockResponse();

    await getCategories(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });


  test("should propagate database error", async () => {
    const sort = jest
      .fn()
      .mockRejectedValue(new Error("Database error"));

    Category.find.mockReturnValue({
      sort,
    });

    const req = {};
    const res = mockResponse();

    await expect(
      getCategories(req, res)
    ).rejects.toThrow("Database error");
  });

});


/* =========================================================
   CREATE CATEGORY
========================================================= */

describe("createCategory", () => {

  test("should create category with allowed fields", async () => {
    const category = {
      _id: "cat123",
      name: "Electronics",
      slug: "electronics",
      isFixed: false,
      sortOrder: 1,
      image: "electronics.jpg",
    };

    Category.create.mockResolvedValue(category);

    const req = {
      body: {
        name: "Electronics",
        slug: "electronics",
        isFixed: false,
        sortOrder: 1,
        image: "electronics.jpg",

        // Should NOT be passed to Category.create
        maliciousField: "should not be included",
      },
    };

    const res = mockResponse();

    await createCategory(req, res);

    expect(Category.create).toHaveBeenCalledWith({
      name: "Electronics",
      slug: "electronics",
      isFixed: false,
      sortOrder: 1,
      image: "electronics.jpg",
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(category);
  });


  test("should only pass allowed fields", async () => {
    const category = {
      _id: "cat123",
      name: "Books",
    };

    Category.create.mockResolvedValue(category);

    const req = {
      body: {
        name: "Books",
        password: "hack",
        admin: true,
        randomField: "test",
      },
    };

    const res = mockResponse();

    await createCategory(req, res);

    expect(Category.create).toHaveBeenCalledWith({
      name: "Books",
    });
  });


  test("should create category with empty allowed fields", async () => {
    const category = {
      _id: "cat123",
    };

    Category.create.mockResolvedValue(category);

    const req = {
      body: {},
    };

    const res = mockResponse();

    await createCategory(req, res);

    expect(Category.create).toHaveBeenCalledWith({});

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(category);
  });


  test("should return 400 when category creation fails", async () => {
    Category.create.mockRejectedValue(
      new Error("Category already exists")
    );

    const req = {
      body: {
        name: "Electronics",
      },
    };

    const res = mockResponse();

    await createCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Category already exists",
    });
  });

});


/* =========================================================
   UPDATE CATEGORY
========================================================= */

describe("updateCategory", () => {

  test("should update category successfully", async () => {
    const category = {
      _id: "cat123",
      name: "Updated Electronics",
      slug: "updated-electronics",
    };

    Category.findByIdAndUpdate.mockResolvedValue(category);

    const req = {
      params: {
        id: "cat123",
      },
      body: {
        name: "Updated Electronics",
        slug: "updated-electronics",

        // Should be ignored
        maliciousField: "hack",
      },
    };

    const res = mockResponse();

    await updateCategory(req, res);

    expect(Category.findByIdAndUpdate).toHaveBeenCalledWith(
      "cat123",
      {
        name: "Updated Electronics",
        slug: "updated-electronics",
      },
      {
        new: true,
        runValidators: true,
      }
    );

    expect(res.json).toHaveBeenCalledWith(category);
  });


  test("should return 404 when category does not exist", async () => {
    Category.findByIdAndUpdate.mockResolvedValue(null);

    const req = {
      params: {
        id: "missing123",
      },
      body: {
        name: "Test",
      },
    };

    const res = mockResponse();

    await updateCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Category not found",
    });
  });


  test("should update only allowed fields", async () => {
    const category = {
      _id: "cat123",
      name: "Books",
    };

    Category.findByIdAndUpdate.mockResolvedValue(category);

    const req = {
      params: {
        id: "cat123",
      },
      body: {
        name: "Books",
        isFixed: true,
        randomField: "not allowed",
        admin: true,
      },
    };

    const res = mockResponse();

    await updateCategory(req, res);

    expect(Category.findByIdAndUpdate).toHaveBeenCalledWith(
      "cat123",
      {
        name: "Books",
        isFixed: true,
      },
      {
        new: true,
        runValidators: true,
      }
    );
  });


  test("should return 400 when update fails", async () => {
    Category.findByIdAndUpdate.mockRejectedValue(
      new Error("Validation failed")
    );

    const req = {
      params: {
        id: "cat123",
      },
      body: {
        name: "",
      },
    };

    const res = mockResponse();

    await updateCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Validation failed",
    });
  });

});


/* =========================================================
   DELETE CATEGORY
========================================================= */

describe("deleteCategory", () => {

  test("should return 404 when category does not exist", async () => {
    Category.findById.mockResolvedValue(null);

    const req = {
      params: {
        id: "missing123",
      },
    };

    const res = mockResponse();

    await deleteCategory(req, res);

    expect(Category.findById).toHaveBeenCalledWith(
      "missing123"
    );

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Category not found",
    });
  });


  test("should not delete fixed category", async () => {
    const category = {
      _id: "cat123",
      name: "Default",
      isFixed: true,
      deleteOne: jest.fn(),
    };

    Category.findById.mockResolvedValue(category);

    const req = {
      params: {
        id: "cat123",
      },
    };

    const res = mockResponse();

    await deleteCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Fixed categories cannot be deleted.",
    });

    expect(category.deleteOne).not.toHaveBeenCalled();
  });


  test("should delete non-fixed category successfully", async () => {
    const category = {
      _id: "cat123",
      name: "Temporary",
      isFixed: false,
      deleteOne: jest.fn().mockResolvedValue(true),
    };

    Category.findById.mockResolvedValue(category);

    const req = {
      params: {
        id: "cat123",
      },
    };

    const res = mockResponse();

    await deleteCategory(req, res);

    expect(category.deleteOne).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      message: "Category deleted",
    });
  });


  test("should delete category when isFixed is undefined", async () => {
    const category = {
      _id: "cat123",
      name: "Temporary",
      deleteOne: jest.fn().mockResolvedValue(true),
    };

    Category.findById.mockResolvedValue(category);

    const req = {
      params: {
        id: "cat123",
      },
    };

    const res = mockResponse();

    await deleteCategory(req, res);

    expect(category.deleteOne).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      message: "Category deleted",
    });
  });


  test("should propagate database error while deleting", async () => {
    Category.findById.mockRejectedValue(
      new Error("Database error")
    );

    const req = {
      params: {
        id: "cat123",
      },
    };

    const res = mockResponse();

    await expect(
      deleteCategory(req, res)
    ).rejects.toThrow("Database error");
  });

});