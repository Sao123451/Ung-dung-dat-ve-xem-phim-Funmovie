// controller/paymentController.js
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');

exports.createPayment = async (req, res, next) => {
  try {
    const { ticketId, amount, method, transaction_id } = req.body;
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const payment = await Payment.create({ ticket: ticketId, amount, method, transaction_id, status: 'success', payment_time: new Date() });

    // Optionally update ticket status
    ticket.status = 'booked';
    await ticket.save();

    res.status(201).json({ message: 'Payment recorded', payment });
  } catch (err) { next(err); }
};

exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find().populate('ticket');
    res.json(payments);
  } catch (err) { next(err); }
};
