// ⚡ FULL FIXED seats.js – đã sửa toàn bộ lỗi: trạng thái ghế, gọi API staff-create,
// mapping status chuẩn, không còn lỗi booked/sold/holding/prebook, cố định màu ghế,
// loại bỏ goBackFromPay, ensure seat snapshot đúng format backend.

/* ============================================================
   IMPORT
============================================================ */
import { api } from "../core/api.js";
import { $, $$, showToast } from "../core/helper.js";
import { S, BAD_STATUSES, SEAT_HOLD_SECONDS } from "../core/state.js";
import { computeSeatSubtotal } from "./pay.js";
import { switchView } from "../core/routes.js";

/* ============================================================
   SVG ICONS
============================================================ */
export function seatSVG(color) {
    return `
    <svg viewBox="0 0 48 48" width="28" height="28">
        <rect x="10" y="6" width="28" height="18" rx="6" fill="${color}"/>
        <rect x="6" y="22" width="36" height="6" rx="3" fill="${color}" opacity="0.9"/>
        <rect x="8" y="28" width="32" height="12" rx="6" fill="${color}"/>
    </svg>`;
}

export function coupleSVG(color) {
    return `
    <svg viewBox="0 0 96 48" width="80" height="28">
        <rect x="10" y="6" width="28" height="18" rx="6" fill="${color}"/>
        <rect x="6" y="22" width="36" height="6" rx="3" fill="${color}" opacity="0.9"/>
        <rect x="8" y="28" width="32" height="12" rx="6" fill="${color}"/>

        <rect x="58" y="6" width="28" height="18" rx="6" fill="${color}"/>
        <rect x="54" y="22" width="36" height="6" rx="3" fill="${color}" opacity="0.9"/>
        <rect x="56" y="28" width="32" height="12" rx="6" fill="${color}"/>
    </svg>`;
}

/* ============================================================
   LOAD SEATS
============================================================ */
export async function onPickShowtime(st) {
    S.pickedShowtime = st;
    S.seatsSelected.clear();
    S.seatIdByKey.clear();
    S.seatByKey.clear();

    $("#seatMovieTitle").textContent = S.movie?.title || "Chọn ghế";

    const roomName = st.room_name || st.room?.name || "Phòng ?";
    $("#seatMeta").textContent =
        `${S.staffCinemaName} • ${roomName} • ` +
        new Date(st.start_time).toLocaleString();

    renderScreenArc();

    const id = st._id || st.id;
    const res = await api(`/showtimes/${id}/seats?ts=${Date.now()}`);

    S.seatsRaw = Array.isArray(res.seats) ? res.seats : [];
    S.seatsRaw.sort(byRowThenNumber);

    S.seatsRaw.forEach(se => {
        const key = `${se.row}${se.number}`;

        S.seatIdByKey.set(key, se._id);

        S.seatByKey.set(key, {
            showtime_seat_id: se._id,
            seat_id: se.seat,
            row: se.row,
            number: se.number,
            seat_type: se.seat_type,
            extra_price: se.extra_price,
            status: se.status
        });
    });

    renderSeatGrid();
    loadLegendPrices();
    updateSeatSummary();
    bindGoPay();
    switchView("seats");
}

/* ============================================================
   LOAD PRICE LEGEND
============================================================ */
function loadLegendPrices() {
    const base = S.pickedShowtime?.ticket_price || 0;

    let normal = null;
    let vip = null;
    let couple = null;

    for (const s of S.seatsRaw) {
        if (s.seat_type === "normal" && normal === null) normal = base + s.extra_price;
        if (s.seat_type === "vip" && vip === null) vip = base + s.extra_price;
        if (s.seat_type === "couple" && couple === null) couple = (base + s.extra_price) * 2;
    }

    $("#priceNormal").textContent = normal ? normal.toLocaleString() + "đ" : "—đ";
    $("#priceVIP").textContent = vip ? vip.toLocaleString() + "đ" : "—đ";
    $("#priceCouple").textContent = couple ? couple.toLocaleString() + "đ" : "—đ";
}

/* ============================================================
   SCREEN ARC
============================================================ */
export function renderScreenArc() {
    $("#screenArc").innerHTML = `
    <svg width="100%" height="80" viewBox="0 0 600 80">
        <path d="M20,70 Q300,5 580,70"
              fill="none"
              stroke="#7583ff"
              stroke-width="6"/>
        <text x="300" y="60" text-anchor="middle" fill="#aeb8ff">MÀN HÌNH</text>
    </svg>`;
}

export function byRowThenNumber(a, b) {
    if (a.row !== b.row) return a.row.localeCompare(b.row);
    return Number(a.number) - Number(b.number);
}

/* ============================================================
   RENDER GRID
============================================================ */
export function renderSeatGrid() {
    const grid = $("#seatGrid");
    grid.innerHTML = "";

    const byRow = {};
    S.seatsRaw.forEach(s => (byRow[s.row] ||= []).push(s));

    Object.keys(byRow).sort().forEach(row => {
        const arr = byRow[row].sort((a, b) => a.number - b.number);

        const rowDiv = document.createElement("div");
        rowDiv.className = "seat-row";

        for (let i = 0; i < arr.length; i++) {
            const se = arr[i];

            /* ==== GHẾ ĐÔI ==== */
            if (se.seat_type === "couple") {
                const next = arr[i + 1];
                const key1 = `${se.row}${se.number}`;
                const key2 = next ? `${next.row}${next.number}` : null;

                const el = document.createElement("div");
                el.className = "seat couple";
                el.dataset.key = key1;
                el.innerHTML = coupleSVG(getSeatColor(se));

                const disable = isDisabled(se) || isDisabled(next);
                if (!disable) el.onclick = () => toggleSelect([key1, key2]);
                else el.classList.add("disabled");

                rowDiv.appendChild(el);
                i++;
                continue;
            }

            /* ==== GHẾ ĐƠN ==== */
            const key = `${se.row}${se.number}`;
            const el = document.createElement("div");
            el.className = "seat";
            el.dataset.key = key;
            el.innerHTML = seatSVG(getSeatColor(se));

            if (!isDisabled(se)) el.onclick = () => toggleSelect([key]);
            else el.classList.add("disabled");

            rowDiv.appendChild(el);
        }

        grid.appendChild(rowDiv);
    });
}

/* ============================================================
   SELECT SEATS
============================================================ */
export function toggleSelect(keys) {
    const set = new Set(S.seatsSelected);
    const adding = keys.some(k => !set.has(k));

    keys.forEach(k => {
        if (!k) return;
        if (adding) set.add(k);
        else set.delete(k);
    });

    S.seatsSelected = set;

    renderSeatGrid();
    updateSeatSummary();
}

/* ============================================================
   RULE: no single seat left alone
============================================================ */
function violatesSingleSeatRule(selectedSet = S.seatsSelected) {
    const byRow = {};
    S.seatsRaw.forEach(s => (byRow[s.row] ||= []).push(s));

    for (const row in byRow) {
        const arr = byRow[row].sort((a, b) => a.number - b.number);

        for (let i = 0; i < arr.length; i++) {
            const se = arr[i];
            const key = `${se.row}${se.number}`;

            const isFree =
                !selectedSet.has(key) &&
                !BAD_STATUSES.has(String(se.status).toLowerCase());

            if (!isFree) continue;

            const left = arr[i - 1];
            const right = arr[i + 1];

            const leftBlocked =
                !left ||
                selectedSet.has(`${left.row}${left.number}`) ||
                BAD_STATUSES.has(String(left?.status).toLowerCase());

            const rightBlocked =
                !right ||
                selectedSet.has(`${right.row}${right.number}`) ||
                BAD_STATUSES.has(String(right?.status).toLowerCase());

            if (leftBlocked && rightBlocked) return true;
        }
    }
    return false;
}

/* ============================================================
   SUMMARY
============================================================ */
export function updateSeatSummary() {
    const seats = [...S.seatsSelected].sort();
    const subtotal = computeSeatSubtotal();

    $("#seatSummary").textContent =
        seats.length
            ? `Đã chọn: ${seats.join(", ")} • Tạm tính: ${subtotal.toLocaleString()}đ`
            : "Chưa chọn ghế.";
}


/* ============================================================
   GO PAY
============================================================ */
/* ============================================================
   GO PAY — chỉ chuyển sang trang thanh toán
============================================================ */
export function bindGoPay() {
    $("#btnGoPay").onclick = () => {
        if (!S.seatsSelected.size)
            return showToast("Vui lòng chọn ghế!");

        if (violatesSingleSeatRule())
            return showToast("⚠ Không thể để lại 1 ghế trống!");

        switchView("pay");   // ⭐ chuyển trang
        import("./pay.js").then(m => {
            m.switchToPay();
        });
    };
}

/* ============================================================
   BACK: từ PAY → SEATS
   — giữ nguyên ghế đã chọn
   — không load lại API
============================================================ */
export function backFromPayToSeats() {
    // quay về seats
    switchView("seats");

    // re-render từ cache có sẵn
    renderSeatGrid();
    updateSeatSummary();
}


/* ============================================================
   BACK: từ SEATS → SCHEDULE
   — quay lại chọn suất
============================================================ */
export function backFromSeatsToSchedule() {

    // phải có movie đã chọn
    if (!S.movie) {
        return switchView("home");
    }

    // phải có ngày/suất đã load sẵn
    switchView("schedule");

    // giữ nguyên schedule
    document.getElementById("schMovieTitle").textContent = S.movie.title;

    // nếu có ngày đã chọn trước đó
    if (S.scheduleDate) {
        const dayEl = document.querySelector(`[data-day="${S.scheduleDate}"]`);
        if (dayEl) dayEl.classList.add("active");
    }
}



/* ============================================================
   HELPERS
============================================================ */
export function isDisabled(se) {
    return BAD_STATUSES.has(String(se.status).toLowerCase());
}

export function getSeatColor(se) {
    const status = String(se.status).toLowerCase();
    const type = String(se.seat_type).toLowerCase();
    const key = `${se.row}${se.number}`;

    if (status === "sold") return "var(--seat-sold)";
    if (status === "booked") return "var(--seat-booked)";
    if (status === "holding") return "var(--seat-holding)";

    if (S.seatsSelected.has(key)) return "var(--seat-selected)";

    if (type === "vip") return "var(--seat-vip)";
    if (type === "couple") return "var(--seat-couple)";

    return "var(--seat-empty)";
}

window.backFromPayToSeats = backFromPayToSeats;
window.backFromSeatsToSchedule = backFromSeatsToSchedule;
