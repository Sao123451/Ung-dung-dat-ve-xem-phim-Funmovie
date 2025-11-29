// middlewares/auditLogger.js  middlewares của tôi có chữ "s"
const AuditLog = require("../models/AuditLog");

/**
 * Dùng sau verifyToken.
 * Ở controller bạn gán:
 *   req.auditAction  = "movie.create";
 *   req.auditSummary = "Tạo phim mới: Avatar 3";
 *   req.auditTarget  = { type: "Movie", id: movie._id, name: movie.title };
 */
function auditLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", async () => {
    try {
      // Chỉ log khi có user (đã login) và có action
      if (!req.user || !req.user.id || !req.auditAction) return;

      const duration = Date.now() - start;

      const target = req.auditTarget || {};

      await AuditLog.create({
        user: req.user.id,
        action: req.auditAction,
        summary: req.auditSummary || req.auditAction,
        target_type: target.type,
        target_id: target.id,
        target_name: target.name,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        success: res.statusCode < 400,
        status_code: res.statusCode,
        meta: {
          duration_ms: duration,
        },
      });
    } catch (err) {
      console.error("auditLogger error:", err.message);
    }
  });

  next();
}

module.exports = auditLogger;
