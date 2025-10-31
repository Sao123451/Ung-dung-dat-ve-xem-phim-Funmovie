// models/Wishlist.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const WishlistSchema = new Schema({
  user:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true, index: true },
}, { timestamps: true });

// Mỗi movie chỉ được ưa thích 1 lần bởi 1 user
WishlistSchema.index({ user: 1, movie: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', WishlistSchema);
