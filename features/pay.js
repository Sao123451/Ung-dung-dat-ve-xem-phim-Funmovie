import { api, apiPublic } from "../core/api.js";
import { $, $$, esc, showToast } from "../core/helper.js";
import { S } from "../core/state.js";
import { switchView } from "../core/routes.js";

/* ============================================================
   FIX ẢNH COMBO
============================================================ */
function comboImg(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (!path.startsWith("/")) path = "/" + path;
    return "http://localhost:3000/public" + path;
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

    S.combos = list.filter((p) =>
        ["combo", "popcorn", "drink", "food", "beverage"].includes(
            String(p.type)
        ) && p.active !== false
    );

    S.comboPick = [];
    renderComboList();
}

/* ============================================================
   RENDER COMBO
============================================================ */
function renderComboList() {
    const wrap = $("#comboList");
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
            <img class="combo-img" 
                 src="${esc(comboImg(p.image || ""))}" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2Zy8+'"/>

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
        const dec = row.querySelector('[data-act="dec"]');
        const inc = row.querySelector('[data-act="inc"]');

        inc.onclick = () => {
            let v = Number(numBox.textContent) + 1;
            numBox.textContent = v;
            numBox.classList.add("bump");
            setTimeout(() => numBox.classList.remove("bump"), 180);
            syncComboPick();
            renderPaySummary();
        };

        dec.onclick = () => {
            let v = Math.max(0, Number(numBox.textContent) - 1);
            numBox.textContent = v;
            numBox.classList.add("bump");
            setTimeout(() => numBox.classList.remove("bump"), 180);
            syncComboPick();
            renderPaySummary();
        };
    });
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

/* ============================================================
   VOUCHER
============================================================ */
export async function loadVoucherOptions() {
    let res;

    try {
        res = await apiPublic("/vouchers/public?ts=" + Date.now());
        console.log("📌 API voucher trả về:", res);
    } catch (err) {
        console.error("❌ Lỗi gọi API voucher:", err);
        S.voucherOptions = [];
        return renderVoucherOptions();
    }

    if (res && Array.isArray(res.items)) S.voucherOptions = res.items;
    else if (Array.isArray(res)) S.voucherOptions = res;
    else S.voucherOptions = [];

    renderVoucherOptions();
}

function renderVoucherOptions() {
    const wrap = $("#voucherOptions");
    wrap.innerHTML = "";

    if (!S.voucherOptions.length) {
        wrap.innerHTML = `<div class="small muted">Không có voucher</div>`;
        return;
    }

    S.voucherOptions.forEach((v) => {
        const btn = document.createElement("button");
        btn.className = "voucher-pill";

        const discountType = v.discount_type || v.type;

        const valText =
            discountType === "percent"
                ? `${v.value}%`
                : `${Number(v.value).toLocaleString()}đ`;

        btn.innerHTML = `
            <div class="voucher-code">${esc(v.code)}</div>
            <div class="voucher-meta small">
                ${v.scope === "seat"
                ? "Giảm vé"
                : v.scope === "combo"
                    ? "Giảm combo"
                    : "Giảm toàn bộ"
            }
                • ${valText}
                ${v.min_order ? ` • Min: ${v.min_order}` : ""}
            </div>
        `;

        btn.onclick = () => {
            $("#voucherPay").value = v.code;
            $("#voucherOptions").classList.add("d-none");
            $("#btnApplyVoucherPay").click();
        };

        wrap.appendChild(btn);
    });
}

export function calcVoucherDiscount(seatSubtotal, comboTotal) {
    const v = S.voucherInfo;
    if (!v) return 0;

    const orderTotal = seatSubtotal + comboTotal;
    if (orderTotal < (v.min_order || 0)) return 0;

    let base = 0;
    if (v.scope === "seat") base = seatSubtotal;
    else if (v.scope === "combo") base = comboTotal;
    else base = orderTotal;

    let discount = 0;

    if (v.discount_type === "amount") discount = v.value;
    else if (v.discount_type === "percent")
        discount = Math.floor(base * (v.value / 100));

    if (v.max_discount) discount = Math.min(discount, v.max_discount);

    return Math.max(0, discount);
}

/* ============================================================
   PAYMENT SUMMARY
============================================================ */
export function renderPaySummary() {
    const seatSubtotal = computeSeatSubtotal();
    const comboTotal = S.comboPick.reduce((s, c) => s + c.unit_price * c.qty, 0);
    const discount = calcVoucherDiscount(seatSubtotal, comboTotal);
    const total = Math.max(0, seatSubtotal + comboTotal - discount);

    const el = $("#paySummary");
    el.innerHTML = `
        <div>Phim: <b>${esc(S.movie?.title || "")}</b></div>
        <div>Rạp: ${S.staffCinemaName || "—"}</div>
        <div>Suất: ${new Date(S.pickedShowtime.start_time).toLocaleString()}</div>

        <div class="divider"></div>

        <div>Vé: ${seatSubtotal.toLocaleString()}đ</div>
        <div>Combo: ${comboTotal.toLocaleString()}đ</div>
        <div>Giảm giá: -${discount.toLocaleString()}đ</div>

        <div class="divider"></div>
        <div><b>Tổng cộng: ${total.toLocaleString()}đ</b></div>
    `;
}

/* ============================================================
   ÁP DỤNG VOUCHER
============================================================ */
export function bindApplyVoucher() {
    $("#btnApplyVoucherPay").onclick = async () => {
        const code = $("#voucherPay").value.trim();
        if (!code) return alert("Vui lòng nhập mã!");

        try {
            const res = await apiPublic(`/vouchers/${code}/validate`);
            const v = res?.voucher;

            if (!res.valid || !v) {
                S.voucherCode = "";
                S.voucherInfo = null;
                showToast("Voucher không hợp lệ");
                renderPaySummary();
                return;
            }

            const seatSubtotal = computeSeatSubtotal();
            const comboTotal = S.comboPick.reduce(
                (s, c) => s + c.unit_price * c.qty,
                0
            );

            const orderTotal = seatSubtotal + comboTotal;

            if (orderTotal < (v.min_order || 0)) {
                showToast(
                    `Đơn hàng chưa đạt tối thiểu ${v.min_order.toLocaleString()}đ để dùng voucher này.`
                );
                S.voucherCode = "";
                S.voucherInfo = null;
                renderPaySummary();
                return;
            }

            S.voucherCode = code;
            S.voucherInfo = v;

            showToast("Áp dụng thành công!");
        } catch {
            S.voucherCode = "";
            S.voucherInfo = null;
            showToast("Lỗi áp dụng voucher");
        }

        renderPaySummary();
    };
}

/* ============================================================
   CHUYỂN SANG TRANG THANH TOÁN
============================================================ */
export async function switchToPay() {
    switchView("pay");
    await loadCombos();
    await loadVoucherOptions();
    renderPaySummary();
}

/* ============================================================
   TÍNH TIỀN GHẾ
============================================================ */
export function computeSeatSubtotal() {
    let total = 0;
    const base = Number(S.pickedShowtime.ticket_price || 0);

    for (const key of S.seatsSelected) {
        const se = S.seatByKey.get(key);
        if (!se) continue;
        const extra = Number(se.extra_price || 0);
        total += base + extra;
    }

    return total;
}

/* ============================================================
   EXPORT CHUẨN — KHÔNG BAO GIỜ LỖI IMPORT
============================================================ */
export default {
    loadCombos,
    loadVoucherOptions,
    bindApplyVoucher,
    renderPaySummary,
    switchToPay,
    computeSeatSubtotal
};
