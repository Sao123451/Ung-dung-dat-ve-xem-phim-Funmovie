// models/UserVoucher.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserVoucherSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  voucher: { type: Schema.Types.ObjectId, ref: "Voucher", required: true },
  used: { type: Boolean, default: false },
   usage_limit: { type: Number, default: 0 },
  used_count: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("UserVoucher", UserVoucherSchema);
