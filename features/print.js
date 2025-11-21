import { api } from "../core/api.js";
import { esc } from "../core/helper.js";
import { S } from "../core/state.js";

/* ============================================================
   LOAD PRINT TICKET (STAFF)
============================================================ */
export async function loadPrintTicket(ticketId = null) {
    const wrap = document.getElementById("printWrap");
    wrap.innerHTML = `<div class="text-center muted">Đang tải vé...</div>`;

    try {
        if (!ticketId) ticketId = S.lastTicketId;
        if (!ticketId) {
            wrap.innerHTML = `<div class="text-danger">Chưa có vé để in.</div>`;
            return;
        }

        // 🔥 LẤY TOÀN BỘ CHI TIẾT TỪ API STAFF
        const t = await api(`/bookings/detail/${ticketId}`);

        if (!t || t.status !== "paid") {
            wrap.innerHTML = `<div class="text-danger">Vé chưa thanh toán — không thể in.</div>`;
            return;
        }

        /* ======================================================
           CHUẨN HÓA DỮ LIỆU
        ====================================================== */

        // Movie
        const movieTitle = t.movie_title || "Không rõ phim";

        // Cinema
        const cinemaName =
            t.cinema_name ||
            t.cinema_snapshot?.name ||
            "Không rõ rạp";

        // Room
        const roomName = t.room_name || "Không rõ phòng";

        // Showtime datetime
        const start = t.showtime_start ? new Date(t.showtime_start) : null;

        const date = start
            ? start.toLocaleDateString("vi-VN")
            : "—";

        const time = start
            ? start.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : "—";

        // Seats
        const seats = Array.isArray(t.seats)
            ? t.seats.join(", ")
            : "—";

        // Combos
        const comboList = (t.combos?.length)
            ? t.combos.map(cb => `
                <div class="print-ticket-row">
                    <span class="label">${esc(cb.name)}</span>
                    <span class="value">${cb.qty} × ${cb.unit_price.toLocaleString("vi-VN")}đ</span>
                </div>
            `).join("")
            : `<div class="print-ticket-row"><span class="label">Combo</span><span class="value">Không có</span></div>`;

        // Vouchers
        const voucherList = t.vouchers?.length
            ? t.vouchers.map(code => `
                <div class="print-ticket-row">
                    <span class="label">Voucher</span>
                    <span class="value">${esc(code)}</span>
                </div>
              `).join("")
            : `<div class="print-ticket-row"><span class="label">Voucher</span><span class="value">Không áp dụng</span></div>`;

        // Total
        const total = Number(t.total || 0);

        /* ======================================================
           RENDER HTML
        ====================================================== */

        wrap.innerHTML = `
            <div class="print-ticket-card">

                <div class="ticket-header">
                    ${esc(cinemaName)}<br>
                    <strong>${esc(movieTitle)}</strong>
                </div>

                <div class="ticket-line"></div>

                <div class="print-ticket-row"><span class="label">Phòng</span><span class="value">${esc(roomName)}</span></div>
                <div class="print-ticket-row"><span class="label">Ngày</span><span class="value">${date}</span></div>
                <div class="print-ticket-row"><span class="label">Giờ</span><span class="value">${time}</span></div>
                <div class="print-ticket-row"><span class="label">Ghế</span><span class="value">${seats}</span></div>

                <div class="ticket-line"></div>

                ${comboList}

                <div class="ticket-line"></div>

                ${voucherList}

                <div class="ticket-line"></div>

                <div class="print-ticket-row">
                    <span class="label">Tổng tiền</span>
                    <span class="value">${total.toLocaleString("vi-VN")}đ</span>
                </div>

                <div class="print-ticket-qr">
                    <div id="printTicketQRCode"></div>
                </div>

                <button class="print-ticket-btn" onclick="window.print()">
                    In vé
                </button>
            </div>
        `;

        /* ======================================================
           QR CODE
        ====================================================== */
        new QRCode(document.getElementById("printTicketQRCode"), {
            width: 160,
            height: 160,
            text: t.reservation_code || t._id
        });

    } catch (err) {
        console.error("PRINT ERROR:", err);
        wrap.innerHTML = `<div class="text-danger">Lỗi tải vé!</div>`;
    }
}
