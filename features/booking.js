// features/booking.js
import { api } from "../core/api.js";
import { showToast } from "../core/helper.js";
import { S } from "../core/state.js";
import { switchView } from "../core/routes.js";
import { loadPrintTicket } from "./print.js";

/* ============================================================
   BUILD PAYLOAD
============================================================ */
export function buildBookingPayload() {

    const seatIds = [...S.seatsSelected].map(k => S.seatIdByKey.get(k));
    const combos = (S.comboPick || []).map(c => ({
        productId: c.product_id || c.id,
        qty: c.qty
    }));

    const payMap = {
        "Tiền mặt": "cash",
        "Chuyển khoản": "bank",
        "MOMO": "momo",
        "VNPay": "vnpay",
        "Thẻ ngân hàng": "card"
    };

    return {
        membership_card: S.memberCard || null,
        showtimeId: S.pickedShowtime._id,
        seatIds,
        combos,
        payment_method: payMap[S.payMethod] || "cash"
    };
}

/* ============================================================
   STAFF CONFIRM PAYMENT
============================================================ */
export function bindConfirmPay() {

    const btn = document.getElementById("btnConfirmPay");
    if (!btn) return;

    btn.onclick = async () => {

        const payload = buildBookingPayload();

        try {

            // CREATE PAID TICKET
            const res = await api("/bookings/staff-create", {
                method: "POST",
                body: payload
            });

            if (!res || !res.ticket_id) {
                showToast("Không tạo được vé!");
                return;
            }

            // ⭐ LẤY DETAIL ĐÚNG ROUTE STAFF
            const detail = await api(`/bookings/detailBooking/${res.ticket_id}`);

            S.lastTicketId = res.ticket_id;
            S.lastTicketDetail = detail;

            showToast("✔ Đặt vé thành công!");

            await loadPrintTicket(res.ticket_id);
            switchView("print");

        } catch (e) {
            console.error("Lỗi tạo vé:", e);
            showToast("Lỗi tạo vé!");
        }
    };
}
