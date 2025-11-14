// ===== Base URL & helpers =====
const API_BASE = (window.FM_CONFIG?.API_BASE || 'http://localhost:3000/api').replace(/\/+$/,''); // không để dấu / thừa cuối
function apiOrigin() {
  try {
    const u = new URL(API_BASE + '/');           // ví dụ: http://localhost:3000/api/
    return `${u.protocol}//${u.host}`;           // -> http://localhost:3000
  } catch { return ''; }
}

/** Chuẩn hoá URL ảnh: nhận /public/uploads/.., public/uploads/.., ./public/.. hoặc URL tuyệt đối */
function toAbsImage(u) {
  const v = String(u || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;         // đã là absolute
  const origin = apiOrigin();
  const path = v.replace(/^(\.\/)+/,'');         // bỏ ./ đầu
  return origin + (path.startsWith('/') ? '' : '/') + path;
}


// DOM helpers + storage
const $ = (s, r = document) => r.querySelector(s);
const saveToken = (t) => localStorage.setItem('fm_token', t);
const getToken  = ()   => localStorage.getItem('fm_token');
const saveUser  = (u)  => localStorage.setItem('fm_user', JSON.stringify(u));
const getUser   = ()   => { try { return JSON.parse(localStorage.getItem('fm_user') || 'null'); } catch { return null; } };

// ===== Validate helpers (FE-only) =====
function setInputError(inputEl, msg) {
  if (!inputEl) return;
  inputEl.classList.add('input-error');
  let err = inputEl.parentElement.querySelector('.error-text');
  if (!err) {
    err = document.createElement('div');
    err.className = 'error-text';
    inputEl.parentElement.appendChild(err);
  }
  err.textContent = msg || '';
}

function clearInputError(inputEl) {
  if (!inputEl) return;
  inputEl.classList.remove('input-error');
  const err = inputEl.parentElement.querySelector('.error-text');
  if (err) err.textContent = '';
}

function requireNotEmpty(inputEl, label) {
  const v = (inputEl?.value || '').trim();
  if (!v) { setInputError(inputEl, `${label} không được để trống.`); return false; }
  clearInputError(inputEl); return true;
}


document.addEventListener('input', (e) => {
  const el = e.target;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) clearInputError(el);
});


// Quyền
const isAdmin = () => (getUser()?.role === 'admin');

// Modal helpers
function openModal(innerHtml, onMount) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal">${innerHtml}</div>`;
  document.body.append(wrap);
  const api = { close: () => wrap.remove(), el: wrap.querySelector('.modal') };
  if (typeof onMount === 'function') onMount(api);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) api.close(); });
  return api;
}

(function ensureUiHelpersStyles(){
  if (document.getElementById('fm-ui-style')) return;
  const s = document.createElement('style');
  s.id = 'fm-ui-style';
  s.textContent = `
    .fm-toast-wrap{position:fixed;right:16px;top:16px;z-index:9999;display:flex;flex-direction:column;gap:8px}
    .fm-toast{min-width:260px;max-width:420px;padding:10px 12px;border-radius:10px;background:#19223c;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:14px}
    .fm-toast.ok{border-left:4px solid #22c55e}
    .fm-toast.warn{border-left:4px solid #f59e0b}
    .fm-toast.err{border-left:4px solid #ef4444}
    .fm-toast .ttl{font-weight:600;margin-bottom:4px}
    .fm-toast .msg{opacity:.95}
    input[type="date"].fm-date{color-scheme:dark}
    input[type="date"].fm-date::-webkit-calendar-picker-indicator{filter:brightness(0) invert(1);opacity:1}
  `;
  document.head.appendChild(s);
})();
function showToast(msg, type='ok', title='Thông báo'){
  let wrap = document.querySelector('.fm-toast-wrap');
  if (!wrap){ wrap = document.createElement('div'); wrap.className = 'fm-toast-wrap'; document.body.appendChild(wrap); }
  const el = document.createElement('div');
  el.className = `fm-toast ${type}`;
  el.innerHTML = `<div class="ttl">${title}</div><div class="msg">${msg||''}</div>`;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(-6px)'; setTimeout(()=>el.remove(),180); }, 2800);
}
function showConfirmDialog(title, message, onConfirm){
  const markup = html`
    <div class="modal-head"><h3>${title||'Xác nhận'}</h3></div>
    <div class="form"><p style="margin:12px 0">${message||''}</p></div>
    <div class="modal-foot">
      <button class="btn" id="cf-cancel">Hủy</button>
      <button class="btn danger" id="cf-ok">Xác nhận</button>
    </div>`;
  openModal(markup, ({ el, close }) => {
    el.querySelector('#cf-cancel').onclick = close;
    el.querySelector('#cf-ok').onclick = () => { close(); onConfirm && onConfirm(); };
  });
}



async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, {
    credentials: 'omit',           // dùng Bearer, không cần cookie
    cache: options.cache ?? 'no-store',
    ...options,
    headers
  });
  return res;
}

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
};
const fmtDuration = (m) => m ? `${m} phút` : '';
const html = (strings, ...vals) => strings.map((s, i) => s + (vals[i] ?? '')).join('');


// Khởi động: render form login
(function start() {
  const tpl = $('#tpl-login'); const root = $('#root');
  root.innerHTML = ''; root.append(tpl.content.cloneNode(true));

  $('#btn-fill-demo').onclick = () => {
    $('#lg-username').value = 'admin@example.com';
    $('#lg-password').value = 'admin123';
  };
  $('#btn-login').onclick = onLoginSubmit;
})();

function setFieldError(el, isErr) {
  if (!el) return;
  if (isErr) el.classList.add('input-error'); else el.classList.remove('input-error');
}

function showHelp(msg, isError = false) {
  const help = $('#login-help');
  help.textContent = msg || '';
  help.classList.toggle('error', !!isError);
  if (isError) {
    const card = help.closest('.login-card');
    card?.classList.add('shake');
    setTimeout(() => card?.classList.remove('shake'), 300);
  }
}

async function onLoginSubmit() {
  const btn = $('#btn-login');
  const uEl = $('#lg-username');
  const pEl = $('#lg-password');
  const usernameOrEmail = uEl.value.trim();
  const password = pEl.value;

  // reset trạng thái
  setFieldError(uEl, false);
  setFieldError(pEl, false);
  showHelp('');

  // Validate phía client
  let hasErr = false;
  if (!usernameOrEmail) { setFieldError(uEl, true); hasErr = true; }
  if (!password) { setFieldError(pEl, true); hasErr = true; }
  if (hasErr) {
    showHelp('Vui lòng nhập đầy đủ tài khoản và mật khẩu.', true);
    (!usernameOrEmail ? uEl : pEl).focus();
    return;
  }

  // Khóa nút trong lúc gửi
  btn.disabled = true;
  showHelp('Đang đăng nhập...');

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Mapping thông báo thân thiện
      let msg = 'Đăng nhập thất bại.';
      if (res.status === 400) msg = 'Sai tài khoản hoặc mật khẩu.';
      else if (res.status === 401) msg = 'Không được phép. Vui lòng thử lại.';
      else if (res.status === 429) msg = 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.';
      else if (data?.message) msg = data.message;

      setFieldError(uEl, true);
      setFieldError(pEl, true);
      showHelp(msg, true);
      btn.disabled = false;
      return;
    }

    const { token, user } = data;
     // ✅ Kiểm tra hồ sơ thật bằng token (lấy status từ backend)
    let meRes = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    const me = await meRes.json().catch(() => ({}));
    if (!meRes.ok) {
      setFieldError(uEl, true);
      setFieldError(pEl, true);
      showHelp(me?.message || 'Không đọc được hồ sơ người dùng.', true);
      btn.disabled = false;
      return;
    }
    // ❗ Chặn đăng nhập nếu tài khoản bị vô hiệu hoá
    if (user && user.status && user.status !== 'active') {
      setFieldError(uEl, true);
      setFieldError(pEl, true);
      showHelp('Tài khoản đã bị vô hiệu hoá. Liên hệ quản trị viên.', true);
      // tuyệt đối KHÔNG lưu token/user
      return;
    }

    // Thành công
    saveToken(token);
    saveUser(user);
    showHelp('Đăng nhập thành công!');
    renderAppShell();
  } catch (e) {
    setFieldError(uEl, true);
    setFieldError(pEl, true);
    showHelp('Không thể kết nối máy chủ. Kiểm tra API và mạng.', true);
  } finally {
    btn.disabled = false;
  }
}

// Xóa đỏ khi người dùng gõ lại
document.addEventListener('input', (e) => {
  if (e.target?.id === 'lg-username' || e.target?.id === 'lg-password') {
    setFieldError(e.target, false);
    showHelp('');
  }
});
// Enter để submit
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && $('#btn-login')) onLoginSubmit();
});

function renderAppShell() {
  const tpl = $('#tpl-app'); 
  const root = $('#root');
  root.innerHTML = ''; 
  root.append(tpl.content.cloneNode(true));

  // ✅ Kiểm tra trạng thái tài khoản bằng token hiện có
  (async () => {
    try {
      const r = await authFetch(`${API_BASE}/users/me`, { cache: 'no-store' });
      const meLive = await r.json().catch(() => ({}));

      // Không hợp lệ hoặc bị disabled → chặn & đá ra
      if (!r.ok || meLive.status !== 'active') {
        alert('Tài khoản của bạn đã bị vô hiệu hoá hoặc không hợp lệ. Vui lòng liên hệ quản trị viên.');
        return logout();
      }

      // Hợp lệ → merge vào localStorage cho đồng bộ (avatar/status/...)
      const cur = getUser() || {};
      const me = { ...cur, ...meLive };
      saveUser(me);

      // Chặn role không đủ quyền
      if (!['admin', 'manager'].includes(me.role)) {
        alert('Tài khoản của bạn không có quyền truy cập Admin.');
        return logout();
      }

      // ====== TỪ ĐÂY MỚI TIẾP TỤC VẼ APP ======
      const navItems = ['Dashboard', 'Phim', 'Rạp' ,'Phòng', 'Bỏng & Nước', 'Suất chiếu', 'Banner', 'Voucher', 'Người dùng', 'Tin tức'];
      const nav = $('#nav');
      const btnRefresh = $('#btn-refresh');
      const btnCreate = $('#btn-create');

      function updateToolbarFor(label) {
        const meNow = getUser(); // đọc lại phòng khi đã được merge
        btnRefresh.disabled = false;

        let showCreate = false;
        let createText = '+ Thêm mới';

        if (label === 'Phim' && meNow.role === 'admin') { showCreate = true; createText = '+ Thêm phim'; }
        if (label === 'Rạp' && ['admin','manager'].includes(meNow.role)) { showCreate = true; createText = '+ Thêm rạp'; }
        if (label === 'Phòng' && ['admin','manager'].includes(meNow.role)) { showCreate = true; createText = '+ Thêm phòng'; }
        if (label === 'Bỏng & Nước' && ['admin','manager','staff'].includes(meNow.role)) { showCreate = true; createText = '+ Thêm sản phẩm'; }
        if (label === 'Banner' && ['admin','manager'].includes(meNow.role)) { showCreate = true; createText = '+ Thêm banner'; }
        if (label === 'Tin tức' && ['admin','manager'].includes(meNow.role)) { showCreate = true; createText = '+ Thêm tin'; }
        if (label === 'Suất chiếu' && ['admin','manager','staff'].includes(meNow.role)) {showCreate = true;createText = '+ Thêm suất chiếu';}
        if (label === 'Voucher' && meNow.role === 'admin') {showCreate = true;createText = '+ Thêm voucher';}


        btnCreate.style.display = showCreate ? '' : 'none';
        btnCreate.textContent = createText;
      }

      navItems.forEach((label, i) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (i === 0) btn.classList.add('active');
        btn.onclick = () => { selectPage(label, btn); updateToolbarFor(label); };
        nav.append(btn);
      });

      btnRefresh.onclick = () => refreshPage();
      btnCreate.onclick = () => createEntityForCurrentPage();
      $('#btn-logout').onclick = logout;

      selectPage('Dashboard', nav.firstChild);
      updateToolbarFor('Dashboard');
    } catch (e) {
      // Nếu gọi /users/me lỗi mạng → coi như không hợp lệ để tránh lọt
      alert('Không thể xác thực phiên đăng nhập. Vui lòng đăng nhập lại.');
      return logout();
    }
  })();
}


function logout() {
  localStorage.removeItem('fm_token');
  localStorage.removeItem('fm_user');
  location.reload();
}

function selectPage(label, btn) {
  // set active nav
  [...document.querySelectorAll('.nav button')].forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // set title
  $('#page-title').textContent = label;

  // clear page
  const page = $('#page');
  page.innerHTML = '';

  if (label === 'Dashboard') {
    page.innerHTML = `
      <section class="kpi">
        <div class="card">
          <div class="muted">Xin chào</div>
          <div class="value">${getUser()?.username || ''}</div>
          <div class="sub">Bạn đã đăng nhập thành công.</div>
        </div>
      </section>
    `;
  } else if (label === 'Phim') {
    // ➜ Trang danh sách phim
    renderMoviesPage(page);
  } else if (label === 'Rạp') {
    renderCinemasPage(page);           
  } else if (label === 'Phòng') {
    renderRoomsPage(page);             
  } else if (label === 'Bỏng & Nước') {
    renderProductsPage(page);     
  } else if (label === 'Người dùng') {
    renderUserList(page);
  } else if (label === 'Banner') {
    renderBannersPage(page);
    } else if (label === 'Suất chiếu') {
  renderShowtimesPage(page);
  } else if (label === 'Tin tức') {

    renderNewsPage(page);
  } else if (label === 'Voucher') {
    renderVoucherPage(page);
  }
   else {
    page.innerHTML = `<div class="card">Trang <b>${label}</b> đang phát triển.</div>`;
  }
}


async function renderUserList(container) {
  // expose API cho toolbar
  window.fm_users = { reload: () => {} };

  const me = getUser();
  if (!me || me.role !== 'admin') {
    container.innerHTML = `<div class="card">Chỉ Admin mới truy cập được trang này.</div>`;
    return;
  }

  // ===== UI =====
  container.innerHTML = `
    <div class="card">
      <h3 style="margin:0 0 8px">Tạo tài khoản nhân sự</h3>
      <div class="form">
        <div class="row">
          <div class="col-6 field"><label>Username *</label><input id="cu-username"/></div>
          <div class="col-6 field"><label>Email (@gmail.com) *</label><input id="cu-email"/></div>
          <div class="col-6 field"><label>Mật khẩu *</label><input id="cu-password" type="password" placeholder="≥8 ký tự"/></div>
          <div class="col-6 field"><label>Họ tên *</label><input id="cu-fullname"/></div>
          <div class="col-6 field"><label>SĐT *</label><input id="cu-phone" type="text" oninput="this.value=this.value.replace(/[^0-9]/g,'')"/></div>
          <div class="col-6 field">
            <label>Vai trò *</label>
            <select id="cu-role">
              <option value="staff">staff</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <!-- ⭐ MỚI: chọn rạp khi role = staff/manager -->
          <div class="col-6 field" id="cu-cinema-wrap" style="display:none">
            <label>Rạp hoạt động *</label>
            <select id="cu-cinema">
              <option value="">Đang tải rạp...</option>
            </select>
          </div>

          <div class="col-6 field"><label>Ngày sinh (tùy chọn)</label><input id="cu-birth" type="date" class="fm-date"/></div>
        </div>
        <div class="row">
          <div class="col-6">
            <button class="btn primary" id="btn-create-user">Tạo tài khoản</button>
          </div>
          <div class="col-6" style="text-align:right">
            <span class="help" id="cu-help"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px">
        <h3 style="margin:0">Người dùng</h3>
        <div style="display:flex; gap:8px">
          <input id="usr-q" class="search" placeholder="Tìm username/email..." style="width:260px">
        </div>
      </div>
      <div id="usr-table" class="table-wrap">
        <div class="muted">Đang tải người dùng...</div>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:10px">
        <div class="muted" id="usr-info"></div>
        <div class="pager">
          <button class="btn" id="usr-prev">←</button>
          <span id="usr-page" class="muted">1</span>
          <button class="btn" id="usr-next">→</button>
        </div>
      </div>
    </div>
  `;

  // ===== Style: icon lịch màu trắng =====
  const __dateStyle = document.createElement('style');
  __dateStyle.textContent = `
    input[type="date"].fm-date { color-scheme: dark; }
    input[type="date"].fm-date::-webkit-calendar-picker-indicator{
      filter: brightness(0) invert(1);
      opacity: 1;
    }
  `;
  container.appendChild(__dateStyle);

  // ===== Els =====
  const els = {
    q: $('#usr-q'),
    table: $('#usr-table'),
    info: $('#usr-info'),
    prev: $('#usr-prev'),
    next: $('#usr-next'),
    pg: $('#usr-page')
  };

  const cuEls = {
    username: $('#cu-username'),
    email: $('#cu-email'),
    password: $('#cu-password'),
    fullname: $('#cu-fullname'),
    phone: $('#cu-phone'),
    role: $('#cu-role'),
    birth: $('#cu-birth'),
    help: $('#cu-help'),
    cinemaWrap: $('#cu-cinema-wrap'),
    cinema: $('#cu-cinema')
  };

  // ===== State =====
  let raw = [];
  let view = [];
  let page = 1;
  const pageSize = 6;

  // ⭐ MỚI: danh sách rạp cho dropdown
  let cinemas = [];

  // Regex: email Gmail, SĐT phải bắt đầu 0 và đủ 10 số
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  const phoneRegex = /^0\d{9}$/;

  // ===== Helpers =====
  function showListInfo(msg, isError = false) {
    els.info.textContent = msg || '';
    if (isError) els.info.classList.add('error-text'); else els.info.classList.remove('error-text');
  }
  function showCreateHelp(msg, isError = false) {
    cuEls.help.textContent = msg || '';
    if (isError) cuEls.help.classList.add('error-text'); else cuEls.help.classList.remove('error-text');
  }
  function showConfirmDialog(title, message, onConfirm) {
    const htmlConfirm = html`
      <div class="modal-head"><h3>${title}</h3></div>
      <div class="form"><p style="margin:12px 0">${message}</p></div>
      <div class="modal-foot">
        <button class="btn" id="cf-cancel">Hủy</button>
        <button class="btn danger" id="cf-ok">Xác nhận</button>
      </div>`;
    openModal(htmlConfirm, ({ el, close }) => {
      el.querySelector('#cf-cancel').onclick = close;
      el.querySelector('#cf-ok').onclick = () => { close(); onConfirm && onConfirm(); };
    });
  }
  function fmtYMD(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function setBirthBounds(inputEl){
    if (!inputEl) return;
    const now = new Date();
    const max = new Date(now.getFullYear()-20, now.getMonth(), now.getDate());
    const min = new Date(now.getFullYear()-50, now.getMonth(), now.getDate());
    inputEl.setAttribute('max', fmtYMD(max));
    inputEl.setAttribute('min', fmtYMD(min));
  }
  function calcAge(isoDate){
    if (!isoDate) return null;
    const dob = new Date(isoDate);
    if (isNaN(dob)) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const mo = now.getMonth() - dob.getMonth();
    if (mo < 0 || (mo === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  }

  // Giới hạn chọn ngày sinh ở form tạo
  setBirthBounds(cuEls.birth);

  // ===== API =====
  async function loadCinemas() {
    try {
      const res = await authFetch(`${API_BASE}/cinemas?limit=1000`, { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      // chấp nhận nhiều format trả về
      const items = Array.isArray(d) ? d :
                    Array.isArray(d.items) ? d.items :
                    Array.isArray(d.data) ? d.data : [];
      cinemas = items;
      fillCinemaOptions();
    } catch {
      cinemas = [];
      fillCinemaOptions(true);
    }
  }

  function fillCinemaOptions(error = false) {
    if (!cuEls.cinema) return;
    if (error) {
      cuEls.cinema.innerHTML = `<option value="">Không tải được danh sách rạp</option>`;
      return;
    }
    cuEls.cinema.innerHTML = [
      `<option value="">-- Chọn rạp --</option>`,
      ...cinemas.map(c => `<option value="${c._id}">${c.name || 'Không tên'}${c.city ? ' - ' + c.city : ''}</option>`)
    ].join('');
  }

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải người dùng...</div>`;
    showListInfo('');
    try {
      const res = await authFetch(`${API_BASE}/users`, { cache: 'no-store' });
      const list = await res.json().catch(() => ({}));
      if (!Array.isArray(list)) throw new Error('Bad response');
      raw = list;
      applyFilter();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được người dùng.</div>`;
      showListInfo('Không tải được danh sách người dùng.', true);
    }
  }

  function applyFilter() {
    const q = (els.q.value || '').trim().toLowerCase();
    view = !q
      ? raw.slice()
      : raw.filter(u =>
          (u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
    page = 1;
    renderTable();
  }

  function badgeStatus(s) {
    if (s === 'disabled') return '<span class="badge muted">disabled</span>';
    return '<span class="badge ok">active</span>';
  }

  function renderTable() {
    const total = view.length;
    const start = (page - 1) * pageSize;
    const rows = view.slice(start, start + pageSize);

    if (!rows.length) {
      els.table.innerHTML = `<div class="muted">Không có người dùng.</div>`;
    } else {
      els.table.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Họ tên</th>
              <th>Role</th>
              <th>Rạp</th> <!-- ⭐ MỚI -->
              <th>Trạng thái</th>
              <th style="width:240px">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(u => `
              <tr data-id="${u._id}">
                <td>${u.username || ''}</td>
                <td>${u.email || ''}</td>
                <td>${u.full_name || ''}</td>
                <td>${u.role || ''}</td>
                <td>${u.cinema && u.cinema.name ? u.cinema.name : ''}</td> <!-- ⭐ MỚI -->
                <td>${badgeStatus(u.status)}</td>
                <td>
                  <div class="row-actions">
                    <button class="btn" data-act="edit" data-id="${u._id}">Sửa</button>
                    ${u.status === 'disabled'
                      ? `<button class="btn" data-act="restore" data-id="${u._id}">Khôi phục</button>`
                      : `<button class="btn danger" data-act="del" data-id="${u._id}">Xoá</button>`}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      els.table.querySelectorAll('[data-act]').forEach(b => b.onclick = onUserRowAction);
    }

    els.info.textContent = total
      ? `Hiển thị ${Math.min(start + 1, total)}–${Math.min(start + rows.length, total)} / ${total}`
      : '';
    els.info.classList.remove('error-text');
    els.pg.textContent = String(page);
  }

  // ===== Edit form (giữ nguyên) =====
  function openEditUserForm(user) {
    const htmlForm = html`
      <div class="modal-head">
        <h3>Sửa người dùng</h3>
        <div class="spacer"></div>
      </div>
      <div class="form">
        <div class="row">
          <div class="col-6 field"><label>Username</label><input id="eu-username" value="${user.username || ''}" disabled></div>
          <div class="col-6 field"><label>Email (@gmail.com) *</label><input id="eu-email" value="${user.email || ''}"></div>
          <div class="col-6 field"><label>Họ tên *</label><input id="eu-fullname" value="${user.full_name || ''}"></div>
          <div class="col-6 field"><label>SĐT *</label><input id="eu-phone" type="text" value="${user.phone || ''}" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
          <div class="col-6 field"><label>Ngày sinh</label><input id="eu-birth" type="date" class="fm-date" value="${user.birth_date || ''}"></div>
          <div class="col-6 field"><label>Avatar (URL)</label><input id="eu-avatar" value="${user.avatar || ''}"></div>
          <div class="col-6 field">
            <label>Vai trò *</label>
            <select id="eu-role">
              <option value="staff"   ${user.role === 'staff' ? 'selected' : ''}>staff</option>
              <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>manager</option>
              <option value="admin"   ${user.role === 'admin' ? 'selected' : ''}>admin</option>
              <option value="customer"${user.role === 'customer' ? 'selected' : ''}>customer</option>
            </select>
          </div>
          <div class="col-6 field">
            <label>Trạng thái</label>
            <select id="eu-status">
              <option value="active"   ${user.status !== 'disabled' ? 'selected' : ''}>active</option>
              <option value="disabled" ${user.status === 'disabled' ? 'selected' : ''}>disabled</option>
            </select>
          </div>
        </div>
        <div id="eu-error" style="margin-top:8px;font-size:13px;color:#f87171;"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="eu-cancel">Hủy</button>
        <button class="btn primary" id="eu-submit">Lưu</button>
      </div>
    `;

    openModal(htmlForm, ({ el, close }) => {
      const $g = id => el.querySelector(`#${id}`);
      const errEl = $g('eu-error');
      const emailEl = $g('eu-email');
      const fullEl  = $g('eu-fullname');
      const phoneEl = $g('eu-phone');
      const roleEl  = $g('eu-role');
      const birthEl = $g('eu-birth');

      setBirthBounds(birthEl);

      function requireField(inputEl) {
        if (!inputEl) return true;
        const v = (inputEl.value || '').trim();
        if (!v) { setInputError(inputEl, 'Hãy nhập đủ thông tin'); return false; }
        clearInputError(inputEl); return true;
      }

      [emailEl, fullEl, phoneEl, roleEl, birthEl].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => { clearInputError(input); if (errEl) errEl.textContent = ''; });
        if (input.tagName === 'SELECT') input.addEventListener('change', () => { clearInputError(input); if (errEl) errEl.textContent=''; });
      });

      $g('eu-cancel').onclick = close;

      $g('eu-submit').onclick = async () => {
        if (errEl) errEl.textContent = '';

        let ok = true;
        ok = requireField(emailEl) && ok;
        ok = requireField(fullEl)  && ok;
        ok = requireField(phoneEl) && ok;
        ok = requireField(roleEl)  && ok;

        const email = (emailEl.value || '').trim().toLowerCase();
        if (!emailRegex.test(email)) { setInputError(emailEl, 'Vui lòng nhập email @gmail.com hợp lệ'); if (errEl) errEl.textContent='Email phải có đuôi @gmail.com.'; ok = false; }

        const phone = (phoneEl.value || '').trim();
        if (!phoneRegex.test(phone)) { setInputError(phoneEl, 'SĐT phải bắt đầu 0 và đủ 10 số'); if (errEl) errEl.textContent='SĐT phải bắt đầu 0 và đủ 10 số.'; ok = false; }

        const birthVal = (birthEl.value || '').trim();
        if (birthVal) {
          const age = calcAge(birthVal);
          if (age !== null && (age < 20 || age > 50)) {
            setInputError(birthEl, 'Tuổi phải từ 20 đến 50');
            if (errEl) errEl.textContent = 'Ngày sinh: tuổi phải từ 20 đến 50.';
            ok = false;
          }
        }

        if (!ok) return;

        const avatar = ($g('eu-avatar').value || '').trim();
        const status = $g('eu-status').value;

        const body = {
          email,
          full_name: (fullEl.value || '').trim(),
          phone,
          role: roleEl.value,
          avatar,
          status
        };
        if (birthVal) body.birth_date = birthVal;

        try {
          const res = await authFetch(`${API_BASE}/users/${user._id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { if (errEl) errEl.textContent = data?.message || 'Cập nhật thất bại.'; return; }
          close();
          await loadList();
          showListInfo('Đã lưu thay đổi người dùng.');
        } catch {
          if (errEl) errEl.textContent = 'Lỗi kết nối máy chủ.';
        }
      };
    });
  }

  // ===== Row actions (giữ nguyên) =====
  async function onUserRowAction(e) {
    const id  = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');
    const user = raw.find(u => u._id === id);
    if (!user) return;

    if (act === 'edit') { openEditUserForm(user); return; }

    if (act === 'del') {
      showConfirmDialog('Vô hiệu hoá tài khoản', 'Hệ thống sẽ vô hiệu hoá tài khoản này. Bạn có chắc muốn tiếp tục?', async () => {
        showListInfo('');
        try {
          const res = await authFetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
          if (res.ok) { await loadList(); showListInfo('Đã xoá người dùng.'); return; }
        } catch { /* fallback */ }
        try {
          const res2 = await authFetch(`${API_BASE}/users/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'disabled' }) });
          const data2 = await res2.json().catch(() => ({}));
          if (!res2.ok) { showListInfo(data2?.message || 'Vô hiệu hoá thất bại.', true); return; }
          await loadList(); showListInfo('Đã vô hiệu hoá tài khoản.');
        } catch { showListInfo('Lỗi kết nối khi vô hiệu hoá tài khoản.', true); }
      });
      return;
    }

    if (act === 'restore') {
      showListInfo('');
      try {
        const res = await authFetch(`${API_BASE}/users/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'active' }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { showListInfo(data?.message || 'Khôi phục thất bại.', true); return; }
        await loadList(); showListInfo('Đã khôi phục tài khoản.');
      } catch { showListInfo('Lỗi kết nối khi khôi phục tài khoản.', true); }
      return;
    }
  }

  // ===== Create user (CÓ THÊM validate cinema) =====
  async function onCreateUserSubmit() {
    showCreateHelp('');
    [cuEls.username, cuEls.email, cuEls.password, cuEls.fullname, cuEls.phone, cuEls.role, cuEls.birth, cuEls.cinema]
      .forEach(el => el && clearInputError(el));

    let ok = true;
    function requireField(inputEl) {
      if (!inputEl) return true;
      const v = (inputEl.value || '').trim();
      if (!v) { setInputError(inputEl, 'Hãy nhập đủ thông tin'); ok = false; return false; }
      clearInputError(inputEl); return true;
    }

    requireField(cuEls.username);
    requireField(cuEls.email);
    requireField(cuEls.password);
    requireField(cuEls.fullname);
    requireField(cuEls.phone);
    requireField(cuEls.role);

    const roleVal = cuEls.role.value;
    const needCinema = roleVal === 'staff' || roleVal === 'manager';

    if (needCinema) {
      // bắt buộc rạp
      requireField(cuEls.cinema);
      if (!cinemas.length) {
        showCreateHelp('Không tải được danh sách rạp. Vui lòng tải lại trang.', true);
        ok = false;
      }
    }

    const emailVal = (cuEls.email.value || '').trim().toLowerCase();
    if (!emailRegex.test(emailVal)) { setInputError(cuEls.email, 'Vui lòng nhập email @gmail.com hợp lệ'); showCreateHelp('Email phải có đuôi @gmail.com.', true); ok = false; }

    const phoneVal = (cuEls.phone.value || '').trim();
    if (!phoneRegex.test(phoneVal)) { setInputError(cuEls.phone, 'SĐT phải bắt đầu 0 và đủ 10 số'); showCreateHelp('SĐT phải bắt đầu 0 và đủ 10 số.', true); ok = false; }

    const passVal = cuEls.password.value || '';
    if (passVal.length < 8) { setInputError(cuEls.password, 'Mật khẩu phải từ 8 ký tự'); showCreateHelp('Mật khẩu phải từ 8 ký tự trở lên.', true); ok = false; }

    const birthVal = (cuEls.birth.value || '').trim();
    if (birthVal) {
      setBirthBounds(cuEls.birth);
      const age = calcAge(birthVal);
      if (age !== null && (age < 20 || age > 50)) {
        setInputError(cuEls.birth, 'Tuổi phải từ 20 đến 50');
        showCreateHelp('Ngày sinh: tuổi phải từ 20 đến 50.', true);
        ok = false;
      }
    }

    if (!ok) {
      if (!cuEls.help.textContent) showCreateHelp('Vui lòng kiểm tra lại các trường được tô đỏ.', true);
      return;
    }

    const body = {
      username: (cuEls.username.value || '').trim(),
      email: emailVal,
      password: passVal,
      full_name: (cuEls.fullname.value || '').trim(),
      phone: phoneVal,
      role: roleVal
    };
    if (birthVal) body.birth_date = birthVal;
    if (needCinema) body.cinema = cuEls.cinema.value; // ⭐ gửi kèm rạp

    try {
      const res = await authFetch(`${API_BASE}/users/admin-create`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showCreateHelp(data?.message || 'Tạo tài khoản thất bại.', true); return; }

      // clear form
      cuEls.username.value = '';
      cuEls.email.value = '';
      cuEls.password.value = '';
      cuEls.fullname.value = '';
      cuEls.phone.value = '';
      cuEls.birth.value = '';
      cuEls.role.value = 'staff';
      cuEls.cinema.value = '';
      cuEls.cinemaWrap.style.display = ''; // để sẵn cho role mặc định 'staff'

      showCreateHelp('Đã tạo tài khoản nhân sự.', false);
      await loadList();
    } catch {
      showCreateHelp('Lỗi kết nối máy chủ.', true);
    }
  }

  // ===== Events =====
  document.getElementById('btn-create-user').onclick = onCreateUserSubmit;

  // role change: show/hide cinema
  cuEls.role.addEventListener('change', () => {
    const v = cuEls.role.value;
    const need = v === 'staff' || v === 'manager';
    cuEls.cinemaWrap.style.display = need ? '' : 'none';
    if (!need) { cuEls.cinema.value = ''; clearInputError(cuEls.cinema); }
    showCreateHelp('');
  });

  els.q.addEventListener('input', () => { page = 1; applyFilter(); });
  els.prev.onclick = () => { if (page > 1) { page--; renderTable(); } };
  els.next.onclick = () => {
    const max = Math.ceil(view.length / pageSize) || 1;
    if (page < max) { page++; renderTable(); }
  };

  window.fm_users.reload = () => loadList();

  // Lần đầu
  // Hiển thị dropdown rạp đúng với role mặc định
  cuEls.cinemaWrap.style.display = (cuEls.role.value === 'staff' || cuEls.role.value === 'manager') ? '' : 'none';
  await loadCinemas();
  await loadList();
}




async function onCreateUserSubmit() {
  const me = getUser();
  if (!me || me.role !== 'admin') {
    alert('Chỉ Admin được phép tạo tài khoản.');
    return;
  }

  const get = id => document.getElementById(id);
  const fields = {
    username: get('cu-username'),
    email: get('cu-email'),
    password: get('cu-password'),
    fullname: get('cu-fullname'),
    phone: get('cu-phone'),
    role: get('cu-role'),
    birth: get('cu-birth')
  };

  Object.values(fields).forEach(el => el && clearInputError(el));

  let ok = true;

  if (!fields.username.value.trim()) { setInputError(fields.username, 'Hãy nhập đủ thông tin'); ok = false; }
  if (!fields.email.value.trim())    { setInputError(fields.email, 'Hãy nhập đủ thông tin'); ok = false; }
  if (!fields.password.value.trim()) { setInputError(fields.password, 'Hãy nhập đủ thông tin'); ok = false; }
  if (!fields.fullname.value.trim()) { setInputError(fields.fullname, 'Hãy nhập đủ thông tin'); ok = false; }
  if (!fields.phone.value.trim())    { setInputError(fields.phone, 'Hãy nhập đủ thông tin'); ok = false; }
  if (!fields.role.value)            { setInputError(fields.role, 'Hãy nhập đủ thông tin'); ok = false; }

  if (fields.password.value && fields.password.value.length < 8) {
    setInputError(fields.password, 'Mật khẩu phải ≥ 8 ký tự');
    ok = false;
  }

  fields.phone.value = fields.phone.value.replace(/[^0-9]/g, '');
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(fields.phone.value)) {
    setInputError(fields.phone, 'Số điện thoại phải gồm đúng 10 chữ số');
    ok = false;
  }

  if (fields.birth.value) {
    const sel = new Date(fields.birth.value);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (sel > today) {
      setInputError(fields.birth, 'Ngày sinh không hợp lệ');
      ok = false;
    }
  }

  if (!ok) return;

  const body = {
    username: fields.username.value.trim(),
    email: fields.email.value.trim(),
    password: fields.password.value,
    full_name: fields.fullname.value.trim(),
    phone: fields.phone.value,
    role: fields.role.value,
  };
  if (fields.birth.value) body.birth_date = fields.birth.value;

  const help = document.getElementById('cu-help');
  help.textContent = 'Đang tạo...';

  try {
    const res = await authFetch(`${API_BASE}/users/admin-create`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      help.textContent = data?.message || 'Tạo thất bại';
      return;
    
    }
    help.textContent = 'Tạo thành công!';
    if (window.fm_users?.reload) window.fm_users.reload();
  } catch {
    help.textContent = 'Lỗi kết nối.';
  }
}




function getCurrentPageLabel() {
  return $('#page-title')?.textContent?.trim();
}

function refreshPage() {
  const label = $('#page-title')?.textContent?.trim();
  if (label === 'Phim' && window.fm_movies?.reload) window.fm_movies.reload();
  if (label === 'Banner' && window.fm_banners?.reload) window.fm_banners.reload();
  if (label === 'Tin tức' && window.fm_news?.reload) window.fm_news.reload();
  if (label === 'Người dùng' && window.fm_users?.reload) window.fm_users.reload();
  if (label === 'Rạp' && window.fm_cinemas?.reload) window.fm_cinemas.reload();          
  if (label === 'Phòng' && window.fm_rooms?.reload) window.fm_rooms.reload();            
  if (label === 'Bỏng & Nước' && window.fm_products?.reload) window.fm_products.reload();   
  if (label === 'Suất chiếu' && window.fm_showtimes?.reload) window.fm_showtimes.reload();
  if (label === 'Voucher' && window.fm_vouchers?.reload) window.fm_vouchers.reload();



}

function createEntityForCurrentPage() {
  const label = $('#page-title')?.textContent?.trim();
  const me = getUser();

  if (label === 'Phim') {
    if (!isAdmin()) return alert('Chỉ Admin mới được thêm phim.');
    return window.fm_movies?.create && window.fm_movies.create();
  }
  if (label === 'Rạp') {
  if (!['admin','manager'].includes(me?.role)) return alert('Chỉ Admin/Manager.');
  return window.fm_cinemas?.create && window.fm_cinemas.create();
  }
  if (label === 'Phòng') {
    if (!['admin','manager'].includes(me?.role)) return alert('Chỉ Admin/Manager.');
    return window.fm_rooms?.create && window.fm_rooms.create();
  }
  if (label === 'Bỏng & Nước') {
  if (!me || !['admin','manager','staff'].includes(me.role)) return alert('Chỉ Admin/Manager/Staff.');
  return window.fm_products?.create && window.fm_products.create();
  }
  if (label === 'Banner') {
    if (!me || !['admin', 'manager'].includes(me.role)) return alert('Chỉ Admin/Manager.');
    return window.fm_banners?.create && window.fm_banners.create();
  }
  if (label === 'Voucher') {
    if (!isAdmin()) return showToast('Chỉ Admin được tạo voucher.', 'warn');
    return window.fm_vouchers?.create && window.fm_vouchers.create();
  }
  if (label === 'Tin tức') {
    if (!me || !['admin', 'manager'].includes(me.role)) return alert('Chỉ Admin/Manager.');
    return window.fm_news?.create && window.fm_news.create();
  }
  if (label === 'Suất chiếu') {
  const me = getUser();
  if (!me || !['admin','manager','staff'].includes(me.role)) return alert('Chỉ Admin/Manager/Staff.');
  return window.fm_showtimes?.create && window.fm_showtimes.create();
}

}




function statusBadge(status) {
  if (status === 'now_showing') return '<span class="badge ok">Đang chiếu</span>';
  if (status === 'coming') return '<span class="badge warn">Sắp chiếu</span>';
  return '<span class="badge muted">Đã lưu trữ</span>';
}

function requireNotEmpty(input, field) {
  if (!input) return true;
  const val = (input.value || '').trim();
  if (!val) {
    setInputError(input, `${field} không được để trống.`);
    return false;
  }
  clearInputError(input);
  return true;
}



function renderMoviesPage(container) {
  container.innerHTML = html`
    <div class="card">
      <h3 style="margin:0 0 10px">Danh sách phim</h3>

      <div class="tabs">
        <button class="tab active" data-tab="all">Tất cả</button>
        <button class="tab" data-tab="now">Đang chiếu</button>
        <button class="tab" data-tab="coming">Sắp chiếu</button>
        <button class="tab" data-tab="archived">Đã lưu trữ</button>
      </div>

      <input id="mv-search" class="search" placeholder="Tìm theo tiêu đề..." style="margin-bottom:10px;width:100%;max-width:320px" />

      <div id="mv-table" class="table-wrap">
        <div class="muted">Đang tải danh sách phim...</div>
      </div>

      <div style="display:flex; justify-content:space-between; margin-top:10px">
        <div class="muted" id="mv-info"></div>
        <div class="pager">
          <button class="btn" id="mv-prev">←</button>
          <span id="mv-page" class="muted">1</span>
          <button class="btn" id="mv-next">→</button>
        </div>
      </div>
    </div>
  `;

  // state
  let tab = 'all';
  let raw = [];
  let view = [];
  let page = 1;
  const pageSize = 5;

  const els = {
    search: $('#mv-search'),
    table: $('#mv-table'),
    info: $('#mv-info'),
    prev: $('#mv-prev'),
    next: $('#mv-next'),
    page: $('#mv-page')
  };

  const fetchMoviesByTab = async (tabKey) => {
    const map = {
      all: `${API_BASE}/movies`,
      now: `${API_BASE}/movies/now-showing`,
      coming: `${API_BASE}/movies/coming`,
      archived: `${API_BASE}/movies/archived`
    };
    const url = map[tabKey] || map.all;

    const bust = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
    let res = await fetch(bust, { cache: 'no-store' });
    if (res.status === 304) res = await fetch(bust, { cache: 'reload' });
    if (!res.ok) throw new Error('Fetch movies failed');
    return res.json();
  };

  const load = async () => {
    els.table.innerHTML = `<div class="muted">Đang tải danh sách phim...</div>`;
    els.info.textContent = '';
    try {
      raw = await fetchMoviesByTab(tab);
      applyFilterAndRender();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
      els.info.textContent = 'Lỗi khi tải danh sách phim.';
    }
  };

  const applyFilterAndRender = () => {
    const q = els.search.value.trim().toLowerCase();
    view = !q ? raw : raw.filter(m => (m.title || '').toLowerCase().includes(q));
    page = 1;
    renderTable();
  };

  function actionButtons(m) {
    if (!isAdmin()) return '';
    return `
      <button class="btn" data-act="edit" data-id="${m._id}">Sửa</button>
      <button class="btn danger" data-act="del" data-id="${m._id}">Xóa</button>
    `;
  }

  const renderTable = () => {
    const total = view.length;
    const start = (page - 1) * pageSize;
    const rows = view.slice(start, start + pageSize);

    if (!rows.length) {
      els.table.innerHTML = `<div class="muted">Không có phim nào.</div>`;
    } else {
      els.table.innerHTML = html`
        <table class="table">
          <thead>
            <tr>
              <th style="width:56px">Poster</th>
              <th>Tiêu đề</th>
              <th>Trạng thái</th>
              <th>Thời lượng</th>
              <th>Phát hành</th>
              <th>Điểm</th>
              <th style="width:140px">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(m => html`
              <tr>
                <td>${m.poster ? `<img class="movie-thumb" src="${m.poster}" alt="poster">` : ''}</td>
                <td>${m.title || ''}</td>
                <td>${statusBadge(m.status)}</td>
                <td>${fmtDuration(m.duration)}</td>
                <td>${fmtDate(m.release_date)}</td>
                <td>${m.rating ?? ''}</td>
                <td>${actionButtons(m)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    els.info.textContent = total
      ? `Hiển thị ${Math.min(start + 1, total)}–${Math.min(start + rows.length, total)} / ${total}`
      : '';
    els.page.textContent = String(page);

    els.table.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', onRowAction);
    });
  };

  const toArray = (s) => (s || '').split(',').map(x => x.trim()).filter(Boolean);

  // === helper: File → dataURL (giống trang Bỏng & Nước) ===
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  // Modal confirm đẹp
  function showConfirmDialog(title, message, onConfirm) {
    const htmlConfirm = html`
      <div class="modal-head">
        <h3>${title}</h3>
      </div>
      <div class="form">
        <p style="margin:12px 0">${message}</p>
      </div>
      <div class="modal-foot">
        <button class="btn" id="cf-cancel">Hủy</button>
        <button class="btn danger" id="cf-ok">Xóa</button>
      </div>
    `;
    openModal(htmlConfirm, ({ el, close }) => {
      el.querySelector('#cf-cancel').onclick = close;
      el.querySelector('#cf-ok').onclick = () => { close(); onConfirm && onConfirm(); };
    });
  }

  function showMovieForm(mode, data = {}) {
    const isEdit = mode === 'edit';
    const titleTxt = isEdit ? 'Sửa phim' : 'Thêm phim';

    const htmlForm = html`
      <div class="modal-head">
        <h3>${titleTxt}</h3>
        <div class="spacer"></div>
      </div>
      <div class="form">
        <div class="row">
          <div class="col-12 field">
            <label>Tiêu đề <span class="muted">*</span></label>
            <input id="f-title" value="${data.title || ''}">
          </div>
          <div class="col-12 field">
            <label>Mô tả <span class="muted">*</span></label>
            <textarea id="f-desc">${data.description || ''}</textarea>
          </div>
          <div class="col-6 field">
            <label>Thời lượng (phút) <span class="muted">*</span></label>
            <input id="f-duration" type="number" value="${data.duration || ''}">
          </div>
          <div class="col-6 field">
            <label>Ngày phát hành <span class="muted">*</span></label>
            <input id="f-release" type="date" value="${data.release_date ? new Date(data.release_date).toISOString().slice(0, 10) : ''}">
          </div>
          <div class="col-6 field">
            <label>Ngôn ngữ <span class="muted">*</span></label>
            <input id="f-lang" value="${data.language || ''}">
          </div>
          <div class="col-6 field">
            <label>Điểm (0–10) <span class="muted">*</span></label>
            <input id="f-rating" type="number" step="0.1" min="0" max="10" value="${data.rating ?? ''}">
          </div>
          <div class="col-6 field">
            <label>Đạo diễn <span class="muted">*</span></label>
            <input id="f-director" value="${data.director || ''}">
          </div>

          <!-- Poster: chọn 1 trong 2 cách (giống trang Bỏng & Nước) -->
          <div class="col-12">
            <div class="pill" style="display:inline-block;margin:6px 0">Poster phim (chọn 1 trong 2 cách)</div>
          </div>
          <div class="col-6 field">
            <label>Chọn file ảnh *</label>
            <input id="f-poster-file" type="file" accept="image/*">
          </div>
          <div class="col-6 field">
            <label>Hoặc URL ảnh *</label>
            <input id="f-poster" value="${data.poster || ''}" placeholder="/public/uploads/... hoặc https://... hoặc data:image/...">
          </div>
          <div class="col-12">
            <img id="f-prev" alt="preview" style="display:none;width:120px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">
          </div>

          <div class="col-6 field">
            <label>Diễn viên (phân tách dấu phẩy) <span class="muted">*</span></label>
            <input id="f-cast" value="${(data.cast || []).join(', ')}">
          </div>
          <div class="col-6 field">
            <label>Thể loại (phân tách dấu phẩy) <span class="muted">*</span></label>
            <input id="f-genre" value="${(data.genre || []).join(', ')}">
          </div>
          <div class="col-6 field">
            <label>Trạng thái <span class="muted">*</span></label>
            <select id="f-status">
              <option value="coming" ${data.status === 'coming' ? 'selected' : ''}>Sắp chiếu</option>
              <option value="now_showing" ${data.status === 'now_showing' ? 'selected' : ''}>Đang chiếu</option>
              <option value="archived" ${data.status === 'archived' ? 'selected' : ''}>Đã lưu trữ</option>
            </select>
          </div>
        </div>
        <div id="f-error" style="margin-top:8px; font-size:13px; color:#f87171;"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">${isEdit ? 'Lưu thay đổi' : 'Tạo phim'}</button>
      </div>
    `;

    const modal = openModal(htmlForm, ({ el, close }) => {
      // Inputs
      const iTitle    = el.querySelector('#f-title');
      const iDesc     = el.querySelector('#f-desc');
      const iDuration = el.querySelector('#f-duration');
      const iRelease  = el.querySelector('#f-release');
      const iLang     = el.querySelector('#f-lang');
      const iRating   = el.querySelector('#f-rating');
      const iDirector = el.querySelector('#f-director');
      const iPoster   = el.querySelector('#f-poster');
      const iPosterF  = el.querySelector('#f-poster-file');
      const iPrev     = el.querySelector('#f-prev');
      const iCast     = el.querySelector('#f-cast');
      const iGenre    = el.querySelector('#f-genre');
      const iStatus   = el.querySelector('#f-status');
      const iError    = el.querySelector('#f-error');

      // ====== Preview (giữ nguyên hành vi cũ) ======
      iPoster.addEventListener('input', () => {
        const v = iPoster.value.trim();
        if (v) { iPrev.src = v; iPrev.style.display = ''; }
        else if (!(iPosterF.files && iPosterF.files.length)) { iPrev.removeAttribute('src'); iPrev.style.display = 'none'; }
        clearInputError(iPoster); if (iError) iError.textContent = '';
      });
      iPosterF.addEventListener('change', () => {
        const f = iPosterF.files && iPosterF.files[0];
        if (f) { const url = URL.createObjectURL(f); iPrev.src = url; iPrev.style.display = ''; }
        else if (!iPoster.value.trim()) { iPrev.removeAttribute('src'); iPrev.style.display = 'none'; }
        if (iError) iError.textContent = '';
      });

      // ====== Validate helpers (MỚI: chỉ thêm validate) ======
      const z2 = (n) => String(n).padStart(2, '0');
      const ymd = (d) => `${d.getFullYear()}-${z2(d.getMonth()+1)}-${z2(d.getDate())}`;
      const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
      const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth()+m); return x; };

      function setReleaseBoundsByStatus() {
        const today = startOfDay(new Date());
        const status = iStatus.value;
        // reset trước
        iRelease.removeAttribute('min');
        iRelease.removeAttribute('max');

        if (status === 'now_showing' || status === 'archived') {
          // chỉ cho quá khứ & hôm nay
          iRelease.setAttribute('max', ymd(today));
        } else if (status === 'coming') {
          // chỉ cho tương lai (sau hôm nay) và không quá 3 tháng
          const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
          const within3M = addMonths(today, 3);
          iRelease.setAttribute('min', ymd(tomorrow));
          iRelease.setAttribute('max', ymd(within3M));
        }
      }

      function validateReleaseAgainstStatus() {
        const status = iStatus.value;
        const v = (iRelease.value || '').trim();
        if (!v) return true; // để requireField xử lý rỗng

        const picked = startOfDay(new Date(v));
        const today = startOfDay(new Date());
        const max3M = addMonths(today, 3);

        if (status === 'now_showing' || status === 'archived') {
          if (picked > today) {
            setInputError(iRelease, `Ngày phát hành phải không vượt quá hôm nay (${ymd(today)}). Hãy chọn lại ngày hoặc đổi trạng thái.`);
            setInputError(iStatus, 'Trạng thái và ngày phát hành không khớp.');
            return false;
          }
          clearInputError(iStatus);
          clearInputError(iRelease);
          return true;
        }

        if (status === 'coming') {
          if (picked <= today) {
            setInputError(iRelease, `Sắp chiếu phải là ngày sau hôm nay (${ymd(today)}).`);
            setInputError(iStatus, 'Trạng thái và ngày phát hành không khớp.');
            return false;
          }
          if (picked > max3M) {
            setInputError(iRelease, `Sắp chiếu không được quá 3 tháng (tối đa đến ${ymd(max3M)}).`);
            setInputError(iStatus, 'Trạng thái và ngày phát hành không khớp.');
            return false;
          }
          clearInputError(iStatus);
          clearInputError(iRelease);
          return true;
        }

        // fallback
        clearInputError(iStatus);
        clearInputError(iRelease);
        return true;
      }

      // áp min/max ngay khi mở form và khi đổi trạng thái
      setReleaseBoundsByStatus();
      iStatus.addEventListener('change', () => {
        setReleaseBoundsByStatus();
        validateReleaseAgainstStatus();
        if (iError) iError.textContent = '';
      });
      iRelease.addEventListener('input', () => {
        validateReleaseAgainstStatus();
        if (iError) iError.textContent = '';
      });

      function requireField(inputEl) {
        if (!inputEl) return true;
        const v = (inputEl.value || '').trim();
        if (!v) { setInputError(inputEl, 'Hãy nhập đủ thông tin'); return false; }
        clearInputError(inputEl); return true;
      }

      [iTitle,iDesc,iDuration,iRelease,iLang,iRating,iDirector,iPoster,iCast,iGenre,iStatus].forEach(elm => {
        if (!elm) return;
        elm.addEventListener('input', () => { clearInputError(elm); if (iError) iError.textContent = ''; });
        if (elm.tagName === 'SELECT') elm.addEventListener('change', () => { clearInputError(elm); if (iError) iError.textContent = ''; });
      });

      el.querySelector('#f-cancel').onclick = close;

      el.querySelector('#f-submit').onclick = async () => {
        if (iError) iError.textContent = '';

        // ====== Validate bắt buộc ======
        let ok = true;
        ok = requireField(iTitle)    && ok;
        ok = requireField(iDesc)     && ok;
        ok = requireField(iDuration) && ok;
        ok = requireField(iRelease)  && ok;
        ok = requireField(iLang)     && ok;
        ok = requireField(iRating)   && ok;
        ok = requireField(iDirector) && ok;

        // Poster: yêu cầu có ÍT NHẤT 1 trong 2 (file hoặc URL) — giữ nguyên
        const hasFile = iPosterF.files && iPosterF.files.length > 0;
        const hasUrl  = !!iPoster.value.trim();
        if (!hasFile && !hasUrl) { setInputError(iPoster, 'Poster (file hoặc URL) không được để trống.'); ok = false; }
        else { clearInputError(iPoster); }

        ok = requireField(iCast)   && ok;
        ok = requireField(iGenre)  && ok;
        ok = requireField(iStatus) && ok;

        // ====== Validate bổ sung (MỚI) ======
        // 1) Thời lượng: 40–240
        const durationNum = Number(iDuration.value);
        if (!Number.isFinite(durationNum) || durationNum < 40 || durationNum > 240) {
          setInputError(iDuration, 'Thời lượng phải từ 40 đến 240 phút.');
          ok = false;
        } else {
          clearInputError(iDuration);
        }

        // 2) Điểm: 1.0–10.0
        const ratingNum = Number(iRating.value);
        if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 10) {
          setInputError(iRating, 'Điểm đánh giá phải từ 1.0 đến 10.0.');
          ok = false;
        } else {
          clearInputError(iRating);
        }

        // 3) Ngày phát hành theo trạng thái
        if (!validateReleaseAgainstStatus()) {
          ok = false;
        }

        if (!ok) {
          if (iError) iError.textContent = 'Vui lòng kiểm tra lại các trường được tô đỏ.';
          return;
        }

        try {
          // Nếu chọn file → base64 (giữ nguyên hành vi)
          let posterValue = iPoster.value.trim();
          if (hasFile) {
            posterValue = await fileToDataURL(iPosterF.files[0]);
          }

          const body = {
            title:        iTitle.value.trim(),
            description:  iDesc.value.trim(),
            duration:     Number(iDuration.value) || undefined,
            release_date: iRelease.value || undefined,
            language:     iLang.value.trim() || undefined,
            rating:       iRating.value ? Number(iRating.value) : undefined,
            director:     iDirector.value.trim() || undefined,
            poster:       posterValue,
            cast:         toArray(iCast.value),
            genre:        toArray(iGenre.value),
            status:       iStatus.value
          };

          let res, dataRes;
          if (isEdit) {
            res = await authFetch(`${API_BASE}/movies/${data._id}`, {
              method: 'PUT',
              body: JSON.stringify(body)
            });
          } else {
            res = await authFetch(`${API_BASE}/movies`, {
              method: 'POST',
              body: JSON.stringify(body)
            });
          }

          dataRes = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (iError) iError.textContent = dataRes?.message || (isEdit ? 'Cập nhật phim không thành công.' : 'Tạo phim không thành công.');
            return;
          }

          close();
          await load();
          els.info.textContent = isEdit ? 'Đã lưu thay đổi phim.' : 'Đã tạo phim mới.';
        } catch {
          if (iError) iError.textContent = 'Lỗi khi xử lý ảnh hoặc kết nối máy chủ.';
        }
      };
    });

    return modal;
  }

  const onRowAction = async (e) => {
    const id = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');

    if (act === 'edit') {
      try {
        els.info.textContent = '';
        const res = await fetch(`${API_BASE}/movies/${id}`);
        if (!res.ok) {
          els.info.textContent = 'Không tải được dữ liệu phim để sửa.';
          return;
        }
        const m = await res.json();
        showMovieForm('edit', m);
      } catch {
        els.info.textContent = 'Lỗi kết nối khi tải dữ liệu phim.';
      }
    }

    if (act === 'del') {
      if (!isAdmin()) {
        els.info.textContent = 'Chỉ Admin mới được xóa phim.';
        return;
      }

      showConfirmDialog('Xác nhận xóa', 'Bạn có chắc muốn xóa phim này?', async () => {
        try {
          els.info.textContent = '';
          const res = await authFetch(`${API_BASE}/movies/${id}`, { method: 'DELETE' });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            els.info.textContent = data?.message || 'Xóa phim không thành công.';
            return;
          }
          raw = raw.filter(x => x._id !== id);
          applyFilterAndRender();
          els.info.textContent = 'Đã xóa 1 phim.';
        } catch {
          els.info.textContent = 'Lỗi kết nối khi xóa phim.';
        }
      });
    }
  };

  // Tabs
  container.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      tab = t.getAttribute('data-tab');
      els.search.value = '';
      els.info.textContent = '';
      load();
    });
  });

  // Search & pagination
  els.search.addEventListener('input', () => {
    applyFilterAndRender();
    els.info.textContent = '';
  });
  els.prev.addEventListener('click', () => {
    if (page > 1) {
      page--;
      renderTable();
    }
  });
  els.next.addEventListener('click', () => {
    const maxPage = Math.ceil(view.length / pageSize) || 1;
    if (page < maxPage) {
      page++;
      renderTable();
    }
  });

  // Expose action cho toolbar
  window.fm_movies = {
    reload: () => {
      els.info.textContent = '';
      load();
    },
    create: () => {
      if (!isAdmin()) {
        els.info.textContent = 'Chỉ Admin mới được thêm phim.';
        return;
      }
      showMovieForm('create');
    }
  };

  // load lần đầu
  load();
}



function renderBannersPage(container) {
  // stub để toolbar có thể gọi sớm
  window.fm_banners = { reload: () => { }, create: () => { } };

  container.innerHTML = html`
    <div class="card">
      <h3 style="margin:0 0 10px">Danh sách banner</h3>

      <div class="tabs">
        <button class="tab active" data-tab="all">Tất cả</button>
        <button class="tab" data-tab="active">Đang bật</button>
        <button class="tab" data-tab="inactive">Đang tắt</button>
      </div>

      <div id="bn-table" class="table-wrap">
        <div class="muted">Đang tải...</div>
      </div>
      <div class="muted" id="bn-info" style="margin-top:8px;"></div>
    </div>

    <div class="card" style="margin-top:12px">
      <h3 style="margin:0 0 8px">Ảnh trong banner (chọn 1 banner)</h3>
      <div class="form">
        <div class="row">
          <div class="col-12"><div id="bn-selected" class="muted">Chưa chọn banner.</div></div>
          <div class="col-12"><div id="bn-images" class="banner-grid"></div></div>
        </div>
      </div>
      <div class="muted" id="bn-img-info" style="margin-top:8px;"></div>
    </div>
  `;

  const me = getUser();
  const canManage = !!(me && ['admin', 'manager'].includes(me.role));

  let raw = [];
  let tab = 'all';
  let selectedBanner = null;

  const els = {
    table: $('#bn-table'),
    images: $('#bn-images'),
    selected: $('#bn-selected'),
    info: $('#bn-info'),
    imgInfo: $('#bn-img-info'),
  };

  function showInfo(msg, isError = false) {
    els.info.textContent = msg || '';
    if (isError) els.info.classList.add('error-text');
    else els.info.classList.remove('error-text');
  }

  function showImgInfo(msg, isError = false) {
    els.imgInfo.textContent = msg || '';
    if (isError) els.imgInfo.classList.add('error-text');
    else els.imgInfo.classList.remove('error-text');
  }

  // Modal confirm đẹp (thay cho window.confirm)
  function showConfirmDialog(title, message, onConfirm) {
    const htmlConfirm = html`
      <div class="modal-head">
        <h3>${title}</h3>
      </div>
      <div class="form">
        <p style="margin:12px 0">${message}</p>
      </div>
      <div class="modal-foot">
        <button class="btn" id="cf-cancel">Hủy</button>
        <button class="btn danger" id="cf-ok">Xác nhận</button>
      </div>
    `;
    openModal(htmlConfirm, ({ el, close }) => {
      el.querySelector('#cf-cancel').onclick = close;
      el.querySelector('#cf-ok').onclick = () => {
        close();
        onConfirm && onConfirm();
      };
    });
  }

  async function fetchBanners() {
    const res = await authFetch(`${API_BASE}/banners`, { cache: 'no-store' });
    if (!res.ok) throw new Error('load banners failed');
    return res.json();
  }

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
    showInfo('');
    try {
      raw = await fetchBanners();
      renderList();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
      showInfo('Không tải được danh sách banner.', true);
    }
  }

  function filtered() {
    if (tab === 'all') return raw;
    if (tab === 'active') return raw.filter(b => b.is_active);
    return raw.filter(b => !b.is_active);
  }

  function renderList() {
    const rows = filtered();
    if (!rows.length) {
      els.table.innerHTML = `<div class="muted">Không có banner.</div>`;
      return;
    }
    els.table.innerHTML = html`
      <table class="table">
        <thead>
          <tr>
            <th>Tiêu đề</th>
            <th>Link</th>
            <th>Trạng thái</th>
            <th>Ảnh</th>
            <th style="width:280px">Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(b => html`
            <tr data-id="${b._id}">
              <td>${b.title}</td>
              <td>${b.link_url || ''}</td>
              <td>${b.is_active ? '<span class="badge ok">Bật</span>' : '<span class="badge muted">Tắt</span>'}</td>
              <td>${b.image_count ?? 0}</td>
              <td>
                <div class="row-actions">
                  <button class="btn" data-act="select" data-id="${b._id}">Chọn</button>
                  ${canManage ? `
                    <button class="btn" data-act="toggle" data-id="${b._id}">${b.is_active ? 'Tắt' : 'Bật'}</button>
                    <button class="btn" data-act="edit" data-id="${b._id}">Sửa</button>
                    <button class="btn warn" data-act="upload" data-id="${b._id}">Upload ảnh</button>
                    <button class="btn danger" data-act="del" data-id="${b._id}">Xoá</button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    els.table.querySelectorAll('[data-act]').forEach(b => b.onclick = onRowAction);
  }

  function openBannerForm(mode, data = {}) {
    const isEdit = mode === 'edit';
    const htmlForm = html`
      <div class="modal-head">
        <h3>${isEdit ? 'Sửa banner' : 'Tạo banner'}</h3>
        <div class="spacer"></div>
      </div>
      <div class="form">
        <div class="row">
          <div class="col-12 field">
            <label>Tiêu đề *</label>
            <input id="f-title" value="${data.title || ''}">
          </div>
          <div class="col-12 field">
            <label>Link (optional)</label>
            <input id="f-link" value="${data.link_url || ''}">
          </div>

          ${isEdit ? `
          <div class="col-12 field">
            <label>Trạng thái</label>
            <select id="f-active">
              <option value="true" ${data.is_active !== false ? 'selected' : ''}>Bật</option>
              <option value="false" ${data.is_active === false ? 'selected' : ''}>Tắt</option>
            </select>
          </div>` : ``}
        </div>
        <div id="f-error" style="margin-top:8px; font-size:13px; color:#f87171;"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">${isEdit ? 'Lưu' : 'Tạo'}</button>
      </div>
    `;

    openModal(htmlForm, ({ el, close }) => {
      const iTitle  = el.querySelector('#f-title');
      const iLink   = el.querySelector('#f-link');
      const iActive = el.querySelector('#f-active');
      const errEl   = el.querySelector('#f-error');

      // validate 1 ô giống trang Phim
      function requireField(inputEl) {
        if (!inputEl) return true;
        const v = (inputEl.value || '').trim();
        if (!v) {
          setInputError(inputEl, 'Hãy nhập đủ thông tin');
          return false;
        }
        clearInputError(inputEl);
        return true;
      }

      [iTitle, iLink, iActive].forEach(input => {
        if (!input) return;
        const evt = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(evt, () => {
          clearInputError(input);
          if (errEl) errEl.textContent = '';
        });
      });

      el.querySelector('#f-cancel').onclick = close;

      el.querySelector('#f-submit').onclick = async () => {
        if (errEl) errEl.textContent = '';

        let ok = true;
        ok = requireField(iTitle) && ok; // chỉ Tiêu đề là bắt buộc
        if (!ok) {
          if (errEl) errEl.textContent = 'Vui lòng kiểm tra lại các trường bắt buộc được tô đỏ.';
          return;
        }

        const body = {
          title: iTitle.value.trim(),
          link_url: iLink.value.trim()
        };
        if (isEdit && iActive) {
          body.is_active = iActive.value === 'true';
        }

        try {
          let res;
          if (isEdit) {
            res = await authFetch(`${API_BASE}/banners/${data._id}`, {
              method: 'PUT',
              body: JSON.stringify(body)
            });
          } else {
            res = await authFetch(`${API_BASE}/banners`, {
              method: 'POST',
              body: JSON.stringify(body)
            });
          }
          const dataRes = await res.json().catch(() => ({}));

          if (res.status === 401 || res.status === 403) {
            if (errEl) errEl.textContent = 'Phiên đăng nhập đã hết hạn hoặc thiếu quyền. Vui lòng đăng nhập lại.';
            logout();
            return;
          }

          if (!res.ok) {
            if (errEl) errEl.textContent = dataRes?.message || 'Thao tác thất bại.';
            return;
          }

          close();
          await loadList();
          showInfo(isEdit ? 'Đã lưu banner.' : 'Đã tạo banner mới.');
        } catch {
          if (errEl) errEl.textContent = 'Lỗi kết nối máy chủ.';
        }
      };
    });
  }


  function openUploadDialog(bannerId) {
    const htmlForm = html`
      <div class="modal-head">
        <h3>Upload ảnh</h3>
        <div class="spacer"></div>
      </div>
      <div class="form">
        <div class="row">
          <div class="col-12">
            <input id="f-files" type="file" accept="image/*" multiple />
            <div class="help">Chọn tối đa 12 ảnh/lần.</div>
          </div>
        </div>
        <div id="up-error" style="margin-top:8px; font-size:13px; color:#f87171;"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">Tải lên</button>
      </div>
    `;
    openModal(htmlForm, ({ el, close }) => {
      const fileEl = el.querySelector('#f-files');
      const errEl  = el.querySelector('#up-error');

      el.querySelector('#f-cancel').onclick = close;
      el.querySelector('#f-submit').onclick = async () => {
        if (errEl) errEl.textContent = '';
        const files = fileEl.files;
        if (!files || !files.length) {
          if (errEl) errEl.textContent = 'Vui lòng chọn ít nhất 1 ảnh.';
          return;
        }
        try {
          const fd = new FormData();
          [...files].forEach(f => fd.append('images', f));
          const token = getToken();
          const res = await fetch(`${API_BASE}/banners/${bannerId}/images`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: fd
          });
          const data = await res.json().catch(() => ({}));

          if (res.status === 401 || res.status === 403) {
            if (errEl) errEl.textContent = 'Phiên đăng nhập đã hết hạn hoặc thiếu quyền. Vui lòng đăng nhập lại.';
            logout();
            return;
          }

          if (!res.ok) {
            if (errEl) errEl.textContent = data?.message || 'Upload thất bại.';
            return;
          }
          close();
          await loadList();
          if (selectedBanner && selectedBanner._id === bannerId) {
            await loadImagesOf(bannerId);
          }
          showImgInfo('Đã upload ảnh thành công.');
        } catch {
          if (errEl) errEl.textContent = 'Lỗi kết nối máy chủ.';
        }
      };
    });
  }

  async function loadImagesOf(bannerId) {
    els.selected.textContent = `Đang nạp ảnh cho banner ${bannerId}...`;
    els.images.innerHTML = '';
    showImgInfo('');

    try {
      const url = `${API_BASE}/banners/${bannerId}/images?_=${Date.now()}`;
      const res = await authFetch(url, { cache: 'no-store' });

      const text = await res.text();
      let payload;
      try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }

      if (res.status === 401 || res.status === 403) {
        els.images.innerHTML = `<div class="muted">Không tải được ảnh.</div>`;
        showImgInfo('Phiên đăng nhập đã hết hạn hoặc thiếu quyền. Vui lòng đăng nhập lại.', true);
        logout();
        return;
      }

      if (!res.ok) {
        els.images.innerHTML = `<div class="muted">${payload?.message || 'Không tải được ảnh.'}</div>`;
        showImgInfo(payload?.message || 'Không tải được ảnh.', true);
        return;
      }

      selectedBanner =
        filtered().find(x => x._id === bannerId) ||
        { _id: bannerId, title: payload?.banner?.title || '' };

      els.selected.innerHTML = selectedBanner
        ? `<div class="kv"><b>${selectedBanner.title || '(Chưa có tiêu đề)'}</b> <span class="pill">${selectedBanner._id}</span></div>`
        : 'Không tìm thấy banner.';

      const images = Array.isArray(payload.images) ? payload.images : [];
      if (!images.length) {
        els.images.innerHTML = `<div class="muted">Chưa có ảnh.</div>`;
        return;
      }

      els.images.innerHTML = images.map(img => html`
        <div class="card banner-item">
          <img class="banner-thumb" src="${img.image_url}" alt="">
          <div class="form" style="margin-top:8px">
            <div class="movie-label">
              ${img.movie_id ? `Đang gán: <code>${img.movie_id}</code>` : `Chưa gán phim`}
            </div>
            <div class="btn-group">
              ${canManage ? `
                <button class="btn" data-act="assign-movie" data-image-id="${img._id}">Gán</button>
                ${img.movie_id ? `<button class="btn warn" data-act="unassign-movie" data-image-id="${img._id}">Bỏ gán</button>` : ``}
                <button class="btn danger" data-act="del-img" data-image-id="${img._id}">Xoá</button>
              ` : ``}
            </div>
          </div>
        </div>
      `).join('');

      // Gán phim
      els.images.querySelectorAll('[data-act="assign-movie"]').forEach(b => b.onclick = (e) => {
        const imageId = e.currentTarget.getAttribute('data-image-id');
        openAssignMovieDialog({ bannerId, imageId });
      });

      // Bỏ gán phim
      els.images.querySelectorAll('[data-act="unassign-movie"]').forEach(b => b.onclick = (e) => {
        const imageId = e.currentTarget.getAttribute('data-image-id');
        showConfirmDialog('Bỏ gán phim', 'Bạn có chắc muốn bỏ gán movie cho ảnh này?', async () => {
          showImgInfo('');
          try {
            const res = await authFetch(`${API_BASE}/banners/${bannerId}/images/${imageId}`, {
              method: 'PATCH',
              body: JSON.stringify({ movie_id: null })
            });
            const t = await res.text();
            let data; try { data = t ? JSON.parse(t) : {}; } catch { data = {}; }

            if (res.status === 401 || res.status === 403) {
              showImgInfo('Hết hạn phiên. Vui lòng đăng nhập lại.', true);
              logout();
              return;
            }
            if (!res.ok) {
              showImgInfo(data?.message || 'Thao tác thất bại.', true);
              return;
            }
            await loadImagesOf(bannerId);
            showImgInfo('Đã bỏ gán phim cho ảnh.');
          } catch {
            showImgInfo('Lỗi kết nối khi bỏ gán.', true);
          }
        });
      });

      // Xoá ảnh
      els.images.querySelectorAll('[data-act="del-img"]').forEach(b => b.onclick = (e) => {
        const imageId = e.currentTarget.getAttribute('data-image-id');
        showConfirmDialog('Xoá ảnh', 'Xoá ảnh này khỏi banner?', async () => {
          showImgInfo('');
          try {
            const res = await authFetch(`${API_BASE}/banners/${bannerId}/images/${imageId}`, { method: 'DELETE' });
            const t = await res.text();
            let data; try { data = t ? JSON.parse(t) : {}; } catch { data = {}; }

            if (res.status === 401 || res.status === 403) {
              showImgInfo('Hết hạn phiên. Vui lòng đăng nhập lại.', true);
              logout();
              return;
            }
            if (!res.ok) {
              showImgInfo(data?.message || 'Xoá thất bại.', true);
              return;
            }
            await loadImagesOf(bannerId); // reload khung ảnh
            await loadList();             // cập nhật cột "Ảnh" trong bảng
            showImgInfo('Đã xoá ảnh khỏi banner.');
          } catch {
            showImgInfo('Lỗi kết nối khi xoá ảnh.', true);
          }
        });
      });

    } catch (err) {
      console.error(err);
      els.images.innerHTML = `<div class="muted">Không tải được ảnh (lỗi mạng hoặc CORS).</div>`;
      showImgInfo('Không tải được ảnh (lỗi mạng hoặc CORS).', true);
    }
  }
  

  async function onRowAction(e) {
    const id  = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');

    if (act === 'select') {
      await loadImagesOf(id);
      return;
    }

    if (act === 'toggle' && canManage) {
      showInfo('');
      try {
        const res = await authFetch(`${API_BASE}/banners/${id}/toggle`, { method: 'PATCH' });
        const data = await res.json().catch(() => ({}));

        if (res.status === 401 || res.status === 403) {
          showInfo('Phiên đăng nhập đã hết hạn hoặc thiếu quyền. Vui lòng đăng nhập lại.', true);
          logout();
          return;
        }
        if (!res.ok) {
          showInfo(data?.message || 'Thất bại.', true);
          return;
        }
        await loadList();
        showInfo('Đã cập nhật trạng thái banner.');
      } catch {
        showInfo('Lỗi kết nối khi cập nhật trạng thái.', true);
      }
      return;
    }

    if (act === 'edit' && canManage) {
      const b = raw.find(x => x._id === id);
      if (!b) return;
      openBannerForm('edit', b);
      return;
    }

    if (act === 'upload' && canManage) {
      showImgInfo('');
      openUploadDialog(id);
      return;
    }

    if (act === 'del' && canManage) {
      showConfirmDialog('Xoá banner', 'Xoá banner và toàn bộ ảnh của nó?', async () => {
        showInfo('');
        try {
          const res = await authFetch(`${API_BASE}/banners/${id}`, { method: 'DELETE' });
          const data = await res.json().catch(() => ({}));

          if (res.status === 401 || res.status === 403) {
            showInfo('Phiên đăng nhập đã hết hạn hoặc thiếu quyền. Vui lòng đăng nhập lại.', true);
            logout();
            return;
          }
          if (!res.ok) {
            showInfo(data?.message || 'Xoá thất bại.', true);
            return;
          }
          if (selectedBanner && selectedBanner._id === id) {
            selectedBanner = null;
            els.selected.textContent = 'Chưa chọn banner.';
            els.images.innerHTML = '';
            showImgInfo('');
          }
          await loadList();
          showInfo('Đã xoá banner.');
        } catch {
          showInfo('Lỗi kết nối khi xoá banner.', true);
        }
      });
      return;
    }
  }

  container.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      container.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      tab = t.getAttribute('data-tab');
      showInfo('');
      renderList();
    };
  });

  window.fm_banners = {
    reload: async () => {
      const cur = selectedBanner && selectedBanner._id;
      await loadList();
      if (cur) {
        try { await loadImagesOf(cur); } catch (e) { console.warn('Reload images failed:', e); }
      }
    },
    create: () => {
      if (!canManage) {
        showInfo('Chỉ Admin/Manager.', true);
        return;
      }
      openBannerForm('create');
    }
  };

  loadList();
}


function debounce(fn, ms=300) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }
}

// cố gắng dùng API tìm kiếm (q,page,size). Nếu backend bạn chưa có q thì vẫn chạy chế độ fallback.
async function fetchMoviesPaged({ q = '', page = 1, size = 12 } = {}) {
  const url = new URL(`${API_BASE}/movies`);
  if (q) url.searchParams.set('q', q);
  url.searchParams.set('page', page);
  url.searchParams.set('size', size);
  const res = await authFetch(url.toString(), { cache: 'no-store' });
  // nếu API không hỗ trợ phân trang, ta fallback: đọc array thô rồi lọc client
  let data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(data?.message || 'Movie API error');

  // Nếu data là array thô: giả lập phân trang
  if (Array.isArray(data)) {
    let list = data;
    if (q) {
      const term = q.trim().toLowerCase();
      list = list.filter(m =>
        (m.title || '').toLowerCase().includes(term) ||
        (m.genre && String(m.genre).toLowerCase().includes(term))
      );
    }
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const start = (page - 1) * size;
    const items = list.slice(start, start + size);
    return { items, page, size, total, totalPages };
  }

  // Nếu backend đã trả dạng {items,total,...}
  // Chuẩn hoá fields
  if (data && data.items && Array.isArray(data.items)) {
    const total = Number(data.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / (data.size || size)));
    return {
      items: data.items,
      page: Number(data.page || page),
      size: Number(data.size || size),
      total,
      totalPages
    };
  }

  // Trường hợp khác: gắng chuyển về array
  const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  return { items: arr, page, size, total: arr.length, totalPages: Math.max(1, Math.ceil(arr.length / size)) };
}

function openAssignMovieDialog({ bannerId, imageId }) {
  const htmlPicker = html`
    <div class="modal-head">
      <h3>Chọn phim để gán</h3>
      <div class="spacer"></div>
    </div>

    <div class="form">
      <input id="mv-q" class="search" placeholder="Tìm theo tên, thể loại... (nhập để lọc)">
      <div id="mv-grid" class="movie-picker-grid">
        <div class="muted">Đang tải...</div>
      </div>
      <div class="picker-pager">
        <button class="btn" id="mv-prev" disabled>◀</button>
        <span id="mv-pages" class="muted"></span>
        <button class="btn" id="mv-next" disabled>▶</button>
      </div>
    </div>

    <div class="modal-foot">
      <button class="btn" id="mv-cancel">Đóng</button>
    </div>
  `;

  const modal = openModal(htmlPicker, ({ el, close }) => {
    const qInput = el.querySelector('#mv-q');
    const grid   = el.querySelector('#mv-grid');
    const prev   = el.querySelector('#mv-prev');
    const next   = el.querySelector('#mv-next');
    const pages  = el.querySelector('#mv-pages');

    let state = { q: '', page: 1, size: 6, totalPages: 1 };

    async function load() {
      grid.innerHTML = `<div class="muted">Đang tải...</div>`;
      try {
        const { items, page, size, total, totalPages } = await fetchMoviesPaged({ q: state.q, page: state.page, size: state.size });
        state.totalPages = totalPages;

        if (!items.length) {
          grid.innerHTML = `<div class="muted">Không có phim phù hợp.</div>`;
        } else {
          grid.innerHTML = items.map(m => {
            const title = (m.title || '(Không tên)').replace(/</g,'&lt;');
            const poster = m.poster || '';
            const dur = m.duration ? `${m.duration}’` : '—';
            const g = Array.isArray(m.genre) ? m.genre.join(', ') : (m.genre || '');
            return html`
              <div class="mv-card" data-id="${m._id || m.id}">
                <img src="${poster}" alt="">
                <div class="cap">
                  <div class="t">${title}</div>
                  <div class="m">${g || '—'} • ${dur}</div>
                </div>
              </div>
            `;
          }).join('');
        }

        pages.textContent = `Trang ${page}/${totalPages}`;
        prev.disabled = page <= 1;
        next.disabled = page >= totalPages;

        
        
        // bind chọn phim
        grid.querySelectorAll('.mv-card').forEach(card => card.onclick = async () => {
          const movieId = card.getAttribute('data-id');
          if (!movieId) return;

          try {
            const res = await authFetch(`${API_BASE}/banners/${bannerId}/images/${imageId}`, {
              method: 'PATCH',
              body: JSON.stringify({ movie_id: movieId })
            });

            const text = await res.text();
            let data; try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

            if (res.status === 401 || res.status === 403) {
              alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
              logout();
              return;
            }
            if (!res.ok) {
              alert(data?.message || 'Gán thất bại.');
              return;
            }

            // PATCH ok → cố gắng reload danh sách ảnh, nhưng nếu lỗi thì bỏ qua
            try { await loadImagesOf(bannerId); }
            catch (e) { console.warn('Reload images failed:', e); }

            // đóng modal dù reload thành công hay không
            close();

          } catch (err) {
            console.error(err);
            alert('Không thể kết nối máy chủ. Kiểm tra API_BASE/CORS hoặc restart server.');
          }
        });



      } catch (e) {
        console.error(e);
        grid.innerHTML = `<div class="muted">Không tải được danh sách phim.</div>`;
      }
    }

    // sự kiện
    el.querySelector('#mv-cancel').onclick = close;
    prev.onclick = () => { if (state.page > 1) { state.page--; load(); } };
    next.onclick = () => { if (state.page < state.totalPages) { state.page++; load(); } };
    qInput.oninput = debounce(() => { state.q = qInput.value.trim(); state.page = 1; load(); }, 300);

    // lần đầu
    load();
  });
}

function renderNewsPage(container) {
  // stub để toolbar gọi từ ngoài
  window.fm_news = { reload: () => { }, create: () => { } };

  container.innerHTML = html`
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px">
        <h3 style="margin:0">Danh sách tin tức</h3>
        <div style="display:flex; align-items:center; gap:8px">
          <input id="news-q" class="search" placeholder="Tìm theo tiêu đề/nội dung..." style="width:280px">
          <select id="news-filter" style="padding:8px 12px; border-radius:10px; border:1px solid var(--line); background:#0f1530; color:#fff">
            <option value="all">Tất cả</option>
            <option value="published">Đã publish</option>
            <option value="draft">Nháp</option>
          </select>
        </div>
      </div>
      <div id="news-table" class="table-wrap"><div class="muted">Đang tải...</div></div>
      <div style="display:flex; justify-content:space-between; margin-top:10px">
        <div class="muted" id="news-info"></div>
        <div class="pager">
          <button class="btn" id="news-prev">←</button>
          <span id="news-page" class="muted">1</span>
          <button class="btn" id="news-next">→</button>
        </div>
      </div>
    </div>
  `;

  const me = getUser();
  const canManage = !!(me && ['admin', 'manager'].includes(me.role));

  // state
  let raw = [];      // toàn bộ từ API admin list
  let view = [];     // sau khi filter tìm kiếm / trạng thái
  let page = 1;
  const pageSize = 10;

  const els = {
    q: $('#news-q'),
    filter: $('#news-filter'),
    table: $('#news-table'),
    info: $('#news-info'),
    prev: $('#news-prev'),
    next: $('#news-next'),
    pg: $('#news-page')
  };

  // hiển thị thông báo / lỗi dưới bảng
  function showInfo(msg, isError = false) {
    els.info.textContent = msg || '';
    if (isError) els.info.classList.add('error-text');
    else els.info.classList.remove('error-text');
  }

  // modal confirm đẹp thay cho window.confirm
  function showConfirmDialog(title, message, onConfirm) {
    const htmlConfirm = html`
      <div class="modal-head">
        <h3>${title}</h3>
      </div>
      <div class="form">
        <p style="margin:12px 0">${message}</p>
      </div>
      <div class="modal-foot">
        <button class="btn" id="cf-cancel">Hủy</button>
        <button class="btn danger" id="cf-ok">Xác nhận</button>
      </div>
    `;
    openModal(htmlConfirm, ({ el, close }) => {
      el.querySelector('#cf-cancel').onclick = close;
      el.querySelector('#cf-ok').onclick = () => {
        close();
        onConfirm && onConfirm();
      };
    });
  }

  async function fetchNewsAdmin(params = {}) {
   
    const url = new URL(`${API_BASE}/news`);
    if (params.q) url.searchParams.set('q', params.q);
    if (typeof params.is_published === 'boolean') {
      url.searchParams.set('is_published', String(params.is_published));
    }

    const res = await authFetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error('load news failed');
    const js = await res.json();
    
    return Array.isArray(js.items) ? js.items : js;
  }

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
    showInfo('');
    try {
      const f = els.filter.value;
      const q = els.q.value.trim();
      const params = {};
      if (f === 'published') params.is_published = true;
      if (f === 'draft') params.is_published = false;
      if (q) params.q = q;

      raw = await fetchNewsAdmin(params);
      applyFilterAndRender();
    } catch (e) {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
      showInfo('Không tải được danh sách tin tức.', true);
    }
  }

  function applyFilterAndRender() {
    view = raw.slice();
    
    const q = els.q.value.trim().toLowerCase();
    const f = els.filter.value;

    if (q) {
      view = view.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q)
      );
    }
    if (f === 'published') view = view.filter(n => n.is_published);
    if (f === 'draft') view = view.filter(n => !n.is_published);

    page = 1;
    renderTable();
  }

  function statusBadge(n) {
    return n.is_published
      ? '<span class="badge ok">Đã publish</span>'
      : '<span class="badge muted">Nháp</span>';
  }

  function fmtDateTime(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2, '0');
    const mi = String(dt.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }

  function renderTable() {
    const total = view.length;
    const start = (page - 1) * pageSize;
    const rows = view.slice(start, start + pageSize);

    if (!rows.length) {
      els.table.innerHTML = `<div class="muted">Không có bài viết.</div>`;
    } else {
      els.table.innerHTML = html`
        <table class="table">
          <thead>
            <tr>
              <th style="width:72px">Ảnh</th>
              <th>Tiêu đề</th>
              <th>Slug</th>
              <th>Tags</th>
              <th>Trạng thái</th>
              <th>Publish at</th>
              <th>Views</th>
              <th style="width:280px">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(n => {
              const src = toAbsImage(n.cover_image);
              return html`
                <tr data-id="${n._id}">
                  <td>${src ? `<img class="news-thumb" src="${src}" alt="cover">` : ''}</td>
                  <td>${n.title || ''}</td>
                  <td>${n.slug || ''}</td>
                  <td>${Array.isArray(n.tags) ? n.tags.join(', ') : ''}</td>
                  <td>${statusBadge(n)}</td>
                  <td>${fmtDateTime(n.published_at)}</td>
                  <td>${n.view_count ?? 0}</td>
                  <td>
                    <div class="row-actions">
                      ${canManage ? `
                        <button class="btn" data-act="toggle" data-id="${n._id}">${n.is_published ? 'Unpublish' : 'Publish'}</button>
                        <button class="btn" data-act="edit" data-id="${n._id}">Sửa</button>
                        <!-- ĐÃ BỎ nút Đổi ảnh bìa -->
                        <button class="btn danger" data-act="del" data-id="${n._id}">Xoá</button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      els.table.querySelectorAll('[data-act]').forEach(b => b.onclick = onRowAction);
    }

    els.info.textContent = total
      ? `Hiển thị ${Math.min(start + 1, total)}–${Math.min(start + rows.length, total)} / ${total}`
      : '';
    els.pg.textContent = String(page);
  }

  // ====== Form thêm/sửa ======
  function toSlug(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function openNewsForm(mode, data = {}) {
    const isEdit = mode === 'edit';

   
    const abs = (u) => {
      const v = String(u || '').trim();
      if (!v) return '';
      if (/^https?:\/\//i.test(v)) return v;
      const origin = (API_BASE || '').replace(/\/api\/?$/, '');
      return origin + (v.startsWith('/') ? v : '/' + v);
    };

    const htmlForm = html`
      <div class="modal-head">
        <h3>${isEdit ? 'Sửa tin tức' : 'Thêm tin tức'}</h3>
        <div class="spacer"></div>
      </div>
      <div class="form">
        <div class="row">
          <div class="col-12 field"><label>Tiêu đề *</label><input id="f-title" value="${data.title || ''}"></div>
          <div class="col-12 field"><label>Slug *</label><input id="f-slug" placeholder="auto từ tiêu đề nếu để trống" value="${data.slug || ''}"></div>
          <div class="col-12 field"><label>Tóm tắt *</label><textarea id="f-excerpt">${data.excerpt || ''}</textarea></div>
          <div class="col-12 field"><label>Nội dung *</label><textarea id="f-content" style="min-height:160px">${data.content || ''}</textarea></div>
          <div class="col-12 field"><label>Tags (phân tách dấu phẩy) *</label><input id="f-tags" value="${Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || '')}"></div>

          <div class="col-12">
            <div class="pill" style="display:inline-block;margin:6px 0">Ảnh bìa (chọn 1 trong 2 cách)</div>
          </div>

          <div class="col-6 field"><label>Chọn file ảnh *</label><input id="f-cover-file" type="file" accept="image/*"></div>
          <div class="col-6 field"><label>Hoặc nhập URL ảnh *</label><input id="f-cover-url" value="${data.cover_image || ''}" placeholder="https://..."></div>

          <div class="col-12">
            <div id="f-cover-preview-wrap" style="margin-top:8px">
              <img id="f-cover-preview" alt="preview" style="display:none;width:120px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">
            </div>
          </div>
        </div>
        <div id="f-error" style="margin-top:8px; font-size:13px; color:#f87171;"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">${isEdit ? 'Lưu' : 'Tạo'}</button>
      </div>
    `;

    openModal(htmlForm, ({ el, close }) => {
      const iTitle = el.querySelector('#f-title');
      const iSlug  = el.querySelector('#f-slug');
      const iEx    = el.querySelector('#f-excerpt');
      const iCt    = el.querySelector('#f-content');
      const iTags  = el.querySelector('#f-tags');
      const iFile  = el.querySelector('#f-cover-file');
      const iUrl   = el.querySelector('#f-cover-url');
      const img    = el.querySelector('#f-cover-preview');
      const errEl  = el.querySelector('#f-error');

      const setPreview = (src) => {
        if (!src) { img.style.display = 'none'; img.removeAttribute('src'); return; }
        img.src = src; img.style.display = '';
      };

      
      if ((data.cover_image || '').trim()) setPreview(abs(data.cover_image));

      
      iUrl.addEventListener('input', () => {
        const v = iUrl.value.trim();
        setPreview(v ? abs(v) : '');
      });

      
      iFile.addEventListener('change', () => {
        const f = iFile.files?.[0];
        if (!f) return setPreview('');
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(f);
      });

      
      iTitle.addEventListener('blur', () => {
        if (!iSlug.value.trim()) iSlug.value = toSlug(iTitle.value);
      });

      function requireField(inputEl) {
        if (!inputEl) return true;
        const v = (inputEl.value || '').trim();
        if (!v) {
          setInputError(inputEl, 'Hãy nhập đủ thông tin');
          return false;
        }
        clearInputError(inputEl);
        return true;
      }

      [iTitle, iSlug, iEx, iCt, iTags, iUrl].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
          clearInputError(input);
          if (errEl) errEl.textContent = '';
        });
      });

      el.querySelector('#f-cancel').onclick = close;

      el.querySelector('#f-submit').onclick = async () => {
        if (errEl) errEl.textContent = '';

        let ok = true;
        ok = requireField(iTitle) && ok;

        if (!iSlug.value.trim()) iSlug.value = toSlug(iTitle.value);
        ok = requireField(iSlug) && ok;
        ok = requireField(iEx)   && ok;
        ok = requireField(iCt)   && ok;
        ok = requireField(iTags) && ok;

        
        const hasFile = iFile.files && iFile.files.length > 0;
        const hasUrl  = !!iUrl.value.trim();

        if (!hasFile && !hasUrl) {
          setInputError(iUrl, 'Ảnh bìa (file hoặc URL) không được để trống.');
        
          ok = false;
        } else {
          clearInputError(iUrl);
        }

        if (!ok) {
          if (errEl) errEl.textContent = 'Vui lòng kiểm tra lại các trường bắt buộc được tô đỏ.';
          return;
        }

        try {
          let res;

          if (isEdit) {
            if (hasFile) {
              const fd = new FormData();
              fd.append('cover', iFile.files[0]);
              fd.append('title',   iTitle.value.trim());
              fd.append('slug',    iSlug.value.trim());
              fd.append('excerpt', iEx.value.trim());
              fd.append('content', iCt.value.trim());
              fd.append('tags',    iTags.value.trim());
              const token = getToken();
              res = await fetch(`${API_BASE}/news/${data._id}`, {
                method: 'PUT',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: fd
              });
            } else {
              const body = {
                title:   iTitle.value.trim(),
                slug:    iSlug.value.trim(),
                excerpt: iEx.value.trim(),
                content: iCt.value.trim(),
                tags:    iTags.value.trim(),
                cover_image: iUrl.value.trim()
              };
              res = await authFetch(`${API_BASE}/news/${data._id}`, {
                method: 'PUT',
                body: JSON.stringify(body)
              });
            }
          } else {
            if (hasFile) {
              const fd = new FormData();
              fd.append('cover', iFile.files[0]);
              fd.append('title',   iTitle.value.trim());
              fd.append('slug',    iSlug.value.trim());
              fd.append('excerpt', iEx.value.trim());
              fd.append('content', iCt.value.trim());
              fd.append('tags',    iTags.value.trim());
              const token = getToken();
              res = await fetch(`${API_BASE}/news`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: fd
              });
            } else {
              const body = {
                title:   iTitle.value.trim(),
                slug:    iSlug.value.trim(),
                excerpt: iEx.value.trim(),
                content: iCt.value.trim(),
                tags:    iTags.value.trim(),
                cover_image: iUrl.value.trim()
              };
              res = await authFetch(`${API_BASE}/news`, {
                method: 'POST',
                body: JSON.stringify(body)
              });
            }
          }

          const dataRes = await res.json().catch(() => ({}));

          if (res.status === 401 || res.status === 403) {
            if (errEl) errEl.textContent = 'Phiên đăng nhập đã hết hạn hoặc thiếu quyền. Vui lòng đăng nhập lại.';
            logout();
            return;
          }

          if (!res.ok) {
            if (errEl) errEl.textContent = dataRes?.message || 'Thao tác thất bại.';
            return;
          }

          close();
          await loadList();
          showInfo(isEdit ? 'Đã lưu bài viết.' : 'Đã tạo bài viết mới.');
        } catch {
          if (errEl) errEl.textContent = 'Lỗi kết nối máy chủ.';
        }
      };
    });
  }

  async function onRowAction(e) {
    const id  = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');

    if (act === 'toggle' && canManage) {
      showInfo('');
      try {
        const res = await authFetch(`${API_BASE}/news/${id}/publish`, { method: 'PATCH' });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          showInfo(d?.message || 'Cập nhật trạng thái thất bại.', true);
          return;
        }
        await loadList();
        showInfo('Đã cập nhật trạng thái bài viết.');
      } catch {
        showInfo('Lỗi kết nối khi cập nhật trạng thái.', true);
      }
      return;
    }

    if (act === 'edit' && canManage) {
      showInfo('');
      try {
        const res = await authFetch(`${API_BASE}/news/${id}`);
        const n = await res.json();
        openNewsForm('edit', n);
      } catch {
        showInfo('Không lấy được chi tiết bài viết.', true);
      }
      return;
    }

    if (act === 'del' && canManage) {
      showConfirmDialog('Xoá bài viết', 'Bạn có chắc muốn xoá bài viết này?', async () => {
        showInfo('');
        try {
          const res = await authFetch(`${API_BASE}/news/${id}`, { method: 'DELETE' });
          const d = await res.json().catch(() => ({}));
          if (!res.ok) {
            showInfo(d?.message || 'Xoá thất bại.', true);
            return;
          }
          await loadList();
          showInfo('Đã xoá bài viết.');
        } catch {
          showInfo('Lỗi kết nối khi xoá bài viết.', true);
        }
      });
      return;
    }
  }

  // events: search auto load theo input, filter đổi là load lại
  els.q.addEventListener('input', debounce(() => {
    page = 1;
    loadList();
  }, 300));

  els.filter.addEventListener('change', () => {
    page = 1;
    loadList();
  });

  els.prev.onclick = () => {
    if (page > 1) {
      page--;
      renderTable();
    }
  };
  els.next.onclick = () => {
    const max = Math.ceil(view.length / pageSize) || 1;
    if (page < max) {
      page++;
      renderTable();
    }
  };

  window.fm_news = {
    reload: () => loadList(),
    create: () => openNewsForm('create')
  };

  loadList();
}


function renderCinemasPage(container) {
  window.fm_cinemas = { reload: () => {}, create: () => {} };

  container.innerHTML = `
    <div class="card">
      <h3 style="margin:0 0 8px">Quản lý rạp</h3>
      <div style="display:flex; gap:8px; margin-bottom:8px">
        <input id="cinema-q" class="search" placeholder="Tìm theo tên, địa chỉ, hotline..." style="width:260px">
      </div>
      <div id="cinema-table" class="table-wrap">
        <div class="muted">Đang tải...</div>
      </div>
      <div class="muted" id="cinema-info" style="margin-top:8px;"></div>
    </div>
  `;

  const els = {
    q: $('#cinema-q'),
    table: $('#cinema-table'),
    info: $('#cinema-info')
  };

  let raw = [];

  function showInfo(msg, isError = false) {
    els.info.textContent = msg || '';
    if (isError) els.info.classList.add('error-text');
    else els.info.classList.remove('error-text');
  }

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
    showInfo('');
    try {
      const q = (els.q.value || '').trim();
      const url = new URL(`${API_BASE}/cinemas`);
      if (q) url.searchParams.set('q', q);

      const res = await authFetch(url.toString(), { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
      if (!res.ok) {
        els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
        showInfo('Không tải được danh sách rạp.', true);
        return;
      }
      raw = items;
      renderTable();
    } catch {
      els.table.innerHTML = `<div class="muted">Lỗi khi tải danh sách rạp.</div>`;
      showInfo('Lỗi khi tải danh sách rạp.', true);
    }
  }

  function renderTable() {
    if (!raw.length) {
      els.table.innerHTML = `<div class="muted">Chưa có rạp.</div>`;
      return;
    }

    els.table.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Tên rạp</th>
            <th>Địa chỉ</th>
            <th>Thành phố</th>
            <th>Hotline</th>
            <th style="width:220px">Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${raw.map(c => `
            <tr data-id="${c._id}">
              <td>${c.name || ''}</td>
              <td>${c.address || ''}</td>
              <td>${c.city || ''}</td>
              <td>${c.hotline || ''}</td>
              <td>
                <div class="row-actions">
                  <button class="btn" data-act="edit" data-id="${c._id}">Sửa</button>
                  <button class="btn danger" data-act="del" data-id="${c._id}">Xoá</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    els.table.querySelectorAll('[data-act]').forEach(b => b.onclick = onRowAction);
  }

  function citySelectHTML(selected = '') {
    const cities = [
      'Hà Nội','Hải Phòng','Quảng Ninh','Bắc Ninh','Hải Dương','Hưng Yên','Vĩnh Phúc',
      'Bắc Giang','Thái Nguyên','Phú Thọ','Ninh Bình','Nam Định','Thái Bình',
      'Lạng Sơn','Lào Cai','Yên Bái','Điện Biên','Lai Châu','Sơn La',
      'Hà Giang','Tuyên Quang','Cao Bằng','Bắc Kạn'
    ];
    return `
      <select id="f-city">
        <option value="">-- Chọn tỉnh/thành --</option>
        ${cities.map(c => `
          <option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>
        `).join('')}
      </select>
    `;
  }

  function openCinemaForm(mode, data = {}) {
    const isEdit = mode === 'edit';
    const htmlForm = html`
      <div class="modal-head">
        <h3>${isEdit ? 'Sửa rạp' : 'Thêm rạp'}</h3>
        <div class="spacer"></div>
      </div>
      <div class="form">
        <div class="row">
          <div class="col-12 field">
            <label>Tên rạp *</label>
            <input id="f-name" value="${data.name || ''}">
          </div>
          <div class="col-12 field">
            <label>Địa chỉ *</label>
            <input id="f-address" value="${data.address || ''}">
          </div>
          <div class="col-6 field">
            <label>Thành phố *</label>
            ${citySelectHTML(data.city || '')}
          </div>
          <div class="col-6 field">
            <label>Hotline *</label>
            <input id="f-hotline" value="${data.hotline || ''}" placeholder="10 chữ số">
          </div>
        </div>
        <div id="f-error" style="margin-top:8px; font-size:13px; color:#f87171;"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">${isEdit ? 'Lưu' : 'Tạo'}</button>
      </div>
    `;

    openModal(htmlForm, ({ el, close }) => {
      const nameEl = el.querySelector('#f-name');
      const addrEl = el.querySelector('#f-address');
      const cityEl = el.querySelector('#f-city');
      const hotEl  = el.querySelector('#f-hotline');
      const errEl  = el.querySelector('#f-error');

      el.querySelector('#f-cancel').onclick = close;

      [nameEl, addrEl, cityEl, hotEl].forEach(input => {
        input?.addEventListener('input', () => {
          clearInputError(input);
          errEl.textContent = '';
        });
      });

      function validateHotline(v) {
        return /^[0-9]{10}$/.test(v);
      }

      el.querySelector('#f-submit').onclick = async () => {
        [nameEl, addrEl, cityEl, hotEl].forEach(clearInputError);
        errEl.textContent = '';
        let ok = true;

        if (!nameEl.value.trim()) { setInputError(nameEl, 'Hãy nhập đủ thông tin'); ok = false; }
        if (!addrEl.value.trim()) { setInputError(addrEl, 'Hãy nhập đủ thông tin'); ok = false; }
        if (!cityEl.value)        { setInputError(cityEl, 'Hãy nhập đủ thông tin'); ok = false; }
        if (!hotEl.value.trim())  { setInputError(hotEl, 'Hãy nhập đủ thông tin'); ok = false; }
        else if (!validateHotline(hotEl.value.trim())) {
          setInputError(hotEl, 'Vui lòng nhập đúng số điện thoại (10 chữ số)');
          ok = false;
        }

        if (!ok) return;

        const body = {
          name: nameEl.value.trim(),
          address: addrEl.value.trim(),
          city: cityEl.value,
          hotline: hotEl.value.trim()
        };

        try {
          let res;
          if (isEdit) {
            res = await authFetch(`${API_BASE}/cinemas/${data._id}`, {
              method: 'PUT',
              body: JSON.stringify(body)
            });
          } else {
            res = await authFetch(`${API_BASE}/cinemas`, {
              method: 'POST',
              body: JSON.stringify(body)
            });
          }
          const js = await res.json().catch(() => ({}));
          if (!res.ok) {
            errEl.textContent = js?.message || 'Thao tác thất bại.';
            return;
          }
          close();
          await loadList();
          showInfo(isEdit ? 'Đã lưu thay đổi rạp.' : 'Đã tạo rạp mới.');
        } catch {
          errEl.textContent = 'Không thể kết nối máy chủ.';
        }
      };
    });
  }

  // ===== modal xác nhận xoá =====
  function showConfirmDialog(title, message, onConfirm) {
    const htmlConfirm = html`
      <div class="modal-head">
        <h3>${title}</h3>
      </div>
      <div class="form">
        <p style="margin:12px 0">${message}</p>
      </div>
      <div class="modal-foot">
        <button class="btn" id="cf-cancel">Hủy</button>
        <button class="btn danger" id="cf-ok">Xóa</button>
      </div>
    `;
    openModal(htmlConfirm, ({ el, close }) => {
      el.querySelector('#cf-cancel').onclick = close;
      el.querySelector('#cf-ok').onclick = () => { close(); onConfirm?.(); };
    });
  }

  async function onRowAction(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');
    const item = raw.find(c => c._id === id);
    if (!item) return;

    if (act === 'edit') {
      openCinemaForm('edit', item);
      return;
    }
    if (act === 'del') {
      showConfirmDialog('Xác nhận xoá', `Bạn có chắc muốn xoá rạp "${item.name}"?`, async () => {
        try {
          const res = await authFetch(`${API_BASE}/cinemas/${id}`, { method: 'DELETE' });
          const js = await res.json().catch(() => ({}));
          if (!res.ok) {
            showInfo(js?.message || 'Xoá thất bại.', true);
            return;
          }
          await loadList();
          showInfo('Đã xoá 1 rạp.');
        } catch {
          showInfo('Lỗi kết nối khi xoá.', true);
        }
      });
    }
  }

  els.q.addEventListener('input', debounce(loadList, 300));

  window.fm_cinemas = {
    reload: () => loadList(),
    create: () => openCinemaForm('create')
  };

  loadList();
}

function renderRoomsPage(container) {
  window.fm_rooms = { reload: () => {}, create: () => {} };

  container.innerHTML = html`
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px">
        <h3 style="margin:0">Danh sách phòng</h3>
        <div style="display:flex; gap:8px; align-items:center">
          <input id="rm-q" class="search" placeholder="Tìm theo tên phòng…" style="width:220px">
          <select id="rm-cinema" style="padding:8px 12px; border-radius:10px; border:1px solid var(--line); background:#0f1530; color:#fff">
            <option value="">-- Tất cả rạp --</option>
          </select>
          <select id="rm-type" style="padding:8px 12px; border-radius:10px; border:1px solid var(--line); background:#0f1530; color:#fff">
            <option value="">-- Tất cả loại --</option>
            <option value="2D">2D</option>
            <option value="3D">3D</option>
            <option value="IMAX">IMAX</option>
          </select>
        </div>
      </div>

      <div id="rm-table" class="table-wrap"><div class="muted">Đang tải...</div></div>
      <div style="display:flex; justify-content:space-between; margin-top:10px">
        <div class="muted" id="rm-info"></div>
        <div class="pager">
          <button class="btn" id="rm-prev">←</button>
          <span id="rm-page" class="muted">1</span>
          <button class="btn" id="rm-next">→</button>
        </div>
      </div>
    </div>
  `;

  const me = getUser();
  const canManage = !!(me && ['admin','manager'].includes(me.role));

  let raw = [];
  let view = [];
  let page = 1;
  const pageSize = 10;

  const els = {
    q: $('#rm-q'),
    cinema: $('#rm-cinema'),
    type: $('#rm-type'),
    table: $('#rm-table'),
    info: $('#rm-info'),
    prev: $('#rm-prev'),
    next: $('#rm-next'),
    pg: $('#rm-page'),
  };

  // ===== helper hiển thị thông báo / lỗi =====
  function showListError(msg, isError = false) {
    els.info.textContent = msg || '';
    if (isError) els.info.classList.add('error-text');
    else els.info.classList.remove('error-text');
  }

  // ===== modal xác nhận hành động =====
  function showConfirmDialog(title, message, onConfirm) {
    const htmlConfirm = html`
      <div class="modal-head"><h3>${title}</h3></div>
      <div class="form"><p style="margin:12px 0">${message}</p></div>
      <div class="modal-foot">
        <button class="btn" id="cf-cancel">Hủy</button>
        <button class="btn danger" id="cf-ok">Xác nhận</button>
      </div>
    `;
    openModal(htmlConfirm, ({ el, close }) => {
      el.querySelector('#cf-cancel').onclick = close;
      el.querySelector('#cf-ok').onclick = () => { close(); onConfirm?.(); };
    });
  }

  // ===== nạp rạp để filter =====
  async function fetchCinemasAll() {
    const url = new URL(`${API_BASE}/cinemas`);
    url.searchParams.set('limit', '200');
    const res = await authFetch(url.toString(), { cache: 'no-store' });
    const js = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(js?.message || 'load cinemas failed');
    return Array.isArray(js?.items) ? js.items : (Array.isArray(js) ? js : []);
  }

  async function fillCinemaSelect(selectEl, withAllOption = true) {
    try {
      const list = await fetchCinemasAll();
      selectEl.innerHTML = withAllOption
        ? `<option value="">-- Tất cả rạp --</option>`
        : `<option value="">-- Chọn rạp --</option>`;
      list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c._id;
        opt.textContent = `${c.name}${c.city ? ' • ' + c.city : ''}`;
        selectEl.append(opt);
      });
    } catch {}
  }

  // ===== nạp danh sách phòng =====
  async function fetchRooms(params = {}) {
    const url = new URL(`${API_BASE}/rooms`);
    if (params.q) url.searchParams.set('q', params.q);
    if (params.cinema) url.searchParams.set('cinema', params.cinema);
    if (params.type) url.searchParams.set('type', params.type);
    url.searchParams.set('limit', '500');
    const res = await authFetch(url.toString(), { cache: 'no-store' });
    const js = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(js?.message || 'load rooms failed');
    return Array.isArray(js?.items) ? js.items : (Array.isArray(js) ? js : []);
  }

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
    showListError('');
    try {
      const params = {
        q: els.q.value.trim(),
        cinema: els.cinema.value || '',
        type: els.type.value || ''
      };
      raw = await fetchRooms(params);
      applyFilterAndRender();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
      showListError('Không tải được danh sách phòng.', true);
    }
  }

  function applyFilterAndRender() {
    const q = els.q.value.trim().toLowerCase();
    view = raw.filter(r => !q || (r.name || '').toLowerCase().includes(q));
    page = 1;
    renderTable();
  }

  function renderTable() {
    const total = view.length;
    const start = (page - 1) * pageSize;
    const rows = view.slice(start, start + pageSize);

    if (!rows.length) {
      els.table.innerHTML = `<div class="muted">Không có phòng.</div>`;
      return;
    }

    els.table.innerHTML = html`
      <table class="table">
        <thead>
          <tr>
            <th>Phòng</th><th>Rạp</th><th>Loại</th><th>Layout</th><th>RxC</th><th>Sức chứa</th><th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => html`
            <tr data-id="${r._id}">
              <td>${r.name}</td>
              <td>${r.cinema?.name || r.cinema || ''}</td>
              <td>${r.type}</td>
              <td>${r.layout_key}</td>
              <td>${r.rows}×${r.cols}</td>
              <td>${r.capacity}</td>
              <td>
                <div class="row-actions">
                  ${canManage ? `
                    <button class="btn" data-act="edit" data-id="${r._id}">Sửa</button>
                    <button class="btn danger" data-act="del" data-id="${r._id}">Xóa</button>` : ''}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;
    els.table.querySelectorAll('[data-act]').forEach(b => b.onclick = onRowAction);
    els.info.textContent = `Hiển thị ${start + 1}–${Math.min(start + rows.length, total)} / ${total}`;
  }

  // ===== form tạo/sửa phòng =====
  function openRoomForm(mode, data = {}) {
    const isEdit = mode === 'edit';
    const htmlForm = html`
      <div class="modal-head"><h3>${isEdit ? 'Sửa phòng' : 'Thêm phòng'}</h3></div>
      <div class="form">
        <div class="row">
          <div class="col-6 field"><label>Rạp *</label><select id="f-cinema"></select></div>
          <div class="col-6 field"><label>Tên phòng *</label><input id="f-name" value="${data.name || ''}"></div>
          <div class="col-6 field"><label>Loại *</label>
            <select id="f-type">
              <option value="2D" ${data.type==='2D'?'selected':''}>2D</option>
              <option value="3D" ${data.type==='3D'?'selected':''}>3D</option>
              <option value="IMAX" ${data.type==='IMAX'?'selected':''}>IMAX</option>
            </select></div>
          <div class="col-6 field"><label>Layout *</label>
            <select id="f-layout">
              <option value="STD_10x10" ${data.layout_key==='STD_10x10'?'selected':''}>STD_10x10</option>
              <option value="STD_10x12" ${data.layout_key==='STD_10x12'?'selected':''}>STD_10x12</option>
              <option value="STD_8x10"  ${data.layout_key==='STD_8x10'?'selected':''}>STD_8x10</option>
              <option value="STD_8x8"   ${data.layout_key==='STD_8x8'?'selected':''}>STD_8x8</option>
            </select>
          </div>
        </div>
        <div id="f-error" class="error-text" style="margin-top:6px;"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">${isEdit?'Lưu':'Tạo phòng'}</button>
      </div>
    `;

    openModal(htmlForm, async ({ el, close }) => {
      const iCinema = el.querySelector('#f-cinema');
      const iName = el.querySelector('#f-name');
      const iType = el.querySelector('#f-type');
      const iLayout = el.querySelector('#f-layout');
      const errEl = el.querySelector('#f-error');

      await fillCinemaSelect(iCinema, false);
      if (data.cinema?._id) iCinema.value = data.cinema._id;
      else if (data.cinema) iCinema.value = data.cinema;

      [iCinema, iName, iType, iLayout].forEach(inp =>
        inp.addEventListener('input', () => { clearInputError(inp); errEl.textContent = ''; })
      );

      el.querySelector('#f-cancel').onclick = close;

      el.querySelector('#f-submit').onclick = async () => {
        [iCinema, iName, iType, iLayout].forEach(clearInputError);
        errEl.textContent = '';

        // yêu cầu đủ cả 4 trường cả khi edit (để chắc chắn có layout cho bước tái sinh)
        let ok = true;
        if (!iCinema.value) { setInputError(iCinema, 'Chọn rạp'); ok = false; }
        if (!iName.value.trim()) { setInputError(iName, 'Nhập tên phòng'); ok = false; }
        if (!iType.value) { setInputError(iType, 'Chọn loại'); ok = false; }
        if (!iLayout.value) { setInputError(iLayout, 'Chọn layout'); ok = false; }
        if (!ok) return;

        const selectedLayout = iLayout.value;

        try {
          if (isEdit) {
            // 1) Cập nhật thông tin phòng
            const putRes = await authFetch(`${API_BASE}/rooms/${data._id}`, {
              method: 'PUT',
              body: JSON.stringify({
                cinema: iCinema.value,
                name: iName.value.trim(),
                type: iType.value
                // (không gửi layout_key ở PUT vì BE đang không đổi layout tại đây)
              })
            });
            const putJs = await putRes.json().catch(()=>({}));
            if (!putRes.ok) { errEl.textContent = putJs?.message || 'Cập nhật phòng thất bại.'; return; }

            // 2) Tái sinh ghế theo layout đã chọn
            const regenRes = await authFetch(`${API_BASE}/rooms/${data._id}/regenerate-seats`, {
              method: 'POST',
              body: JSON.stringify({ layout_key: selectedLayout })
            });
            const regenJs = await regenRes.json().catch(()=>({}));
            if (!regenRes.ok) {
              // Cập nhật OK nhưng tái sinh lỗi
              close();
              await loadList();
              showListError(regenJs?.message || 'Đã lưu phòng nhưng tái sinh ghế thất bại.', true);
              return;
            }

            close();
            await loadList();
            showListError('Đã lưu phòng và tái sinh ghế theo layout mới.', false);
          } else {
            // Tạo mới: BE đã sinh ghế sau create (giữ logic cũ)
            const postRes = await authFetch(`${API_BASE}/rooms`, {
              method: 'POST',
              body: JSON.stringify({
                cinema: iCinema.value,
                name: iName.value.trim(),
                type: iType.value,
                layout_key: selectedLayout
              })
            });
            const postJs = await postRes.json().catch(()=>({}));
            if (!postRes.ok) { errEl.textContent = postJs?.message || 'Tạo phòng thất bại.'; return; }
            close();
            await loadList();
            showListError('Đã tạo phòng mới.', false);
          }
        } catch {
          errEl.textContent = 'Lỗi kết nối máy chủ.';
        }
      };
    });
  }

  // ===== hành động =====
  async function onRowAction(e) {
    const id = e.currentTarget.dataset.id;
    const act = e.currentTarget.dataset.act;
    const room = raw.find(r => r._id === id);
    if (!room) return;

    if (act==='edit') return openRoomForm('edit', room);

    if (act==='del') {
      showConfirmDialog('Xác nhận xoá', `Bạn có chắc muốn xoá phòng "${room.name}"?`, async () => {
        try {
          const res = await authFetch(`${API_BASE}/rooms/${id}`, { method:'DELETE' });
          const js = await res.json().catch(()=>({}));
          if (!res.ok) return showListError(js?.message || 'Xoá thất bại.', true);
          await loadList(); showListError('Đã xoá phòng.', false);
        } catch { showListError('Lỗi kết nối khi xoá.', true); }
      });
    }
  }

  // ===== sự kiện =====
  els.q.addEventListener('input', debounce(loadList,300));
  els.cinema.addEventListener('change',loadList);
  els.type.addEventListener('change',loadList);
  els.prev.onclick=()=>{if(page>1){page--;renderTable();}};
  els.next.onclick=()=>{const max=Math.ceil(view.length/pageSize)||1;if(page<max){page++;renderTable();}};

  window.fm_rooms = { reload: loadList, create: ()=>openRoomForm('create') };
  fillCinemaSelect(els.cinema,true);
  loadList();
}



function renderProductsPage(container) {
  // expose cho toolbar
  window.fm_products = { reload: () => {}, create: () => {} };

  const me = getUser();
  const canManage = !!(me && ['admin','manager','staff'].includes(me.role));

  container.innerHTML = html`
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px">
        <h3 style="margin:0">Bỏng & Nước</h3>
        <div style="display:flex; gap:8px">
          <select id="pd-type" style="padding:8px 12px; border-radius:10px; border:1px solid var(--line); background:#0f1530; color:#fff">
            <option value="all">Tất cả loại</option>
            <option value="popcorn">Popcorn</option>
            <option value="drink">Drink</option>
            <option value="combo">Combo</option>
          </select>
          <input id="pd-q" class="search" placeholder="Tìm tên sản phẩm..." style="width:260px">
        </div>
      </div>

      <div id="pd-table" class="table-wrap"><div class="muted">Đang tải...</div></div>

      <div style="display:flex; justify-content:space-between; margin-top:10px">
        <div class="muted" id="pd-info"></div>
        <div class="pager">
          <button class="btn" id="pd-prev">←</button>
          <span id="pd-page" class="muted">1</span>
          <button class="btn" id="pd-next">→</button>
        </div>
      </div>
    </div>
  `;

  // ===== state =====
  let raw = [];    // toàn bộ từ /api/products (adminList)
  let view = [];   // sau filter
  let page = 1;
  const pageSize = 10;

  const els = {
    q:    $('#pd-q'),
    type: $('#pd-type'),
    table: $('#pd-table'),
    info:  $('#pd-info'),
    prev:  $('#pd-prev'),
    next:  $('#pd-next'),
    pg:    $('#pd-page'),
  };

  const vnd = (n) => (typeof n === 'number' ? n.toLocaleString('vi-VN') + '₫' : '');

  function badgeActive(a) {
    return a
      ? '<span class="badge ok">active</span>'
      : '<span class="badge muted">inactive</span>';
  }

  // helper hiển thị thông báo / lỗi dưới bảng
  function showInfo(msg, isError = false) {
    els.info.textContent = msg || '';
    if (isError) els.info.classList.add('error-text');
    else els.info.classList.remove('error-text');
  }

  // modal confirm đẹp thay cho window.confirm
  function showConfirmDialog(title, message, onConfirm) {
    const htmlConfirm = html`
      <div class="modal-head">
        <h3>${title}</h3>
      </div>
      <div class="form">
        <p style="margin:12px 0">${message}</p>
      </div>
      <div class="modal-foot">
        <button class="btn" id="cf-cancel">Hủy</button>
        <button class="btn danger" id="cf-ok">Xóa</button>
      </div>
    `;
    openModal(htmlConfirm, ({ el, close }) => {
      el.querySelector('#cf-cancel').onclick = close;
      el.querySelector('#cf-ok').onclick = () => { close(); onConfirm && onConfirm(); };
    });
  }

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
    showInfo('');
    try {
      const res = await authFetch(`${API_BASE}/products`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!Array.isArray(data)) throw new Error('Bad response');
      raw = data;
      applyFilter();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
      showInfo('Không tải được danh sách sản phẩm.', true);
    }
  }

  function applyFilter() {
    const q = els.q.value.trim().toLowerCase();
    const t = els.type.value;
    view = raw.filter(p => {
      const okQ = !q || (p.name || '').toLowerCase().includes(q);
      const okT = (t === 'all') || (p.type === t);
      return okQ && okT;
    });
    page = 1;
    renderTable();
  }

  // hỗ trợ hiển thị cả URL thường và data:base64
  function resolveImgSrc(src) {
    const v = String(src || '');
    if (v.startsWith('data:')) return v;
    return toAbsImage(v);
  }

  function renderTable() {
    const total = view.length;
    const start = (page - 1) * pageSize;
    const rows = view.slice(start, start + pageSize);

    if (!rows.length) {
      els.table.innerHTML = `<div class="muted">Không có sản phẩm.</div>`;
    } else {
      els.table.innerHTML = html`
        <table class="table">
          <thead>
            <tr>
              <th style="width:72px">Ảnh</th>
              <th>Tên</th>
              <th>Loại</th>
              <th>Giá</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
              <th style="width:280px">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(p => {
              const img = resolveImgSrc(p.image);
              return html`
                <tr data-id="${p._id}">
                  <td>${img ? `<img class="news-thumb" src="${img}" alt="img">` : ''}</td>
                  <td>${p.name || ''}</td>
                  <td>${p.type}</td>
                  <td>${vnd(p.price)}</td>
                  <td>${p.description || ''}</td>
                  <td>${badgeActive(p.active)}</td>
                  <td>
                    <div class="row-actions">
                      ${canManage ? `
                        <button class="btn" data-act="toggle" data-id="${p._id}">${p.active ? 'Disable' : 'Enable'}</button>
                        <button class="btn" data-act="edit" data-id="${p._id}">Sửa</button>
                        <button class="btn danger" data-act="del" data-id="${p._id}">Xoá</button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    els.info.textContent = total
      ? `Hiển thị ${Math.min(start + 1, total)}–${Math.min(start + rows.length, total)} / ${total}`
      : '';
    els.pg.textContent = String(page);

    els.table.querySelectorAll('[data-act]').forEach(b => b.onclick = onRowAction);
  }

  // đọc file -> Data URL (base64)
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  function openProductForm(mode, data = {}) {
    const isEdit = mode === 'edit';

    const htmlForm = html`
      <div class="modal-head">
        <h3>${isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
        <div class="spacer"></div>
      </div>
      <div class="form">
        <div class="row">
          <div class="col-6 field">
            <label>Tên *</label>
            <input id="pd-name" value="${data.name || ''}">
          </div>
          <div class="col-3 field">
            <label>Loại *</label>
            <select id="pd-type-sel">
              <option value="popcorn" ${data.type==='popcorn'?'selected':''}>popcorn</option>
              <option value="drink"   ${data.type==='drink'?'selected':''}>drink</option>
              <option value="combo"   ${data.type==='combo'?'selected':''}>combo</option>
            </select>
          </div>
          <div class="col-3 field">
            <label>Giá (VND) *</label>
            <input id="pd-price" type="number" min="0" step="1000" value="${(data.price ?? '')}">
          </div>

          <div class="col-12">
            <div class="pill" style="display:inline-block;margin:6px 0">Ảnh sản phẩm (chọn 1 trong 2 cách)</div>
          </div>

          <div class="col-6 field">
            <label>Chọn file ảnh *</label>
            <input id="pd-image-file" type="file" accept="image/*">
          </div>
          <div class="col-6 field">
            <label>Hoặc URL ảnh *</label>
            <input id="pd-image" value="${data.image || ''}" placeholder="/public/uploads/... hoặc https://...">
          </div>

          <div class="col-12 field">
            <label>Mô tả *</label>
            <textarea id="pd-desc">${data.description || ''}</textarea>
          </div>

          <!-- Checkbox Active được ẩn -->
          <div class="col-12" style="display:none">
            <label><input id="pd-active" type="checkbox" ${data.active!==false?'checked':''}> Active</label>
          </div>

          <!-- Preview -->
          <div class="col-12">
            <img id="pd-preview" alt="preview" style="display:none;width:120px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">
          </div>
        </div>
        <div id="pd-error" style="margin-top:8px; font-size:13px; color:#f87171;"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="pd-cancel">Hủy</button>
        <button class="btn primary" id="pd-submit">${isEdit ? 'Lưu' : 'Tạo'}</button>
      </div>
    `;

    openModal(htmlForm, ({ el, close }) => {
      const $g = id => el.querySelector('#' + id);

      const iName   = $g('pd-name');
      const iType   = $g('pd-type-sel');
      const iPrice  = $g('pd-price');
      const iImage  = $g('pd-image');
      const iFile   = $g('pd-image-file');
      const iDesc   = $g('pd-desc');
      const iPrev   = $g('pd-preview');
      const errEl   = $g('pd-error');

      // preview theo URL
      iImage.addEventListener('input', () => {
        const v = iImage.value.trim();
        if (v) {
          iPrev.src = v;
          iPrev.style.display = '';
        } else if (!iFile.files?.length) {
          iPrev.removeAttribute('src');
          iPrev.style.display = 'none';
        }
        clearInputError(iImage); if (errEl) errEl.textContent = '';
      });

      // preview theo file
      iFile.addEventListener('change', async () => {
        if (iFile.files && iFile.files[0]) {
          const url = URL.createObjectURL(iFile.files[0]);
          iPrev.src = url; iPrev.style.display = '';
        } else if (!iImage.value.trim()) {
          iPrev.removeAttribute('src'); iPrev.style.display = 'none';
        }
        if (errEl) errEl.textContent = '';
      });

      // helper required
      function requireField(inputEl) {
        if (!inputEl) return true;
        const v = (inputEl.value || '').trim();
        if (!v) { setInputError(inputEl, 'Hãy nhập đủ thông tin'); return false; }
        clearInputError(inputEl); return true;
      }

      [iName, iType, iPrice, iImage, iDesc].forEach(elm => {
        if (!elm) return;
        elm.addEventListener('input', () => { clearInputError(elm); if (errEl) errEl.textContent = ''; });
        if (elm.tagName === 'SELECT') elm.addEventListener('change', () => { clearInputError(elm); if (errEl) errEl.textContent = ''; });
      });

      el.querySelector('#pd-cancel').onclick = close;

      el.querySelector('#pd-submit').onclick = async () => {
        if (errEl) errEl.textContent = '';

        // validate các trường text/select
        let ok = true;
        ok = requireField(iName)  && ok;
        ok = requireField(iType)  && ok;
        ok = requireField(iPrice) && ok;
        ok = requireField(iDesc)  && ok;

        // Ảnh: bắt buộc có ít nhất 1 (file hoặc URL)
        const hasFile = iFile.files && iFile.files.length > 0;
        const hasUrl  = !!iImage.value.trim();
        if (!hasFile && !hasUrl) {
          setInputError(iImage, 'Ảnh sản phẩm (file hoặc URL) không được để trống.');
          ok = false;
        } else {
          clearInputError(iImage);
        }

        if (!ok) {
          if (errEl) errEl.textContent = 'Vui lòng kiểm tra lại các trường bắt buộc được tô đỏ.';
          return;
        }

        try {
          // chuẩn bị giá trị image:
          let imageValue = iImage.value.trim();
          if (hasFile) {
            // chỉ FE: chuyển file thành data URL (base64) để post qua API JSON hiện có
            imageValue = await fileToDataURL(iFile.files[0]);
          }

          const body = {
            name:  iName.value.trim(),
            type:  iType.value,
            price: Number(iPrice.value),
            image: imageValue,
            description: iDesc.value.trim(),
            active: isEdit ? (data.active !== false) : true
          };

          let res;
          if (isEdit) {
            res = await authFetch(`${API_BASE}/products/${data._id}`, {
              method: 'PUT',
              body: JSON.stringify(body)
            });
          } else {
            res = await authFetch(`${API_BASE}/products`, {
              method: 'POST',
              body: JSON.stringify(body)
            });
          }

          const js = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (errEl) errEl.textContent = js?.message || 'Thao tác thất bại.';
            return;
          }

          close();
          await loadList();
          showInfo(isEdit ? 'Đã lưu sản phẩm.' : 'Đã tạo sản phẩm mới.');
        } catch (e) {
          if (errEl) errEl.textContent = 'Lỗi khi xử lý ảnh hoặc kết nối máy chủ.';
        }
      };
    });
  }

  async function onRowAction(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');
    const item = raw.find(x => x._id === id);
    if (!item) return;

    if (act === 'edit' && canManage) {
      openProductForm('edit', item);
      return;
    }

    if (act === 'toggle' && canManage) {
      showInfo('');
      try {
        const res = await authFetch(`${API_BASE}/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ active: !item.active })
        });
        const d = await res.json().catch(()=> ({}));
        if (!res.ok) {
          showInfo(d?.message || 'Cập nhật trạng thái thất bại.', true);
          return;
        }
        await loadList();
        showInfo('Đã cập nhật trạng thái sản phẩm.');
      } catch {
        showInfo('Lỗi kết nối khi cập nhật trạng thái.', true);
      }
      return;
    }

    if (act === 'del' && canManage) {
      showConfirmDialog('Xoá sản phẩm', `Bạn có chắc muốn xoá sản phẩm "${item.name}"?`, async () => {
        showInfo('');
        try {
          const res = await authFetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
          const d = await res.json().catch(()=> ({}));
          if (!res.ok) {
            showInfo(d?.message || 'Xoá thất bại.', true);
            return;
          }
          await loadList();
          showInfo('Đã xoá sản phẩm.');
        } catch {
          showInfo('Lỗi kết nối khi xoá sản phẩm.', true);
        }
      });
      return;
    }
  }

  // events
  els.q.addEventListener('input', () => { applyFilter(); showInfo(''); });
  els.type.addEventListener('change', () => { applyFilter(); showInfo(''); });
  els.prev.onclick = () => { if (page > 1) { page--; renderTable(); } };
  els.next.onclick = () => {
    const max = Math.ceil(view.length / pageSize) || 1;
    if (page < max) { page++; renderTable(); }
  };

  window.fm_products = {
    reload: () => loadList(),
    create: () => {
      if (!canManage) {
        showInfo('Chỉ Admin/Manager/Staff mới được thêm sản phẩm.', true);
        return;
      }
      openProductForm('create');
    }
  };

  // lần đầu
  loadList();
}

async function renderShowtimesPage(container) {
  // Expose cho toolbar
  window.fm_showtimes = { reload: () => {}, create: () => {} };

  const me = getUser() || {};
  const isAdminRole   = me.role === 'admin';
  const isMgrOrAdmin  = ['admin','manager'].includes(me.role);
  const isStaffAny    = ['admin','manager','staff'].includes(me.role);

  // ====== State ======
  let cinemas = [];       // danh sách rạp (theo quyền)
  let rooms   = [];       // danh sách phòng (cache theo cinema)
  let movies  = [];       // danh sách phim (lọc bỏ archived khi tạo mới)
  let showtimes = [];     // toàn bộ showtime từ API
  let view = [];          // sau khi filter
  let page = 1;
  const pageSize = 6;

  // Bộ lọc
  let filter = {
    cinema: '',                                 // nếu staff có cinema, khóa về cinema đó
    date: new Date().toISOString().slice(0,10), // YYYY-MM-DD (today)
    q: ''
  };

  // ====== UI Skeleton ======
  container.innerHTML = html`
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:nowrap; margin-bottom:8px">
        <h3 style="margin:0">Suất chiếu</h3>
        <!-- ⭐ 3 mục trên CÙNG 1 DÒNG -->
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:nowrap">
          <select id="st-cinema" style="min-width:220px"></select>
          <input id="st-date" type="date" class="fm-date" value="${filter.date}">
          <input id="st-q" class="search" placeholder="Tìm theo tên phim/phòng..." style="width:260px">
        </div>
      </div>

      <div id="st-table" class="table-wrap">
        <div class="muted">Đang tải suất chiếu...</div>
      </div>

      <div style="display:flex; justify-content:space-between; margin-top:10px">
        <div class="muted" id="st-info"></div>
        <div class="pager">
          <button class="btn" id="st-prev">←</button>
          <span id="st-page" class="muted">1</span>
          <button class="btn" id="st-next">→</button>
        </div>
      </div>
    </div>
  `;

  // ===== Elems =====
  const els = {
    table: $('#st-table'),
    info:  $('#st-info'),
    page:  $('#st-page'),
    prev:  $('#st-prev'),
    next:  $('#st-next'),
    cinema: $('#st-cinema'),
    date:   $('#st-date'),
    q:      $('#st-q')
  };

  // ===== Little helpers =====
  const fmtYMD = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  };
  const fmtHM = (d) => {
    const dt = new Date(d);
    return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  };
  const withinDay = (iso, ymd) => {
    if (!iso) return false;
    const start = new Date(`${ymd}T00:00:00`);
    const end   = new Date(`${ymd}T00:00:00`); end.setDate(end.getDate()+1);
    const t = new Date(iso);
    return t >= start && t < end;
  };
  const addMins = (dt, m) => new Date(dt.getTime() + m*60000);

  function showListInfo(msg, isError = false) {
    els.info.textContent = msg || '';
    els.info.classList.toggle('error-text', !!isError);
  }

  // ===== Confirm dialog (đẹp, thay cho confirm()) =====
  function showConfirmDialog(title, message, onConfirm) {
    const markup = html`
      <div class="modal-head"><h3>${title}</h3></div>
      <div class="form"><p style="margin:12px 0">${message}</p></div>
      <div class="modal-foot">
        <button class="btn" id="cf-cancel">Hủy</button>
        <button class="btn danger" id="cf-ok">Xác nhận</button>
      </div>`;
    openModal(markup, ({ el, close }) => {
      el.querySelector('#cf-cancel').onclick = close;
      el.querySelector('#cf-ok').onclick = () => { close(); onConfirm && onConfirm(); };
    });
  }

  // ====== API loads ======
  async function loadCinemasForUser() {
    try {
      // Staff có cinema → chỉ cho rạp đó; Admin/Manager → xem danh sách
      if (me.role === 'staff' && me.cinema && me.cinema._id) {
        const res = await fetch(`${API_BASE}/cinemas/${me.cinema._id}/public`, { cache: 'no-store' });
        const c = await res.json().catch(()=> ({}));
        cinemas = c? [c] : [];
        filter.cinema = c?._id || '';
      } else {
        const res = await authFetch(`${API_BASE}/cinemas?limit=1000`, { cache: 'no-store' });
        const list = await res.json().catch(()=> ({}));
        cinemas = Array.isArray(list) ? list : (Array.isArray(list.items) ? list.items : []);
        if (!filter.cinema && cinemas[0]) filter.cinema = cinemas[0]._id || '';
      }

      // Fill dropdown
      els.cinema.innerHTML = cinemas.map(c =>
        `<option value="${c._id}" ${String(c._id)===String(filter.cinema)?'selected':''}>${c.name}${c.city?' - '+c.city:''}</option>`
      ).join('');
      if (me.role === 'staff') els.cinema.disabled = true; // khoá rạp với staff
    } catch {
      cinemas = [];
      els.cinema.innerHTML = `<option value="">Không tải được rạp</option>`;
    }
  }

  async function loadRoomsByCinema(cinemaId) {
    if (!cinemaId) { rooms = []; return; }
    try {
      const res = await authFetch(`${API_BASE}/rooms?cinema=${cinemaId}&limit=1000`, { cache: 'no-store' });
      const data = await res.json().catch(()=> ({}));
      rooms = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    } catch { rooms = []; }
  }

  async function loadMovies() {
    try {
      const res = await fetch(`${API_BASE}/movies`, { cache: 'no-store' });
      const list = await res.json().catch(()=> ({}));
      movies = Array.isArray(list) ? list : [];
    } catch { movies = []; }
  }

  async function loadShowtimes() {
    els.table.innerHTML = `<div class="muted">Đang tải suất chiếu...</div>`;
    showListInfo('');
    try {
      const res = await fetch(`${API_BASE}/showtimes`, { cache: 'no-store' });
      const list = await res.json().catch(()=> ({}));
      showtimes = Array.isArray(list) ? list : [];
      applyFilterAndRender();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được suất chiếu.</div>`;
      showListInfo('Không tải được danh sách suất chiếu.', true);
    }
  }

  function applyFilterAndRender() {
    const q = (els.q.value||'').trim().toLowerCase();
    view = showtimes
      .filter(s => (!filter.cinema || String(s.cinema?._id||s.cinema)===String(filter.cinema)))
      .filter(s => withinDay(s.start_time, filter.date))
      .filter(s => {
        if (!q) return true;
        const mv = (s.movie?.title||'').toLowerCase();
        const rm = (s.room?.name||'').toLowerCase();
        return mv.includes(q) || rm.includes(q);
      })
      .sort((a,b) => new Date(a.start_time)-new Date(b.start_time));
    page = 1;
    renderTable();
  }

  function renderTable() {
    const total = view.length;
    const start = (page-1)*pageSize;
    const rows = view.slice(start, start+pageSize);

    if (!rows.length) {
      els.table.innerHTML = `<div class="muted">Không có suất chiếu cho bộ lọc hiện tại.</div>`;
    } else {
      els.table.innerHTML = html`
        <table class="table">
          <thead>
            <tr>
              <th>Phim</th>
              <th>Rạp</th>
              <th>Phòng</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Giá vé</th>
              <th>Trạng thái</th>
              <th style="width:220px">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(s => html`
              <tr data-id="${s._id}">
                <td>${s.movie?.title || ''}</td>
                <td>${s.cinema?.name || ''}</td>
                <td>${s.room?.name || ''} ${s.room?.type?`<span class="badge">${s.room.type}</span>`:''}</td>
                <td>${fmtDate(s.start_time)} ${fmtHM(new Date(s.start_time))}</td>
                <td>${fmtDate(s.end_time)} ${fmtHM(new Date(s.end_time))}</td>
                <td>${(s.ticket_price||0).toLocaleString('vi-VN')}đ</td>
                <td>
                  ${s.status === 'scheduled' ? '<span class="badge warn">scheduled</span>' :
                    s.status === 'ongoing'   ? '<span class="badge ok">ongoing</span>' :
                    s.status === 'finished'  ? '<span class="badge muted">finished</span>' :
                                                '<span class="badge muted">cancelled</span>'}
                </td>
                <td>
                  <div class="row-actions">
                    ${isStaffAny ? `<button class="btn" data-act="edit" data-id="${s._id}">Sửa</button>` : ''}
                    ${isAdminRole ? `<button class="btn danger" data-act="del" data-id="${s._id}">Xoá</button>` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      els.table.querySelectorAll('[data-act]').forEach(b => b.onclick = onRowAction);
    }

    els.info.textContent = total
      ? `Hiển thị ${Math.min(start+1,total)}–${Math.min(start+rows.length,total)} / ${total}`
      : '';
    els.page.textContent = String(page);
  }

  // ===== Form Create/Edit (không dùng alert/confirm, validate đỏ & help đẹp) =====
  function openShowtimeForm(mode, dataObj = {}) {
    const isEdit = mode === 'edit';
    const title = isEdit ? 'Sửa suất chiếu' : 'Thêm suất chiếu';
    const currentCinema = (isEdit ? (dataObj.cinema?._id||dataObj.cinema) : filter.cinema) || '';
    const currentRoom   = isEdit ? (dataObj.room?._id||dataObj.room) : '';
    const currentMovie  = isEdit ? (dataObj.movie?._id||dataObj.movie) : '';
    const startISO      = isEdit ? new Date(dataObj.start_time) : new Date();
    const startDate     = fmtYMD(startISO);
    const startTime     = fmtHM(startISO);
    const price         = isEdit ? (dataObj.ticket_price||'') : '';
    const statusVal     = isEdit ? (dataObj.status||'scheduled') : 'scheduled';

    // Chỉ cho chọn status khi edit; khi tạo mới: khoá ở scheduled
    const statusSelect = isEdit ? html`
      <div class="col-6 field">
        <label>Trạng thái *</label>
        <select id="f-status">
          <option value="scheduled" ${statusVal==='scheduled'?'selected':''}>scheduled</option>
          <option value="cancelled" ${statusVal==='cancelled'?'selected':''}>cancelled</option>
        </select>
      </div>` : '';

    const markup = html`
      <div class="modal-head">
        <h3>${title}</h3><div class="spacer"></div>
      </div>
      <div class="form">
        <div class="row">
          <div class="col-6 field">
            <label>Rạp *</label>
            <select id="f-cinema" ${me.role==='staff'?'disabled':''}>
              ${cinemas.map(c => `<option value="${c._id}" ${String(c._id)===String(currentCinema)?'selected':''}>${c.name}${c.city?' - '+c.city:''}</option>`).join('')}
            </select>
          </div>
          <div class="col-6 field">
            <label>Phòng *</label>
            <select id="f-room"><option value="">-- Chọn phòng --</option></select>
          </div>

          <div class="col-12 field">
            <label>Phim *</label>
            <select id="f-movie"><option value="">-- Chọn phim --</option></select>
          </div>

          <div class="col-6 field">
            <label>Ngày bắt đầu *</label>
            <input id="f-date" type="date" class="fm-date" value="${startDate}">
          </div>
          <div class="col-6 field">
            <label>Giờ bắt đầu *</label>
            <input id="f-time" type="time" value="${startTime}">
          </div>

          <div class="col-6 field">
            <label>Giá vé (đ) *</label>
            <input id="f-price" type="number" inputmode="numeric" min="10000" step="1000" value="${price}">
          </div>

          ${statusSelect}

          <div class="col-6 field">
            <label>Giờ kết thúc (tự tính theo thời lượng phim)</label>
            <input id="f-end-readonly" disabled>
          </div>
        </div>
        <div id="f-error" style="margin-top:8px; font-size:13px; color:#f87171;"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">${isEdit ? 'Lưu' : 'Tạo suất chiếu'}</button>
      </div>
    `;

    openModal(markup, ({ el, close }) => {
      const $g = id => el.querySelector('#'+id);
      const iCinema = $g('f-cinema');
      const iRoom   = $g('f-room');
      const iMovie  = $g('f-movie');
      const iDate   = $g('f-date');
      const iTime   = $g('f-time');
      const iPrice  = $g('f-price');
      const iStatus = $g('f-status');
      const iEndRO  = $g('f-end-readonly');
      const iError  = $g('f-error');

      function clearErrAll() {
        [iCinema,iRoom,iMovie,iDate,iTime,iPrice,iStatus].forEach(x => x && clearInputError(x));
        if (iError) iError.textContent = '';
      }

      async function fillRooms(selectedId='') {
        const cid = iCinema?.value || currentCinema;
        await loadRoomsByCinema(cid);
        iRoom.innerHTML = [
          `<option value="">-- Chọn phòng --</option>`,
          ...rooms.map(r => `<option value="${r._id}" ${String(r._id)===String(selectedId)?'selected':''}>${r.name} (${r.type})</option>`)
        ].join('');
      }

      function fillMovies(selectedId='') {
        const items = isEdit ? movies : movies.filter(m => m.status!=='archived');
        iMovie.innerHTML = [
          `<option value="">-- Chọn phim --</option>`,
          ...items.map(m => `<option value="${m._id}" ${String(m._id)===String(selectedId)?'selected':''}>${m.title} ${m.duration?`- ${m.duration}p`:''} ${m.status==='coming'?'(Sắp chiếu)':(m.status==='now_showing'?'(Đang chiếu)':'')}</option>`)
        ].join('');
      }

      function recomputeEndRO() {
        const mv = movies.find(x => String(x._id) === String(iMovie.value));
        const dur = mv?.duration || 120;
        const d = (iDate.value||'').trim();
        const t = (iTime.value||'').trim();
        if (!d || !t) { iEndRO.value=''; return; }
        const start = new Date(`${d}T${t}:00`);
        const end = addMins(start, dur);
        iEndRO.value = `${fmtYMD(end)} ${fmtHM(end)}`;
      }

      (async () => {
        if (!iCinema.value && currentCinema) iCinema.value = currentCinema;
        await fillRooms(currentRoom);
        await loadMovies();
        fillMovies(currentMovie);
        recomputeEndRO();
      })();

      [iCinema].forEach(elm => elm && elm.addEventListener('change', async () => {
        clearErrAll();
        await fillRooms('');
      }));
      [iMovie,iDate,iTime].forEach(elm => elm && elm.addEventListener('input', () => {
        clearInputError(elm); if (iError) iError.textContent=''; recomputeEndRO();
      }));
      if (iStatus) iStatus.addEventListener('change', () => { clearInputError(iStatus); if (iError) iError.textContent=''; });
      iPrice.addEventListener('input', () => { clearInputError(iPrice); if (iError) iError.textContent=''; });

      $g('f-cancel').onclick = close;

      $g('f-submit').onclick = async () => {
        clearErrAll();

        // ===== Validate đỏ (không alert) =====
        let ok = true;
        function req(el, label) {
          const v = (el?.value || '').trim();
          if (!v) { setInputError(el, `${label} không được để trống.`); ok = false; }
          return !!v;
        }
        req(iCinema,'Rạp'); req(iRoom,'Phòng'); req(iMovie,'Phim'); req(iDate,'Ngày'); req(iTime,'Giờ'); req(iPrice,'Giá vé');

        const priceNum = Number(iPrice.value);
        if (!Number.isFinite(priceNum) || priceNum < 10000 || priceNum > 1000000) {
          setInputError(iPrice, 'Giá vé phải từ 10.000–1.000.000');
          ok = false;
        }

        // Không cho scheduled bắt đầu quá khứ khi tạo mới
        const start = new Date(`${iDate.value}T${iTime.value}:00`);
        if (!isEdit) {
          const now = new Date();
          if (start.getTime() < now.getTime() - 10*60000) {
            setInputError(iTime, 'Giờ bắt đầu phải ở hiện tại hoặc tương lai gần');
            ok = false;
          }
        }

        // coming trước ngày phát hành → lỗi
        const mv = movies.find(x => String(x._id)===String(iMovie.value));
        if (mv?.status === 'coming' && mv.release_date) {
          const rel = new Date(mv.release_date);
          if (start < rel) {
            setInputError(iDate, 'Ngày bắt đầu phải sau ngày phát hành của phim');
            ok = false;
          }
        }

        if (!ok) {
          if (iError) iError.textContent = 'Vui lòng kiểm tra các trường được tô đỏ.';
          return;
        }

        const startISO = `${iDate.value}T${iTime.value}:00+07:00`;
        const duration = mv?.duration || 120;
        const endISO   = new Date(new Date(startISO).getTime() + duration*60000).toISOString();

        const body = {
          movie:  iMovie.value,
          cinema: me.role==='staff' ? (me.cinema?._id || iCinema.value) : iCinema.value,
          room:   iRoom.value,
          start_time: startISO,
          end_time: endISO,
          ticket_price: priceNum
        };
        if (isEdit && iStatus) body.status = iStatus.value;

        try {
          let res, json;
          if (isEdit) {
            res = await authFetch(`${API_BASE}/showtimes/${dataObj._id}`, { method:'PUT', body: JSON.stringify(body) });
          } else {
            res = await authFetch(`${API_BASE}/showtimes`, { method:'POST', body: JSON.stringify(body) });
          }
          json = await res.json().catch(()=> ({}));

          if (!res.ok) {
            // Lỗi trùng/buffer từ BE
            if (json?.conflict) {
              const endBuf = json.conflict.end_plus_buffer ? new Date(json.conflict.end_plus_buffer) : null;
              const msg = `Suất chiếu trùng/vi phạm buffer ${json.buffer_min || 30} phút.` +
                          (endBuf ? ` Suất trước kết thúc (sau buffer): ${fmtYMD(endBuf)} ${fmtHM(endBuf)}.` : '');
              if (iError) iError.textContent = msg;
              setInputError(iTime, msg);
            } else {
              if (iError) iError.textContent = json?.message || (isEdit ? 'Cập nhật không thành công.' : 'Tạo không thành công.');
            }
            return;
          }

          close();
          await loadShowtimes();
          showListInfo(isEdit ? 'Đã lưu thay đổi suất chiếu.' : 'Đã tạo suất chiếu.');
        } catch {
          if (iError) iError.textContent = 'Lỗi kết nối máy chủ.';
        }
      };
    });
  }

  // ===== Row actions =====
  async function onRowAction(e) {
    const id  = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');
    const s   = showtimes.find(x => x._id === id);
    if (!s) return;

    if (act === 'edit') {
      if (!isStaffAny) { showListInfo('Chỉ Admin/Manager/Staff.', true); return; }
      try {
        const res = await fetch(`${API_BASE}/showtimes/${id}`, { cache: 'no-store' });
        const one = await res.json().catch(()=> ({}));
        if (!res.ok) { showListInfo(one?.message || 'Không tải được dữ liệu để sửa.', true); return; }
        openShowtimeForm('edit', one);
      } catch { showListInfo('Lỗi mạng khi tải dữ liệu.', true); }
      return;
    }

    if (act === 'del') {
      if (!isAdminRole) { showListInfo('Chỉ Admin mới được xoá suất chiếu.', true); return; }
      showConfirmDialog('Xoá suất chiếu', 'Bạn có chắc muốn xoá suất chiếu này?', async () => {
        try {
          const res = await authFetch(`${API_BASE}/showtimes/${id}`, { method:'DELETE' });
          const d = await res.json().catch(()=> ({}));
          if (!res.ok) { showListInfo(d?.message || 'Xoá không thành công.', true); return; }
          await loadShowtimes();
          showListInfo('Đã xoá 1 suất chiếu.');
        } catch { showListInfo('Lỗi mạng khi xoá.', true); }
      });
      return;
    }
  }

  // ===== Events =====
  els.cinema.addEventListener('change', () => {
    filter.cinema = els.cinema.value;
    applyFilterAndRender();
  });
  els.date.addEventListener('change', () => {
    filter.date = els.date.value || new Date().toISOString().slice(0,10);
    applyFilterAndRender();
  });
  els.q.addEventListener('input', () => { filter.q = els.q.value; applyFilterAndRender(); });

  els.prev.onclick = () => { if (page>1) { page--; renderTable(); } };
  els.next.onclick = () => {
    const max = Math.ceil(view.length / pageSize) || 1;
    if (page<max) { page++; renderTable(); }
  };

  // Toolbar hooks (❌ bỏ alert, dùng thông báo đẹp)
  window.fm_showtimes.reload = () => loadShowtimes();
  window.fm_showtimes.create = () => {
    if (!isStaffAny) { showListInfo('Chỉ Admin/Manager/Staff được tạo suất chiếu.', true); return; }
    openShowtimeForm('create');
  };

  // ===== First load =====
  await loadCinemasForUser();
  await loadRoomsByCinema(filter.cinema);
  await loadMovies();
  await loadShowtimes();
}

async function renderVoucherPage(container) {
  // Expose cho toolbar
  window.fm_vouchers = { reload: () => {}, create: () => {} };

  const me = getUser() || {};
  const isAdmin = me.role === 'admin';

  // ===== State =====
  let page = 1;
  const pageSize = 8;
  let total = 0;
  let items = [];
  let q = '';

  // ===== UI =====
  container.innerHTML = html`
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:8px">
        <h3 style="margin:0">Voucher</h3>
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          <input id="vc-q" class="search" placeholder="Tìm theo mã voucher..." style="width:260px">
        </div>
      </div>

      <div id="vc-table" class="table-wrap">
        <div class="muted">Đang tải voucher...</div>
      </div>

      <div style="display:flex; justify-content:space-between; margin-top:10px">
        <div class="muted" id="vc-info"></div>
        <div class="pager">
          <button class="btn" id="vc-prev">←</button>
          <span id="vc-page" class="muted">1</span>
          <button class="btn" id="vc-next">→</button>
        </div>
      </div>
    </div>
  `;

  // ===== style: icon lịch =====
  const __dateStyle = document.createElement('style');
  __dateStyle.textContent = `
    input[type="date"].fm-date { color-scheme: dark; }
    input[type="date"].fm-date::-webkit-calendar-picker-indicator{
      filter: brightness(0) invert(1);
      opacity: 1;
    }
  `;
  container.appendChild(__dateStyle);

  const els = {
    q:    $('#vc-q'),
    tb:   $('#vc-table'),
    info: $('#vc-info'),
    pg:   $('#vc-page'),
    prev: $('#vc-prev'),
    next: $('#vc-next')
  };

  // ===== Helpers =====
  function badgeScope(s){
    if (s==='seat')  return '<span class="badge">seat</span>';
    if (s==='combo') return '<span class="badge warn">combo</span>';
    return '<span class="badge ok">order</span>';
  }
  const fmtYMD = (d) => {
    if (!d) return '';
    const dt = new Date(d); if (isNaN(dt)) return '';
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
  };
  const ymd = (d) => {
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  };
  const startOfDayISO7 = (dStr) => dStr ? `${dStr}T00:00:00+07:00` : null;
  const endOfDayISO7   = (dStr) => dStr ? `${dStr}T23:59:59+07:00` : null;

  // confirm đẹp
  function showConfirmDialog(title, message, onConfirm) {
    const markup = html`
      <div class="modal-head"><h3>${title}</h3></div>
      <div class="form"><p style="margin:12px 0">${message}</p></div>
      <div class="modal-foot">
        <button class="btn" id="cf-cancel">Hủy</button>
        <button class="btn danger" id="cf-ok">Xác nhận</button>
      </div>`;
    openModal(markup, ({ el, close }) => {
      el.querySelector('#cf-cancel').onclick = close;
      el.querySelector('#cf-ok').onclick = () => { close(); onConfirm && onConfirm(); };
    });
  }

  // ===== LIST (public) =====
  async function loadList(){
    els.tb.innerHTML = `<div class="muted">Đang tải voucher...</div>`;
    els.info.textContent = '';
    try{
      const res = await authFetch(`${API_BASE}/vouchers/public?q=${encodeURIComponent(q)}&page=${page}&limit=${pageSize}`, { cache:'no-store' });
      const d = await res.json().catch(()=>({}));
      items = Array.isArray(d.items) ? d.items : [];
      total = Number.isFinite(d.total) ? d.total : items.length;
      renderTable();
    }catch{
      els.tb.innerHTML = `<div class="muted">Không tải được voucher.</div>`;
      els.info.textContent = 'Lỗi khi tải voucher.';
    }
  }

  function renderTable(){
    if (!items.length){
      els.tb.innerHTML = `<div class="muted">Không có voucher phù hợp.</div>`;
    }else{
      els.tb.innerHTML = html`
        <table class="table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Phạm vi</th>
              <th>Loại</th>
              <th>Giá trị</th>
              <th>Tối đa giảm</th>
              <th>Đơn tối thiểu</th>
              <th>Hiệu lực</th>
              <th>Dùng / Giới hạn</th>
              <th style="width:260px">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(v => {
              const val = v.type==='percent' ? `${v.value}%` : `${(v.value||0).toLocaleString('vi-VN')}đ`;
              const cap = (v.type==='percent' && v.max_discount != null)
                ? `${Number(v.max_discount).toLocaleString('vi-VN')}đ`
                : '—';
              const min = (v.min_total!==undefined && v.min_total!==null)
                ? `${Number(v.min_total).toLocaleString('vi-VN')}đ`
                : '—';
              const end = v.end_date ? fmtYMD(v.end_date) : '—';
              const used = `${v.used_count||0} / ${v.usage_limit||'∞'}`;
              return html`
                <tr data-code="${v.code}">
                  <td><code>${v.code}</code></td>
                  <td>${badgeScope(v.scope)}</td>
                  <td>${v.type}</td>
                  <td>${val}</td>
                  <td>${cap}</td>
                  <td>${min}</td>
                  <td>đến ${end}</td>
                  <td>${used}</td>
                  <td>
                    <div class="row-actions">
                      <button class="btn" data-act="validate" data-code="${v.code}">Kiểm tra</button>
                      ${isAdmin ? `<button class="btn" data-act="edit" data-code="${v.code}">Sửa</button>` : ''}
                      ${isAdmin ? `<button class="btn danger" data-act="del" data-code="${v.code}">Xoá</button>` : ''}
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      `;
      els.tb.querySelectorAll('[data-act]').forEach(b => b.onclick = onRowAction);
    }
    const maxPg = Math.max(1, Math.ceil(total / pageSize));
    els.pg.textContent = `${page} / ${maxPg}`;
    els.info.textContent = total ? `Tổng ${total} voucher đang hoạt động` : '';
  }

  // detail theo code (để lấy _id PUT/DELETE)
  async function fetchVoucherDetailByCode(code){
    const res = await authFetch(`${API_BASE}/vouchers/${encodeURIComponent(code)}/validate`, { cache:'no-store' });
    const d = await res.json().catch(()=>({}));
    if (!res.ok || !d.voucher) throw new Error(d?.message || 'Không tải được chi tiết voucher.');
    return d.voucher;
  }

  async function onRowAction(e){
    const code = e.currentTarget.getAttribute('data-code');
    const act  = e.currentTarget.getAttribute('data-act');
    if (!code) return;

    if (act === 'validate'){
      try{
        const res = await fetch(`${API_BASE}/vouchers/${encodeURIComponent(code)}/validate`, { cache:'no-store' });
        const d = await res.json().catch(()=>({}));
        const ok = !!d.valid;
        const v  = d.voucher || {};
        const msg = ok
          ? `Mã <b>${code}</b> <span style="color:#22c55e">hợp lệ</span>. Đã dùng: ${v.used_count||0}/${v.usage_limit||'∞'}.`
          : `Mã <b>${code}</b> <span style="color:#ef4444">không hợp lệ</span> hoặc đã hết hạn.`;
        showToast?.(msg, ok ? 'ok' : 'err', 'Kiểm tra Voucher');
      }catch{
        showToast?.('Không kiểm tra được voucher.', 'err');
      }
      return;
    }

    if (act === 'edit' && isAdmin){
      try{
        const full = await fetchVoucherDetailByCode(code);
        openVoucherForm('edit', full);
      }catch(err){
        els.info.textContent = err.message || 'Không mở được form chỉnh sửa.';
      }
      return;
    }

    if (act === 'del' && isAdmin){
      showConfirmDialog('Xoá voucher', `Bạn chắc muốn xoá mã <b>${code}</b>?`, async () => {
        try{
          const full = await fetchVoucherDetailByCode(code);
          const res = await authFetch(`${API_BASE}/vouchers/${full._id}`, { method:'DELETE' });
          const d = await res.json().catch(()=>({}));
          if (!res.ok){ els.info.textContent = d?.message || 'Xoá voucher thất bại.'; return; }
          showToast?.(`Đã xoá voucher <b>${code}</b>.`, 'ok');
          await loadList();
        }catch{
          els.info.textContent = 'Lỗi kết nối khi xoá voucher.';
        }
      });
      return;
    }
  }

  // ===== Form Create/Edit =====
  function openVoucherForm(mode='create', data=null){
    const isEdit = (mode==='edit');
    const V = data || {};
    const usedCount = Number(V.used_count || 0);

    const markup = html`
      <div class="modal-head"><h3>${isEdit?'Sửa Voucher':'Thêm Voucher'}</h3><div class="spacer"></div></div>
      <div class="form">
        <div class="row">
          <div class="col-6 field"><label>Mã voucher *</label><input id="v-code" placeholder="VD: SUMMER50" value="${(V.code||'').toUpperCase()}" ${isEdit?'disabled':''}></div>
          <div class="col-6 field"><label>Phạm vi *</label>
            <select id="v-scope">
              <option value="">-- Chọn --</option>
              <option value="seat"  ${V.scope==='seat'?'selected':''}>seat</option>
              <option value="combo" ${V.scope==='combo'?'selected':''}>combo</option>
              <option value="order" ${V.scope==='order'?'selected':''}>order</option>
            </select>
          </div>
          <div class="col-6 field"><label>Loại giảm giá *</label>
            <select id="v-type">
              <option value="">-- Chọn --</option>
              <option value="percent" ${V.discount_type==='percent'?'selected':''}>percent (%)</option>
              <option value="amount"  ${V.discount_type==='amount'?'selected':''}>amount (đ)</option>
            </select>
          </div>
          <div class="col-6 field"><label>Giá trị *</label><input id="v-value" type="number" min="1" step="1" placeholder="VD: 10 hoặc 20000" value="${V.value ?? ''}"></div>
          <div class="col-6 field"><label>Giảm tối đa (bắt buộc nếu %)</label><input id="v-max" type="number" min="1" step="1000" placeholder="VD: 30000" value="${V.max_discount ?? ''}"></div>
          <div class="col-6 field"><label>Đơn tối thiểu *</label><input id="v-min" type="number" min="0" step="1000" placeholder="VD: 100000" value="${V.min_order ?? ''}"></div>
          <div class="col-6 field"><label>Ngày bắt đầu *</label><input id="v-start" type="date" class="fm-date" value="${V.start_date ? ymd(new Date(V.start_date)) : ''}"></div>
          <div class="col-6 field"><label>Ngày kết thúc *</label><input id="v-end" type="date" class="fm-date" value="${V.end_date ? ymd(new Date(V.end_date)) : ''}"></div>
          <div class="col-6 field"><label>Giới hạn lượt dùng</label><input id="v-limit" type="number" min="0" step="1" placeholder="0 = không giới hạn" value="${V.usage_limit ?? 0}"></div>
          <div class="col-6 field"><label>Trạng thái</label>
            <select id="v-active">
              <option value="true"  ${(V.active ?? true) ? 'selected':''}>active</option>
              <option value="false" ${!(V.active ?? true) ? 'selected':''}>inactive</option>
            </select>
          </div>
        </div>
        <div id="v-err" style="margin-top:8px;font-size:13px;color:#f87171;"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="v-cancel">Hủy</button>
        <button class="btn primary" id="v-submit">${isEdit?'Lưu':'Tạo voucher'}</button>
      </div>
    `;

    openModal(markup, ({ el, close }) => {
      const $g = id => el.querySelector('#'+id);
      const iCode=$g('v-code'), iScope=$g('v-scope'), iType=$g('v-type'), iVal=$g('v-value'),
            iMax=$g('v-max'), iMin=$g('v-min'), iStart=$g('v-start'), iEnd=$g('v-end'),
            iLim=$g('v-limit'), iAct=$g('v-active'), iErr=$g('v-err');

      // đặt min = hôm nay, không cho chọn quá khứ
      const today = ymd(new Date());
      iStart.setAttribute('min', today);
      iEnd.setAttribute('min', today);

      // bật/tắt trường max theo type, và bắt buộc nếu percent
      function syncMaxInput(){
        const t = iType.value;
        if (t === 'amount'){
          iMax.disabled = true;
          iMax.value = '';
          iMax.placeholder = 'Không áp dụng cho amount';
          clearInputError(iMax);
        } else {
          iMax.disabled = false;
          iMax.placeholder = 'Bắt buộc khi %';
        }
      }
      syncMaxInput();
      iType.addEventListener('change', syncMaxInput);

      // helpers validate cục bộ
      function requireField(inputEl, label){
        const v = (inputEl?.value ?? '').toString().trim();
        if (v === '') { setInputError(inputEl, `${label} không được để trống.`); return false; }
        clearInputError(inputEl); return true;
      }
      function clearAll(){
        [iCode,iScope,iType,iVal,iMax,iMin,iStart,iEnd,iLim,iAct].forEach(x=>x&&clearInputError(x));
        if(iErr) iErr.textContent='';
      }
      ['input','change'].forEach(ev=>{
        [iCode,iScope,iType,iVal,iMax,iMin,iStart,iEnd,iLim,iAct].forEach(x=>x&&x.addEventListener(ev,()=>{ clearInputError(x); if(iErr) iErr.textContent=''; }));
      });

      $g('v-cancel').onclick = close;

      $g('v-submit').onclick = async () => {
        clearAll();
        let ok = true;

        ok = requireField(iCode,'Mã voucher') && ok;
        ok = requireField(iScope,'Phạm vi') && ok;
        ok = requireField(iType,'Loại giảm') && ok;
        ok = requireField(iVal,'Giá trị') && ok;
        ok = requireField(iMin,'Đơn tối thiểu') && ok;
        ok = requireField(iStart,'Ngày bắt đầu') && ok;
        ok = requireField(iEnd,'Ngày kết thúc') && ok;

        const code = (iCode.value||'').trim().toUpperCase();
        if (!/^[A-Z0-9_-]{3,32}$/.test(code)){ setInputError(iCode,'Mã chỉ gồm A-Z, số, -, _, 3–32 ký tự'); ok=false; }

        const type = iType.value;
        const valueNum = Number(iVal.value);
        if (!Number.isFinite(valueNum) || valueNum<=0){ setInputError(iVal,'Giá trị phải > 0'); ok=false; }
        if (type==='percent' && (valueNum<1 || valueNum>100)){ setInputError(iVal,'% phải trong 1–100'); ok=false; }
        if (type==='amount' && valueNum<1000){ setInputError(iVal,'Số tiền tối thiểu 1.000đ'); ok=false; }

        // max_discount: BẮT BUỘC nếu percent, >0
        let maxNum = null;
        if (type === 'percent'){
          if (!requireField(iMax, 'Giảm tối đa')) ok=false;
          maxNum = Number(iMax.value);
          if (!Number.isFinite(maxNum) || maxNum <= 0){ setInputError(iMax,'Giảm tối đa phải > 0'); ok=false; }
        } else {
          if (iMax.value) { setInputError(iMax,'Không dùng “Giảm tối đa” cho amount'); ok=false; }
        }

        // min_order: bắt buộc và ≥ 0
        const minNum = Number(iMin.value);
        if (!Number.isFinite(minNum) || minNum < 0){ setInputError(iMin,'Đơn tối thiểu phải ≥ 0'); ok=false; }

        // ngày: bắt buộc, không quá khứ, end ≥ start
        const start = (iStart.value||'').trim();
        const end   = (iEnd.value||'').trim();
        const todayDate = new Date(today);
        const dStart = start ? new Date(start) : null;
        const dEnd   = end   ? new Date(end)   : null;

        if (dStart && dStart < new Date(today + 'T00:00:00')) { setInputError(iStart,'Không được chọn ngày quá khứ'); ok=false; }
        if (dEnd   && dEnd   < new Date(today + 'T00:00:00')) { setInputError(iEnd,'Không được chọn ngày quá khứ'); ok=false; }
        if (dStart && dEnd && dEnd < dStart){ setInputError(iEnd,'Ngày kết thúc phải ≥ ngày bắt đầu'); ok=false; }

        const limit = iLim.value ? Number(iLim.value) : 0;
        if (!Number.isFinite(limit) || limit<0){ setInputError(iLim,'Giới hạn không hợp lệ'); ok=false; }
        if (isEdit && limit > 0 && usedCount > 0 && limit < usedCount){
          setInputError(iLim, `Giới hạn không được nhỏ hơn số lượt đã dùng (${usedCount})`); ok = false;
        }

        if (!ok){ iErr.textContent = 'Vui lòng kiểm tra các trường được tô đỏ.'; return; }

        // payload
        const body = {
          scope: iScope.value,
          discount_type: type,
          value: valueNum,
          max_discount: (type==='percent' ? maxNum : null),
          min_order: minNum,
          start_date: startOfDayISO7(start),
          end_date:   endOfDayISO7(end),
          usage_limit: limit || 0,
          active: iAct.value === 'true'
        };
        if (!isEdit) body.code = code;

        try{
          let res;
          if (isEdit){
            res = await authFetch(`${API_BASE}/vouchers/${V._id}`, { method:'PUT', body: JSON.stringify(body) });
          }else{
            res = await authFetch(`${API_BASE}/vouchers`, { method:'POST', body: JSON.stringify(body) });
          }
          const data = await res.json().catch(()=>({}));

          if (!res.ok){
            let msg = data?.message || (isEdit ? 'Cập nhật voucher thất bại.' : 'Tạo voucher thất bại.');
            if (String(msg).toLowerCase().includes('duplicate') || String(msg).includes('E11000')){
              msg = 'Mã voucher đã tồn tại. Hãy dùng mã khác.'; setInputError(iCode, msg);
            }
            iErr.textContent = msg; return;
          }

          close();
          showToast?.(`${isEdit?'Đã lưu thay đổi':'Đã tạo'} voucher <b>${code}</b>.`, 'ok');
          page = 1; await loadList();
        }catch{
          iErr.textContent = 'Lỗi kết nối máy chủ.';
        }
      };
    });
  }

  // ===== Events =====
  els.q.addEventListener('input', () => { q = els.q.value.trim(); page = 1; loadList(); });
  els.prev.onclick = () => { const maxPg = Math.max(1, Math.ceil(total / pageSize)); if (page>1){ page--; loadList(); } };
  els.next.onclick = () => { const maxPg = Math.max(1, Math.ceil(total / pageSize)); if (page<maxPg){ page++; loadList(); } };

  window.fm_vouchers.reload = () => loadList();
  window.fm_vouchers.create = () => {
    if (!isAdmin) { els.info.textContent = 'Chỉ Admin mới thêm voucher.'; return; }
    openVoucherForm('create');
  };

  await loadList();
}











