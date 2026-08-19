import { jest } from "@jest/globals";

// ============================================================
// MOCK USER MODEL
// ============================================================

jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    find: jest.fn(),
  },
}));


// ============================================================
// MOCK NOTIFICATION MODEL
// ============================================================

jest.unstable_mockModule("../../models/Notification.js", () => ({
  default: {
    insertMany: jest.fn(),
  },
}));


// ============================================================
// IMPORT MOCKED MODELS
// ============================================================

const { default: User } = await import(
  "../../models/User.js"
);

const { default: Notification } = await import(
  "../../models/Notification.js"
);


// ============================================================
// IMPORT FUNCTION UNDER TEST
// ============================================================

const { notifyAdmins } = await import(
  "../../utils/notifyAdmins.js"
);


// ============================================================
// TEST SUITE
// ============================================================

describe("notifyAdmins", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });


  // ==========================================================
  // TEST 1
  // Admins exist
  // ==========================================================

  test("should create notifications for all admins", async () => {

    const admin1 = {
      _id: "admin1",
    };

    const admin2 = {
      _id: "admin2",
    };


    // Mock User.find().select("_id")
    const selectMock = jest.fn();

    selectMock.mockResolvedValue([
      admin1,
      admin2,
    ]);


    User.find.mockReturnValue({
      select: selectMock,
    });


    Notification.insertMany.mockResolvedValue([]);


    // Execute
    await notifyAdmins({
      type: "order",
      title: "New Order",
      message: "A new order has been placed.",
    });


    // ========================================================
    // Verify User.find()
    // ========================================================

    expect(User.find).toHaveBeenCalledTimes(1);

    expect(User.find).toHaveBeenCalledWith({
      role: "admin",
    });


    // ========================================================
    // Verify select()
    // ========================================================

    expect(selectMock).toHaveBeenCalledTimes(1);

    expect(selectMock).toHaveBeenCalledWith("_id");


    // ========================================================
    // Verify insertMany()
    // ========================================================

    expect(Notification.insertMany).toHaveBeenCalledTimes(1);

    expect(Notification.insertMany).toHaveBeenCalledWith([
      {
        user: "admin1",
        type: "order",
        title: "New Order",
        message: "A new order has been placed.",
        order: null,
      },
      {
        user: "admin2",
        type: "order",
        title: "New Order",
        message: "A new order has been placed.",
        order: null,
      },
    ]);
  });


  // ==========================================================
  // TEST 2
  // No admins
  // ==========================================================

  test("should return without inserting when there are no admins", async () => {

    const selectMock = jest.fn();

    selectMock.mockResolvedValue([]);


    User.find.mockReturnValue({
      select: selectMock,
    });


    await notifyAdmins({
      type: "order",
      title: "New Order",
      message: "A new order has been placed.",
    });


    // User.find should execute
    expect(User.find).toHaveBeenCalledTimes(1);

    expect(User.find).toHaveBeenCalledWith({
      role: "admin",
    });


    // select should execute
    expect(selectMock).toHaveBeenCalledTimes(1);

    expect(selectMock).toHaveBeenCalledWith("_id");


    // insertMany must NOT execute
    expect(Notification.insertMany).not.toHaveBeenCalled();
  });


  // ==========================================================
  // TEST 3
  // Order object
  // ==========================================================

  test("should include the order in every admin notification", async () => {

    const admin1 = {
      _id: "admin123",
    };


    const selectMock = jest.fn();

    selectMock.mockResolvedValue([
      admin1,
    ]);


    User.find.mockReturnValue({
      select: selectMock,
    });


    Notification.insertMany.mockResolvedValue([]);


    const order = {
      _id: "order123",
      invoiceNumber: "INV-001",
    };


    await notifyAdmins({
      type: "order",
      title: "Order Placed",
      message: "A customer placed a new order.",
      order,
    });


    expect(Notification.insertMany).toHaveBeenCalledTimes(1);


    expect(Notification.insertMany).toHaveBeenCalledWith([
      {
        user: "admin123",
        type: "order",
        title: "Order Placed",
        message: "A customer placed a new order.",
        order,
      },
    ]);
  });

});