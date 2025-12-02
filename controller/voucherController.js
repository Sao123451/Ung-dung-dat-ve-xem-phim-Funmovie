const Voucher = require("../models/Voucher");
const User = require("../models/User");
const UserVoucher = require("../models/UserVoucher");

/* ============================================================
   PUBLIC LIST ⭐
   ============================================================ */
async function publicList(req, res, next) {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const now = new Date();

    const filter = {
      active: true,
      $or: [{ start_date: null }, { start_date: { $lte: now } }],
      $and: [{ $or: [{ end_date: null }, { end_date: { $gte: now } }] }]
    };

    if (q) filter.code = new RegExp(String(q).trim(), "i");

    const pg = parseInt(page, 10);
    const lm = parseInt(limit, 10);

    const [items, total] = await Promise.all([
      Voucher.find(filter)
        .select("code scope discount_type value min_order max_discount end_date used_count usage_limit distribute_type")
        .sort({ createdAt: -1 })
        .skip((pg - 1) * lm)
        .limit(lm)
        .lean(),
      Voucher.countDocuments(filter)
    ]);

    const mapped = items.map(v => ({
      code: v.code,
      scope: v.scope,
      type: v.discount_type,
      value: v.value,
      min_total: v.min_order ?? 0,
      max_discount: v.max_discount,
      end_date: v.end_date,
      used_count: v.used_count || 0,
      usage_limit: v.usage_limit || 0,
      distribute_type: v.distribute_type
    }));

    res.json({ items: mapped, total, page: pg, limit: lm });

  } catch (err) { next(err); }
}

/* ============================================================
   CREATE VOUCHER (ADMIN) ⭐ AUTO DISTRIBUTE
   ============================================================ */
async function createVoucher(req, res, next) {
  try {
    const v = await Voucher.create(req.body);

    // Tự động phân phát voucher
    if (v.distribute_type === "auto") {
      const users = await User.find().select("_id").lean();

      const docs = users.map(u => ({
        user: u._id,
        voucher: v._id,
        used: false,

        // ⭐ copy usage_limit và used_count
        usage_limit: v.usage_limit,
        used_count: 0
      }));

      if (docs.length > 0) await UserVoucher.insertMany(docs);
    }

    // ⭐ AUDIT: tạo voucher
    req.auditAction  = "voucher.create";
    req.auditSummary = `Tạo voucher ${v.code} (scope=${v.scope}, type=${v.discount_type}, value=${v.value})`;
    req.auditTarget  = {
      type: "Voucher",
      id:   v._id,
      name: v.code,
    };

    res.status(201).json({ message: "Voucher created", voucher: v });

  } catch (err) { next(err); }
}

/* ============================================================
   UPDATE
   ============================================================ */
async function updateVoucher(req, res, next) {
  try {
    const updated = await Voucher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!updated) return res.status(404).json({ message: "Voucher not found" });

    // ⭐ AUDIT: cập nhật voucher
    const changedFields = Object.keys(req.body || {});
    req.auditAction  = "voucher.update";
    req.auditSummary = `Cập nhật voucher ${updated.code}: ${changedFields.join(", ") || "không thay đổi trường nào"}`;
    req.auditTarget  = {
      type: "Voucher",
      id:   updated._id,
      name: updated.code,
    };

    res.json({ message: "Voucher updated", voucher: updated });

  } catch (err) { next(err); }
}

/* ============================================================
   DELETE
   ============================================================ */
async function removeVoucher(req, res, next) {
  try {
    const deleted = await Voucher.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Voucher not found" });

    // ⭐ AUDIT: xóa voucher
    req.auditAction  = "voucher.delete";
    req.auditSummary = `Xóa voucher ${deleted.code}`;
    req.auditTarget  = {
      type: "Voucher",
      id:   deleted._id,
      name: deleted.code,
    };

    res.json({ message: "Voucher deleted" });

  } catch (err) { next(err); }
}

/* ============================================================
   VALIDATE VOUCHER
   ============================================================ */
async function validateVoucher(req, res, next) {
  try {
    const code = String(req.params.code || "").toUpperCase();

    const v = await Voucher.findOne({ code });
    if (!v) return res.status(404).json({ valid: false, message: "Voucher không tồn tại" });

    const now = new Date();

    const valid =
      v.active &&
      (!v.start_date || now >= v.start_date) &&
      (!v.end_date || now <= v.end_date) &&
      (!v.usage_limit || v.used_count < v.usage_limit);

    res.json({ valid, voucher: v });

  } catch (err) { next(err); }
}

/* ============================================================
   USER ADD VOUCHER (MANUAL)
   ============================================================ */
async function addUserVoucher(req, res, next) {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    const voucher = await Voucher.findOne({ code: code.toUpperCase() });
    if (!voucher)
      return res.status(404).json({ message: "Voucher không tồn tại" });

    if (voucher.distribute_type === "auto")
      return res.status(400).json({ message: "Voucher này được phát tự động" });

    const now = new Date();
    if (voucher.start_date && now < voucher.start_date)
      return res.status(400).json({ message: "Voucher chưa bắt đầu" });

    if (voucher.end_date && now > voucher.end_date)
      return res.status(400).json({ message: "Voucher đã hết hạn" });

    if (voucher.usage_limit > 0 && voucher.used_count >= voucher.usage_limit)
      return res.status(400).json({ message: "Voucher đã hết lượt sử dụng" });

    const existed = await UserVoucher.findOne({ user: userId, voucher: voucher._id });
    if (existed)
      return res.status(400).json({ message: "Bạn đã nhận voucher này rồi" });

    // ⭐ create user voucher with usage limit
    const uv = await UserVoucher.create({
      user: userId,
      voucher: voucher._id,
      usage_limit: voucher.usage_limit,
      used_count: 0
    });

    res.json({ message: "Nhận voucher thành công", item: uv });

  } catch (err) { next(err); }
}

/* ============================================================
   USER LIST VOUCHERS
   ============================================================ */
async function myVouchers(req, res, next) {
  try {
    const userId = req.user.id;

    const items = await UserVoucher.find({ user: userId })
      .populate("voucher")
      .sort({ createdAt: -1 })
      .lean();

    // BỎ QUA record nào voucher=null
    const mapped = items
      .filter(v => v.voucher) 
      .map((v) => ({
        id: v._id,
        code: v.voucher.code,
        scope: v.voucher.scope,
        type: v.voucher.discount_type,
        value: v.voucher.value,
        max_discount: v.voucher.max_discount,
        end_date: v.voucher.end_date,
        used: v.used,
        distribute_type: v.voucher.distribute_type,
        used_count: v.voucher.used_count ?? 0,
        usage_limit: v.voucher.usage_limit ?? 0,
      }));

    res.json({ items: mapped });

  } catch (err) {
    console.error("MY_VOUCHER_ERR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}




/* ============================================================
   USE VOUCHER
   ============================================================ */
async function useVoucher(req, res, next) {
  try {
    const uv = await UserVoucher.findById(req.params.id).populate("voucher");
    if (!uv)
      return res.status(404).json({ message: "Không tìm thấy voucher" });

    if (uv.used)
      return res.status(400).json({ message: "Voucher đã được sử dụng" });

    // Mark user voucher used
    uv.used = true;
    uv.used_count += 1;
    await uv.save();

    // Increase global voucher usage
    uv.voucher.used_count = (uv.voucher.used_count || 0) + 1;
    await uv.voucher.save();

    res.json({ message: "Đã dùng voucher", item: uv });

  } catch (err) { next(err); }
}

/* ============================================================
   EXPORT
   ============================================================ */
module.exports = {
  publicList,
  createVoucher,
  updateVoucher,
  removeVoucher,
  validateVoucher,
  addUserVoucher,
  myVouchers,
  useVoucher
};
