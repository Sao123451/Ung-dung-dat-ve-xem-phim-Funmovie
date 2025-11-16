// routes/bookings.js
const r = require("express").Router();
const c = require("../controller/bookingController");
const { verifyToken, requireRoles } = require("../middlewares/auth");

/* ======================================================
   STAFF CREATE TICKET TẠI QUẦY
   (KHÔNG CẦN TOKEN KHÁCH — CHỈ STAFF/MANAGER/ADMIN)
====================================================== */
r.post(
  "/staff-create",
  verifyToken,
  requireRoles("staff", "manager", "admin"),
  c.staffCreate
);

/* ======================================================
   CUSTOMER
====================================================== */
r.post("/quote", c.quote);
r.post("/", verifyToken, c.create);
r.get("/me/list", verifyToken, c.myTickets);

/* ======================================================
   ADMIN SEND EMAIL (MANUAL)
====================================================== */
r.post("/:id/send-email", verifyToken, requireRoles("admin"), c.sendEmail);

/* ======================================================
   ACTIONS
====================================================== */
r.post("/:id/confirm", verifyToken, c.confirm);
r.post("/:id/cancel", verifyToken, c.cancel);
r.get("/:id", verifyToken, c.detail);

/* ======================================================
   ADMIN LIST / UPDATE / REMOVE
====================================================== */
r.get("/", verifyToken, requireRoles("admin", "manager", "staff"), c.list);
r.patch("/:id/status", verifyToken, requireRoles("admin", "manager", "staff"), c.updateStatus);
r.delete("/:id", verifyToken, requireRoles("admin", "manager"), c.remove);

module.exports = r;
