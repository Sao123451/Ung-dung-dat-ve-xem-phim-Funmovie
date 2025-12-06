// path: WEB_ADMIN_DATN/app.js
(() => {
  "use strict";


  const API_BASE = (window.FM_CONFIG && window.FM_CONFIG.API_BASE) || "";
  if (!API_BASE) console.warn("[FM] Missing FM_CONFIG.API_BASE");


  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const html = (strings, ...values) =>
    strings.reduce((acc, s, i) => acc + s + (i < values.length ? values[i] : ""), "");

  const esc = (s) =>
    String(s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));


  window.$ = $;
  window.$$ = $$;
  window.html = html;
  window.esc = esc;


  const z2       = (n) => String(n).padStart(2, "0");
  const fmtTime  = (d) => `${z2(d.getHours())}:${z2(d.getMinutes())}`;
  const fmtDate  = (d) => `${z2(d.getDate())}/${z2(d.getMonth()+1)}/${d.getFullYear()}`;
  const ymd      = (d) => `${d.getFullYear()}-${z2(d.getMonth()+1)}-${z2(d.getDate())}`;
  const fmtDuration = (mins) => {
    const m = Math.max(0, parseInt(mins || 0, 10));
    const h = Math.floor(m / 60);
    const r = m % 60;
    return h ? `${h}h ${r ? r + "m" : ""}`.trim() : `${r}m`;
  };
  const formatVND = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

  function apiOrigin() {
    try {
      const u = new URL(API_BASE);
      return `${u.protocol}//${u.host}`;
    } catch {
      // fallback guess
      return location.origin;
    }
  }
  function toAbsImage(u) {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    const base = apiOrigin();
    if (u.startsWith("/")) return base + u;
    return base + "/" + u;
  }

  window.toAbsImage = toAbsImage;

  // lu token tai khoan
  const LS_TOKEN_KEY = "FM_TOKEN";
  const LS_USER_KEY  = "FM_USER";

  const storage = {
    get(k, d = null) {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
      } catch {
        return d;
      }
    },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    remove(k) { localStorage.removeItem(k); },
  };

  function getToken()     { return storage.get(LS_TOKEN_KEY, ""); }
  function setToken(t)    { storage.set(LS_TOKEN_KEY, t || ""); }
  function getUser()      { return storage.get(LS_USER_KEY, null); }
  function setUser(u)     { storage.set(LS_USER_KEY, u || null); }
  function logout() {
    setToken("");
    setUser(null);
    location.hash = "";
    renderLogin();
  }

  // JWT exp checker (fails closed → treat as valid if parse fails)
  function isExpired(token) {
    try {
      const p = JSON.parse(atob(token.split(".")[1]));
      return p.exp ? p.exp * 1000 < Date.now() : false;
    } catch {
      return false;
    }
  }


  window.getUser = getUser;


  function ensureToastHost() {
    let host = $("#fm-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "fm-toast-host";
      Object.assign(host.style, {
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 9999,
        display: "grid",
        gap: "8px",
      });
      document.body.appendChild(host);
    }
    return host;
  }

  // type: 'ok' | 'warn' | 'err'
  function showToast(message, type = "ok", title = "") {
    const host = ensureToastHost();
    const card = document.createElement("div");
    card.className = "card";
    card.style.minWidth = "260px";
    card.innerHTML = html`
      <div style="display:flex; gap:10px; align-items:flex-start">
        <div class="badge ${type === "ok" ? "ok" : type === "warn" ? "warn" : "muted"}" style="text-transform:uppercase">
          ${type === "ok" ? "OK" : type === "warn" ? "WARN" : "ERR"}
        </div>
        <div style="flex:1">
          ${title ? `<div style="font-weight:600; margin-bottom:4px">${esc(title)}</div>` : ""}
          <div style="opacity:.9">${esc(message)}</div>
        </div>
        <button class="btn" style="padding:4px 8px">×</button>
      </div>
    `;
    const closeBtn = $("button", card);
    closeBtn.onclick = () => host.removeChild(card);
    host.appendChild(card);
    setTimeout(() => {
      if (card.isConnected) host.removeChild(card);
    }, 3500);
  }

  function openModal(innerHtml, onMount) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = innerHtml;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    function close() { backdrop.remove(); }
    // dong cua so khi nhan ra ngoai
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });

    const onEsc = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onEsc, { once: true });

    onMount && onMount({ el: modal, backdrop, close });
    return { close, el: modal };
  }

  window.openModal = openModal;
  window.showToast = showToast;


  function setInputError(inputEl, message = "") {
    if (!inputEl) return;
    inputEl.classList.add("input-error");
    const next = inputEl.nextElementSibling;
    if (next && next.classList.contains("error-text")) next.textContent = message || "";
    inputEl.title = message || "";
  }
  function clearInputError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove("input-error");
    inputEl.title = "";
    const next = inputEl.nextElementSibling;
    if (next && next.classList.contains("error-text")) next.textContent = "";
  }
  window.setInputError = setInputError;
  window.clearInputError = clearInputError;


  function normalizeFetchOptions(opts = {}) {
    const out = { ...opts };
    out.headers = new Headers(out.headers || {});
    // Default JSON headers unless body is FormData
    const isForm = (out.body && typeof FormData !== "undefined" && out.body instanceof FormData);
    if (!isForm && !out.headers.has("Content-Type")) {
      out.headers.set("Content-Type", "application/json");
    }
    if (!out.headers.has("Accept")) out.headers.set("Accept", "application/json");
    return out;
  }


  async function authFetch(path, opts = {}) {
  const token = getToken();
  const isForm = opts.body && typeof FormData !== "undefined" && opts.body instanceof FormData;
  const o = normalizeFetchOptions(opts);

  if (token) o.headers.set("Authorization", `Bearer ${token}`);

  // Ghép API_BASE nếu path không phải absolute URL
  let url = path;
  if (!/^https?:\/\//i.test(path)) {
    url = API_BASE.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
  }

  // stringify body nếu là object (không phải FormData)
  if (!isForm && o.body && typeof o.body === "object") {
    o.body = JSON.stringify(o.body);
  }

  const res = await fetch(url, o);

  if (res.status === 401) {
    logout();
    return res;
  }
  return res;
}

  window.authFetch = authFetch;


  // Route map 
  window.FM_PAGES = {
    dashboard: { js: "pages/dashboard/dashboard.js", title: "Dashboard",      mount: "dashboard" },
    movies:    { js: "pages/movies/movies.js",       title: "Phim",           mount: "movies"    },
    cinemas:   { js: "pages/cinemas/cinemas.js",     title: "Rạp",            mount: "cinemas"   },
    rooms:     { js: "pages/rooms/rooms.js",         title: "Phòng",          mount: "rooms"     },
    products:  { js: "pages/products/products.js",   title: "Bỏng & Nước",    mount: "products"  },
    showtimes: { js: "pages/showtimes/showtimes.js", title: "Suất chiếu",     mount: "showtimes" },
    banners:   { js: "pages/banners/banners.js",     title: "Banner",         mount: "banners"   },
    vouchers:  { js: "pages/vouchers/vouchers.js",   title: "Voucher",        mount: "vouchers"  },
    users:     { js: "pages/users/users.js",         title: "Người dùng",     mount: "users"     },
    news:      { js: "pages/news/news.js",           title: "Tin tức",        mount: "news"      },
    tickets: { js: "pages/tickets/tickets.js", title: "Vé", mount: "tickets" },
    activity:  { js: "pages/activity/activity.js",   title: "Lịch sử hoạt động", mount: "activity" },

  };

  const __loadedScripts = new Set();
  const __loadedCss     = new Set();
  let __currentToolbarHooks = { reload: null, create: null };

  function currentRoute() {
    const raw = (location.hash || "").replace(/^#/, "");
    return (raw.split("?")[0] || "").trim();
  }

  function setActiveNav(route) {
    $$("[data-route]").forEach((b) => b.classList.toggle("active", b.getAttribute("data-route") === route));
  }

  function ensurePageStyle(routeKey) {
    const cssUrl = `pages/${routeKey}/${routeKey}.css`;
    if (__loadedCss.has(cssUrl)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl + `?v=${Date.now()}`; 
    link.onload  = () => __loadedCss.add(cssUrl);
    link.onerror = () => {}; 
    document.head.appendChild(link);
  }

  function ensurePageScript(routeKey) {
    const def = window.FM_PAGES[routeKey];
    if (!def) return Promise.reject(new Error(`Unknown route: ${routeKey}`));
    if (__loadedScripts.has(def.js)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = def.js + `?v=${Date.now()}`;
      s.onload  = () => { __loadedScripts.add(def.js); resolve(); };
      s.onerror = () => reject(new Error(`Failed to load: ${def.js}`));
      document.head.appendChild(s);
    });
  }

  async function mountPage(routeKey) {
    const def = window.FM_PAGES[routeKey];
    if (!def) return;

    ensurePageStyle(routeKey);
    await ensurePageScript(routeKey);

    const titleEl = $("#page-title");
    if (titleEl) titleEl.textContent = def.title;

    const pageEl = $("#page");
    if (!pageEl) return;

    pageEl.innerHTML = ""; // clean previous
    __currentToolbarHooks = { reload: null, create: null };

    window.FMPages = window.FMPages || {};
    const mountFn = window.FMPages[def.mount];
    if (typeof mountFn !== "function") {
      pageEl.innerHTML = `<div class="card"><div class="muted">Trang chưa sẵn sàng: ${esc(def.title)}</div></div>`;
      return;
    }

 
    const ctx = {
      API_BASE,
      
      authFetch, getUser,
      
      showToast, openModal, setInputError, clearInputError,
      
      html, $, $$, esc,
    
      toAbsImage, apiOrigin, z2, fmtTime, fmtDate, ymd, fmtDuration, formatVND,
    };

    const hooks = await mountFn(pageEl, ctx);
    if (hooks && hooks.onToolbar) {
      __currentToolbarHooks = {
        reload: hooks.onToolbar.reload || null,
        create: hooks.onToolbar.create || null,
      };
    }
  }

  async function selectPage(routeKey) {
    const me = getUser() || {};
    // Role gate
    const adminOnly = ["users"];
    const adminMgr  = ["dashboard", "movies", "cinemas", "rooms", "products", "showtimes", "banners", "vouchers", "news", "users","activity"];
    const staffOnly = ["showtimes"];

    let allow = false;
    if (me.role === "admin") allow = true;
    else if (me.role === "manager") allow = !adminOnly.includes(routeKey) && adminMgr.includes(routeKey);
    else if (me.role === "staff") allow = staffOnly.includes(routeKey);

    if (!allow) routeKey = me.role === "staff" ? "showtimes" : "dashboard";

    setActiveNav(routeKey);
    await mountPage(routeKey);
  }

  function goTo(routeKey) { location.hash = `#${routeKey}`; }
  window.goTo = goTo;

// Không cho chuyển trang khi chưa đăng nhập
window.addEventListener("hashchange", () => {
  if (!getToken()) return;          // chưa login → bỏ qua điều hướng
  selectPage(currentRoute());
});

  /* ============================================================
   *  7) App shell & navigation
   * ============================================================ */
  function renderNavForRole(me) {
    const nav = $("#nav");
    if (!nav) return;

    const items = [];
    if (["admin", "manager"].includes(me.role)) {
      items.push(
        { key: "dashboard", label: "Dashboard" },
        { key: "movies",    label: "Phim" },
        { key: "cinemas",   label: "Rạp" },
        { key: "rooms",     label: "Phòng" },
        { key: "products",  label: "Bỏng & Nước" },
        { key: "showtimes", label: "Suất chiếu" },
        { key: "tickets", label: "Vé" },
        { key: "banners",   label: "Banner" },
        { key: "vouchers",  label: "Voucher" },
        { key: "users",     label: "Người dùng", adminOnly: true },
        { key: "news",      label: "Tin tức" },
        { key: "activity",  label: "Lịch sử hoạt động" }
        
      );
    } else if (me.role === "staff") {
      items.push({ key: "showtimes", label: "Suất chiếu" });
    }

    nav.innerHTML = items
      .filter((it) => !(it.adminOnly && me.role !== "admin"))
      .map((it) => `<button data-route="${it.key}">${it.label}</button>`)
      .join("");

    $$("[data-route]", nav).forEach((btn) => { btn.onclick = () => goTo(btn.getAttribute("data-route")); });
  }

  function renderAppShell() {
    const root = $("#root");
    const tpl  = $("#tpl-app");
    if (!root || !tpl) return showToast("Thiếu template app", "err", "Lỗi");

    root.innerHTML = "";
    root.appendChild(tpl.content.cloneNode(true));

    const me = getUser() || {};
    renderNavForRole(me);

    // Toolbar wiring → delegates to current page hooks
    const btnRefresh = $("#btn-refresh");
    const btnCreate  = $("#btn-create");
    if (btnRefresh) btnRefresh.onclick = () => __currentToolbarHooks.reload && __currentToolbarHooks.reload();
    if (btnCreate)  btnCreate.onclick  = () => __currentToolbarHooks.create && __currentToolbarHooks.create();

    // Logout
    const btnLogout = $("#btn-logout");
    if (btnLogout) btnLogout.onclick = () => logout();

    // Default route
    if (!location.hash) {
      location.hash = me.role === "staff" ? "#showtimes" : "#dashboard";
    }
    selectPage(currentRoute());
  }

  /* ============================================================
   *  8) Login screen & flow
   * ============================================================
   *  (giữ nhẹ, đúng chuẩn API: POST /auth/login → token;
   *   sau đó GET /users/me để lấy hồ sơ)
   * ============================================================ */
  function renderLogin(message = "") {
    const root = $("#root");
    const tpl  = $("#tpl-login");
    if (!root || !tpl) return alert("Thiếu template login");
    root.innerHTML = "";
    root.appendChild(tpl.content.cloneNode(true));

    const u = $("#lg-username");
    const p = $("#lg-password");
    const help = $("#login-help");
    const btnLogin = $("#btn-login");
    const btnDemo  = $("#btn-fill-demo");

    if (message) { help.textContent = message; help.classList.add("error"); }
    else { help.textContent = ""; help.classList.remove("error"); }

    if (btnDemo) {
      btnDemo.onclick = () => {
        u.value = "admin@example.com";
        p.value = "123456";
        help.textContent = "";
        help.classList.remove("error");
        [u, p].forEach(clearInputError);
      };
    }

    // Press Enter to login
    [u, p].forEach((el) => el && el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") btnLogin?.click();
    }));

    if (btnLogin) {
      btnLogin.onclick = async () => {
        [u, p].forEach(clearInputError);
        help.textContent = "";
        help.classList.remove("error");

        const usernameOrEmail = (u.value || "").trim();
        const password        = (p.value || "").trim();
        let ok = true;
        if (!usernameOrEmail) { setInputError(u, "Vui lòng nhập tên đăng nhập/email"); ok = false; }
        if (!password)        { setInputError(p, "Vui lòng nhập mật khẩu");          ok = false; }
        if (!ok) return;

        btnLogin.disabled = true;
        try {
          // 1) Login
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ usernameOrEmail, password }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data?.token) {
            help.textContent = esc(data?.message || "Đăng nhập thất bại");
            help.classList.add("error");
            u.classList.add("shake");
            p.classList.add("shake");
            setTimeout(() => { u.classList.remove("shake"); p.classList.remove("shake"); }, 300);
            return;
          }

          // 2) Profile
          setToken(data.token);
          let me;
          try {
            const meRes = await authFetch(`${API_BASE}/users/me`, { method: "GET" });
            me = await meRes.json().catch(() => null);
            if (!meRes.ok || !me) throw new Error("Không lấy được hồ sơ người dùng");
          } catch (e) {
            showToast(e.message || "Không lấy được hồ sơ người dùng", "err", "Lỗi");
            setToken("");
            return;
          }


          if (me.status && me.status !== "active") {
            setToken("");
            help.textContent = "Tài khoản chưa hoạt động hoặc bị khoá.";
            help.classList.add("error");
            return;
          }
          // chi role admin moi duọc dn
          if (me.role !== "admin") {
          setToken("");
          setUser(null);
          help.textContent = "Tài khoản không có quyền đăng nhập trang quản trị.";
          help.classList.add("error");
          return;
        }

          setUser(me);
          renderAppShell();
          showToast("Đăng nhập thành công", "ok");
        } catch {
          help.textContent = "Không thể kết nối máy chủ.";
          help.classList.add("error");
        } finally {
          btnLogin.disabled = false;
        }
      };
    }
  }


function bootstrap() {
  try {
    // Luôn xoá phiên cũ để buộc đăng nhập lại khi mở web
    setToken("");
    setUser(null);
    location.hash = "";   
  } catch {}
  renderLogin();          // mở màn hình đăng nhập
}



  document.addEventListener("DOMContentLoaded", bootstrap);

})();
