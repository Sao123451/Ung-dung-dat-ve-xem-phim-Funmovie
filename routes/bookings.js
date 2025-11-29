const r = require("express").Router();
const c = require("../controller/bookingController");
const { verifyToken, requireRoles } = require("../middlewares/auth");

/* STAFF CREATE */
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

/* CUSTOMER */
r.post("/quote", c.quote);
r.post("/", verifyToken, c.create);
r.post("/:id/confirm", verifyToken, c.confirm);   // customer pay online
r.post("/:id/cancel", verifyToken, c.cancel);
r.get("/:id", verifyToken, c.detail);
r.get("/me/list", verifyToken, c.myTickets);

/* LIST / DETAIL */
r.get("/", verifyToken, requireRoles("admin", "manager", "staff"), c.list);

r.get(
  "/detail/:id",
  verifyToken,
  requireRoles("staff", "manager", "admin"),
  c.detailBooking
);

/* UPDATE STATUS & REMOVE */
r.patch(
  "/:id/status",
  verifyToken,
  requireRoles("admin", "manager", "staff"),
  c.updateStatus
);

r.delete("/:id", verifyToken, requireRoles("admin", "manager"), c.remove);

/* ADMIN SEND EMAIL */
r.post("/:id/send-email", verifyToken, requireRoles("admin"), c.sendEmail);

module.exports = r;
