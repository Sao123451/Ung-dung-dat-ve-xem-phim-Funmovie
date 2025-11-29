import { authHeaders } from "./auth.js";

export const API_BASE =
    (window.FM_CONFIG && window.FM_CONFIG.API_BASE) ||
    "http://localhost:3000/api";

/* ============================================================
   API (PRIVATE) — TỰ ĐỘNG NHẬN JSON HOẶC FORMDATA
============================================================ */
export async function api(path, opts = {}) {
    const token = localStorage.getItem("token");

    const isForm = opts.body instanceof FormData;

    // ====== HEADERS ======
    opts.headers = {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(opts.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    // ====== BODY ======
    if (opts.body && !isForm) {
        opts.body = JSON.stringify(opts.body);
    }

    const res = await fetch(`${API_BASE}${path}`, opts);

    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("application/json")) {
        return res.text();
    }

    return res.json();
}

/* ============================================================
   API PUBLIC — CHO BANNERS / NEWS / MOVIE POSTER
============================================================ */
export async function apiPublic(path, opts = {}) {
    const base = API_BASE.replace(/\/$/, '') + '/';
    const url = new URL(String(path).replace(/^\//, ""), base);

    const isForm = opts.body instanceof FormData;

    const init = {
        method: opts.method || "GET",
        headers: {
            ...(isForm ? {} : { "Content-Type": "application/json" }),
            ...(opts.headers || {})
        },
        cache: "no-store",
        body: opts.body
            ? (isForm ? opts.body : JSON.stringify(opts.body))
            : undefined
    };

    const res = await fetch(url, init);

    const contentType = res.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
        ? await res.json().catch(() => ({}))
        : await res.text();

    if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
    }

    return data;
}

/* ============================================================
   ASSET HELPERS
============================================================ */
export const API_ORIGIN = (() => {
    try {
        return new URL(API_BASE).origin;
    } catch {
        return location.origin;
    }
})();

export function resolveAsset(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url) || url.startsWith("data:")) return url;
    return API_ORIGIN + (url.startsWith("/") ? url : "/" + url);
}
