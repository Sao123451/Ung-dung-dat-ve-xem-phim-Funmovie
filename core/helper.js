/* ============================================================
   STRING UTILITIES
============================================================ */

export const esc = (s) =>
    String(s || "").replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[m]));

export const z2 = (n) => String(n).padStart(2, "0");

export const fmtTime = (d) =>
    `${z2(d.getHours())}:${z2(d.getMinutes())}`;

export const ymd = (d) =>
    `${d.getFullYear()}-${z2(d.getMonth() + 1)}-${z2(d.getDate())}`;

/* ============================================================
   DOM SHORTCUTS
============================================================ */

export const $ = (s) => document.querySelector(s);
export const $$ = (s) => document.querySelectorAll(s);

/* ============================================================
   GLOBAL CENTER TOAST
============================================================ */

export function showToast(msg, ms = 2500) {
    let el = document.getElementById("globalToast");

    if (!el) {
        el = document.createElement("div");
        el.id = "globalToast";

        Object.assign(el.style, {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0, 0, 0, 0.85)",
            color: "#fff",
            padding: "14px 20px",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
            zIndex: 99999,
            fontSize: "16px",
            maxWidth: "85%",
            textAlign: "center",
            opacity: "0",
            transition: "opacity 0.25s ease",
            pointerEvents: "none"
        });

        document.body.appendChild(el);
    }

    el.textContent = msg;
    el.style.opacity = "1";

    clearTimeout(el.timer);
    el.timer = setTimeout(() => {
        el.style.opacity = "0";
    }, ms);
}
