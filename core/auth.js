/************************************************************
 *  core/auth.js — BẢN CHUẨN CHO HỆ THỐNG STAFF
 ************************************************************/

import { showToast } from "./helper.js";

export const LOGIN_PAGE = "login.html";

/* ============================================================
   KIỂM TRA JWT HẾT HẠN
============================================================ */
export function isExpired(token) {
    try {
        const p = JSON.parse(atob(token.split(".")[1]));
        return p.exp ? p.exp * 1000 < Date.now() : false;
    } catch {
        return false;
    }
}

/* ============================================================
   ĐĂNG XUẤT
============================================================ */
export function logout() {
    localStorage.clear();
    location.replace(LOGIN_PAGE);
}

/* ============================================================
   HEADER AUTH
============================================================ */
export function authHeaders() {
    const t = localStorage.getItem("token");
    return t ? { Authorization: "Bearer " + t } : {};
}

/* ============================================================
   BẢO VỆ TRANG — STAFF ONLY
============================================================ */
export function hardGuard() {
    const t = localStorage.getItem("token");

    let u = null;
    try {
        u = JSON.parse(localStorage.getItem("user") || "null");
    } catch {}

    const notStaff = !u || (u.role || "").toLowerCase() !== "staff";
    const expired = !t || isExpired(t);

    if (notStaff || expired) {
        localStorage.clear();
        location.replace(LOGIN_PAGE);
    }
}
