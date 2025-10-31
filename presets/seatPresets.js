// presets/seatPresets.js

module.exports = {
  // Rạp tiêu chuẩn 2D: 10 hàng, 12 cột
  STD_2D_10x12: {
    cols: 12,
    rows: [
      "rrrrrrrrrrrr",
      "rrrrrrrrrrrr",
      "rrvvvvvvvvrr",
      "rrvvvvvvvvrr",
      "rrrrrrrrrrrr",
      "rrrrrrrrrrrr",
      "rrrrrrrrrrrr",
      "rrrrrrrrrrrr",
      "rrrrrrrrrrrr",
      "rrrrrrrrrrrr",
    ]
  },

  // Rạp 3D: máy chiếu lớn ở giữa
  STD_3D_10x12: {
    cols: 12,
    rows: [
      "rrrrrrrrrrrr",
      "rrrrrrrrrrrr",
      "rrvvvvvvvvrr",
      "rrvvvvvvvvrr",
      "rrrrccrrcccc", // ghế couple
      "rrrrccrrcccc",
      "rrrrrrrrrrrr",
      "rrrrrrrrrrrr",
      "rrrrrrrrrrrr",
      "rrrrrrrrrrrr",
    ]
  },

  // IMAX: rộng hơn, nhiều VIP hơn
  IMAX_12x16: {
    cols: 16,
    rows: [
      "rrrrrrrrrrrrrrrr",
      "rrrrrrrrrrrrrrrr",
      "rrvvvvvvvvvvvvrr",
      "rrvvvvvvvvvvvvrr",
      "rrccccccccccccrr",
      "rrccccccccccccrr",
      "rrrrrrrrrrrrrrrr",
      "rrrrrrrrrrrrrrrr",
      "rrrrrrrrrrrrrrrr",
      "rrrrrrrrrrrrrrrr",
      "rrrrrrrrrrrrrrrr",
      "rrrrrrrrrrrrrrrr",
    ]
  }
};
