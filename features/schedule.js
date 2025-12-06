import { apiPublic } from "../core/api.js";
import { ymd } from "../core/helper.js";
import { S } from "../core/state.js";

/* ============================================================
   FORMAT TIME — CHUẨN GIỜ VIỆT NAM (UTC+7)
============================================================ */
function formatVNTime(iso) {
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh"
    }).format(new Date(iso));
}

/* =============================
   Khi chọn phim
============================= */
export async function onPickMovie(movie) {
    S.movie = movie;
    S.movieFormat = "all";
    S.date = ymd(new Date());

    document.querySelector("#schMovieTitle").textContent = movie.title;

    buildDateStrip();
    bindFormatSelector();
    await loadShowtimes();
}

/* =============================
   Gắn sự kiện đổi định dạng
============================= */
function bindFormatSelector() {
    const sel = document.getElementById("typeSel");
    if (!sel) return;

    sel.value = S.movieFormat || "all";

    sel.onchange = (e) => {
        S.movieFormat = e.target.value || "all";
        loadShowtimes();
    };
}

/* =============================
   Dải ngày
============================= */
export function buildDateStrip() {
    const wrap = document.querySelector("#dateStrip");
    wrap.innerHTML = "";

    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const key = ymd(d);

        const btn = document.createElement("button");
        btn.className = "date-pill" + (key === S.date ? " active" : "");
        btn.textContent = `${d.getDate()}/${d.getMonth() + 1}`;

        btn.onclick = () => {
            S.date = key;
            buildDateStrip();
            loadShowtimes();
        };

        wrap.appendChild(btn);
    }
}

/* =============================
   Load suất chiếu
============================= */
export async function loadShowtimes() {
    const cinema = S.staffCinemaId;
    if (!cinema || !S.movie?._id) return;

    const qs = new URLSearchParams({
        cinema,
        date: S.date
    });

    const res = await apiPublic(`/showtimes/public/by-cinema?${qs}`);
    const movieGroup = res?.movies || [];

    const entry = movieGroup.find(x => String(x.movie?._id) === S.movie._id);
    let list = entry?.showtimes || [];

    // ⭐ Lọc định dạng (2D / 3D / IMAX)
    if (S.movieFormat !== "all") {
        list = list.filter(st =>
            st.room_type?.toUpperCase() === S.movieFormat.toUpperCase()
        );
    }

    renderScheduleSlots(list);
}

/* =============================
   Render suất chiếu
============================= */
export function renderScheduleSlots(list) {
    const wrap = document.querySelector("#scheduleWrap");
    wrap.innerHTML = "";

    if (!list.length) {
        wrap.innerHTML = `<div class="muted">Không có suất chiếu.</div>`;
        return;
    }

    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "repeat(auto-fill, minmax(180px, 1fr))";
    wrap.style.gap = "16px";

    list.forEach(st => {
        const btn = document.createElement("button");
        btn.className = "slot-btn";

        // ⭐ FIX GIỜ — HIỂN THỊ ĐÚNG GIỜ VIỆT NAM (KHÔNG LỆCH -7)
        const timeStr = formatVNTime(st.start_time);

        const roomName = st.room_name?.replace(/\(.+?\)/g, "").trim() || "Phòng ?";
        const roomType = st.room_type || "";

        btn.innerHTML = `
            <div class="slot-time">${timeStr}</div>
            <div class="slot-room small muted">
                ${roomName} • ${roomType}
            </div>
        `;

        btn.onclick = () => {
            import("./seats.js").then(m => m.onPickShowtime(st));
        };

        wrap.appendChild(btn);
    });
}
