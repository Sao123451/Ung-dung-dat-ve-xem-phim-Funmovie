import { S } from "./state.js";

export function switchView(view, from = null) {
    // Lưu view trước để BACK hoạt động đúng
    if (from) S.prevView = from;

    document.querySelectorAll("section[id^='view-']")
        .forEach(sec => sec.classList.add("d-none"));

    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.remove("d-none");

    // ❌ ĐÃ XOÁ OFFLINE KHỎI TITLE MAP
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

    // Active sidebar
    document.querySelectorAll(".nav-linkx")
        .forEach(x => {
            x.classList.toggle("active", x.dataset.view === view);
        });
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

            document.querySelectorAll(".nav-linkx")
                .forEach(x => x.classList.remove("active"));
            a.classList.add("active");
        };
    });
}
