/* ============================================================
   GLOBAL POPUP
============================================================ */
window.showMidAlert = function (msg) {
    const box = document.getElementById("midAlert");
    const msgEl = document.getElementById("midAlertMsg");

    if (!box || !msgEl) return console.error("midAlert không tồn tại!");

    msgEl.textContent = msg;
    box.classList.remove("d-none");
};

window.hideMidAlert = function () {
    const box = document.getElementById("midAlert");
    if (box) box.classList.add("d-none");
};


/* ============================================================
   IMPORT MODULES
============================================================ */
import { hardGuard } from "./core/auth.js";
import { loadStaffCinema } from "./features/cinema.js";
import { fetchMovies, renderHome } from "./features/movies.js";

import { bindApplyVoucher } from "./features/pay.js";
import { bindGoPay } from "./features/seats.js";
import { bindConfirmPay } from "./features/booking.js";

import { bindSidebar } from "./core/routes.js";
import { bindOfflineViewAutoLoad } from "./features/offline.js";
import { loadPrintTicket } from "./features/print.js";

import { S } from "./core/state.js";


/* ============================================================
   DOMContentLoaded
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {

    const ok = document.getElementById("midAlertBtn");
    if (ok) ok.onclick = window.hideMidAlert;

    hardGuard();

    setupTopbar();
    bindSidebar();
    bindLogout();
    bindReload();
    bindMovieTabs();

    await loadStaffCinema();
    if (S.noCinema) {
        disableAllFeatures();
        return;
    }

    await fetchMovies();

    // PAYMENT + VOUCHER
    bindApplyVoucher();
    bindConfirmPay();
    bindPayMethodButtons();
    setupVoucherListButton();

    // ⭐ AUTO LOAD OFFLINE
    bindOfflineViewAutoLoad();

    // ⭐ BIND BACK BUTTONS
    bindBackFromPay();
    bindBackFromSeats();

    renderHome();
});


/* ============================================================
   BACK BUTTON: PAY → SEATS
============================================================ */
function bindBackFromPay() {
    const btn = document.getElementById("btnBackFromPay");
    if (!btn) return;

    btn.onclick = () => {
        console.log("BACK: pay → seats");
        window.switchView("seats");
    };
}

/* ============================================================
   BACK BUTTON: SEATS → SCHEDULE
============================================================ */
function bindBackFromSeats() {
    const btn = document.getElementById("btnBackFromSeats");
    if (!btn) return;

    btn.onclick = () => {
        console.log("BACK: seats → schedule");
        window.switchView("schedule");
    };
}


/* ============================================================
   VOUCHER LIST BUTTON
============================================================ */
function setupVoucherListButton() {
    const btn = document.getElementById("btnShowVoucher");
    const box = document.getElementById("voucherOptions");

    if (!btn || !box) return;

    btn.onclick = async () => {
        if (!S.voucherOptions.length) {
            const mod = await import("./features/pay.js");
            await mod.loadVoucherOptions();
        }
        box.classList.toggle("d-none");
    };
}


/* ============================================================
   TOPBAR
============================================================ */
function setupTopbar() {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const nameEl = document.getElementById("helloName");

    if (nameEl && u.full_name) {
        nameEl.textContent = u.full_name;
    }
}


/* ============================================================
   LOGOUT
============================================================ */
function bindLogout() {
    const btn = document.getElementById("btnLogout");
    if (btn) {
        btn.onclick = () => {
            localStorage.clear();
            location.href = "login.html";
        };
    }
}


/* ============================================================
   RELOAD
============================================================ */
function bindReload() {
    const btn = document.getElementById("btnReload");
    if (btn) btn.onclick = () => location.reload();
}


/* ============================================================
   MOVIE TABS
============================================================ */
function bindMovieTabs() {
    const tabNow = document.getElementById("tab-now");
    const tabComing = document.getElementById("tab-coming");

    if (!tabNow || !tabComing) return;

    tabNow.onclick = () => {
        tabNow.classList.add("active");
        tabComing.classList.remove("active");
        S.movieTab = "now";
        renderHome();
    };

    tabComing.onclick = () => {
        tabComing.classList.add("active");
        tabNow.classList.remove("active");
        S.movieTab = "coming";
        renderHome();
    };

    S.movieTab = "now";
}


/* ============================================================
   DISABLE ALL WHEN STAFF HAS NO CINEMA
============================================================ */
function disableAllFeatures() {
    document.querySelectorAll("section[id^='view-']")
        .forEach(sec => sec.classList.add("d-none"));

    const home = document.getElementById("view-home");
    if (home) {
        home.innerHTML = `
            <div class="cardx text-center p-4">
                <h3>⚠ Chưa được gán rạp</h3>
                <p class="muted">Bạn không thể bán vé.
                Hãy liên hệ quản trị viên để được phân rạp làm việc.</p>
            </div>
        `;
        home.classList.remove("d-none");
    }

    document.querySelectorAll(".nav-linkx").forEach(a => {
        a.style.pointerEvents = "none";
        a.style.opacity = "0.5";
    });
}


/* ============================================================
   PAY METHOD BUTTONS
============================================================ */
function bindPayMethodButtons() {
    document.querySelectorAll(".pay-pill").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".pay-pill").forEach(b =>
                b.classList.remove("active")
            );
            btn.classList.add("active");

            S.payMethod = btn.innerText.trim();
            console.log("Phương thức thanh toán:", S.payMethod);
        };
    });
}
