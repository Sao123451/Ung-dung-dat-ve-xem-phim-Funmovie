const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movie_booking';

    // ✅ Tắt retryWrites để driver KHÔNG tự sinh transaction number
    if (mongoURI.includes('?')) {
      mongoURI += '&retryWrites=false';
    } else {
      mongoURI += '?retryWrites=false';
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Tuy chọn thêm nếu cần:
      // useCreateIndex: true,
      // useFindAndModify: false,
    });

    console.log('✅ MongoDB connected successfully:', mongoURI);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
