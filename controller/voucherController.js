const Voucher = require('../models/Voucher');

// GET /api/vouchers/public
async function publicList(req, res, next) {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const now = new Date();

    const filter = {
      active: true,
      $or: [{ start_date: null }, { start_date: { $lte: now } }],
      $and: [{ $or: [{ end_date: null }, { end_date: { $gte: now } }] }],
    };
    if (q) filter.code = new RegExp(String(q).trim(), 'i');

    const pg = parseInt(page, 10);
    const lm = parseInt(limit, 10);
    const skip = (pg - 1) * lm;

    const [items, total] = await Promise.all([
      Voucher.find(filter)
        .select('code scope discount_type value min_order end_date used_count usage_limit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lm)
        .lean(),
      Voucher.countDocuments(filter),
    ]);

    const mapped = items.map(v => ({
      code: v.code,
      scope: v.scope,              // seat | combo | order
      type: v.discount_type,       // percent | amount (map cho Android)
      value: v.value,
      min_total: v.min_order ?? 0,
      end_date: v.end_date,
      used_count: v.used_count,
      usage_limit: v.usage_limit
    }));

    res.json({ items: mapped, total, page: pg, limit: lm });
  } catch (err) { next(err); }
}

// POST /api/vouchers  (admin)
async function createVoucher(req, res, next) {
  try {
    const v = await Voucher.create(req.body);
    res.status(201).json({ message: 'Voucher created', voucher: v });
  } catch (err) { next(err); }
}

// GET /api/vouchers/:code/validate
async function validateVoucher(req, res, next) {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const v = await Voucher.findOne({ code });
    if (!v) return res.status(404).json({ valid: false, message: 'Voucher not found' });

    const now = new Date();
    const valid =
      v.active &&
      (!v.start_date || now >= v.start_date) &&
      (!v.end_date || now <= v.end_date) &&
      (!v.usage_limit || v.used_count < v.usage_limit);

    res.json({ valid, voucher: v });
  } catch (err) { next(err); }
}

module.exports = {
  publicList,
  createVoucher,
  validateVoucher,
};
  