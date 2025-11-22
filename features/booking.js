// features/booking.js — VERSION REMOVED OFFLINE, DIRECT PRINT

import { api } from "../core/api.js";
import { showToast } from "../core/helper.js";
import { S } from "../core/state.js";
import { switchView } from "../core/routes.js";
import { loadPrintTicket } from "./print.js";   // ✔ dùng print.js, bỏ offline.js

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
        vouchers: S.voucherCode ? [S.voucherCode] : [],
        payment_method: payMap[S.payMethod] || "cash"
    };
}

/* ============================================================
   STAFF CONFIRM PAYMENT (UNPAID → PAID)
============================================================ */
export function bindConfirmPay() {

    const btn = document.getElementById("btnConfirmPay");
    if (!btn) return;

    btn.onclick = async () => {

        const payload = buildBookingPayload();
        if (!payload) return showToast("Lỗi dữ liệu tạo vé!");

        try {
            const res = await api("/bookings/staff-create", {
                method: "POST",
                body: payload
            });

            if (!res || !res.ticket_id) {
                showToast("Không tạo được vé!");
                return;
            }

            /* ⭐ LẤY CHI TIẾT VÉ CHUẨN CHO WEB STAFF */
            const detail = await api(`/bookings/detail/${res.ticket_id}`);

            S.lastTicketId = res.ticket_id;
            S.lastTicketDetail = detail;

            showToast("✔ Đặt vé thành công!");

            // ⭐⭐ BỎ OFFLINE – NHẢY THẲNG VÀO TRANG IN VÉ
            await loadPrintTicket(res.ticket_id);
            switchView("print");

        } catch (e) {
            console.error(e);
            showToast("Lỗi tạo vé!");
        }
    };
}

/* ============================================================
   STAFF CREATE PAID BOOKING (KHÁCH TRẢ TRƯỚC)
============================================================ */
export async function createPaidBooking() {

    if (!S.seatsSelected.size)
        return showToast("Bạn chưa chọn ghế!");

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

    const payload = {
        showtimeId: S.pickedShowtime._id,
        seatIds: [...S.seatsSelected].map(k => S.seatIdByKey.get(k)),
        combos,
        vouchers: S.voucherCode ? [S.voucherCode] : [],
        payment_method: payMap[S.payMethod] || "cash",
        payment_status: "paid"
    };

    try {
        const res = await api("/bookings/staff-create", {
            method: "POST",
            body: payload
        });

        if (!res.ticket_id)
            return showToast("Không tạo được vé!");

        /* ⭐ LẤY CHI TIẾT */
        const detail = await api(`/bookings/detail/${res.ticket_id}`);

        S.lastTicketId = res.ticket_id;
        S.lastTicketDetail = detail;

        showToast("✔ Đã thanh toán!");

        // ⭐⭐ BỎ OFFLINE – NHẢY THẲNG VÀO TRANG IN VÉ
        await loadPrintTicket(res.ticket_id);
        switchView("print");

    } catch (err) {
        console.error(err);
        showToast("Lỗi tạo vé!");
    }
}

/* ============================================================
   GLOBAL POPUP
============================================================ */
window.showMidAlert = function (msg) {
    const box = document.getElementById("midAlert");
    const msgEl = document.getElementById("midAlertMsg");

    if (!box || !msgEl) return;
    msgEl.textContent = msg;
    box.classList.remove("d-none");
};

window.hideMidAlert = function () {
    const box = document.getElementById("midAlert");
    if (box) box.classList.add("d-none");
};
