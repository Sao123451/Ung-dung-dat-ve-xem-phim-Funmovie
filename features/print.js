import { api } from "../core/api.js";
import { esc } from "../core/helper.js";
import { S } from "../core/state.js";

export async function loadPrintTicket(ticketId = null) {
    const wrap = document.getElementById("printWrap");
    wrap.innerHTML = `<div class="text-center muted">Đang tải vé...</div>`;

    try {
        if (!ticketId) ticketId = S.lastTicketId;

        if (!ticketId) {
            wrap.innerHTML = `<div class="text-danger">Chưa có vé để in.</div>`;
            return;
        }

        // Lấy ticket
        const t = await api(`/bookings/${ticketId}`);

        if (!t || t.status !== "paid") {
            wrap.innerHTML = `<div class="text-danger">Chưa có vé hợp lệ để in.</div>`;
            return;
        }

        // Lấy showtime đầy đủ
        const show = await api(`/showtimes/${t.showtime}`);

        const movieTitle  = show.movie?.title  || t.movie_title  || "Không rõ phim";
        const cinemaName  = show.cinema?.name  || t.cinema_name  || "Không rõ rạp";
        const roomName    = show.room?.name    || t.room_name    || "Không rõ phòng";

        const date = new Date(show.start_time).toLocaleDateString("vi-VN");
        const time = new Date(show.start_time).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
        });

        const seats = Array.isArray(t.seats) ? t.seats.join(", ") : "—";

        // Lấy combo
        const combos = await api(`/ticket-combos/${ticketId}`);
        const comboHTML = combos.length
            ? combos.map(cb => `
                <div class="print-ticket-row">
                    <span class="label">${esc(cb.name)}</span>
                    <span class="value">${cb.qty} × ${cb.unit_price.toLocaleString("vi-VN")}đ</span>
                </div>
            `).join("")
            : `<div class="print-ticket-row"><span class="label">Combo</span><span class="value">Không có</span></div>`;

        // Voucher
        const voucherHTML = t.voucher_codes?.length
            ? t.voucher_codes.map(code => `
                <div class="print-ticket-row">
                    <span class="label">Voucher</span>
                    <span class="value">${esc(code)}</span>
                </div>
            `).join("")
            : `<div class="print-ticket-row"><span class="label">Voucher</span><span class="value">Không áp dụng</span></div>`;

        const total =
            t.total_after ||
            t.total_amount ||
            t.total ||
            0;

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

                ${comboHTML}
                <div class="ticket-line"></div>
                ${voucherHTML}

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

        // QR Code
        new QRCode(document.getElementById("printTicketQRCode"), {
            width: 160,
            height: 160,
            text: t._id
        });

    } catch (err) {
        console.error(err);
        wrap.innerHTML = `<div class="text-danger">Lỗi tải vé!</div>`;
    }
}
