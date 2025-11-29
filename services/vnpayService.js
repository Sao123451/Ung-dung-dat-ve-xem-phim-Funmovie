const qs = require("qs");
const crypto = require("crypto");
const moment = require("moment");
const vnpConfig = require("../config/vnpay");

function sortObj(obj) {
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach(key => (sorted[key] = obj[key]));
  return sorted;
}

exports.createPaymentUrl = (reservationCode, amount, ipAddr) => {
  console.log("\n================= CREATE PAYMENT URL =================");

  const createDate = moment().format("YYYYMMDDHHmmss");
  const expireDate = moment().add(15, "minutes").format("YYYYMMDDHHmmss");

  let params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: vnpConfig.vnp_TmnCode,
    vnp_Amount: amount * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: reservationCode,   // ⭐ GIÁ TRỊ DUY NHẤT CHECK LẠI TICKET
    vnp_OrderInfo: `Thanh-toan-ve-${reservationCode}`,
    vnp_OrderType: "billpayment",
    vnp_ReturnUrl: vnpConfig.vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_Locale: "vn",
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate
  };

  const sorted = sortObj(params);
  const signData = qs.stringify(sorted, { encode: true });

  const secureHash = crypto
    .createHmac("sha512", vnpConfig.vnp_HashSecret)
    .update(signData)
    .digest("hex");

  sorted.vnp_SecureHash = secureHash;

  const url =
    vnpConfig.vnp_Url +
    "?" +
    qs.stringify(sorted, { encode: true });

  console.log("👉 FINAL URL:", url);
  return url;
};

exports.verifyChecksum = params => {
  const secureHash = params["vnp_SecureHash"];
  delete params["vnp_SecureHash"];
  delete params["vnp_SecureHashType"];

  const sorted = sortObj(params);
  const signData = qs.stringify(sorted, { encode: true });

  const signed = crypto
    .createHmac("sha512", vnpConfig.vnp_HashSecret)
    .update(signData)
    .digest("hex");

  return secureHash === signed;
};
