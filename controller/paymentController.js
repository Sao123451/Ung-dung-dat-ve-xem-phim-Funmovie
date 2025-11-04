const Payment = require('../models/Payment');
const Ticket  = require('../models/Ticket');
const TicketSeat = require('../models/TicketSeat');
const Seat    = require('../models/Seat');
const Voucher = require('../models/Voucher');

const isId = v => /^[0-9a-fA-F]{24}$/.test(String(v||'').trim());

async function confirmTicketAtomic(ticketId) {
  const t = await Ticket.findById(ticketId);
  if (!t || t.status !== 'pending') return t;

  // snapshot reserved -> sold, bỏ TTL
  await TicketSeat.updateMany(
    { ticket: t._id, status: 'reserved', expires_at: { $gt: new Date() } },
    { $set: { status: 'sold' }, $unset: { expires_at: 1 } }
  );

  // ghế thật -> sold
  const seatDocs = await TicketSeat.find({ ticket: t._id }).select('seat').lean();
  const seatIds = seatDocs.map(s => s.seat);
  if (seatIds.length) {
    await Seat.updateMany({ _id: { $in: seatIds } }, { $set: { seat_status: 'sold' } });
  }

  // ticket + voucher
  t.status = 'paid';
  t.payment_status = 'paid';
  await t.save();

  if (t.voucher_codes?.length) {
    await Voucher.updateMany({ code: { $in: t.voucher_codes } }, { $inc: { used_count: 1 } });
  }
  return t;
}

/** POST /api/payments/init  (Bearer) */
exports.init = async (req, res, next) => {
  try {
    const { ticketId, method = 'cash' } = req.body || {};
    if (!isId(ticketId)) return res.status(400).json({ message: 'Invalid ticketId' });

    const t = await Ticket.findById(ticketId);
    if (!t) return res.status(404).json({ message: 'Ticket not found' });
    if (t.status !== 'pending') return res.status(400).json({ message: 'Ticket is not pending' });

    const m = String(method).toLowerCase();
    const pay = await Payment.create({
      ticket: t._id,
      user: t.user,
      method: m,
      amount: t.total_after,
      status: m === 'cash' ? 'succeeded' : 'pending',
      meta: { createdBy: 'api' }
    });

    // cash -> auto confirm vé & gán payment_id/method
    if (m === 'cash') {
      await confirmTicketAtomic(t._id);
      t.payment_method = 'cash';
      t.payment_id = pay._id;
      await t.save();
      return res.status(201).json({ message: 'Payment created & ticket confirmed (cash)', payment: pay });
    }

    // online -> trả mock deeplink để FE test
    const mock = {
      deeplink: `funmovie://${m}/pay?paymentId=${pay._id}`,
      redirect_url: `/payments/${pay._id}/simulate/${m}`
    };
    res.status(201).json({ message: 'Payment created', payment: pay, next: mock });
  } catch (err) { next(err); }
};

/** POST /api/payments/:id/mark  (webhook/staff) */
exports.mark = async (req, res, next) => {
  try {
    const id = String(req.params.id||'').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });

    const { status, provider_txn_id, provider_message, meta } = req.body || {};
    if (!['succeeded','failed','refunded','pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const p = await Payment.findByIdAndUpdate(
      id,
      { $set: { status, provider_txn_id, provider_message, meta } },
      { new: true }
    ).populate('ticket');

    if (!p) return res.status(404).json({ message: 'Payment not found' });

    // nếu succeeded -> auto confirm vé & gán payment_id/method
    if (p.status === 'succeeded' && p.ticket && p.ticket.status === 'pending') {
      const t = await confirmTicketAtomic(p.ticket._id);
      t.payment_method = p.method;
      t.payment_id = p._id;
      await t.save();
    }

    res.json({ message: 'Payment updated', payment: p });
  } catch (err) { next(err); }
};
