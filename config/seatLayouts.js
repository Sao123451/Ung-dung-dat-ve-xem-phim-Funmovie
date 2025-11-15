// config/seatLayouts.js

// Hàng A, B, C...
const rowLabel = (i) => String.fromCharCode(65 + i);

/**
 * Preset:
 * - Tầng 1: TẤT CẢ HÀNG TRÊN = NORMAL
 * - Tầng 2: 1 HÀNG VIP (ngay trên hàng couple)
 * - Tầng 3: HÀNG CUỐI = FULL GHẾ ĐÔI (COUPLE)
 */
function makeNormalVipCouplePreset({ key, label, rows, cols, vipExtra, coupleExtra }) {
  
  const coupleRow = rows - 1;       // hàng cuối
  const vipRow = rows - 2;          // hàng VIP (1 hàng)

  return {
    key,
    label,
    rows,
    cols,

    seatTypeAt(rowIdx, colIdx) {

      // ===== HÀNG CUỐI → FULL COUPLE =====
      if (rowIdx === coupleRow) return 'couple';

      // ===== HÀNG VIP → FULL VIP =====
      if (rowIdx === vipRow) return 'vip';

      // ===== CÁC HÀNG TRÊN → NORMAL =====
      return 'normal';
    },

    priceExtraOf(type) {
      if (type === 'vip') return vipExtra;
      if (type === 'couple') return coupleExtra;
      return 0;
    },
  };
}


// ====== PRESETS ======
const PRESETS = {
  STD_8x10: makeNormalVipCouplePreset({
    key: 'STD_8x10',
    label: 'Chuẩn • 8×10 (Normal → VIP → Couple FULL)',
    rows: 8,
    cols: 10,
    vipExtra: 15000,
    coupleExtra: 25000,
  }),
  STD_8x8: makeNormalVipCouplePreset({
    key: 'STD_8x8',
    label: 'Chuẩn • 8×8 (Normal → VIP → Couple FULL)',
    rows: 8,
    cols: 8,
    vipExtra: 15000,
    coupleExtra: 25000,
  }),
  STD_10x10: makeNormalVipCouplePreset({
    key: 'STD_10x10',
    label: 'Chuẩn • 10×10 (Normal → VIP → Couple FULL)',
    rows: 10,
    cols: 10,
    vipExtra: 20000,
    coupleExtra: 30000,
  }),
  STD_10x12: makeNormalVipCouplePreset({
    key: 'STD_10x12',
    label: 'Chuẩn • 10×12 (Normal → VIP → Couple FULL)',
    rows: 10,
    cols: 12,
    vipExtra: 20000,
    coupleExtra: 30000,
  }),
};


// Giữ nguyên hàm normalize
function normalizeLayoutKey(raw) {
  if (!raw) return raw;
  return String(raw).trim().replace('*', 'x');
}

module.exports = { PRESETS, rowLabel, normalizeLayoutKey };
