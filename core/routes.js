import { S } from "./state.js";

export function switchView(view, from = null) {
    if (from) S.prevView = from;

    // Ẩn tất cả view
    document.querySelectorAll("section[id^='view-']")
        .forEach(sec => sec.classList.add("d-none"));

    // Hiện view đang chọn
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.remove("d-none");

    // TITLE
    const titleMap = {
        home: "Chọn phim",
        schedule: "Chọn suất",
        seats: "Chọn ghế",
        pay: "Thanh toán",
        print: "In vé",
        online: "Quét mã vé online",
        loyalty: "Tích điểm"
    };
    const pageTitle = document.getElementById("pageTitle");
    if (titleMap[view]) pageTitle.textContent = titleMap[view];

    // ⭐⭐⭐ Active sidebar thông minh ⭐⭐⭐
    // Nhóm view thuộc Bán vé tại quầy
    const ticketViews = ["home", "schedule", "seats", "pay", "print"];

    document.querySelectorAll(".nav-linkx").forEach(x => x.classList.remove("active"));

    if (ticketViews.includes(view)) {
        // luôn để mục HOME sáng
        document.querySelector('.nav-linkx[data-view="home"]')?.classList.add("active");
    } else {
        // các view còn lại active đúng mục của nó
        document.querySelector(`.nav-linkx[data-view="${view}"]`)?.classList.add("active");
    }
}

window.switchView = switchView;

/* ===========================
      SIDEBAR
=========================== */
export function bindSidebar() {
    document.querySelectorAll(".nav-linkx").forEach(a => {
        a.onclick = (e) => {
            e.preventDefault();
            const v = a.dataset.view;
            if (!v) return;

            switchView(v);
        };
    });
}
