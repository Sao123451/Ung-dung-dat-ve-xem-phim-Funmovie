import { authHeaders } from "./auth.js";

export const API_BASE =
    (window.FM_CONFIG && window.FM_CONFIG.API_BASE) ||
    "http://localhost:3000/api";

export async function api(path, opts = {}) {
    const token = localStorage.getItem("token");

    opts.headers = {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    if (opts.body) {
        opts.body = JSON.stringify(opts.body);
    }

    const res = await fetch(`${API_BASE}${path}`, opts);
    return res.json();
}


export async function apiPublic(path, opts = {}) {
    const base = API_BASE.replace(/\/$/, '') + '/';
    const url = new URL(String(path).replace(/^\//, ""), base);

    const init = {
        method: opts.method || "GET",
        headers: { 
            "Content-Type": "application/json",
            ...(opts.headers || {}) 
        },
        cache: "no-store",
        body: opts.body ? JSON.stringify(opts.body) : undefined
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

/* Asset helpers */
export const API_ORIGIN = (() => {
    try { return new URL(API_BASE).origin; }
    catch { return location.origin; }
})();

export function resolveAsset(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url) || url.startsWith("data:")) return url;
    return API_ORIGIN + (url.startsWith("/") ? url : "/" + url);
}
