import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

// GET /api/admin/stats
export const getStats = async (req, res) => {
  try {
    const [totalOrders, totalUsers, totalProducts, revenueAgg, recentOrders] =
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
      ]);

    res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue: revenueAgg[0]?.total || 0,
      recentOrders,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};