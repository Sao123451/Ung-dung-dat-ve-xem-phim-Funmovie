// models/News.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NewsSchema = new Schema({
  title:        { type: String, required: true, trim: true },
  slug:         { type: String, required: true, unique: true, index: true },
  content:      { type: String, required: true },
  excerpt:      { type: String, default: '' },
  cover_image:  { type: String, default: '' },

  // ⭐ PHÂN LOẠI TIN TỨC / KHUYẾN MÃI
  category:     { type: String, enum: ['news','promotion'], default: 'news', index: true },

  tags:         [{ type: String, trim: true, lowercase: true }],
  is_published: { type: Boolean, default: false },
  published_at: { type: Date, default: null },
  author:       { type: Schema.Types.ObjectId, ref: 'User' },
  view_count:   { type: Number, default: 0 }
}, { timestamps: true });

// text search
NewsSchema.index(
  { title: 'text', content: 'text' },
  { weights: { title: 5, content: 2 } }
);

// slug generator
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
