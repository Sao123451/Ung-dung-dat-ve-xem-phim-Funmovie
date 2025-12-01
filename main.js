import { hardGuard } from "./core/auth.js";
import { loadStaffCinema } from "./features/cinema.js";
import { fetchMovies, renderHome } from "./features/movies.js";
import { bindConfirmPay } from "./features/booking.js";
import { bindSidebar, switchView } from "./core/routes.js";
import { loadPrintTicket } from "./features/print.js";
import { S } from "./core/state.js";
import { api } from "./core/api.js";
import pay from "./features/pay.js";


// Handle VNPay return redirect
window.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("vnp_return_code");

    if (code) {
        console.log("⭐ Staff nhận mã VNPay:", code);

        try {
            const detail = await api(`/bookings/find-by-res-code/${code}`);

            if (detail && detail.ticket_id) {
                S.lastTicketId = detail.ticket_id;
                S.lastTicketDetail = detail;

                await loadPrintTicket(detail.ticket_id);
                switchView("print");
            } else {
                alert("Không tìm thấy vé sau thanh toán!");
            }
        } catch (err) {
            console.error(err);
            alert("Lỗi khi tải vé VNPay!");
        }
    }
});

/* ============================================================
   GLOBAL POPUP
============================================================ */
window.showMidAlert = function (msg) {
    const box = document.getElementById("midAlert");
    const msgEl = document.getElementById("midAlertMsg");
    if (!box || !msgEl) return;
    msgEl.textContent = msg;
    box.classList.remove("d-none");
};

window.hideMidAlert = function () {
    const box = document.getElementById("midAlert");
    if (box) box.classList.add("d-none");
};

/* ============================================================
   AUTO HANDLE VNPay REDIRECT
============================================================ */
(async function handleVnPayReturn() {
    const url = new URL(location.href);
    const code = url.searchParams.get("vnp_return_code");
    if (!code) return;

    console.log("⭐ STAFF nhận mã return:", code);

    // Xóa query để không load lại lần sau
    history.replaceState(null, "", location.pathname);

    try {
        const detail = await api(`/bookings/find-by-res-code/${code}`);

        if (!detail || !detail.ticket_id) {
            alert("Không tìm thấy vé sau thanh toán!");
            return;
        }

        S.lastTicketId = detail.ticket_id;
        S.lastTicketDetail = detail;

        await loadPrintTicket(detail.ticket_id);
        switchView("print");

    } catch (err) {
        console.error(err);
        alert("Lỗi load vé sau thanh toán!");
    }
})();

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

    // PAYMENT
    bindConfirmPay();
    bindPayMethodButtons();
    pay.bindMemberSearch();

    renderHome();
});

/* ============================================================
   STAFF CREATED EVENT → DIRECT PRINT
============================================================ */
document.addEventListener("staff-created", async (ev) => {
    const ticketId = ev.detail?.ticket_id;
    if (!ticketId) return;

    try {
        const t = await api(`/bookings/detail/${ticketId}`);
        S.lastTicketDetail = t;
        S.lastTicketId = ticketId;

        console.log("⭐ Direct print:", t);

        await loadPrintTicket(ticketId);
        window.switchView("print");

    } catch (err) {
        console.error("Lỗi load detail:", err);
    }
});

/* ============================================================
   PAY METHOD BUTTONS
============================================================ */
function bindPayMethodButtons() {
    document.querySelectorAll(".pay-pill").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".pay-pill")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            S.payMethod = btn.innerText.trim();
            console.log("Phương thức thanh toán:", S.payMethod);
        };
    });
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
    if (!btn) return;

    btn.onclick = () => {
        localStorage.clear();
        location.href = "login.html";
    };
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
    const now = document.getElementById("tab-now");
    const coming = document.getElementById("tab-coming");

    if (!now || !coming) return;

    now.onclick = () => {
        now.classList.add("active");
        coming.classList.remove("active");
        S.movieTab = "now";
        renderHome();
    };

    coming.onclick = () => {
        coming.classList.add("active");
        now.classList.remove("active");
        S.movieTab = "coming";
        renderHome();
    };

    S.movieTab = "now";
}

/* ============================================================
   DISABLE STAFF IF NO CINEMA
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
}

/************************************************************
 *  🔥 KHÔNG CÒN postMessage LISTENER — ĐÃ LOẠI BỎ HOÀN TOÀN
 ************************************************************/
