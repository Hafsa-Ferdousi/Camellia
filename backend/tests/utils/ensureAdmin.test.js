import { jest } from "@jest/globals";

// ============================================================
// MOCK USER MODEL
// ============================================================

jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));


// ============================================================
// MOCK BCRYPT
// ============================================================

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    hash: jest.fn(),
  },
}));


// ============================================================
// MOCK SECURITY QUESTIONS
// ============================================================

jest.unstable_mockModule("../../utils/securityQuestions.js", () => ({
  normalizeAnswer: jest.fn(),
}));


// ============================================================
// IMPORT MOCKS
// ============================================================

const { default: User } = await import("../../models/User.js");

const { default: bcrypt } = await import("bcryptjs");

const { normalizeAnswer } = await import(
  "../../utils/securityQuestions.js"
);


// ============================================================
// IMPORT MODULE UNDER TEST
//
// IMPORTANT:
// If your actual file is NOT utils/ensureAdmin.js,
// change this path.
// ============================================================

const { ensureAdminUser } = await import(
  "../../utils/ensureAdmin.js"
);


// ============================================================
// TEST SUITE
// ============================================================

describe("ensureAdminUser", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env = {
      ...originalEnv,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });


  // ============================================================
  // TEST 1
  // ADMIN ALREADY EXISTS
  // ============================================================

  test("should do nothing when an admin already exists", async () => {
    const existingAdmin = {
      _id: "admin123",
      email: "admin@example.com",
      role: "admin",
    };

    User.findOne.mockResolvedValue(existingAdmin);

    await ensureAdminUser();

    expect(User.findOne).toHaveBeenCalledTimes(1);

    expect(User.findOne).toHaveBeenCalledWith({
      role: "admin",
    });

    expect(User.create).not.toHaveBeenCalled();

    expect(bcrypt.hash).not.toHaveBeenCalled();

    expect(normalizeAnswer).not.toHaveBeenCalled();
  });


  // ============================================================
  // TEST 2
  // NO ADMIN + MISSING ENVIRONMENT VARIABLES
  // ============================================================

  test("should skip bootstrap when required environment variables are missing", async () => {
    User.findOne.mockResolvedValue(null);

    process.env.ADMIN_EMAIL = "";
    process.env.ADMIN_PASSWORD = "";
    process.env.ADMIN_SECURITY_QUESTION = "";
    process.env.ADMIN_SECURITY_ANSWER = "";

    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    await ensureAdminUser();

    expect(User.findOne).toHaveBeenCalledTimes(1);

    expect(User.findOne).toHaveBeenCalledWith({
      role: "admin",
    });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "No admin account exists yet"
      )
    );

    expect(bcrypt.hash).not.toHaveBeenCalled();

    expect(normalizeAnswer).not.toHaveBeenCalled();

    expect(User.create).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });


  // ============================================================
  // TEST 3
  // NO ADMIN + ALL ENVIRONMENT VARIABLES PRESENT
  // ============================================================

  test("should create admin when no admin exists and environment variables are configured", async () => {
    User.findOne.mockResolvedValue(null);

    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "SuperSecret123!";
    process.env.ADMIN_USERNAME = "mainadmin";
    process.env.ADMIN_NAME = "Main Admin";
    process.env.ADMIN_PHONE = "01700000000";
    process.env.ADMIN_SECURITY_QUESTION =
      "What is your favorite color?";
    process.env.ADMIN_SECURITY_ANSWER = " Blue ";


    // normalizeAnswer mock
    normalizeAnswer.mockReturnValue("blue");


    // bcrypt mock
    bcrypt.hash.mockResolvedValue(
      "hashed-security-answer"
    );


    // User.create mock
    User.create.mockResolvedValue({
      _id: "admin123",
      username: "mainadmin",
      name: "Main Admin",
      email: "admin@example.com",
      role: "admin",
    });


    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});


    await ensureAdminUser();


    // ========================================================
    // VERIFY FIND
    // ========================================================

    expect(User.findOne).toHaveBeenCalledTimes(1);

    expect(User.findOne).toHaveBeenCalledWith({
      role: "admin",
    });


    // ========================================================
    // VERIFY NORMALIZATION
    // ========================================================

    expect(normalizeAnswer).toHaveBeenCalledTimes(1);

    expect(normalizeAnswer).toHaveBeenCalledWith(
      " Blue "
    );


    // ========================================================
    // VERIFY HASH
    // ========================================================

    expect(bcrypt.hash).toHaveBeenCalledTimes(1);

    expect(bcrypt.hash).toHaveBeenCalledWith(
      "blue",
      10
    );


    // ========================================================
    // VERIFY ADMIN CREATION
    // ========================================================

    expect(User.create).toHaveBeenCalledTimes(1);

    expect(User.create).toHaveBeenCalledWith({
      username: "mainadmin",
      name: "Main Admin",
      email: "admin@example.com",
      password: "SuperSecret123!",
      role: "admin",
      phone: "01700000000",
      securityQuestion:
        "What is your favorite color?",
      securityAnswerHash:
        "hashed-security-answer",
    });


    // ========================================================
    // VERIFY SUCCESS LOG
    // ========================================================

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "✅ Admin account bootstrapped: admin@example.com"
    );


    consoleLogSpy.mockRestore();
  });
});