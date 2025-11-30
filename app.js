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

/* STATIC FILES */
app.use(
  '/public',
  express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false,
    cacheControl: true,
    maxAge: 0,
  })
);
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'public/uploads'), {
    etag: false,
    lastModified: false,
    cacheControl: true,
    maxAge: 0,
  })
);

/* GLOBAL MIDDLEWARE */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/* CORS (phải chạy TRƯỚC helmet) */
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: false,
}));

/* HELMET */
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}));

app.use(morgan('dev'));
app.use(cookieParser());
app.use(auditLogger);

/* ROUTES */
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
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/news', require('./routes/news'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/products', require('./routes/products'));

/* HEALTH CHECK */
app.get('/', (req, res) => {
  res.json({ message: '🎬 FunMovie API is running!' });
});

module.exports = app;
