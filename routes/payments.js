const express = require("express");
const router = express.Router();
const c = require("../controller/paymentController");
const { verifyToken } = require("../middlewares/auth");

/* ======================================================
   PAYMENT (Cash / Online / Staff / Webhook)
====================================================== */
router.post("/init", verifyToken, c.init);            // Tạo payment (cash / online)
router.post("/:id/mark", c.mark);                    // Webhook hoặc staff xác nhận



/* ======================================================
   VNPAY PAYMENT
====================================================== */
router.post("/vnpay/init", verifyToken, c.initVnpay); // Tạo link thanh toán VNPay
router.get("/vnpay/return", c.vnpayReturn);           // Frontend redirect về
router.get("/vnpay/ipn", c.vnpayIpn);                 // Server callback (quan trọng nhất)


module.exports = router;
