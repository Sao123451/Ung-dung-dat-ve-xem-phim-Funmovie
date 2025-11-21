export const S = {
    movieTab: "now",

    // Movies
    allMovies: [],
    nowMovies: [],
    comingMovies: [],
    movie: null,

    // Cinema
    cinemas: [],
    staffCinemaId: null,
    staffCinemaName: null,

    // Showtime
    showtimes: [],
    pickedShowtime: null,

    // Seats
    seatsRaw: [],
    seatByKey: new Map(),
    seatIdByKey: new Map(),
    seatsSelected: new Set(),

    // Voucher
    voucherCode: "",
    voucherInfo: null,
    voucherOptions: [],
    voucherPay: null,

    // Combo
    combos: [],
    comboPick: [],
    comboList: [],

    // Payment method
    payMethod: "Tiền mặt",

    // Booking
    lastTicketId: null,
    lastTicketTotal: 0     // ⭐ THÊM — lưu tổng tiền sau giảm giá
};

export const SEAT_HOLD_SECONDS = 2 * 60;

// ⭐ GHẾ CHỈ BỊ KHÓA KHI THỰC SỰ SOLD
export const BAD_STATUSES = new Set([
    "sold",
    "broken"
]);
