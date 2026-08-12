import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../../models/User.js";

describe("User Model Unit Tests", () => {
  // --------------------------------------------------
  // Helper function
  // --------------------------------------------------
  const validUserData = () => ({
    username: "testuser",
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
    securityQuestion: "What is your favorite color?",
    securityAnswerHash: "hashed-answer",
  });

  // --------------------------------------------------
  // 1. Valid User
  // --------------------------------------------------
  test("should create a valid user", () => {
    const user = new User(validUserData());

    const error = user.validateSync();

    expect(error).toBeUndefined();
    expect(user.username).toBe("testuser");
    expect(user.name).toBe("Test User");
    expect(user.email).toBe("test@example.com");
    expect(user.password).toBe("Password123!");
  });

  // --------------------------------------------------
  // 2. username is required
  // --------------------------------------------------
  test("should fail when username is missing", () => {
    const data = validUserData();

    delete data.username;

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.username).toBeDefined();
  });

  // --------------------------------------------------
  // 3. name is required
  // --------------------------------------------------
  test("should fail when name is missing", () => {
    const data = validUserData();

    delete data.name;

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
  });

  // --------------------------------------------------
  // 4. email is required
  // --------------------------------------------------
  test("should fail when email is missing", () => {
    const data = validUserData();

    delete data.email;

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
  });

  // --------------------------------------------------
  // 5. password is required
  // --------------------------------------------------
  test("should fail when password is missing", () => {
    const data = validUserData();

    delete data.password;

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.password).toBeDefined();
  });

  // --------------------------------------------------
  // 6. securityQuestion is required
  // --------------------------------------------------
  test("should fail when securityQuestion is missing", () => {
    const data = validUserData();

    delete data.securityQuestion;

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.securityQuestion).toBeDefined();
  });

  // --------------------------------------------------
  // 7. securityAnswerHash is required
  // --------------------------------------------------
  test("should fail when securityAnswerHash is missing", () => {
    const data = validUserData();

    delete data.securityAnswerHash;

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.securityAnswerHash).toBeDefined();
  });

  // --------------------------------------------------
  // 8. Email should be lowercase
  // --------------------------------------------------
  test("should convert email to lowercase", () => {
    const data = validUserData();

    data.email = "TEST@EXAMPLE.COM";

    const user = new User(data);

    expect(user.email).toBe("test@example.com");
  });

  // --------------------------------------------------
  // 9. Default role
  // --------------------------------------------------
  test("should set role to customer by default", () => {
    const user = new User(validUserData());

    expect(user.role).toBe("customer");
  });

  // --------------------------------------------------
  // 10. Admin role
  // --------------------------------------------------
  test("should accept admin role", () => {
    const data = validUserData();

    data.role = "admin";

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeUndefined();
    expect(user.role).toBe("admin");
  });

  // --------------------------------------------------
  // 11. Invalid role
  // --------------------------------------------------
  test("should reject an invalid role", () => {
    const data = validUserData();

    data.role = "manager";

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.role).toBeDefined();
  });

  // --------------------------------------------------
  // 12. Default preferredLanguage
  // --------------------------------------------------
  test("should set preferredLanguage to en by default", () => {
    const user = new User(validUserData());

    expect(user.preferredLanguage).toBe("en");
  });

  // --------------------------------------------------
  // 13. Bangla preferredLanguage
  // --------------------------------------------------
  test("should accept bn as preferredLanguage", () => {
    const data = validUserData();

    data.preferredLanguage = "bn";

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeUndefined();
    expect(user.preferredLanguage).toBe("bn");
  });

  // --------------------------------------------------
  // 14. Invalid preferredLanguage
  // --------------------------------------------------
  test("should reject invalid preferredLanguage", () => {
    const data = validUserData();

    data.preferredLanguage = "fr";

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.preferredLanguage).toBeDefined();
  });

  // --------------------------------------------------
  // 15. Default notificationsEnabled
  // --------------------------------------------------
  test("should enable notifications by default", () => {
    const user = new User(validUserData());

    expect(user.notificationsEnabled).toBe(true);
  });

  // --------------------------------------------------
  // 16. notificationsEnabled can be false
  // --------------------------------------------------
  test("should allow notificationsEnabled to be false", () => {
    const data = validUserData();

    data.notificationsEnabled = false;

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeUndefined();
    expect(user.notificationsEnabled).toBe(false);
  });

  // --------------------------------------------------
  // 17. Default email verification
  // --------------------------------------------------
  test("should set isEmailVerified to true by default", () => {
    const user = new User(validUserData());

    expect(user.isEmailVerified).toBe(true);
  });

  // --------------------------------------------------
  // 18. Email verification can be false
  // --------------------------------------------------
  test("should allow isEmailVerified to be false", () => {
    const data = validUserData();

    data.isEmailVerified = false;

    const user = new User(data);

    expect(user.isEmailVerified).toBe(false);
  });

  // --------------------------------------------------
  // 19. Default loginAttempts
  // --------------------------------------------------
  test("should set loginAttempts to 0 by default", () => {
    const user = new User(validUserData());

    expect(user.loginAttempts).toBe(0);
  });

  // --------------------------------------------------
  // 20. Default twoFactorEnabled
  // --------------------------------------------------
  test("should disable two-factor authentication by default", () => {
    const user = new User(validUserData());

    expect(user.twoFactorEnabled).toBe(false);
  });

  // --------------------------------------------------
  // 21. Two-factor authentication can be enabled
  // --------------------------------------------------
  test("should allow twoFactorEnabled to be true", () => {
    const data = validUserData();

    data.twoFactorEnabled = true;
    data.twoFactorSecret = "test-secret";

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeUndefined();
    expect(user.twoFactorEnabled).toBe(true);
  });

  // --------------------------------------------------
  // 22. Phone is optional
  // --------------------------------------------------
  test("should allow phone to be omitted", () => {
    const user = new User(validUserData());

    const error = user.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // 23. Address
  // --------------------------------------------------
  test("should accept a valid address", () => {
    const data = validUserData();

    data.addresses = [
      {
        label: "Home",
        addressLine: "123 Main Road",
        district: "Dhaka",
        city: "Dhaka",
        phone: "01700000000",
        isDefault: true,
      },
    ];

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeUndefined();

    expect(user.addresses).toHaveLength(1);
    expect(user.addresses[0].label).toBe("Home");
    expect(user.addresses[0].district).toBe("Dhaka");
    expect(user.addresses[0].city).toBe("Dhaka");
  });

  // --------------------------------------------------
  // 24. Address isDefault default
  // --------------------------------------------------
  test("should set address isDefault to false by default", () => {
    const data = validUserData();

    data.addresses = [
      {
        label: "Office",
        addressLine: "456 Office Road",
        district: "Dhaka",
        city: "Dhaka",
        phone: "01800000000",
      },
    ];

    const user = new User(data);

    expect(user.addresses[0].isDefault).toBe(false);
  });

  // --------------------------------------------------
  // 25. Multiple addresses
  // --------------------------------------------------
  test("should accept multiple addresses", () => {
    const data = validUserData();

    data.addresses = [
      {
        label: "Home",
        addressLine: "Home Address",
        district: "Dhaka",
        city: "Dhaka",
        phone: "01700000000",
      },
      {
        label: "Office",
        addressLine: "Office Address",
        district: "Chattogram",
        city: "Chattogram",
        phone: "01800000000",
      },
    ];

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeUndefined();
    expect(user.addresses).toHaveLength(2);
  });

  // --------------------------------------------------
  // 26. Refresh token
  // --------------------------------------------------
  test("should accept a valid refresh token entry", () => {
    const data = validUserData();

    data.refreshTokens = [
      {
        tokenHash: "hashed-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
        userAgent: "Chrome",
      },
    ];

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeUndefined();

    expect(user.refreshTokens).toHaveLength(1);
    expect(user.refreshTokens[0].tokenHash).toBe(
      "hashed-refresh-token"
    );
    expect(user.refreshTokens[0].userAgent).toBe("Chrome");
  });

  // --------------------------------------------------
  // 27. Refresh token tokenHash required
  // --------------------------------------------------
  test("should fail when refresh token tokenHash is missing", () => {
    const data = validUserData();

    data.refreshTokens = [
      {
        expiresAt: new Date(Date.now() + 3600000),
      },
    ];

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeDefined();
  });

  // --------------------------------------------------
  // 28. Refresh token expiresAt required
  // --------------------------------------------------
  test("should fail when refresh token expiresAt is missing", () => {
    const data = validUserData();

    data.refreshTokens = [
      {
        tokenHash: "hashed-token",
      },
    ];

    const user = new User(data);
    const error = user.validateSync();

    expect(error).toBeDefined();
  });

  // --------------------------------------------------
  // 29. Refresh tokens default empty array
  // --------------------------------------------------
  test("should default refreshTokens to an empty array", () => {
    const user = new User(validUserData());

    expect(user.refreshTokens).toEqual([]);
  });

  // --------------------------------------------------
  // 30. isLocked false for normal account
  // --------------------------------------------------
  test("should return false when account is not locked", () => {
    const user = new User(validUserData());

    expect(user.isLocked()).toBe(false);
  });

  // --------------------------------------------------
  // 31. isLocked true for future lockUntil
  // --------------------------------------------------
  test("should return true when lockUntil is in the future", () => {
    const user = new User({
      ...validUserData(),
      lockUntil: new Date(Date.now() + 10 * 60 * 1000),
    });

    expect(user.isLocked()).toBe(true);
  });

  // --------------------------------------------------
  // 32. isLocked false for expired lock
  // --------------------------------------------------
  test("should return false when lockUntil has expired", () => {
    const user = new User({
      ...validUserData(),
      lockUntil: new Date(Date.now() - 10 * 60 * 1000),
    });

    expect(user.isLocked()).toBe(false);
  });

  // --------------------------------------------------
  // 33. isLocked false when lockUntil is undefined
  // --------------------------------------------------
  test("should return false when lockUntil is undefined", () => {
    const user = new User(validUserData());

    user.lockUntil = undefined;

    expect(user.isLocked()).toBe(false);
  });

  // --------------------------------------------------
  // 34. registerFailedLogin increments attempts
  // --------------------------------------------------
  test("should increment loginAttempts after failed login", async () => {
    const user = new User(validUserData());

    user.loginAttempts = 0;

    // Prevent actual database operation
    user.save = jest.fn().mockResolvedValue(user);

    await user.registerFailedLogin();

    expect(user.loginAttempts).toBe(1);
    expect(user.save).toHaveBeenCalledWith({
      validateBeforeSave: false,
    });
  });

  // --------------------------------------------------
  // 35. registerFailedLogin increments existing attempts
  // --------------------------------------------------
  test("should increment existing loginAttempts", async () => {
    const user = new User(validUserData());

    user.loginAttempts = 2;

    user.save = jest.fn().mockResolvedValue(user);

    await user.registerFailedLogin();

    expect(user.loginAttempts).toBe(3);
  });

  // --------------------------------------------------
  // 36. Account locks after 5 failed attempts
  // --------------------------------------------------
  test("should lock account after 5 failed login attempts", async () => {
    const user = new User(validUserData());

    user.loginAttempts = 4;

    user.save = jest.fn().mockResolvedValue(user);

    const before = Date.now();

    await user.registerFailedLogin();

    const after = Date.now();

    expect(user.loginAttempts).toBe(5);
    expect(user.lockUntil).toBeDefined();

    expect(user.lockUntil.getTime()).toBeGreaterThanOrEqual(
      before + 15 * 60 * 1000
    );

    expect(user.lockUntil.getTime()).toBeLessThanOrEqual(
      after + 15 * 60 * 1000
    );
  });

  // --------------------------------------------------
  // 37. Failed login does not lock before 5 attempts
  // --------------------------------------------------
  test("should not lock account before 5 failed attempts", async () => {
    const user = new User(validUserData());

    user.loginAttempts = 3;
    user.lockUntil = undefined;

    user.save = jest.fn().mockResolvedValue(user);

    await user.registerFailedLogin();

    expect(user.loginAttempts).toBe(4);
    expect(user.lockUntil).toBeUndefined();
  });

  // --------------------------------------------------
  // 38. Expired lock resets failed login count
  // --------------------------------------------------
  test("should reset attempts when previous lock has expired", async () => {
    const user = new User(validUserData());

    user.loginAttempts = 5;
    user.lockUntil = new Date(Date.now() - 1000);

    user.save = jest.fn().mockResolvedValue(user);

    await user.registerFailedLogin();

    expect(user.loginAttempts).toBe(1);
    expect(user.lockUntil).toBeUndefined();
  });

  // --------------------------------------------------
  // 39. resetLoginAttempts
  // --------------------------------------------------
  test("should reset loginAttempts and lockUntil", async () => {
    const user = new User(validUserData());

    user.loginAttempts = 5;
    user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);

    user.save = jest.fn().mockResolvedValue(user);

    await user.resetLoginAttempts();

    expect(user.loginAttempts).toBe(0);
    expect(user.lockUntil).toBeUndefined();

    expect(user.save).toHaveBeenCalledWith({
      validateBeforeSave: false,
    });
  });

  // --------------------------------------------------
  // 40. resetLoginAttempts does nothing when already reset
  // --------------------------------------------------
  test("should not save when login attempts are already reset", async () => {
    const user = new User(validUserData());

    user.loginAttempts = 0;
    user.lockUntil = undefined;

    user.save = jest.fn().mockResolvedValue(user);

    await user.resetLoginAttempts();

    expect(user.loginAttempts).toBe(0);
    expect(user.lockUntil).toBeUndefined();
    expect(user.save).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // 41. matchPassword method exists
  // --------------------------------------------------
  test("should have matchPassword method", () => {
    const user = new User(validUserData());

    expect(typeof user.matchPassword).toBe("function");
  });

  // --------------------------------------------------
  // 42. matchPassword returns true for correct password
  // --------------------------------------------------
  test("should return true for the correct password", async () => {
    const password = "Password123!";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      ...validUserData(),
      password: hashedPassword,
    });

    const result = await user.matchPassword(password);

    expect(result).toBe(true);
  });

  // --------------------------------------------------
  // 43. matchPassword returns false for wrong password
  // --------------------------------------------------
  test("should return false for an incorrect password", async () => {
    const hashedPassword = await bcrypt.hash(
      "CorrectPassword123!",
      10
    );

    const user = new User({
      ...validUserData(),
      password: hashedPassword,
    });

    const result = await user.matchPassword(
      "WrongPassword123!"
    );

    expect(result).toBe(false);
  });

  // --------------------------------------------------
  // 44. Password should be bcrypt compatible
  // --------------------------------------------------
  test("should recognize bcrypt password hash", async () => {
    const password = "Password123!";

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      ...validUserData(),
      password: hashedPassword,
    });

    const result = await bcrypt.compare(
      password,
      user.password
    );

    expect(result).toBe(true);
  });

  // --------------------------------------------------
  // 45. Model name
  // --------------------------------------------------
  test("should use User as the model name", () => {
    expect(User.modelName).toBe("User");
  });

  // --------------------------------------------------
  // 46. Timestamps
  // --------------------------------------------------
  test("should have createdAt and updatedAt timestamps", () => {
    expect(User.schema.path("createdAt")).toBeDefined();
    expect(User.schema.path("updatedAt")).toBeDefined();
  });

  // --------------------------------------------------
  // 47. Unique username
  // --------------------------------------------------
  test("should have username configured as unique", () => {
    const usernamePath = User.schema.path("username");

    expect(usernamePath.options.unique).toBe(true);
  });

  // --------------------------------------------------
  // 48. Unique email
  // --------------------------------------------------
  test("should have email configured as unique", () => {
    const emailPath = User.schema.path("email");

    expect(emailPath.options.unique).toBe(true);
  });

  // --------------------------------------------------
  // 49. Email lowercase option
  // --------------------------------------------------
  test("should have lowercase enabled for email", () => {
    const emailPath = User.schema.path("email");

    expect(emailPath.options.lowercase).toBe(true);
  });

  // --------------------------------------------------
  // 50. Refresh token _id disabled
  // --------------------------------------------------
  test("should disable _id for refresh token entries", () => {
    const refreshTokenPath =
      User.schema.path("refreshTokens");

    expect(refreshTokenPath.schema.options._id).toBe(false);
  });

  // --------------------------------------------------
  // 51. Sensitive fields use select false
  // --------------------------------------------------
  test("should hide sensitive fields by default", () => {
    expect(
      User.schema.path("emailOtpHash").options.select
    ).toBe(false);

    expect(
      User.schema.path("emailOtpExpiry").options.select
    ).toBe(false);

    expect(
      User.schema.path("securityAnswerHash").options.select
    ).toBe(false);

    expect(
      User.schema.path("loginAttempts").options.select
    ).toBe(false);

    expect(
      User.schema.path("lockUntil").options.select
    ).toBe(false);

    expect(
      User.schema.path("twoFactorSecret").options.select
    ).toBe(false);

    expect(
      User.schema.path("twoFactorTempSecret").options.select
    ).toBe(false);

    expect(
      User.schema.path("refreshTokens").options.select
    ).toBe(false);
  });

  // --------------------------------------------------
  // 52. Schema contains security fields
  // --------------------------------------------------
  test("should contain all security-related fields", () => {
    const schema = User.schema;

    expect(schema.path("isEmailVerified")).toBeDefined();
    expect(schema.path("emailOtpHash")).toBeDefined();
    expect(schema.path("emailOtpExpiry")).toBeDefined();

    expect(schema.path("securityQuestion")).toBeDefined();
    expect(schema.path("securityAnswerHash")).toBeDefined();

    expect(schema.path("loginAttempts")).toBeDefined();
    expect(schema.path("lockUntil")).toBeDefined();

    expect(schema.path("twoFactorEnabled")).toBeDefined();
    expect(schema.path("twoFactorSecret")).toBeDefined();
    expect(schema.path("twoFactorTempSecret")).toBeDefined();

    expect(schema.path("refreshTokens")).toBeDefined();
  });

  // --------------------------------------------------
  // 53. Default refreshTokens is []
  // --------------------------------------------------
  test("should configure refreshTokens default as empty array", () => {
    const refreshTokenPath =
      User.schema.path("refreshTokens");

    expect(refreshTokenPath.options.default).toEqual([]);
  });

  // --------------------------------------------------
  // 54. Default twoFactorEnabled
  // --------------------------------------------------
  test("should configure twoFactorEnabled default as false", () => {
    const twoFactorPath =
      User.schema.path("twoFactorEnabled");

    expect(twoFactorPath.defaultValue).toBe(false);
  });

  // --------------------------------------------------
  // 55. Default isEmailVerified
  // --------------------------------------------------
  test("should configure isEmailVerified default as true", () => {
    const emailVerifiedPath =
      User.schema.path("isEmailVerified");

    expect(emailVerifiedPath.defaultValue).toBe(true);
  });

  // --------------------------------------------------
  // 56. Default loginAttempts
  // --------------------------------------------------
  test("should configure loginAttempts default as 0", () => {
    const loginAttemptsPath =
      User.schema.path("loginAttempts");

    expect(loginAttemptsPath.defaultValue).toBe(0);
  });

  // --------------------------------------------------
  // 57. Address schema fields
  // --------------------------------------------------
  test("should contain all address fields", () => {
    const addressPath = User.schema.path("addresses");

    expect(addressPath).toBeDefined();

    const addressSchema = addressPath.schema;

    expect(addressSchema.path("label")).toBeDefined();
    expect(addressSchema.path("addressLine")).toBeDefined();
    expect(addressSchema.path("district")).toBeDefined();
    expect(addressSchema.path("city")).toBeDefined();
    expect(addressSchema.path("phone")).toBeDefined();
    expect(addressSchema.path("isDefault")).toBeDefined();
  });

  // --------------------------------------------------
  // 58. User schema contains all main fields
  // --------------------------------------------------
  test("should contain all expected main fields", () => {
    const schema = User.schema;

    expect(schema.path("username")).toBeDefined();
    expect(schema.path("name")).toBeDefined();
    expect(schema.path("email")).toBeDefined();
    expect(schema.path("password")).toBeDefined();
    expect(schema.path("phone")).toBeDefined();
    expect(schema.path("role")).toBeDefined();
    expect(schema.path("addresses")).toBeDefined();
    expect(schema.path("preferredLanguage")).toBeDefined();
    expect(schema.path("notificationsEnabled")).toBeDefined();
  });
});