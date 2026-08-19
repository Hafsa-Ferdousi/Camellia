import {
  describe,
  test,
  expect,
  jest,
} from "@jest/globals";

/* =========================================================
   MOCK MULTER
========================================================= */

let multerConfig;
let storageConfig;

const multerMock = jest.fn((config) => {
  multerConfig = config;

  return {
    single: jest.fn(),
    array: jest.fn(),
    fields: jest.fn(),
    none: jest.fn(),
  };
});

multerMock.diskStorage = jest.fn((config) => {
  storageConfig = config;

  return config;
});

jest.unstable_mockModule("multer", () => ({
  default: multerMock,
}));

/* =========================================================
   IMPORT AFTER MOCK
========================================================= */

const uploadModule =
  await import("../../middleware/upload.js");

const {
  upload,
  uploadDir,
} = uploadModule;

/* =========================================================
   TEST SUITE
========================================================= */

describe("upload middleware", () => {

  /*
   * IMPORTANT:
   *
   * Do NOT use:
   *
   * beforeEach(() => {
   *   jest.clearAllMocks();
   * });
   *
   * multer() and multer.diskStorage() are called when
   * upload.js is imported. clearAllMocks() would erase
   * those calls and make the configuration tests fail.
   */

  /* =======================================================
     EXPORTS
  ======================================================= */

  describe("Exports", () => {

    test("should export upload middleware", () => {
      expect(upload).toBeDefined();
    });

    test("should export uploadDir", () => {
      expect(uploadDir).toBeDefined();
      expect(typeof uploadDir).toBe("string");
    });

    test("upload should provide multer methods", () => {
      expect(typeof upload.single).toBe("function");
      expect(typeof upload.array).toBe("function");
      expect(typeof upload.fields).toBe("function");
      expect(typeof upload.none).toBe("function");
    });

  });

  /* =======================================================
     MULTER CONFIGURATION
  ======================================================= */

  describe("Multer configuration", () => {

    test("should call multer with configuration", () => {
      expect(multerMock).toHaveBeenCalledTimes(1);
      expect(multerConfig).toBeDefined();
    });

    test("should configure disk storage", () => {
      expect(multerMock.diskStorage).toHaveBeenCalledTimes(1);
      expect(storageConfig).toBeDefined();
    });

    test("should configure file size limit to 5 MB", () => {
      expect(multerConfig.limits).toEqual({
        fileSize: 5 * 1024 * 1024,
      });
    });

    test("should configure fileFilter", () => {
      expect(typeof multerConfig.fileFilter).toBe(
        "function"
      );
    });

    test("should configure storage", () => {
      expect(multerConfig.storage).toBeDefined();
    });

  });

  /* =======================================================
     UPLOAD DIRECTORY
  ======================================================= */

  describe("Upload directory", () => {

    test("should point to frontend/public/uploads", () => {
      expect(uploadDir).toContain("frontend");
      expect(uploadDir).toContain("public");
      expect(uploadDir).toContain("uploads");
    });

    test("should use uploads directory as storage destination", () => {
      const cb = jest.fn();

      storageConfig.destination(
        {},
        {
          originalname: "test.jpg",
        },
        cb
      );

      expect(cb).toHaveBeenCalledTimes(1);

      expect(cb.mock.calls[0][0]).toBeNull();

      expect(cb.mock.calls[0][1]).toBe(
        uploadDir
      );
    });

  });

  /* =======================================================
     ALLOWED FILE TYPES
  ======================================================= */

  describe("Allowed image types", () => {

    test("should accept JPG", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "image.jpg",
          mimetype: "image/jpeg",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should accept JPEG", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "image.jpeg",
          mimetype: "image/jpeg",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should accept PNG", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "image.png",
          mimetype: "image/png",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should accept WEBP", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "image.webp",
          mimetype: "image/webp",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should accept GIF", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "image.gif",
          mimetype: "image/gif",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

  });

  /* =======================================================
     CASE INSENSITIVITY
  ======================================================= */

  describe("File extension handling", () => {

    test("should accept uppercase JPG", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "IMAGE.JPG",
          mimetype: "image/jpeg",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should accept uppercase PNG", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "IMAGE.PNG",
          mimetype: "image/png",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should accept uppercase WEBP", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "IMAGE.WEBP",
          mimetype: "image/webp",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should accept uppercase GIF", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "IMAGE.GIF",
          mimetype: "image/gif",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

  });

  /* =======================================================
     INVALID EXTENSIONS
  ======================================================= */

  describe("Invalid extensions", () => {

    test("should reject EXE files", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "malware.exe",
          mimetype: "application/octet-stream",
        },
        cb
      );

      expect(cb).toHaveBeenCalledTimes(1);

      expect(
        cb.mock.calls[0][0]
      ).toBeInstanceOf(Error);

      expect(
        cb.mock.calls[0][0].message
      ).toBe(
        "Only JPG, PNG, WEBP, or GIF images are allowed."
      );
    });

    test("should reject PDF files", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "document.pdf",
          mimetype: "application/pdf",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });

    test("should reject SVG files", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "image.svg",
          mimetype: "image/svg+xml",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });

    test("should reject TXT files", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "file.txt",
          mimetype: "text/plain",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });

  });

  /* =======================================================
     MIME TYPE VALIDATION
  ======================================================= */

  describe("MIME type validation", () => {

    /*
     * Your current upload.js accepts files according to the
     * extension. Therefore these mismatched MIME cases return
     * (null, true) instead of an Error.
     */

    test("should accept JPG extension with PNG MIME type", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "image.jpg",
          mimetype: "image/png",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should accept PNG extension with JPEG MIME type", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "image.png",
          mimetype: "image/jpeg",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should accept WEBP extension with JPEG MIME type", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "image.webp",
          mimetype: "image/jpeg",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should accept GIF extension with PNG MIME type", () => {
      const cb = jest.fn();

      multerConfig.fileFilter(
        {},
        {
          originalname: "image.gif",
          mimetype: "image/png",
        },
        cb
      );

      expect(cb).toHaveBeenCalledWith(
        null,
        true
      );
    });

    test("should reject valid extension with invalid MIME type", () => {
  const cb = jest.fn();

  multerConfig.fileFilter(
    {},
    {
      originalname: "image.jpg",
      mimetype: "application/pdf",
    },
    cb
  );

  expect(cb).toHaveBeenCalledWith(
    expect.any(Error)
  );

  expect(cb.mock.calls[0][0].message).toBe(
    "Only JPG, PNG, WEBP, or GIF images are allowed."
  );
});

  });

  /* =======================================================
     FILENAME GENERATION
  ======================================================= */

  describe("Filename generation", () => {

    test("should generate filename for JPG", () => {
      const cb = jest.fn();

      storageConfig.filename(
        {},
        {
          originalname: "product.jpg",
        },
        cb
      );

      expect(cb).toHaveBeenCalledTimes(1);

      expect(
        cb.mock.calls[0][0]
      ).toBeNull();

      const filename =
        cb.mock.calls[0][1];

      expect(filename).toMatch(
        /^\d+-[a-f0-9]{16}\.jpg$/
      );
    });

    test("should generate filename for PNG", () => {
      const cb = jest.fn();

      storageConfig.filename(
        {},
        {
          originalname: "product.png",
        },
        cb
      );

      expect(cb).toHaveBeenCalledTimes(1);

      expect(
        cb.mock.calls[0][0]
      ).toBeNull();

      const filename =
        cb.mock.calls[0][1];

      expect(filename).toMatch(
        /^\d+-[a-f0-9]{16}\.png$/
      );
    });

    test("should generate filename for WEBP", () => {
      const cb = jest.fn();

      storageConfig.filename(
        {},
        {
          originalname: "product.webp",
        },
        cb
      );

      expect(cb).toHaveBeenCalledTimes(1);

      expect(
        cb.mock.calls[0][0]
      ).toBeNull();

      const filename =
        cb.mock.calls[0][1];

      expect(filename).toMatch(
        /^\d+-[a-f0-9]{16}\.webp$/
      );
    });

    test("should generate filename for GIF", () => {
      const cb = jest.fn();

      storageConfig.filename(
        {},
        {
          originalname: "product.gif",
        },
        cb
      );

      expect(cb).toHaveBeenCalledTimes(1);

      expect(
        cb.mock.calls[0][0]
      ).toBeNull();

      const filename =
        cb.mock.calls[0][1];

      expect(filename).toMatch(
        /^\d+-[a-f0-9]{16}\.gif$/
      );
    });

    test("should convert uppercase extension to lowercase", () => {
      const cb = jest.fn();

      storageConfig.filename(
        {},
        {
          originalname: "PRODUCT.JPG",
        },
        cb
      );

      expect(cb).toHaveBeenCalledTimes(1);

      const filename =
        cb.mock.calls[0][1];

      expect(filename).toMatch(
        /\.jpg$/
      );
    });

    test("should preserve JPEG extension", () => {
      const cb = jest.fn();

      storageConfig.filename(
        {},
        {
          originalname: "PRODUCT.JPEG",
        },
        cb
      );

      expect(cb).toHaveBeenCalledTimes(1);

      const filename =
        cb.mock.calls[0][1];

      expect(filename).toMatch(
        /\.jpeg$/
      );
    });

    test("should not use the original filename directly", () => {
      const cb = jest.fn();

      storageConfig.filename(
        {},
        {
          originalname: "my-secret-product.jpg",
        },
        cb
      );

      expect(cb).toHaveBeenCalledTimes(1);

      const filename =
        cb.mock.calls[0][1];

      expect(filename).not.toBe(
        "my-secret-product.jpg"
      );
    });

    test("should generate different filenames for repeated uploads", () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();

      storageConfig.filename(
        {},
        {
          originalname: "product.jpg",
        },
        cb1
      );

      storageConfig.filename(
        {},
        {
          originalname: "product.jpg",
        },
        cb2
      );

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);

      const filename1 =
        cb1.mock.calls[0][1];

      const filename2 =
        cb2.mock.calls[0][1];

      expect(filename1).not.toBe(
        filename2
      );
    });

  });

  /* =======================================================
     SIZE LIMIT
  ======================================================= */

  describe("File size limit", () => {

    test("should limit files to exactly 5 MB", () => {
      expect(
        multerConfig.limits.fileSize
      ).toBe(
        5 * 1024 * 1024
      );
    });

    test("should not allow a size limit greater than 5 MB", () => {
      expect(
        multerConfig.limits.fileSize
      ).toBeLessThanOrEqual(
        5 * 1024 * 1024
      );
    });

  });

});