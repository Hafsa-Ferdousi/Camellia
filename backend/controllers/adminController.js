import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Setting from "../models/Setting.js";
import { validatePasswordStrength } from "../utils/validators.js";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

// GET /api/admin/stats
export const getStats = async (req, res) => {
  try {
    const trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - 6);
    trendStart.setHours(0, 0, 0, 0);

    const [totalOrders, totalUsers, totalProducts, revenueAgg, recentOrders, statusAgg, revenueTrendAgg] =
      await Promise.all([
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
        Order.aggregate([
          { $match: { createdAt: { $gte: trendStart } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              total: { $sum: "$totalAmount" },
            },
          },
        ]),
      ]);

    const statusCounts = ORDER_STATUSES.reduce((acc, st) => ({ ...acc, [st]: 0 }), {});
    statusAgg.forEach((s) => { if (s._id in statusCounts) statusCounts[s._id] = s.count; });

    const revenueByDay = Object.fromEntries(revenueTrendAgg.map((r) => [r._id, r.total]));
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      revenueTrend.push({ date: key, total: revenueByDay[key] || 0 });
    }

    res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue: revenueAgg[0]?.total || 0,
      recentOrders,
      statusCounts,
      revenueTrend,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/customers/:userId/reset-password
// Fallback for customers who can't self-serve (e.g. forgot their security
// answer too) — there's no email service, so this is the only recovery path
// besides re-registering. Invalidates all of the customer's sessions.
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

    res.json({ message: "Password reset. Share the new password with the customer securely." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/settings
export const getSettings = async (req, res) => {
  try {
    const settings = await Setting.getSingleton();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/settings
export const updateSettings = async (req, res) => {
  try {
    const { vatRate, defaultDeliveryCharge, districtDeliveryCharges } = req.body;

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

    const settings = await Setting.getSingleton();
    if (vatRate !== undefined) settings.vatRate = Number(vatRate);
    if (defaultDeliveryCharge !== undefined) settings.defaultDeliveryCharge = Number(defaultDeliveryCharge);
    if (districtDeliveryCharges !== undefined) {
      settings.districtDeliveryCharges = districtDeliveryCharges.map((d) => ({
        district: d.district.trim(),
        charge: Number(d.charge),
      }));
    }
    await settings.save();

    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};