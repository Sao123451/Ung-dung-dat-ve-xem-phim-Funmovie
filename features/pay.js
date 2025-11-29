// features/pay.js — MEMBERSHIP ONLY, NO VOUCHER

import { api, API_ORIGIN } from "../core/api.js";
import { $, $$, esc, showToast } from "../core/helper.js";
import { S } from "../core/state.js";
import { switchView } from "../core/routes.js";

/* ============================================================
   FIX ẢNH COMBO
============================================================ */
function comboImg(path) {
    if (!path) return "";
    if (!path.startsWith("/")) path = "/" + path;
    return `${API_ORIGIN}/public${path}`;
}

/* ============================================================
   LOAD COMBOS
============================================================ */
export async function loadCombos() {
    let res = [];

    try {
        res = await api("/products/public?ts=" + Date.now());
    } catch {
        try {
            res = await api("/products?ts=" + Date.now());
        } catch {
            res = [];
        }
    }

    const list = Array.isArray(res)
        ? res
        : res.products || res.items || res.data || [];

    S.combos = list.filter(
        (p) =>
            ["combo", "popcorn", "drink", "food", "beverage"].includes(
                String(p.type)
            ) && p.active !== false
    );

    S.comboPick = [];
    renderComboList();
}

/* ============================================================
   RENDER COMBO LIST
============================================================ */
function renderComboList() {
    const wrap = $("#comboList");
    if (!wrap) return;

    wrap.innerHTML = "";

    if (!S.combos.length) {
        wrap.innerHTML = `<div class="muted">Không có combo.</div>`;
        return;
    }

    S.combos.forEach((p) => {
        const price = Number(p.price || 0);

        const row = document.createElement("div");
        row.className = "combo-row";
        row.innerHTML = `
            <img class="combo-img" src="${esc(comboImg(p.image || ""))}" />

            <div class="combo-info">
                <div class="name">${esc(p.name)}</div>
                <div class="desc">${esc(p.description || "")}</div>
                <div class="price">${price.toLocaleString()}đ</div>
            </div>

            <div class="combo-counter">
                <button class="cc-btn" data-act="dec">−</button>
                <div class="cc-num" data-id="${p._id}" data-price="${price}">0</div>
                <button class="cc-btn" data-act="inc">+</button>
            </div>
        `;

        wrap.appendChild(row);

        const numBox = row.querySelector(".cc-num");
        const dec = row.querySelector("[data-act='dec']");
        const inc = row.querySelector("[data-act='inc']");

        inc.onclick = () => updateCombo(numBox, 1);
        dec.onclick = () => updateCombo(numBox, -1);
    });
}

function updateCombo(numBox, delta) {
    let v = Number(numBox.textContent) + delta;
    v = Math.max(0, v);

    numBox.textContent = v;
    numBox.classList.add("bump");
    setTimeout(() => numBox.classList.remove("bump"), 180);

    syncComboPick();
    renderPaySummary();
}

function syncComboPick() {
    S.comboPick = [...$$(".cc-num")]
        .map((box) => {
            const qty = Number(box.textContent || 0);
            if (qty <= 0) return null;
            return {
                product_id: box.dataset.id,
                qty,
                unit_price: Number(box.dataset.price),
            };
        })
        .filter(Boolean);
}

export function computeSeatSubtotal() {
    let total = 0;

    const base = Number(S.pickedShowtime?.ticket_price || 0);

    for (const key of S.seatsSelected) {
        const se = S.seatByKey.get(key);
        if (!se) continue;

        total += base + Number(se.extra_price || 0);
    }

    return total;
}

/* ============================================================
   SUMMARY (NO VOUCHER)
============================================================ */
export function renderPaySummary() {
    const seatSubtotal = computeSeatSubtotal();
    const comboTotal = S.comboPick.reduce(
        (sum, c) => sum + c.unit_price * c.qty,
        0
    );

    const total = seatSubtotal + comboTotal;

    const el = $("#paySummary");
    el.innerHTML = `
        <div>Phim: <b>${esc(S.movie?.title || "")}</b></div>
        <div>Rạp: ${S.staffCinemaName || "—"}</div>
        <div>Suất: ${new Date(S.pickedShowtime.start_time).toLocaleString()}</div>

        <div class="divider"></div>

        <div>Vé: ${seatSubtotal.toLocaleString()}đ</div>
        <div>Combo: ${comboTotal.toLocaleString()}đ</div>

        <div class="divider"></div>
        <div><b>Tổng cộng: ${total.toLocaleString()}đ</b></div>
    `;
}

/* ============================================================
   TÌM KIẾM THẺ THÀNH VIÊN (ĐÃ SỬA LỖI)
============================================================ */
export function bindMemberSearch() {
    const input = $("#memberCardInput");
    const btn = $("#btnCheckMember");
    const box = $("#memberResult");

    if (!input || !btn || !box) return;

    btn.onclick = async () => {
        const card = input.value.trim();
        if (!card) {
            showToast("Vui lòng nhập mã thẻ!");
            return;
        }

        try {
            // ⭐⭐ ĐÃ SỬA LỖI: THÊM BACKTICK ĐÚNG CÚ PHÁP
            const res = await api(`/users/find-by-card/${card}`);

            S.memberCard = res.membership_card;

            box.innerHTML = `
                <div class="member-box">
                    <div><b>Tên:</b> ${esc(res.full_name)}</div>
                    <div><b>Mã thẻ:</b> ${esc(res.membership_card)}</div>
                </div>
            `;

            showToast("✔ Đã áp dụng thẻ thành viên");

        } catch (err) {
            S.memberCard = null;

            box.innerHTML = `
                <div class="text-danger small">Không tìm thấy thẻ thành viên</div>
            `;
            showToast("Không tìm thấy mã thẻ");
        }
    };
}

/* ============================================================
   CHUYỂN SANG TRANG PAY
============================================================ */
export async function switchToPay() {
    switchView("pay");
    await loadCombos();
    renderPaySummary();
}

/* ============================================================
   EXPORT
============================================================ */
export default {
    loadCombos,
    renderPaySummary,
    computeSeatSubtotal,
    switchToPay,
    bindMemberSearch,
};
