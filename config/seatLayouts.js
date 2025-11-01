// config/seatLayouts.js

// Hàng A, B, C...
const rowLabel = (i) => String.fromCharCode(65 + i);

/**
 * Tạo 2 cặp ghế couple giữa phòng theo số cột
 * VD: cols=10 → [4,5] và [6,7]
 */
function couplePairs(cols) {
  const leftCenter = Math.floor(cols / 2) - 2;
  const lc = Math.max(0, Math.min(leftCenter, cols - 4));
  return [
    [lc, lc + 1],
    [lc + 2, lc + 3],
  ];
}

/**
 * Preset chuẩn:
 * - Trên cùng NORMAL
 * - 2 hàng trước màn hình là VIP
 * - 2 hàng cuối cùng COUPLE (ở giữa)
 */
function makeBottomVipCouplePreset({ key, label, rows, cols, vipExtra, coupleExtra }) {
  return {
    key,
    label,
    rows,
    cols,
    seatTypeAt(rowIdx, colIdx) {
      if (rowIdx >= rows - 2) {
        const couples = couplePairs(cols);
        for (const [c1, c2] of couples) {
          if (colIdx === c1 || colIdx === c2) return 'couple';
        }
        return 'normal';
      }
      if (rowIdx >= rows - 4 && rowIdx < rows - 2) {
        return 'vip';
      }
      return 'normal';
    },
    priceExtraOf(type) {
      if (type === 'vip') return vipExtra;
      if (type === 'couple') return coupleExtra;
      return 0;
    },
  };
}

const PRESETS = {
  STD_8x10: makeBottomVipCouplePreset({
    key: 'STD_8x10',
    label: 'Chuẩn • 8×10 (VIP & Couple dưới)',
    rows: 8, cols: 10, vipExtra: 15000, coupleExtra: 25000,
  }),
  STD_8x8: makeBottomVipCouplePreset({
    key: 'STD_8x8',
    label: 'Chuẩn • 8×8 (VIP & Couple dưới)',
    rows: 8, cols: 8, vipExtra: 15000, coupleExtra: 25000,
  }),
  STD_10x10: makeBottomVipCouplePreset({
    key: 'STD_10x10',
    label: 'Chuẩn • 10×10 (VIP & Couple dưới)',
    rows: 10, cols: 10, vipExtra: 20000, coupleExtra: 30000,
  }),
  STD_10x12: makeBottomVipCouplePreset({
    key: 'STD_10x12',
    label: 'Chuẩn • 10×12 (VIP & Couple dưới)',
    rows: 10, cols: 12, vipExtra: 20000, coupleExtra: 30000,
  }),
};

// Cho phép dùng STD_8*10 → đổi sang STD_8x10
function normalizeLayoutKey(raw) {
  if (!raw) return raw;
  return String(raw).trim().replace('*', 'x');
}

module.exports = { PRESETS, rowLabel, normalizeLayoutKey };
