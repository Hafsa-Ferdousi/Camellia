import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Setting from "../models/Setting.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import { validatePasswordStrength } from "../utils/validators.js";
import { sendError } from "../utils/errorResponse.js";
import { sendPasswordResetByAdminEmail } from "../utils/mailer.js";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const STATS_RANGES = ["today", "2d", "7d", "10d", "thisMonth", "lastMonth"];

// All date-bucketing below uses a fixed +06:00 (Asia/Dhaka, no DST) offset
// rather than the server process's ambient timezone. Dev runs in Asia/Dhaka
// already, but the deployed backend (Render) very likely runs in UTC — if
// "today"/day-bucket boundaries were computed from the server's local clock,
// dev and prod would silently disagree about which calendar day an order
// falls on. A fixed offset keeps it correct (and identical) everywhere.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

// Reads a Date's Dhaka-local calendar fields by shifting the timestamp and
// reading it back with the UTC getters — sidesteps the host's own timezone
// entirely, so this gives the same answer on a UTC server as on this dev box.
function toDhakaParts(date) {
  const shifted = new Date(date.getTime() + DHAKA_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}
// Inverse of toDhakaParts: the real UTC Date instant for 00:00 Dhaka time on
// the given Dhaka calendar day (month is 0-based, day may overflow — that's
// used deliberately below to advance by a day without a separate branch).
function dhakaDateFromParts(y, m, d) {
  return new Date(Date.UTC(y, m, d) - DHAKA_OFFSET_MS);
}
function dhakaStartOfDay(date) {
  const { y, m, d } = toDhakaParts(date);
  return dhakaDateFromParts(y, m, d);
}
// "YYYY-MM-DD" for the Dhaka calendar day containing `date` — must match the
// format $dateToString below produces when given the same `timezone`.
function dhakaDateKey(date) {
  const { y, m, d } = toDhakaParts(date);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Resolves a `range` query value to a [start, end] window for the revenue
// chart. `today`/`2d`/`10d` are trailing windows ending now (like the
// original hardcoded 7-day trend); `thisMonth` runs from the 1st to now;
// `lastMonth` is a fixed, fully-past calendar month. All boundaries are
// Dhaka calendar days, per the note above.
function getStatsRangeBounds(range) {
  const now = new Date();

  if (range === "lastMonth") {
    const { y, m } = toDhakaParts(now);
    const firstOfThisMonth = dhakaDateFromParts(y, m, 1);
    const end = new Date(firstOfThisMonth.getTime() - 1); // last instant of the previous Dhaka month
    const { y: ly, m: lm } = toDhakaParts(end);
    const start = dhakaDateFromParts(ly, lm, 1);
    return { start, end };
  }

  const todayStart = dhakaStartOfDay(now);
  switch (range) {
    case "today": return { start: todayStart, end: now };
    case "2d": return { start: new Date(todayStart.getTime() - 1 * 86400000), end: now };
    case "10d": return { start: new Date(todayStart.getTime() - 9 * 86400000), end: now };
    case "thisMonth": {
      const { y, m } = toDhakaParts(now);
      return { start: dhakaDateFromParts(y, m, 1), end: now };
    }
    case "7d":
    default: return { start: new Date(todayStart.getTime() - 6 * 86400000), end: now };
  }
}

// One entry per Dhaka calendar day from start to end (inclusive), so the
// chart still shows a bar (at 0) for days with no orders instead of
// skipping them. Keys must line up exactly with what the $dateToString
// aggregation (timezone: "+06:00") produces for the same instant.
function buildDailyTrend(start, end, totalsByDay) {
  const days = [];
  const startParts = toDhakaParts(start);
  let cursor = dhakaDateFromParts(startParts.y, startParts.m, startParts.d);
  const endParts = toDhakaParts(end);
  const endDay = dhakaDateFromParts(endParts.y, endParts.m, endParts.d);
  while (cursor <= endDay) {
    const key = dhakaDateKey(cursor);
    days.push({ date: key, total: totalsByDay[key] || 0 });
    const { y, m, d } = toDhakaParts(cursor);
    cursor = dhakaDateFromParts(y, m, d + 1); // Date.UTC normalizes day overflow across months
  }
  return days;
}

// GET /api/admin/stats?range=today|2d|7d|10d|thisMonth|lastMonth
export const getStats = async (req, res) => {
  try {
    const range = STATS_RANGES.includes(req.query.range) ? req.query.range : "7d";
    const { start, end } = getStatsRangeBounds(range);

    const [
      totalOrders, totalUsers, totalProducts, revenueAgg, recentOrders, statusAgg,
      periodRevenueAgg, periodOrderCount, settings,
    ] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.aggregate([
        { $match: { "payment.status": "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name email"),
      Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Realized revenue for the selected period — only paid orders, same
      // definition as the all-time totalRevenue below (the original 7-day
      // chart summed every order's totalAmount regardless of payment
      // status, which double-counted unpaid COD/bKash orders as "revenue").
      Order.aggregate([
        { $match: { "payment.status": "paid", createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+06:00" } },
            total: { $sum: "$totalAmount" },
          },
        },
      ]),
      Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Setting.getSingleton(),
    ]);

    const statusCounts = ORDER_STATUSES.reduce((acc, st) => ({ ...acc, [st]: 0 }), {});
    statusAgg.forEach((s) => { if (s._id in statusCounts) statusCounts[s._id] = s.count; });

    const revenueByDay = Object.fromEntries(periodRevenueAgg.map((r) => [r._id, r.total]));
    const revenueTrend = buildDailyTrend(start, end, revenueByDay);
    const periodRevenue = periodRevenueAgg.reduce((sum, r) => sum + r.total, 0);

    const lowStockCount = await Product.countDocuments({
      isActive: true,
      totalStock: { $lte: settings.lowStockThreshold },
    });

    res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue: revenueAgg[0]?.total || 0,
      recentOrders,
      statusCounts,
      revenueTrend,
      range,
      periodRevenue,
      periodOrderCount,
      lowStockCount,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/admin/products/low-stock
export const getLowStockProducts = async (req, res) => {
  try {
    const settings = await Setting.getSingleton();
    const threshold = req.query.threshold !== undefined ? Number(req.query.threshold) : settings.lowStockThreshold;

    const products = await Product.find({
      isActive: true,
      totalStock: { $lte: threshold },
    })
      .populate("category", "name slug")
      .sort({ totalStock: 1 });

    res.json({ threshold, products });
  } catch (err) {
    sendError(res, err);
  }
};

// Wraps a CSV field in quotes and escapes embedded quotes if it contains a
// comma, quote, or newline — keeps the export valid for Excel/Sheets import.
const csvField = (value) => {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

// GET /api/admin/sales/export?from=&to=&status=  -> streams a CSV of orders
export const exportSalesCSV = async (req, res) => {
  try {
    const { from, to, status } = req.query;
    const query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    const header = [
      "Order ID", "Date", "Customer", "Email", "Items", "Subtotal", "VAT",
      "Delivery", "Total", "Payment Method", "Payment Status", "Order Status",
    ];

    const rows = orders.map((o) => {
      const customerName = o.isGuest ? o.guestInfo?.name : o.user?.name;
      const customerEmail = o.isGuest ? o.guestInfo?.email : o.user?.email;
      const itemsSummary = o.items.map((i) => `${i.nameSnapshot} x${i.quantity}`).join("; ");
      return [
        o._id.toString(),
        o.createdAt.toISOString().slice(0, 10),
        customerName || "",
        customerEmail || "",
        itemsSummary,
        o.subtotal,
        o.vat,
        o.deliveryCharge,
        o.totalAmount,
        o.payment?.method || "",
        o.payment?.status || "",
        o.status,
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map(csvField).join(","))
      .join("\r\n");

    const filename = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/admin/customers
// Unified customer list: registered accounts (from Users) plus guest
// checkouts (grouped by the email they ordered with), each with their
// order-history stats, so admin can see everyone who has ever ordered and
// tell at a glance who has an account vs who checked out as a guest.
export const getCustomers = async (req, res) => {
  try {
    const [users, userOrderAgg, guestOrderAgg] = await Promise.all([
      User.find().select("name username email phone role twoFactorEnabled createdAt").lean(),
      Order.aggregate([
        { $match: { user: { $ne: null } } },
        {
          $group: {
            _id: "$user",
            orderCount: { $sum: 1 },
            totalSpent: { $sum: "$totalAmount" },
            lastOrderAt: { $max: "$createdAt" },
          },
        },
      ]),
      Order.aggregate([
        { $match: { isGuest: true } },
        {
          $group: {
            _id: { $toLower: "$guestInfo.email" },
            name: { $first: "$guestInfo.name" },
            email: { $first: "$guestInfo.email" },
            phone: { $first: "$guestInfo.phone" },
            orderCount: { $sum: 1 },
            totalSpent: { $sum: "$totalAmount" },
            lastOrderAt: { $max: "$createdAt" },
          },
        },
      ]),
    ]);

    const statsByUserId = Object.fromEntries(userOrderAgg.map((a) => [String(a._id), a]));

    const registered = users.map((u) => {
      const stats = statsByUserId[String(u._id)];
      return {
        type: u.role === "admin" ? "admin" : "registered",
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        role: u.role,
        twoFactorEnabled: u.twoFactorEnabled,
        joinedAt: u.createdAt,
        orderCount: stats?.orderCount || 0,
        totalSpent: stats?.totalSpent || 0,
        lastOrderAt: stats?.lastOrderAt || null,
      };
    });

    const guests = guestOrderAgg.map((g) => ({
      type: "guest",
      _id: `guest:${g._id}`,
      name: g.name,
      email: g.email,
      phone: g.phone || "",
      role: "guest",
      twoFactorEnabled: false,
      joinedAt: null,
      orderCount: g.orderCount,
      totalSpent: g.totalSpent,
      lastOrderAt: g.lastOrderAt,
    }));

    const all = [...registered, ...guests].sort((a, b) => {
      const aDate = a.lastOrderAt || a.joinedAt || 0;
      const bDate = b.lastOrderAt || b.joinedAt || 0;
      return new Date(bDate) - new Date(aDate);
    });

    res.json(all);
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/admin/customers/:userId
// Full detail for one registered customer: profile plus their order history.
export const getCustomerDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "name username email phone role twoFactorEnabled createdAt"
    );
    if (!user) return res.status(404).json({ message: "Customer not found." });

    const orders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate("items.product", "name images");

    res.json({ user, orders });
  } catch (err) {
    sendError(res, err);
  }
};

// POST /api/admin/customers/:userId/reset-password
// Fallback for customers who can't self-serve (e.g. forgot their security
// answer too — see PasswordResetRequest, created via
// requestAdminPasswordReset in authController.js). Invalidates all of the
// customer's sessions.
export const resetCustomerPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ message: strength.message });
    }

    const user = await User.findById(req.params.userId).select("+refreshTokens");
    if (!user) return res.status(404).json({ message: "Customer not found." });

    user.password = newPassword; // re-hashed by the pre-save hook
    user.refreshTokens = [];
    await user.save();

    // Whatever brought the admin here is now handled — clear it from the queue.
    await PasswordResetRequest.updateMany(
      { user: user._id, status: "pending" },
      { status: "resolved", resolvedAt: new Date() }
    );

    const { sent } = await sendPasswordResetByAdminEmail(user.email, { newPassword });

    res.json({
      message: sent
        ? "Password reset. An email with the new password — and a prompt to change it — has been sent to the customer."
        : "Password reset, but the notification email could not be sent. Share the new password with the customer securely yourself.",
    });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/admin/password-reset-requests
export const getPasswordResetRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ status: "pending" })
      .sort({ createdAt: 1 })
      .populate("user", "name email username");
    res.json(requests);
  } catch (err) {
    sendError(res, err);
  }
};

// PATCH /api/admin/password-reset-requests/:id/dismiss
// For when the admin has handled it another way (or it wasn't legitimate)
// without actually resetting the password through this panel.
export const dismissPasswordResetRequest = async (req, res) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });

    request.status = "resolved";
    request.resolvedAt = new Date();
    await request.save();

    res.json({ message: "Request dismissed." });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/admin/settings
export const getSettings = async (req, res) => {
  try {
    const settings = await Setting.getSingleton();
    res.json(settings);
  } catch (err) {
    sendError(res, err);
  }
};

// PUT /api/admin/settings
export const updateSettings = async (req, res) => {
  try {
    const { vatRate, defaultDeliveryCharge, districtDeliveryCharges, lowStockThreshold, defaultLanguage, bkashMerchantNumber, bkashNumberType } = req.body;

    if (vatRate !== undefined && (isNaN(Number(vatRate)) || Number(vatRate) < 0 || Number(vatRate) > 1)) {
      return res.status(400).json({ message: "VAT rate must be a number between 0 and 1 (e.g. 0.10 for 10%)." });
    }
    if (defaultDeliveryCharge !== undefined && (isNaN(Number(defaultDeliveryCharge)) || Number(defaultDeliveryCharge) < 0)) {
      return res.status(400).json({ message: "Default delivery charge must be a non-negative number." });
    }
    if (districtDeliveryCharges !== undefined) {
      if (!Array.isArray(districtDeliveryCharges) || districtDeliveryCharges.some(
        (d) => !d.district || isNaN(Number(d.charge)) || Number(d.charge) < 0
      )) {
        return res.status(400).json({ message: "Each district charge needs a district name and a non-negative charge." });
      }
    }
    if (lowStockThreshold !== undefined && (isNaN(Number(lowStockThreshold)) || Number(lowStockThreshold) < 0)) {
      return res.status(400).json({ message: "Low stock threshold must be a non-negative number." });
    }
    if (defaultLanguage !== undefined && !["en", "bn"].includes(defaultLanguage)) {
      return res.status(400).json({ message: "Default language must be 'en' or 'bn'." });
    }
    if (bkashMerchantNumber !== undefined && bkashMerchantNumber !== "" && !/^01[3-9]\d{8}$/.test(bkashMerchantNumber)) {
      return res.status(400).json({ message: "bKash number must be a valid 11-digit Bangladeshi mobile number (e.g. 01712345678)." });
    }
    if (bkashNumberType !== undefined && !["personal", "merchant"].includes(bkashNumberType)) {
      return res.status(400).json({ message: "bKash number type must be 'personal' or 'merchant'." });
    }

    const settings = await Setting.getSingleton();
    if (vatRate !== undefined) settings.vatRate = Number(vatRate);
    if (defaultDeliveryCharge !== undefined) settings.defaultDeliveryCharge = Number(defaultDeliveryCharge);
    if (districtDeliveryCharges !== undefined) {
      settings.districtDeliveryCharges = districtDeliveryCharges.map((d) => ({
        district: d.district.trim(),
        charge: Number(d.charge),
      }));
    }
    if (lowStockThreshold !== undefined) settings.lowStockThreshold = Number(lowStockThreshold);
    if (defaultLanguage !== undefined) settings.defaultLanguage = defaultLanguage;
    if (bkashMerchantNumber !== undefined) settings.bkashMerchantNumber = bkashMerchantNumber;
    if (bkashNumberType !== undefined) settings.bkashNumberType = bkashNumberType;
    await settings.save();

    res.json(settings);
  } catch (err) {
    sendError(res, err);
  }
};