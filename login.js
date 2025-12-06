/* =============================
   LOGIN.JS – FIX AUTOFILL 100%
============================= */

// Toggle password view
document.getElementById("togglePw").onclick = () => {
    const ip = document.getElementById("password");
    ip.type = (ip.type === "text") ? "password" : "text";
};

// Tắt hoàn toàn autofill bằng cách reset 2 input về dạng text khi load
window.addEventListener("DOMContentLoaded", () => {
    const email = document.getElementById("email");
    const pw = document.getElementById("password");

    // Chrome chỉ bật popup cho input có type="email" hoặc "password"
    // nên ta giữ dạng "text" để Chrome không nhận ra form đăng nhập
    email.setAttribute("type", "text");
    pw.setAttribute("type", "text");

    // Xóa mọi giá trị Chrome có thể đã autofill
    email.value = "";
    pw.value = "";

    // Chặn paste autofill
    email.setAttribute("autocomplete", "new-email");
    pw.setAttribute("autocomplete", "new-password");
});

/* =============================
   LOGIN SUBMIT LOGIC 
   (giữ nguyên logic của bạn)
============================= */

const API_BASE = (window.FM_CONFIG && window.FM_CONFIG.API_BASE) || 'http://localhost:3000/api';
const HOME_PAGE = 'index.html';

function isExpired(token) {
    try {
        const p = JSON.parse(atob(token.split('.')[1]));
        return p.exp ? p.exp * 1000 < Date.now() : false;
    } catch {
        return true;
    }
}

function showAlert(type, msg) {
    const el = document.getElementById("alert");
    el.className = "alert-custom " + (type === "success" ? "alert-success-custom" : "alert-error-custom");
    el.textContent = msg;
    el.classList.remove("d-none");
}

(function guard() {
    const t = localStorage.getItem("token");
    const u = JSON.parse(localStorage.getItem("user") || "null");
    const expAt = Number(localStorage.getItem("sessionExpiredAt") || 0);

    if (t && u && u.role === "staff" && !isExpired(t) && (!expAt || Date.now() < expAt)) {
        location.replace(HOME_PAGE);
    }
})();

document.getElementById("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailVal = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const remember = document.getElementById("remember").checked;

    try {
        const res = await fetch(`${API_BASE}/auth/staff/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailVal, password })
        });

        const data = await res.json();

        if (!res.ok) {
            return showAlert("error", data.message || "Đăng nhập thất bại");
        }

        if (data.user.role !== "staff") {
            return showAlert("error", "Tài khoản này không phải STAFF");
        }

        // ⭐ Lưu thông tin đúng chuẩn
        localStorage.setItem("user", JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.full_name,
            role: data.user.role,
            cinema: data.user.cinema,
            cinema_name: data.user.cinema_name
        }));

        localStorage.setItem("token", data.token);

        if (!remember)
            localStorage.setItem("sessionExpiredAt", Date.now() + 2 * 60 * 60 * 1000);
        else
            localStorage.removeItem("sessionExpiredAt");

        location.replace(HOME_PAGE);

    } catch (err) {
        showAlert("error", "Không thể kết nối máy chủ");
    }
});
// Hiện popup
window.showMidAlert = function (msg) {
    const box = document.getElementById("midAlert");
    const txt = document.getElementById("midAlertMsg");
    txt.textContent = msg;
    box.classList.remove("d-none");
};

// Đóng popup
document.getElementById("midAlertBtn").onclick = () => {
    document.getElementById("midAlert").classList.add("d-none");
};
