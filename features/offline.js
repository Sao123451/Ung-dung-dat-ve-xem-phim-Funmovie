import { api } from "../core/api.js";
import { showToast, esc } from "../core/helper.js";
import { switchView } from "../core/routes.js";
import { loadPrintTicket } from "./print.js";
import { S } from "../core/state.js";

/* ============================
   AUTO BIND MENU OFFLINE
============================ */
export function bindOfflineViewAutoLoad() {
    const btn = document.querySelector(`[data-view="offline"]`);
    if (!btn) return;
    btn.addEventListener("click", () => loadOfflineView());
}

/* ============================
   LOAD OFFLINE VIEW
============================ */
export function loadOfflineView() {
    const box = document.getElementById("offlineResult");

    if (!S.lastTicketId) {
        box.innerHTML = `<div class="text-danger">Không có vé nào đang chờ xác nhận.</div>`;
        return;
    }

    loadPendingTicket(S.lastTicketId);
}

/* ============================
   GET BOOKING INFORMATION
============================ */
async function loadPendingTicket(ticketId) {
    const box = document.getElementById("offlineResult");
    box.innerHTML = `<div class="text-center muted">Đang tải vé...</div>`;

    try {
        const t = await api(`/bookings/${ticketId}`);

        if (!t) {
            box.innerHTML = `<div class="text-danger">Không tìm thấy vé.</div>`;
            return;
        }

        renderOfflineTicket(t);

    } catch (e) {
        console.error(e);
        box.innerHTML = `<div class="text-danger">Lỗi tải vé.</div>`;
    }
}

/* ============================
   RENDER VÉ OFFLINE – 80MM STYLE
============================ */
function renderOfflineTicket(t) {
    const box = document.getElementById("offlineResult");

    const seats = Array.isArray(t.seats) ? t.seats.join(", ") : "—";
    const startTime = t.showtime_start
        ? new Date(t.showtime_start).toLocaleString("vi-VN")
        : "—";

    const total =
        t.total_after ||
        t.total_amount ||
        t.total ||
        0;

    box.innerHTML = `
        <div class="offline-ticket-container">
            <div class="offline-ticket-card">

                <div class="offline-ticket-title">
                    ${esc(t.movie_title || "Tên phim")}
                </div>

                <div class="offline-ticket-row">
                    <span class="label">Rạp</span>
                    <span class="value">${esc(t.cinema_name || "")}</span>
                </div>

                <div class="offline-ticket-row">
                    <span class="label">Phòng</span>
                    <span class="value">${esc(t.room_name || "")}</span>
                </div>

                <div class="offline-ticket-row">
                    <span class="label">Suất chiếu</span>
                    <span class="value">${startTime}</span>
                </div>

                <div class="offline-ticket-row">
                    <span class="label">Ghế</span>
                    <span class="value">${seats}</span>
                </div>

                <div class="offline-ticket-line"></div>

                <div class="offline-ticket-row">
                    <span class="label">Tổng tiền</span>
                    <span class="value">${total.toLocaleString("vi-VN")}đ</span>
                </div>

                <button id="btnOfflineConfirm">
                    Xác nhận đặt vé
                </button>

            </div>
        </div>
    `;

    document.getElementById("btnOfflineConfirm").onclick = () =>
        offlineConfirm(t._id);
}

/* ============================
   CONFIRM OFFLINE TICKET
============================ */
async function offlineConfirm(ticketId) {
    showToast("Đang xác nhận...");

    try {
        const res = await api(`/bookings/offline-confirm/${ticketId}`, {
            method: "POST"
        });

        if (!res || !res.ticket_id) {
            return showToast("Xác nhận thất bại!");
        }

        showToast("✔ Đã thanh toán thành công!");

        await loadPrintTicket(ticketId);

        switchView("print", "offline");

    } catch (e) {
        console.error(e);
        showToast("Lỗi xác nhận vé.");
    }
}

export function bindOfflineCheck() { return; }
