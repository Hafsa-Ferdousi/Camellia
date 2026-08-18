import express from "express";
import request from "supertest";
import path from "path";
import { jest } from "@jest/globals";

// ======================================================
// MOCKS
// ======================================================

const mockProtect = jest.fn((req, res, next) => {
  req.user = {
    _id: "admin123",
    role: "admin",
  };
  next();
});

const mockAdminOnly = jest.fn((req, res, next) => {
  next();
});

const mockUploadSingle = jest.fn();

const mockUnlink = jest.fn();

const uploadDir = path.resolve(
  process.cwd(),
  "test-uploads"
);

// ======================================================
// AUTH MOCK
// ======================================================

jest.unstable_mockModule(
  "../../middleware/authMiddleware.js",
  () => ({
    protect: mockProtect,
    adminOnly: mockAdminOnly,
  })
);

// ======================================================
// UPLOAD MOCK
// ======================================================

jest.unstable_mockModule(
  "../../middleware/upload.js",
  () => ({
    upload: {
      single: mockUploadSingle,
    },
    uploadDir,
  })
);

// ======================================================
// FS MOCK
// ======================================================

jest.unstable_mockModule("fs", () => ({
  default: {
    unlink: mockUnlink,
  },
}));

// ======================================================
// IMPORT ROUTER AFTER MOCKS
// ======================================================

const { default: uploadRouter } =
  await import("../../routes/uploadRoutes.js");

// ======================================================
// APP
// ======================================================

const app = express();

app.use(express.json());

app.use("/upload", uploadRouter);

// ======================================================
// BEFORE EACH
// ======================================================

beforeEach(() => {
  jest.clearAllMocks();

  // ------------------------------
  // Authentication
  // ------------------------------

  mockProtect.mockImplementation(
    (req, res, next) => {
      req.user = {
        _id: "admin123",
        role: "admin",
      };

      next();
    }
  );

  mockAdminOnly.mockImplementation(
    (req, res, next) => {
      next();
    }
  );

  // ------------------------------
  // Default upload behavior
  // ------------------------------

  mockUploadSingle.mockImplementation(
    () => (req, res, next) => {
      req.file = {
        filename: "product-123.png",
      };

      next();
    }
  );

  // ------------------------------
  // Default unlink behavior
  // ------------------------------

  mockUnlink.mockImplementation(
    (filePath, callback) => {
      callback(null);
    }
  );
});

// ======================================================
// TESTS
// ======================================================

describe("Upload Routes", () => {
  // ====================================================
  // 1. SUCCESSFUL UPLOAD
  // ====================================================

  test("should upload an image successfully", async () => {
    const response = await request(app)
      .post("/upload")
      .attach(
        "image",
        Buffer.from("fake image"),
        "product.png"
      )
      .expect(201);

    expect(response.body).toEqual({
      url: "/uploads/product-123.png",
    });

    expect(
      mockProtect
    ).toHaveBeenCalled();

    expect(
      mockAdminOnly
    ).toHaveBeenCalled();

    expect(
      mockUploadSingle
    ).toHaveBeenCalledWith("image");
  });

  // ====================================================
  // 2. NO FILE
  // ====================================================

  test("should return 400 when no file is uploaded", async () => {
    mockUploadSingle.mockImplementation(
      () => (req, res, next) => {
        req.file = undefined;

        next();
      }
    );

    const response = await request(app)
      .post("/upload")
      .expect(400);

    expect(response.body).toEqual({
      message: "No file uploaded.",
    });
  });

  // ====================================================
  // 3. UPLOAD ERROR
  // ====================================================

  test("should return 400 when upload middleware fails", async () => {
    mockUploadSingle.mockImplementation(
      () => (req, res, next) => {
        next(
          new Error("Invalid image file")
        );
      }
    );

    const response = await request(app)
      .post("/upload")
      .attach(
        "image",
        Buffer.from("bad file"),
        "file.txt"
      )
      .expect(400);

    expect(response.body).toEqual({
      message: "Invalid image file",
    });
  });

  // ====================================================
  // 4. INVALID DELETE URL
  // ====================================================

  test("should reject DELETE with invalid image URL", async () => {
    const response = await request(app)
      .delete("/upload")
      .send({
        url: "/invalid/image.png",
      })
      .expect(400);

    expect(response.body).toEqual({
      message: "Invalid image url.",
    });

    expect(
      mockUnlink
    ).not.toHaveBeenCalled();
  });

  // ====================================================
  // 5. SUCCESSFUL DELETE
  // ====================================================

  test("should delete an uploaded image successfully", async () => {
    const response = await request(app)
      .delete("/upload")
      .send({
        url: "/uploads/product-123.png",
      })
      .expect(200);

    expect(response.body).toEqual({
      message: "Image deleted.",
    });

    expect(
      mockUnlink
    ).toHaveBeenCalledTimes(1);

    expect(
      mockUnlink
    ).toHaveBeenCalledWith(
      path.join(
        uploadDir,
        "product-123.png"
      ),
      expect.any(Function)
    );
  });

  // ====================================================
  // 6. DELETE ERROR
  // ====================================================

  test("should return 500 when image deletion fails", async () => {
    mockUnlink.mockImplementation(
      (filePath, callback) => {
        const error = new Error(
          "Delete failed"
        );

        error.code = "EACCES";

        callback(error);
      }
    );

    const response = await request(app)
      .delete("/upload")
      .send({
        url: "/uploads/product-123.png",
      })
      .expect(500);

    expect(response.body).toEqual({
      message:
        "Failed to delete image.",
    });

    expect(
      mockUnlink
    ).toHaveBeenCalledTimes(1);
  });
});