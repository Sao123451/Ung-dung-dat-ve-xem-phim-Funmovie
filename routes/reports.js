const r = require("express").Router();
const { verifyToken, requireRoles } = require("../middlewares/auth");
const report = require("../controller/reportController");

// ADMIN + MANAGER mới xem được
const ALLOW = ["admin", "manager"];

/* =======================================
   1) DOANH THU THEO RẠP
======================================= */
r.get(
  "/revenue-by-cinema",
  verifyToken,
  requireRoles(...ALLOW),
  report.revenueByCinema
);

/* =======================================
   2) DOANH THU THEO NGÀY
======================================= */
r.get(
  "/revenue-by-day",
  verifyToken,
  requireRoles(...ALLOW),
  report.revenueByDay
);

/* =======================================
   3) DOANH THU THEO THÁNG
======================================= */
r.get(
  "/revenue-by-month",
  verifyToken,
  requireRoles(...ALLOW),
  report.revenueByMonth
);

/* =======================================
   4) CHI TIÊU KHÁCH HÀNG
======================================= */
r.get(
  "/customer-spending",
  verifyToken,
  requireRoles(...ALLOW),
  report.customerSpending
);


module.exports = r;
