// controller/reportController.js
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');

exports.revenueByDate = async (req, res, next) => {
  try {
    // basic revenue by day (last N days)
    const { from, to } = req.query; // optional ISO dates
    const match = {};
    if (from || to) match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);

    const agg = await Payment.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$payment_time" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json(agg);
  } catch (err) { next(err); }
};
