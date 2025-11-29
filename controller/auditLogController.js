// controller/auditLogController.js
const AuditLog = require("../models/AuditLog");

exports.myLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    let {
      page = 1,
      limit = 20,
      from,
      to,
      action,
      success,
    } = req.query;

    page = Number(page) || 1;
    limit = Math.min(Number(limit) || 20, 100);

    const query = { user: userId };

    if (from) {
      query.created_at = query.created_at || {};
      query.created_at.$gte = new Date(from);
    }
    if (to) {
      query.created_at = query.created_at || {};
      const d = new Date(to);
      d.setDate(d.getDate() + 1);
      query.created_at.$lt = d;
    }

    if (action) query.action = action;

    if (success === "true") query.success = true;
    if (success === "false") query.success = false;

    const [items, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error("myLogs error:", err);
    res.status(500).json({ message: "Không tải được lịch sử hoạt động" });
  }
};
