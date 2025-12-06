// features/print.js
import { api } from "../core/api.js";
import { esc } from "../core/helper.js";
import { S } from "../core/state.js";

/* ============================================================
   FORMAT GIỜ VIỆT NAM — KHÔNG LỆCH +7
============================================================ */
function formatVN(iso) {
    if (!iso) return "—";
    const d = new Date(iso);     // lấy giờ local
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
}

export async function loadPrintTicket(ticketId = null) {

    const wrap = document.getElementById("printWrap");
    wrap.innerHTML = `<div class="text-center muted">Đang tải vé...</div>`;

    try {
        if (!ticketId) ticketId = S.lastTicketId;

        // ⭐ STAFF DETAIL API
        const t = await api(`/bookings/detailBooking/${ticketId}`);

        if (!t || t.status !== "paid") {
            wrap.innerHTML = `<div class="text-danger">Vé chưa thanh toán — không thể in.</div>`;
            return;
        }

        // Ngừng TIMER giữ ghế
        import("../features/seats.js").then(m => m.clearSeatTimer());

        S.lastTicketId = ticketId;

        // ===== THÔNG TIN =====
        const movieTitle = esc(t.movie_title || "Không rõ phim");
        const cinemaName = esc(t.cinema_name || "");
        const roomName = esc(t.room_name || "");

        // ⭐⭐⭐ GIỜ CHIẾU CHUẨN VN ⭐⭐⭐
        const time = formatVN(t.showtime_start);

        // Ngày — vẫn theo locale VN
        const start = t.showtime_start ? new Date(t.showtime_start) : null;
        const date = start ? start.toLocaleDateString("vi-VN") : "—";

        const seats = t.seats?.length ? t.seats.join(", ") : "—";

        // COMBO
        const comboList = t.combos?.length
            ? t.combos.map(cb => `
                <div class="ticket-row">
                    <span class="ticket-label">${esc(cb.name)}</span>
                    <span class="ticket-value">${cb.qty} × ${cb.unit_price.toLocaleString("vi-VN")}đ</span>
                </div>
              `).join("")
            : `
              <div class="ticket-row">
                <span class="ticket-label">Combo</span>
                <span class="ticket-value">Không có</span>
              </div>`;

        const memberCard = t.membership_card || "Không có";

        // TỔNG TIỀN
        const total =
            (t.total_after ?? t.total_before ??
                (t.seat_subtotal + t.combo_subtotal)) || 0;

        // ===== RENDER VÉ =====
        wrap.innerHTML = `
            <div class="print-ticket-card">

                <div class="ticket-header">
                    ${cinemaName}<br><strong>${movieTitle}</strong>
                </div>

                <div class="ticket-line"></div>

                <div class="ticket-row"><span class="ticket-label">Phòng</span><span>${roomName}</span></div>
                <div class="ticket-row"><span class="ticket-label">Ngày</span><span>${date}</span></div>
                <div class="ticket-row"><span class="ticket-label">Giờ</span><span>${time}</span></div>
                <div class="ticket-row"><span class="ticket-label">Ghế</span><span>${seats}</span></div>

                <div class="ticket-line"></div>

                ${comboList}

                <div class="ticket-line"></div>

                <div class="ticket-row"><span>Thẻ thành viên</span><span>${memberCard}</span></div>

                <div class="ticket-line"></div>

                <div class="ticket-row">
                    <span>Tổng tiền</span>
                    <span>${total.toLocaleString("vi-VN")}đ</span>
                </div>

                <div id="printTicketQRCode"></div>

                <button class="print-ticket-btn" onclick="window.print()">In vé</button>
            </div>
        `;

        // QR CODE
        new QRCode(document.getElementById("printTicketQRCode"), {
            width: 170,
            height: 170,
            text: t.reservation_code || t._id,
        });

    } catch (err) {
        console.error("PRINT ERROR:", err);
        wrap.innerHTML = `<div class="text-danger">Lỗi tải vé!</div>`;
    }
}
