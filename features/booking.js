import { api } from "../core/api.js";
import { showToast } from "../core/helper.js";
import { S } from "../core/state.js";
import { switchView } from "../core/routes.js";
import { loadOfflineView } from "./offline.js";   // ⭐ THÊM

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

            console.log("BOOKING API TRẢ VỀ:", res);

            if (!res || !res.ticket_id) {
                showToast("Không tạo được vé!");
                return;
            }

            S.lastTicketId = res.ticket_id;

            showToast("✔ Đặt vé thành công!");

            switchView("offline");

            // ⭐ AUTO LOAD VÉ
            loadOfflineView();

        } catch (e) {
            console.error(e);
            showToast("Lỗi tạo vé!");
        }
    };
}

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

        S.lastTicketId = res.ticket_id;

        showToast("✔ Đã thanh toán thành công!");

        switchView("offline");
        loadOfflineView();   // ⭐ THÊM

    } catch (err) {
        console.error(err);
        showToast("Lỗi tạo vé!");
    }
}
