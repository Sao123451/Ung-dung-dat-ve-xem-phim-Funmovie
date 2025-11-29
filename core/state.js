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
       MEMBERSHIP (TÍCH ĐIỂM)
    ====================================== */
    memberCard: null,            // ⭐ MÃ THẺ THÀNH VIÊN (NEW)

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
       BOOKING / PRINT
    ====================================== */
    lastTicketId: null,
    lastTicketDetail: null,
    lastTicketTotal: 0
};

/* ==========================================
   GHẾ HOLD / STATUS
========================================== */
export const SEAT_HOLD_SECONDS = 2 * 60;

// Ghế thật sự bị khóa (sold/broken)
export const BAD_STATUSES = new Set([
    "sold",
    "broken"
]);
