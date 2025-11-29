require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const connectDB = require('./config/db');
const auditLogger = require('./middlewares/auditLogger');

const app = express();
connectDB();

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  cacheControl: true,
  maxAge: 0
}));

<<<<<<< Updated upstream
// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
=======
// Security headers
>>>>>>> Stashed changes
app.use(helmet());

/* ============================================================
   ✅ CORS CHUẨN — CHO PHÉP WEB ADMIN + WEB STAFF
============================================================ */
app.use(cors({
<<<<<<< Updated upstream
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: false,
  allowedHeaders: ["Authorization", "Content-Type"]
=======
  origin: [
    "http://localhost:5173",  // Web Admin
    "http://localhost:5500"   // Web Staff
  ],
  credentials: false          // dùng Bearer token => không cần cookie
>>>>>>> Stashed changes
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
<<<<<<< Updated upstream
//app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(auditLogger);
=======
>>>>>>> Stashed changes

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
app.use('/api/banners', require('./routes/banners'));
app.use('/api/ticket-seats', require('./routes/ticketSeats'));
<<<<<<< Updated upstream
app.use("/api/audit-logs", require("./routes/auditLogs"));
// app.use('/api/notifications', require('./routes/notifications'));
=======
>>>>>>> Stashed changes
app.use('/api/news', require('./routes/news'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/products', require('./routes/products'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: '🎬 FunMovie API is running!' });
});

// Error handler (optional)
// const errorHandler = require('./middlewares/errorHandler');
// app.use(errorHandler);

module.exports = app;
