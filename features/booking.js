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
        "VNPay": "vnpay"
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
   STAFF CONFIRM PAYMENT (CASH + VNPAY)
============================================================ */
export function bindConfirmPay() {

    const btn = document.getElementById("btnConfirmPay");
    if (!btn) return;

    btn.onclick = async () => {

        const method = S.payMethod;
        const payload = buildBookingPayload();

        console.log("⭐ METHOD:", method);
        console.log("⭐ PAYLOAD:", payload);

        /* ============================================================
           ⭐ CASE 1 — VNPAY
        ============================================================= */
        if (method === "VNPay") {
            try {
                // ===== B1: Tạo ticket pending =====
                const ticket = await api("/bookings/staff-create-pending", {
                    method: "POST",
                    body: payload
                });

                if (!ticket || !ticket.ticket_id) {
                    showToast("Không tạo được ticket để thanh toán!");
                    return;
                }

                S.ticket_id = ticket.ticket_id;

                console.log("⭐ TICKET_ID:", S.ticket_id);

                // ===== B2: Lấy URL thanh toán VNPay =====
                const vnp = await api("/payments/vnpay/init", {
                    method: "POST",
                    body: { ticketId: S.ticket_id }   // 👈 ĐÚNG 100%
                });

                if (!vnp || !vnp.payment_url) {
                    showToast("Không lấy được URL VNPay!");
                    return;
                }

                console.log("⭐ VNPay URL:", vnp.payment_url);

                // ===== B3: Redirect cùng tab =====
                location.assign(vnp.payment_url);

                return;

            } catch (err) {
                console.error("🔥 VNPay Error:", err);
                showToast("Lỗi VNPay!");
                return;
            }
        }

        /* ============================================================
           ⭐ CASE 2 — TIỀN MẶT
        ============================================================= */
        try {
            const res = await api("/bookings/staff-create", {
                method: "POST",
                body: payload
            });

            if (!res || !res.ticket_id) {
                showToast("Không tạo được vé!");
                return;
            }

            const detail = await api(`/bookings/detailBooking/${res.ticket_id}`);

            S.lastTicketId = res.ticket_id;
            S.lastTicketDetail = detail;

            showToast("✔ Đặt vé thành công!");

            // 🔥 TẮT TIMER GIỮ GHẾ
            import("./seats.js").then(m => m.clearSeatTimer());

            // 🔥 Đánh dấu đã có ticket (để seats.js không redirect)
            S.lastTicketId = res.ticket_id;

            await loadPrintTicket(res.ticket_id);
            switchView("print");


        } catch (err) {
            console.error("🔥 CASH error:", err);
            showToast("Lỗi thanh toán tiền mặt!");
        }
    };
}
