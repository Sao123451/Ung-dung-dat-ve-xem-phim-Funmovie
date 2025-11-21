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

    S.nowMovies = S.allMovies.filter(m => m.status === "now_showing");
    S.comingMovies = S.allMovies.filter(m =>
        ["coming", "archived"].includes(m.status)
    );
}

/* ============================================================
   RENDER HOME
============================================================ */
export function renderHome() {
    const grid = document.querySelector("#homeGrid");
    grid.innerHTML = "";

    const data = (S.movieTab === "now") ? S.nowMovies : S.comingMovies;

    if (!data.length) {
        grid.innerHTML = `<div class="muted">Chưa có phim.</div>`;
        return;
    }

    data.forEach(m => {
        const poster = resolveAsset(m.poster || m.image);

        const div = document.createElement("div");
        div.className = "movie-card";

        div.innerHTML = `
            <img src="${esc(poster)}"/>
            <span class="badge bg-${S.movieTab === "now" ? "success" : "warning"} badge-top">
                ${S.movieTab === "now" ? "Đang chiếu" : "Sắp chiếu"}
            </span>
            <div class="cap">
                <div class="title">${esc(m.title)}</div>
                <div class="meta">Thời lượng: ${m.duration || "—"} phút</div>
            </div>
        `;

        /* ========================================================
           CLICK HANDLER — phiên bản ổn định nhất
        ======================================================== */
        div.onclick = async () => {

            // Nếu là phim sắp chiếu → popup
            if (S.movieTab === "coming") {
                
                // Đảm bảo hàm tồn tại
                if (typeof window.showMidAlert === "function") {
                    window.showMidAlert("🎬 Phim sắp được khởi chiếu!\nHiện chưa mở bán vé.");
                } else {
                    console.warn("⚠ showMidAlert chưa sẵn sàng!");
                    alert("Phim sắp được khởi chiếu! Hiện chưa mở bán vé.");
                }
                return;
            }

            // Phim đang chiếu → xem suất chiếu
            const mod = await import("./schedule.js");
            switchView("schedule");
            mod.onPickMovie(m);
        };

        grid.appendChild(div);
    });
}
