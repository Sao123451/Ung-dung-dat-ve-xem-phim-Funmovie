import { api, resolveAsset } from "../core/api.js";
import { esc } from "../core/helper.js";
import { S } from "../core/state.js";
import { switchView } from "../core/routes.js";

/* ============================================================
   FETCH FILMS
============================================================ */
export async function fetchMovies() {
    const list = await api("/movies?ts=" + Date.now()).catch(() => []);
    S.allMovies = list || [];

    // ⭐ Mapping trạng thái phim
    S.nowMovies = S.allMovies.filter(m => m.status === "now_showing");
    S.earlyMovies = S.allMovies.filter(m => m.status === "coming");
    S.comingMovies = S.allMovies.filter(m => m.status === "archived");
}

/* ============================================================
   RENDER HOME
============================================================ */
export function renderHome() {
    const grid = document.querySelector("#homeGrid");
    grid.innerHTML = "";

    let data = [];
    if (S.movieTab === "now") data = S.nowMovies;
    else if (S.movieTab === "early") data = S.earlyMovies;
    else data = S.comingMovies;

    if (!data.length) {
        grid.innerHTML = `<div class="muted">Chưa có phim.</div>`;
        return;
    }

    data.forEach(m => {
        const poster = resolveAsset(m.poster || m.image);

        const div = document.createElement("div");
        div.className = "movie-card";

        // Badge theo tab
        let badge = "Đang chiếu";
        let badgeColor = "success";

        if (S.movieTab === "early") {
            badge = "Suất chiếu sớm";
            badgeColor = "info";
        }

        if (S.movieTab === "coming") {
            badge = "Sắp chiếu";
            badgeColor = "warning";
        }

        div.innerHTML = `
            <img src="${esc(poster)}"/>
            <span class="badge bg-${badgeColor} badge-top">
                ${badge}
            </span>
            <div class="cap">
                <div class="title">${esc(m.title)}</div>
                <div class="meta">Thời lượng: ${m.duration || "—"} phút</div>
            </div>
        `;

        /* ========================================================
           CLICK HANDLER
           - now_showing → vào chọn suất
           - coming → popup (không bán)
           - early (coming) → cho đặt vé!
        ======================================================== */
        div.onclick = async () => {

            // ⭐ Sắp chiếu → KHÔNG cho đặt
            if (S.movieTab === "coming") {
                window.showMidAlert("🎬 Phim sắp khởi chiếu!\nHiện chưa mở bán vé.");
                return;
            }

            // ⭐ Đang chiếu + Suất chiếu sớm → vào suất chiếu
            const mod = await import("./schedule.js");
            switchView("schedule");
            mod.onPickMovie(m);
        };

        grid.appendChild(div);
    });
}
