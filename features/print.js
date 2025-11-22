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
        const movieTitle = t.movie_title || "Không rõ phim";
        const cinemaName = t.cinema_name || t.cinema_snapshot?.name || "Không rõ rạp";
        const roomName = t.room_name || "Không rõ phòng";

        const start = t.showtime_start ? new Date(t.showtime_start) : null;

        const date = start ? start.toLocaleDateString("vi-VN") : "—";
        const time = start
            ? start.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
            })
            : "—";

        const seats = Array.isArray(t.seats) ? t.seats.join(", ") : "—";

        const comboList = t.combos?.length
            ? t.combos
                  .map(
                      (cb) => `
                <div class="ticket-row">
                    <span class="ticket-label">${esc(cb.name)}</span>
                    <span class="ticket-value">${cb.qty} × ${cb.unit_price.toLocaleString(
                        "vi-VN"
                    )}đ</span>
                </div>
            `
                  )
                  .join("")
            : `
            <div class="ticket-row">
                <span class="ticket-label">Combo</span>
                <span class="ticket-value">Không có</span>
            </div>`;

        const voucherList = t.vouchers?.length
            ? t.vouchers
                  .map(
                      (code) => `
                <div class="ticket-row">
                    <span class="ticket-label">Voucher</span>
                    <span class="ticket-value">${esc(code)}</span>
                </div>
            `
                  )
                  .join("")
            : `
            <div class="ticket-row">
                <span class="ticket-label">Voucher</span>
                <span class="ticket-value">Không áp dụng</span>
            </div>`;

        const total = Number(t.total || 0);

        /* ======================================================
           HTML TEMPLATE — 2 CỘT, GIỮA TRANG, BO GÓC
        ====================================================== */

        wrap.innerHTML = `
            <div class="print-ticket-card">

                <div class="ticket-header">
                    ${esc(cinemaName)}<br>
                    <strong>${esc(movieTitle)}</strong>
                </div>

                <div class="ticket-line"></div>

                <div class="ticket-row"><span class="ticket-label">Phòng</span><span class="ticket-value">${esc(roomName)}</span></div>
                <div class="ticket-row"><span class="ticket-label">Ngày</span><span class="ticket-value">${date}</span></div>
                <div class="ticket-row"><span class="ticket-label">Giờ</span><span class="ticket-value">${time}</span></div>
                <div class="ticket-row"><span class="ticket-label">Ghế</span><span class="ticket-value">${seats}</span></div>

                <div class="ticket-line"></div>

                ${comboList}

                <div class="ticket-line"></div>

                ${voucherList}

                <div class="ticket-line"></div>

                <div class="ticket-row">
                    <span class="ticket-label">Tổng tiền</span>
                    <span class="ticket-value">${total.toLocaleString("vi-VN")}đ</span>
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
            width: 170,
            height: 170,
            text: t.reservation_code || t._id,
        });

    } catch (err) {
        console.error("PRINT ERROR:", err);
        wrap.innerHTML = `<div class="text-danger">Lỗi tải vé!</div>`;
    }
}
