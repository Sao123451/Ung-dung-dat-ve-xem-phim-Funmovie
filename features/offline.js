import { api } from "../core/api.js"
import { showToast, esc } from "../core/helper.js"
import { switchView } from "../core/routes.js"
import { loadPrintTicket } from "./print.js"
import { S } from "../core/state.js"

/* ============================
   MENU AUTO LOAD
============================ */
export function bindOfflineViewAutoLoad() {
    const btn = document.querySelector(`[data-view="offline"]`)
    if (!btn) return
    btn.addEventListener("click", () => loadOfflineView())
}

/* ============================
   LOAD VIEW
============================ */
export function loadOfflineView() {
    const box = document.getElementById("offlineResult")

    if (!S.lastTicketId) {
        box.innerHTML = `<div class="text-danger">Không có vé nào đang chờ xác nhận.</div>`
        return
    }

    loadPendingTicket(S.lastTicketId)
}

/* ============================
   LOAD DETAIL BOOKING FOR STAFF
============================ */
async function loadPendingTicket(ticketId) {
    const box = document.getElementById("offlineResult")
    box.innerHTML = `<div class="text-center muted">Đang tải vé...</div>`

    try {
        const t = await api(`/bookings/detail/${ticketId}`)

        console.log("🔎 DETAIL BOOKING:", t)

        if (!t || !t._id) {
            box.innerHTML = `<div class="text-danger">Không tìm thấy vé.</div>`
            return
        }

        renderOfflineTicket(t)

    } catch (err) {
        console.error(err)
        box.innerHTML = `<div class="text-danger">Lỗi tải vé.</div>`
    }
}

/* ============================
   RENDER TICKET CARD
============================ */
function renderOfflineTicket(t) {
    const box = document.getElementById("offlineResult")

    const seats = Array.isArray(t.seats) && t.seats.length
        ? t.seats.join(", ")
        : "—"

    const time = t.showtime_start
        ? new Date(t.showtime_start).toLocaleString("vi-VN")
        : "—"

    box.innerHTML = `
        <div class="offline-ticket-container">
            <div class="offline-ticket-card">

                <div class="offline-ticket-title">${esc(t.movie_title)}</div>

                <div class="offline-ticket-row">
                    <span class="label">Rạp</span>
                    <span class="value">${esc(t.cinema_name)}</span>
                </div>

                <div class="offline-ticket-row">
                    <span class="label">Phòng</span>
                    <span class="value">${esc(t.room_name)}</span>
                </div>

                <div class="offline-ticket-row">
                    <span class="label">Suất chiếu</span>
                    <span class="value">${time}</span>
                </div>

                <div class="offline-ticket-row">
                    <span class="label">Ghế</span>
                    <span class="value">${seats}</span>
                </div>

                <div class="offline-ticket-line"></div>

                <div class="offline-ticket-row">
                    <span class="label">Tổng tiền</span>
                    <span class="value">${t.total.toLocaleString("vi-VN")}đ</span>
                </div>

                <button id="btnOfflineConfirm" class="btn-confirm">
                    Xác nhận đặt vé
                </button>

            </div>
        </div>
    `

    document.getElementById("btnOfflineConfirm").onclick =
        () => offlineConfirm(t._id)
}

/* ============================
   CONFIRM
============================ */
async function offlineConfirm(ticketId) {
    showToast("Đang xác nhận...")

    try {
        const res = await api(`/bookings/${ticketId}/confirm`, { method: "POST" })

        if (!res?.ticket_id) return showToast("Xác nhận thất bại!")

        showToast("✔ Đã thanh toán thành công!")

        await loadPrintTicket(ticketId)
        switchView("print", "offline")

    } catch (err) {
        console.error(err)
        showToast("Lỗi xác nhận vé.")
    }
}

export function bindOfflineCheck() {}
