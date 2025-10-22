// controller/bookingController.js
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Showtime = require('../models/Showtime');
const Seat = require('../models/Seat');
const { generateQRDataURL } = require('../utils/qr');

// create booking (basic, not transactional here)
// Expected body: { userId, showtimeId, seats: [{seatId, label}], voucherCode? }
exports.createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { userId, showtimeId, seats, voucherId } = req.body;
    // Validate showtime
    const show = await Showtime.findById(showtimeId).session(session);
    if (!show) throw { status: 404, message: 'Showtime not found' };

    // Check seats availability: ensure seats exist and not already booked for this showtime
    // Simplified: we don't have a seat-reservation collection, so assume seat free by business rule
    // Compute total
    let total = 0;
    for (const s of seats) {
      const seatDoc = await Seat.findById(s.seatId).session(session);
      if (!seatDoc) throw { status: 404, message: `Seat ${s.seatId} not found` };
      total += (show.ticket_price + (seatDoc.extra_price || 0));
    }

    // Create ticket
    const ticket = await Ticket.create([{
      user: userId,
      showtime: showtimeId,
      seats: seats.map(s => ({ seat: s.seatId, label: s.label || '' })),
      total_amount: total
    }], { session });

    const ticketDoc = ticket[0];

    // Generate QR
    const qr = await generateQRDataURL({ ticketId: ticketDoc._id, showtimeId, userId });
    ticketDoc.qr_code = qr;
    await ticketDoc.save({ session });

    // Decrease available_seats
    show.available_seats = Math.max(0, (show.available_seats || 0) - seats.length);
    await show.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'Booking created', ticket: ticketDoc });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// Get bookings for user
exports.getByUser = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user._id;
    const tickets = await Ticket.find({ user: userId }).populate('showtime').populate('seats.seat');
    res.json(tickets);
  } catch (err) { next(err); }
};
