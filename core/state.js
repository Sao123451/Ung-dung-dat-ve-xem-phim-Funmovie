export const S = {
    /* ======================================
       MOVIES
    ====================================== */
    movieTab: "now",       // now | early | coming
    allMovies: [],
    nowMovies: [],         // now_showing
    earlyMovies: [],       // coming
    comingMovies: [],      // archived
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
    seatByKey: new Map(),
    seatIdByKey: new Map(),
    seatsSelected: new Set(),

    /* ======================================
       MEMBERSHIP
    ====================================== */
    memberCard: null,

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

export const BAD_STATUSES = new Set([
    "sold",
    "broken"
]);
