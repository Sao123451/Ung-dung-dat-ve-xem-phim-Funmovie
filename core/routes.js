import { S } from "./state.js";

export function switchView(view, from = null) {
    if (from) S.prevView = from;

    // Ẩn toàn bộ view
    document.querySelectorAll("section[id^='view-']")
        .forEach(sec => sec.classList.add("d-none"));

    // Hiện view được chọn
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.remove("d-none");

    // ===== TITLE =====
    const titleMap = {
        home: "Chọn phim",
        schedule: "Chọn suất",
        seats: "Chọn ghế",
        pay: "Thanh toán",
        print: "In vé",
        online: "Quét mã vé online",
        loyalty: "Tích điểm"
    };
    document.getElementById("pageTitle").textContent = titleMap[view] || "";

    // ===== RESET ACTIVE =====
    document.querySelectorAll(".nav-linkx").forEach(x => x.classList.remove("active"));

    // ===== FLOW bán vé (không gồm print) =====
    const ticketFlow = ["home", "schedule", "seats", "pay"];

    if (ticketFlow.includes(view)) {
        // luôn sáng mục "Bán vé tại quầy"
        document.querySelector('.nav-linkx[data-view="home"]')
            ?.classList.add("active");
    }
    else {
        // các menu độc lập: online, loyalty, print
        document.querySelector(`.nav-linkx[data-view="${view}"]`)
            ?.classList.add("active");
    }
}

window.switchView = switchView;

/* ==========================
      SIDEBAR
========================== */
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
