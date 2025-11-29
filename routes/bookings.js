const r = require("express").Router();
const c = require("../controller/bookingController");
const { verifyToken, requireRoles } = require("../middlewares/auth");

/* ======================================================
   STAFF CREATE TICKET
====================================================== */
r.post(
  "/staff-create",
  verifyToken,
  requireRoles("staff", "manager", "admin"),
  c.staffCreate
);

/* STAFF CONFIRM PAYMENT */
r.post(
  "/:id/staff-confirm",
  verifyToken,
  requireRoles("staff", "manager", "admin"),
  c.staffConfirm
);

r.post(
  "/staff-create-pending",
  verifyToken,
  requireRoles("staff", "manager", "admin"),
  c.staffCreatePending
);

/* ======================================================
   STAFF DETAIL (IN VÉ)
   → PHẢI ĐẶT TRƯỚC PARAM ROUTE /:id
====================================================== */
r.get(
  "/detailBooking/:id",
  verifyToken,
  requireRoles("staff", "manager", "admin"),
  c.detailBooking
);

/* ======================================================
   CUSTOMER — Quote / Create / My Tickets
====================================================== */
r.post("/quote", c.quote);
r.post("/", verifyToken, c.create);
r.get("/me/list", verifyToken, c.myTickets);

/* CUSTOMER ONLINE CONFIRM PAYMENT */
r.post("/:id/confirm", verifyToken, c.confirm);

/* CUSTOMER CANCEL */
r.post("/:id/cancel", verifyToken, c.cancel);

/* ======================================================
   CUSTOMER DETAIL (Xem 1 vé)
====================================================== */
r.get("/:id", verifyToken, c.detail);

/* ======================================================
   LIST / DETAIL (ADMIN - STAFF)
====================================================== */
r.get("/", verifyToken, requireRoles("admin", "manager", "staff"), c.list);

r.get(
  "/detail/:id",
  verifyToken,
  requireRoles("staff", "manager", "admin"),
  c.detailBooking
);

/* UPDATE STATUS */
r.patch(
  "/:id/status",
  verifyToken,
  requireRoles("admin", "manager", "staff"),
  c.updateStatus
);

/* REMOVE (ADMIN) */
r.delete("/:id", verifyToken, requireRoles("admin", "manager"), c.remove);

/* ADMIN SEND EMAIL */
r.post("/:id/send-email", verifyToken, requireRoles("admin"), c.sendEmail);

module.exports = r;
