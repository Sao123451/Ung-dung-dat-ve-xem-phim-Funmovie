// services/seatGenerator.js
const Seat = require('../models/Seat');
const { PRESETS, rowLabel } = require('../config/seatLayouts');

/** Xoá toàn bộ ghế cũ và sinh lại theo preset (KHÔNG dùng session/transaction) */
async function regenerateSeatsForRoom(room, presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) throw new Error('Preset not found');

  await Seat.deleteMany({ room: room._id });

  const docs = [];
  for (let r = 0; r < preset.rows; r++) {
    const rowName = rowLabel(r);
    for (let c = 0; c < preset.cols; c++) {
      const type = preset.seatTypeAt(r, c);
      const extra = preset.priceExtraOf(type);
      docs.push({
        room: room._id,
        row: rowName,
        number: c + 1,
        seat_type: type,
        extra_price: extra,
        seat_status: 'available',
      });
    }
  }

  const created = await Seat.insertMany(docs, { ordered: true });
  return created.length;
}

module.exports = { regenerateSeatsForRoom };
