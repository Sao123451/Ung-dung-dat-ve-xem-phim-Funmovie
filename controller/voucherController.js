// controller/voucherController.js
const Voucher = require('../models/Voucher');

exports.createVoucher = async (req, res, next) => {
  try {
    const v = await Voucher.create(req.body);
    res.status(201).json({ message: 'Voucher created', voucher: v });
  } catch (err) { next(err); }
};

exports.validateVoucher = async (req, res, next) => {
  try {
    const code = req.params.code;
    const v = await Voucher.findOne({ code });
    if (!v) return res.status(404).json({ valid: false, message: 'Voucher not found' });
    const now = new Date();
    if (v.status !== 'active' || (v.start_date && now < v.start_date) || (v.end_date && now > v.end_date)) {
      return res.json({ valid: false, voucher: v });
    }
    res.json({ valid: true, voucher: v });
  } catch (err) { next(err); }
};
