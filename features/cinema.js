import { apiPublic } from "../core/api.js";
import { S } from "../core/state.js";

export async function loadStaffCinema() {
    const el = document.getElementById("staffCinema");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const cinemaId = user.cinema;

    // ==============================
    // 1) Staff chưa được gán rạp
    // ==============================
    if (!cinemaId) {
        console.warn("⚠ Staff chưa được gán rạp.");

        S.noCinema = true;
        S.staffCinemaId = null;
        S.staffCinemaName = null;

        if (el) {
            el.textContent = "🎬 Rạp phim: Chưa được gán";
            el.style.color = "#ff9b9b"; // màu cảnh báo
        }

        return;
    }

    // ==============================
    // 2) Có rạp → fetch thông tin
    // ==============================
    try {
        const data = await apiPublic(`/cinemas/${cinemaId}/public`);

        const name = data?.name || "(Không rõ rạp)";

        S.noCinema = false;
        S.staffCinemaId = cinemaId;
        S.staffCinemaName = name;

        if (el) {
            el.textContent = `🎬 Rạp phim: ${name}`;
            el.style.color = "#d6dbff"; // reset màu
        }
    } catch (err) {
        console.error("loadStaffCinema error:", err);

        S.noCinema = true;

        if (el) {
            el.textContent = "🎬 Rạp phim: (Lỗi kết nối)";
            el.style.color = "#ff9b9b";
        }
    }
}
