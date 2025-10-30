require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: false, // vì bạn đang dùng Bearer token, không cần cookie
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes (API only)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/showtimes', require('./routes/showtimes'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/cinemas', require('./routes/cinemas'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/seats', require('./routes/seats'));
app.use('/api/tickets', require('./routes/ticket'));
app.use('/api/vouchers', require('./routes/vouchers'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/reports', require('./routes/reports'));
app.use('/public', express.static(path.join(__dirname, 'public'))); // để serve ảnh upload
app.use('/api/banners', require('./routes/banners'));
app.use('/api/ticket-seats', require('./routes/ticketSeats'));
// app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/news', require('./routes/news'));
// app.use('/api/memberships', require('./routes/memberships'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: '🎬 FunMovie API is running!' });
});

// Error handler
const errorHandler = require('./middlewares/errorHandler');
// app.use(errorHandler);

module.exports = app;
