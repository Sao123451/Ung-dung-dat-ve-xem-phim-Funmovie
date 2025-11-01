// models/News.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NewsSchema = new Schema({
  title:        { type: String, required: true, trim: true },
  slug:         { type: String, required: true, unique: true, index: true }, // tạo từ title
  content:      { type: String, required: true },        // HTML/Markdown
  excerpt:      { type: String, default: '' },           // tóm tắt ngắn
  cover_image:  { type: String, default: '' },           // /public/uploads/xxx.jpg
  tags:         [{ type: String, trim: true, lowercase: true }],
  is_published: { type: Boolean, default: false },
  published_at: { type: Date, default: null },
  author:       { type: Schema.Types.ObjectId, ref: 'User' },
  view_count:   { type: Number, default: 0 }
}, { timestamps: true });

// text search hỗ trợ q=
NewsSchema.index({ title: 'text', content: 'text', tags: 'text' }, { weights: { title: 5, content: 2 } });

// Tạo slug nếu chưa có
function toSlug(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
NewsSchema.pre('validate', function(next) {
  if (!this.slug && this.title) this.slug = toSlug(this.title);
  next();
});

module.exports = mongoose.model('News', NewsSchema);
