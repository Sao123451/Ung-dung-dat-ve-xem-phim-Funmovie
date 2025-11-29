// models/AuditLog.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Mã hành động: "login", "movie.create", "movie.update", "ticket.cancel"...
    action: { type: String, required: true },

    // Mô tả ngắn gọn để hiển thị UI
    summary: { type: String, required: true },

    // Thông tin đối tượng tác động (tùy ý)
    target_type: { type: String },   // "Movie", "Showtime", "Ticket"...
    target_id: { type: String },
    target_name: { type: String },

    // Thông tin request
    method: { type: String },
    path: { type: String },
    ip: { type: String },

    // Kết quả
    success: { type: Boolean, default: true },
    status_code: { type: Number },

    // Thêm meta nếu cần debug sâu (không bắt buộc)
    meta: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
