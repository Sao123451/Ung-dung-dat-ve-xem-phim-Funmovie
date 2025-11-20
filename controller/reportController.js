const Ticket = require("../models/Ticket");
const Cinema = require("../models/Cinema");
const mongoose = require("mongoose");

/* ======================================================
   1) THỐNG KÊ DOANH THU THEO RẠP (Cinema)
   GET /api/reports/revenue-by-cinema?from=YYYY-MM-DD&to=YYYY-MM-DD
====================================================== */
exports.revenueByCinema = async (req, res) => {
  try {
    const { from, to } = req.query;

    const match = { status: "paid" }; // chỉ tính vé đã thanh toán

    if (from || to) {
      match.payment_time = {};
      if (from) match.payment_time.$gte = new Date(from);
      if (to) match.payment_time.$lte = new Date(to);
    }

    const result = await Ticket.aggregate([
      { $match: match },

      {
        $group: {
          _id: "$cinema",
          total_revenue: { $sum: "$total_after" },
          total_tickets: { $sum: 1 }
        }
      },

      {
        $lookup: {
          from: "cinemas",
          localField: "_id",
          foreignField: "_id",
          as: "cinema"
        }
      },

      { $unwind: "$cinema" },

      {
        $project: {
          _id: 0,
          cinema_id: "$cinema._id",
          cinema_name: "$cinema.name",
          address: "$cinema.address",
          city: "$cinema.city",
          total_revenue: 1,
          total_tickets: 1
        }
      },

      { $sort: { total_revenue: -1 } }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Report error", error: err.message });
  }
};

/* ======================================================
   2) THỐNG KÊ DOANH THU THEO NGÀY
   GET /api/reports/revenue-by-day?from=&to=
====================================================== */
exports.revenueByDay = async (req, res) => {
  try {
    const { from, to } = req.query;

    const match = { status: "paid" };

    if (from || to) {
      match.payment_time = {};
      if (from) match.payment_time.$gte = new Date(from);
      if (to) match.payment_time.$lte = new Date(to);
    }

    const result = await Ticket.aggregate([
      { $match: match },

      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$payment_time" },
            month: { $month: "$payment_time" },
            year: { $year: "$payment_time" }
          },
          total_revenue: { $sum: "$total_after" },
          total_tickets: { $sum: 1 }
        }
      },

      {
        $project: {
          date: {
            $concat: [
              { $toString: "$_id.year" }, "-",
              { $toString: "$_id.month" }, "-",
              { $toString: "$_id.day" }
            ]
          },
          total_revenue: 1,
          total_tickets: 1,
          _id: 0
        }
      },

      { $sort: { date: 1 } }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Report error", error: err.message });
  }
};

/* ======================================================
   3) THỐNG KÊ DOANH THU 12 THÁNG GẦN NHẤT
   GET /api/reports/revenue-by-month
====================================================== */
exports.revenueByMonth = async (req, res) => {
  try {
    const result = await Ticket.aggregate([
      { $match: { status: "paid" } },

      {
        $group: {
          _id: {
            month: { $month: "$payment_time" },
            year: { $year: "$payment_time" }
          },
          total_revenue: { $sum: "$total_after" },
          total_tickets: { $sum: 1 }
        }
      },

      {
        $project: {
          month: "$_id.month",
          year: "$_id.year",
          total_revenue: 1,
          total_tickets: 1,
          _id: 0
        }
      },

      { $sort: { year: 1, month: 1 } }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Report error", error: err.message });
  }
};
