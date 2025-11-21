export const S = {
    /* ======================================
       MOVIES
    ====================================== */
    movieTab: "now",
    allMovies: [],
    nowMovies: [],
    comingMovies: [],
    movie: null,

    /* ======================================
       CINEMA (STAFF WORKING)
    ====================================== */
    cinemas: [],
    staffCinemaId: null,
    staffCinemaName: null,

    /* ======================================
       SHOWTIME
    ====================================== */
    showtimes: [],
    pickedShowtime: null,

    /* ======================================
       SEATS
    ====================================== */
    seatsRaw: [],
    seatByKey: new Map(),        // key = "A1", value = Seat info
    seatIdByKey: new Map(),      // key = "A1", value = seatId (ShowtimeSeat ID)
    seatsSelected: new Set(),

    /* ======================================
       VOUCHER
    ====================================== */
    voucherCode: "",
    voucherInfo: null,
    voucherOptions: [],
    voucherPay: null,

    /* ======================================
       COMBOS
    ====================================== */
    combos: [],
    comboPick: [],
    comboList: [],

    /* ======================================
       PAYMENT METHOD
    ====================================== */
    payMethod: "Tiền mặt",

    /* ======================================
       BOOKING / OFFLINE / PRINT
    ====================================== */
    lastTicketId: null,          // ID vé vừa tạo
    lastTicketDetail: null,      // ⭐ CHÚ Ý — thêm để chứa dữ liệu vé đầy đủ
    lastTicketTotal: 0           // tổng tiền (tự động tính từ detail)
};

/* ==========================================
   GHẾ HOLD / STATUS
========================================== */
export const SEAT_HOLD_SECONDS = 2 * 60;

// Ghế đang thật sự bị khóa (sold/broken) — không click được
export const BAD_STATUSES = new Set([
    "sold",
    "broken"
]);
