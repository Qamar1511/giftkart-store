const User = require("../models/User");
const Order = require("../models/Order");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");
const streamInvoicePDF = require("../utils/pdfInvoice");

// @route  GET /api/admin/users
// @access Admin
// List every customer with a quick order-count summary — the password
// hash is never selected/returned (see User model: select:false, and it
// can't be reversed to the original password anyway, since it's a one-way
// bcrypt hash — that's true for every account on every site, not a bug).
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    const orderCounts = await Order.aggregate([
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(orderCounts.map((o) => [String(o._id), o.count]));

    const result = users.map((u) => ({
      _id: u._id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      currency: u.currency,
      isVerified: u.isVerified,
      createdAt: u.createdAt,
      totalOrders: countMap.get(String(u._id)) || 0,
    }));

    res.status(200).json({ users: result });
  } catch (error) {
    console.error("Admin get users error:", error);
    res.status(500).json({ message: "Couldn't load users" });
  }
};

// @route  GET /api/admin/users/:id
// @access Admin
// Full profile + every order they've placed, for the detail view.
exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const orders = await Order.find({ user: user._id })
      .select("items totalAmount currency paymentMethod paymentStatus orderStatus invoiceNumber createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({ user, orders });
  } catch (error) {
    console.error("Admin get user detail error:", error);
    res.status(500).json({ message: "Couldn't load this user" });
  }
};

// @route  GET /api/admin/users/:userId/orders/:orderId/invoice
// @access Admin
// Same PDF as the customer's own invoice download — just without the
// "must be your own order" restriction, since an admin needs to pull up
// any customer's invoice.
exports.downloadUserInvoice = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.params.userId }).populate(
      "user",
      "fullName email"
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Invoice is available after payment is confirmed" });
    }

    if (!order.invoiceNumber) {
      order.invoiceNumber = await generateInvoiceNumber();
      await order.save();
    }

    streamInvoicePDF(order, res);
  } catch (error) {
    console.error("Admin invoice error:", error);
    res.status(500).json({ message: "Couldn't generate the invoice." });
  }
};
