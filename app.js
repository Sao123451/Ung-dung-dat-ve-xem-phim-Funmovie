const API_BASE = window.FM_CONFIG.API_BASE;
function apiOrigin() {
  try {
    const u = new URL(API_BASE);        // ví dụ: http://localhost:3000/api
    return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}`; // -> http://localhost:3000
  } catch { return ''; }
}
function toAbsImage(u) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;      // đã absolute
  const origin = apiOrigin();                  // lấy origin từ API_BASE
  return origin + (u.startsWith('/') ? '' : '/') + u.replace(/^(\.\/)+/, '');
}


// Helpers
const $ = (s, r = document) => r.querySelector(s);
const saveToken = (t) => localStorage.setItem('fm_token', t);
const getToken = () => localStorage.getItem('fm_token');
const saveUser = (u) => localStorage.setItem('fm_user', JSON.stringify(u));
const getUser = () => { try { return JSON.parse(localStorage.getItem('fm_user') || 'null'); } catch { return null; } };

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
  const v = (inputEl.value || '').trim();
  if (!v) {
    setInputError(inputEl, `${label} không được để trống.`);
    return false;
  }
  clearInputError(inputEl);
  return true;
}

// clear lỗi khi gõ lại
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    clearInputError(el);
  }
});


// Quyền
const isAdmin = () => getUser()?.role === 'admin';

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


const authFetch = (url, options = {}) => {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
};

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
    if (!user || !['admin', 'manager'].includes(user.role)) {
      setFieldError(uEl, true);
      showHelp('Tài khoản không có quyền truy cập Admin.', true);
      btn.disabled = false;
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
  const tpl = $('#tpl-app'); const root = $('#root');
  root.innerHTML = ''; root.append(tpl.content.cloneNode(true));

  const navItems = ['Dashboard', 'Phim', 'Suất chiếu', 'Banner', 'Voucher', 'Người dùng', 'Tin tức'];
  const nav = $('#nav');
  const btnRefresh = $('#btn-refresh');
  const btnCreate = $('#btn-create');

  const me = getUser();
  if (!me || !['admin', 'manager'].includes(me.role)) return logout();

  function updateToolbarFor(label) {
    const me = getUser();
    btnRefresh.disabled = false;

    let showCreate = false;
    let createText = '+ Thêm mới';

    if (label === 'Phim' && me.role === 'admin') { showCreate = true; createText = '+ Thêm phim'; }
    if (label === 'Banner' && ['admin', 'manager'].includes(me.role)) { showCreate = true; createText = '+ Thêm banner'; }
    if (label === 'Tin tức' && ['admin', 'manager'].includes(me.role)) { showCreate = true; createText = '+ Thêm tin'; }

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
  } else if (label === 'Người dùng') {
    renderUserList(page);
  } else if (label === 'Banner') {
    renderBannersPage(page);
  } else if (label === 'Tin tức') {
    // ➜ Trang tin tức (list + CRUD + publish)
    renderNewsPage(page);
  } else {
    page.innerHTML = `<div class="card">Trang <b>${label}</b> đang phát triển.</div>`;
  }
}


async function renderUserList(container) {
  // expose API cho toolbar trước
  window.fm_users = { reload: () => { } };

  const me = getUser();
  if (!me || me.role !== 'admin') {
    container.innerHTML = `<div class="card">Chỉ Admin mới truy cập được trang này.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px">
        <h3 style="margin:0">Người dùng</h3>
        <div style="display:flex; gap:8px">
          <input id="usr-q" class="search" placeholder="Tìm username/email..." style="width:260px">
        </div>
      </div>
      <div id="usr-table" class="table-wrap">
        <div class="muted">Đang tải người dùng...</div>
      </div>

      <div class="card" style="margin-top:12px">
        <h3 style="margin:0 0 8px">Tạo tài khoản nhân sự</h3>
        <div class="form">
          <div class="row">
            <div class="col-6"><label>Username</label><input id="cu-username"/></div>
            <div class="col-6"><label>Email</label><input id="cu-email"/></div>
            <div class="col-6"><label>Mật khẩu</label><input id="cu-password" type="password" placeholder="≥8 ký tự"/></div>
            <div class="col-6"><label>Họ tên</label><input id="cu-fullname"/></div>
            <div class="col-6"><label>SĐT</label><input id="cu-phone" type="text" maxlength="10" oninput="this.value=this.value.replace(/[^0-9]/g,'')"/></div>
            <div class="col-6">
              <label>Vai trò</label>
              <select id="cu-role">
                <option value="staff">staff</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div class="col-6"><label>Ngày sinh (tùy chọn)</label><input id="cu-birth" type="date"/></div>
          </div>
          <div class="row">
            <div class="col-6"><button class="btn primary" id="btn-create-user">Tạo tài khoản</button></div>
            <div class="col-6" style="text-align:right"><span class="help" id="cu-help"></span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const els = {
    q: $('#usr-q'),
    table: $('#usr-table'),
    help: $('#cu-help')
  };

  let raw = [];
  let view = [];

  const phoneRegex = /^[0-9]{10}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải người dùng...</div>`;
    try {
      const res = await authFetch(`${API_BASE}/users`, { cache: 'no-store' });
      const list = await res.json();
      if (!Array.isArray(list)) throw new Error('Bad response');
      raw = list;
      applyFilter();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được người dùng.</div>`;
    }
  }

  function applyFilter() {
    const q = (els.q.value || '').trim().toLowerCase();
    view = !q ? raw.slice() : raw.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
    renderTable();
  }

  function badgeStatus(s) {
    if (s === 'disabled') return '<span class="badge muted">disabled</span>';
    return '<span class="badge ok">active</span>';
    // (Bạn có thể thêm badge warn cho trạng thái khác nếu cần)
  }

  function renderTable() {
    if (!view.length) {
      els.table.innerHTML = `<div class="muted">Không có người dùng.</div>`;
      return;
    }
    els.table.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Username</th><th>Email</th><th>Họ tên</th><th>Role</th><th>Trạng thái</th><th style="width:240px">Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${view.map(u => `
            <tr data-id="${u._id}">
              <td>${u.username || ''}</td>
              <td>${u.email || ''}</td>
              <td>${u.full_name || ''}</td>
              <td>${u.role || ''}</td>
              <td>${badgeStatus(u.status)}</td>
              <td>
                <div class="row-actions">
                  <button class="btn" data-act="edit" data-id="${u._id}">Sửa</button>
                  ${u.status === 'disabled'
        ? `<button class="btn" data-act="restore" data-id="${u._id}">Khôi phục</button>`
        : `<button class="btn danger" data-act="del" data-id="${u._id}">Xoá</button>`
      }
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    els.table.querySelectorAll('[data-act]').forEach(b => b.onclick = onUserRowAction);
  }

  function openEditUserForm(user) {
    const htmlForm = html`
      <div class="modal-head"><h3>Sửa người dùng</h3><div class="spacer"></div></div>
      <div class="form">
        <div class="row">
          <div class="col-6 field"><label>Username</label><input id="eu-username" value="${user.username || ''}" disabled></div>
          <div class="col-6 field"><label>Email *</label><input id="eu-email" value="${user.email || ''}"></div>
          <div class="col-6 field"><label>Họ tên *</label><input id="eu-fullname" value="${user.full_name || ''}"></div>
          <div class="col-6 field"><label>SĐT *</label><input id="eu-phone" type="text" maxlength="10" value="${user.phone || ''}" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
          <div class="col-6 field"><label>Ngày sinh</label><input id="eu-birth" type="date" value="${user.birth_date || ''}"></div>
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
      </div>
      <div class="modal-foot">
        <button class="btn" id="eu-cancel">Hủy</button>
        <button class="btn primary" id="eu-submit">Lưu</button>
      </div>
    `;

    openModal(htmlForm, ({ el, close }) => {
      const $g = id => el.querySelector(`#${id}`);

      el.querySelector('#eu-cancel').onclick = close;
      el.querySelector('#eu-submit').onclick = async () => {
        const email = $g('eu-email').value.trim();
        const full = $g('eu-fullname').value.trim();
        const phone = $g('eu-phone').value.trim();
        const role = $g('eu-role').value;
        const avatar = $g('eu-avatar').value.trim();
        const birth = $g('eu-birth').value;
        const status = $g('eu-status').value;

        // Validate
        if (!email || !emailRegex.test(email)) { alert('Email không hợp lệ.'); $g('eu-email').focus(); return; }
        if (!full) { alert('Họ tên không được để trống.'); $g('eu-fullname').focus(); return; }
        if (!phoneRegex.test(phone)) { alert('SĐT phải đúng 10 chữ số.'); $g('eu-phone').focus(); return; }
        if (!role) { alert('Vai trò không được để trống.'); $g('eu-role').focus(); return; }

        // Admin có thể sửa mọi field (trừ password)
        const body = { email, full_name: full, phone, role, avatar, status };
        if (birth) body.birth_date = birth;

        try {
          const res = await authFetch(`${API_BASE}/users/${user._id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { alert(data?.message || 'Cập nhật thất bại'); return; }
          close();
          await loadList();
          alert('Đã lưu thay đổi.');
        } catch {
          alert('Lỗi kết nối.');
        }
      };
    });
  }

  async function onUserRowAction(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');
    const user = raw.find(u => u._id === id);
    if (!user) return;

    if (act === 'edit') {
      openEditUserForm(user);
      return;
    }

    if (act === 'del') {
      if (!confirm('Bạn chắc muốn xoá người dùng này? (Nếu backend không hỗ trợ DELETE, hệ thống sẽ vô hiệu hoá tài khoản)')) return;

      // Thử DELETE trước
      try {
        const res = await authFetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await loadList();
          alert('Đã xoá người dùng.');
          return;
        }
        // Nếu không ok → xoá mềm (status='disabled')
      } catch {/* bỏ qua và fallback */ }

      // Soft delete: set status = 'disabled'
      try {
        const res2 = await authFetch(`${API_BASE}/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'disabled' })
        });
        const data2 = await res2.json().catch(() => ({}));
        if (!res2.ok) { alert(data2?.message || 'Vô hiệu hoá thất bại'); return; }
        await loadList();
        alert('Đã vô hiệu hoá tài khoản.');
      } catch {
        alert('Lỗi kết nối.');
      }
      return;
    }

    if (act === 'restore') {
      try {
        const res = await authFetch(`${API_BASE}/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'active' })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { alert(data?.message || 'Khôi phục thất bại'); return; }
        await loadList();
        alert('Đã khôi phục tài khoản.');
      } catch {
        alert('Lỗi kết nối.');
      }
      return;
    }
  }

  // Tạo tài khoản (chỉ admin)
  document.getElementById('btn-create-user').onclick = onCreateUserSubmit;

  // Tìm kiếm
  els.q.addEventListener('input', applyFilter);
  els.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyFilter(); });

  window.fm_users.reload = () => loadList();

  // Lần đầu
  loadList();
}



async function onCreateUserSubmit() {
  const me = getUser();
  if (!me || me.role !== 'admin') {
    alert('Chỉ Admin được phép tạo tài khoản.');
    return;
  }

  const get = (id) => document.getElementById(id);
  const required = (id, label) => {
    const el = get(id);
    const val = (el?.value || '').trim();
    if (!val) {
      alert(`${label} không được để trống`);
      el?.classList.add('input-error');
      el?.focus();
      return null;
    }
    el.classList.remove('input-error');
    return val;
  };

  const username = required('cu-username', 'Username');
  const email = required('cu-email', 'Email');
  const password = required('cu-password', 'Mật khẩu');
  const full_name = required('cu-fullname', 'Họ tên');
  const phone = required('cu-phone', 'SĐT');
  const role = required('cu-role', 'Vai trò');

  if (!username || !email || !password || !full_name || !phone || !role) return;

  // ✅ Validate mật khẩu
  if (password.length < 8) {
    alert('Mật khẩu phải ≥ 8 ký tự');
    get('cu-password').focus();
    return;
  }

  // ✅ Validate số điện thoại chỉ chứa số và đúng 10 số
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    alert('Số điện thoại phải gồm đúng 10 chữ số!');
    get('cu-phone').focus();
    return;
  }

  const birth_date = (get('cu-birth')?.value || '').trim();

  const body = { username, email, password, full_name, phone, role };
  if (birth_date) body.birth_date = birth_date;

  const help = $('#cu-help');
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
    const btn = [...document.querySelectorAll('.nav button')].find(b => b.textContent === 'Người dùng');
    if (btn) selectPage('Người dùng', btn);
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
}

function createEntityForCurrentPage() {
  const label = $('#page-title')?.textContent?.trim();
  const me = getUser();

  if (label === 'Phim') {
    if (!isAdmin()) return alert('Chỉ Admin mới được thêm phim.');
    return window.fm_movies?.create && window.fm_movies.create();
  }
  if (label === 'Banner') {
    if (!me || !['admin', 'manager'].includes(me.role)) return alert('Chỉ Admin/Manager.');
    return window.fm_banners?.create && window.fm_banners.create();
  }
  if (label === 'Tin tức') {
    if (!me || !['admin', 'manager'].includes(me.role)) return alert('Chỉ Admin/Manager.');
    return window.fm_news?.create && window.fm_news.create();
  }
}




function statusBadge(status) {
  if (status === 'now_showing') return '<span class="badge ok">Đang chiếu</span>';
  if (status === 'coming') return '<span class="badge warn">Sắp chiếu</span>';
  return '<span class="badge muted">Đã lưu trữ</span>';
}

function requireNotEmpty(input, field) {
  if (!input) return true;
  const val = input.value?.trim();
  if (!val) {
    alert(`${field} không được để trống!`);
    input.classList.add('input-error');
    input.focus();
    return false;
  }
  input.classList.remove('input-error');
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
  const pageSize = 10;

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

    // chống cache: thêm cache-buster và tắt cache
    const bust = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();

    let res = await fetch(bust, { cache: 'no-store' });
    if (res.status === 304) {
      // một số proxy/browser vẫn trả 304 → bắt buộc reload từ server
      res = await fetch(bust, { cache: 'reload' });
    }
    if (!res.ok) throw new Error('Fetch movies failed');
    return res.json();
  };


  const load = async () => {
    els.table.innerHTML = `<div class="muted">Đang tải danh sách phim...</div>`;
    try {
      raw = await fetchMoviesByTab(tab);
      applyFilterAndRender();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
    }
  };

  const applyFilterAndRender = () => {
    const q = els.search.value.trim().toLowerCase();
    view = !q ? raw : raw.filter(m => (m.title || '').toLowerCase().includes(q));
    page = 1;
    renderTable();
  };

  function actionButtons(m) {
    if (!isAdmin()) return ''; // Manager/khác: không có nút
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

  const toArray = (s) => s.split(',').map(x => x.trim()).filter(Boolean);

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
          <label>Mô tả</label>
          <textarea id="f-desc">${data.description || ''}</textarea>
        </div>
        <div class="col-6 field">
          <label>Thời lượng (phút)</label>
          <input id="f-duration" type="number" value="${data.duration || ''}">
        </div>
        <div class="col-6 field">
          <label>Ngày phát hành</label>
          <input id="f-release" type="date" value="${data.release_date ? new Date(data.release_date).toISOString().slice(0, 10) : ''}">
        </div>
        <div class="col-6 field">
          <label>Ngôn ngữ</label>
          <input id="f-lang" value="${data.language || ''}">
        </div>
        <div class="col-6 field">
          <label>Điểm (0–10)</label>
          <input id="f-rating" type="number" step="0.1" min="0" max="10" value="${data.rating ?? ''}">
        </div>
        <div class="col-6 field">
          <label>Đạo diễn</label>
          <input id="f-director" value="${data.director || ''}">
        </div>
        <div class="col-6 field">
          <label>Poster (URL)</label>
          <input id="f-poster" value="${data.poster || ''}">
        </div>
        <div class="col-6 field">
          <label>Diễn viên (phân tách dấu phẩy)</label>
          <input id="f-cast" value="${(data.cast || []).join(', ')}">
        </div>
        <div class="col-6 field">
          <label>Thể loại (phân tách dấu phẩy)</label>
          <input id="f-genre" value="${(data.genre || []).join(', ')}">
        </div>
        <div class="col-6 field">
          <label>Trạng thái</label>
          <select id="f-status">
            <option value="coming" ${data.status === 'coming' ? 'selected' : ''}>Sắp chiếu</option>
            <option value="now_showing" ${data.status === 'now_showing' ? 'selected' : ''}>Đang chiếu</option>
            <option value="archived" ${data.status === 'archived' ? 'selected' : ''}>Đã lưu trữ</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn" id="f-cancel">Hủy</button>
      <button class="btn primary" id="f-submit">${isEdit ? 'Lưu thay đổi' : 'Tạo phim'}</button>
    </div>
  `;

    const modal = openModal(htmlForm, ({ el, close }) => {
      el.querySelector('#f-cancel').onclick = close;
      el.querySelector('#f-submit').onclick = async () => {
        // ✅ Validate: Tiêu đề bắt buộc
        const iTitle = el.querySelector('#f-title');
        // ✅ Validate tất cả trường
        let ok = true;
        ok = requireNotEmpty(iTitle, 'Tiêu đề') && ok;
        ok = requireNotEmpty(el.querySelector('#f-desc'), 'Mô tả') && ok;
        ok = requireNotEmpty(el.querySelector('#f-duration'), 'Thời lượng') && ok;
        ok = requireNotEmpty(el.querySelector('#f-release'), 'Ngày phát hành') && ok;
        ok = requireNotEmpty(el.querySelector('#f-lang'), 'Ngôn ngữ') && ok;
        ok = requireNotEmpty(el.querySelector('#f-rating'), 'Điểm') && ok;
        ok = requireNotEmpty(el.querySelector('#f-director'), 'Đạo diễn') && ok;
        ok = requireNotEmpty(el.querySelector('#f-poster'), 'Poster URL') && ok;
        ok = requireNotEmpty(el.querySelector('#f-cast'), 'Diễn viên') && ok;
        ok = requireNotEmpty(el.querySelector('#f-genre'), 'Thể loại') && ok;
        ok = requireNotEmpty(el.querySelector('#f-status'), 'Trạng thái') && ok;
        if (!ok) return;


        const toArray = (s) => s.split(',').map(x => x.trim()).filter(Boolean);

        const body = {
          title: iTitle.value.trim(),
          description: el.querySelector('#f-desc').value.trim(),
          duration: Number(el.querySelector('#f-duration').value) || undefined,
          release_date: el.querySelector('#f-release').value || undefined,
          language: el.querySelector('#f-lang').value.trim() || undefined,
          rating: el.querySelector('#f-rating').value ? Number(el.querySelector('#f-rating').value) : undefined,
          director: el.querySelector('#f-director').value.trim() || undefined,
          poster: el.querySelector('#f-poster').value.trim() || undefined,
          cast: toArray(el.querySelector('#f-cast').value),
          genre: toArray(el.querySelector('#f-genre').value),
          status: el.querySelector('#f-status').value
        };

        try {
          let res, dataRes;
          if (isEdit) res = await authFetch(`${API_BASE}/movies/${data._id}`, { method: 'PUT', body: JSON.stringify(body) });
          else res = await authFetch(`${API_BASE}/movies`, { method: 'POST', body: JSON.stringify(body) });
          dataRes = await res.json().catch(() => ({}));
          if (!res.ok) {
            alert(dataRes?.message || (isEdit ? 'Cập nhật thất bại.' : 'Tạo thất bại.'));
            return;
          }
          close();
          await load(); // reload danh sách
          alert(isEdit ? 'Đã lưu thay đổi.' : 'Đã tạo phim.');
        } catch {
          alert('Lỗi kết nối máy chủ.');
        }
      };
    });
    return modal;
  }


  const onRowAction = async (e) => {
    const id = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');

    if (act === 'edit') {
      const res = await fetch(`${API_BASE}/movies/${id}`);
      const m = await res.json();
      showMovieForm('edit', m);
    }

    if (act === 'del') {
      if (!isAdmin()) { alert('Chỉ Admin mới được xóa.'); return; }
      if (!confirm('Bạn có chắc muốn xóa phim này?')) return;
      try {
        const res = await authFetch(`${API_BASE}/movies/${id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data?.message || 'Xóa không thành công.');
          return;
        }
        raw = raw.filter(x => x._id !== id);
        applyFilterAndRender();
        alert('Đã xóa.');
      } catch {
        alert('Lỗi kết nối khi xóa.');
      }
    }
  };

  // Tabs
  container.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      tab = t.getAttribute('data-tab');
      els.search.value = '';
      load();
    });
  });

  // Search & pagination
  els.search.addEventListener('input', () => applyFilterAndRender());
  els.prev.addEventListener('click', () => { if (page > 1) { page--; renderTable(); } });
  els.next.addEventListener('click', () => {
    const maxPage = Math.ceil(view.length / pageSize) || 1;
    if (page < maxPage) { page++; renderTable(); }
  });

  // Expose action cho toolbar
  window.fm_movies = {
    reload: () => load(),
    create: () => {
      if (!isAdmin()) { alert('Chỉ Admin mới được thêm phim.'); return; }
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
    </div>

    <div class="card" style="margin-top:12px">
      <h3 style="margin:0 0 8px">Ảnh trong banner (chọn 1 banner)</h3>
      <div class="form">
        <div class="row">
          <div class="col-12"><div id="bn-selected" class="muted">Chưa chọn banner.</div></div>
          <div class="col-12"><div id="bn-images" class="banner-grid"></div></div>
        </div>
      </div>
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
  };

  async function fetchBanners() {
    const res = await authFetch(`${API_BASE}/banners`, { cache: 'no-store' });
    if (!res.ok) throw new Error('load banners failed');
    return res.json();
  }

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
    try {
      raw = await fetchBanners();
      renderList();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
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
    <div class="modal-head"><h3>${isEdit ? 'Sửa banner' : 'Tạo banner'}</h3><div class="spacer"></div></div>
    <div class="form">
      <div class="row">
        <div class="col-12 field"><label>Tiêu đề *</label><input id="f-title" value="${data.title || ''}"></div>
        <div class="col-12 field"><label>Link (optional)</label><input id="f-link" value="${data.link_url || ''}"></div>

        ${isEdit ? `
        <div class="col-12 field">
          <label>Trạng thái</label>
          <select id="f-active">
            <option value="true" ${data.is_active !== false ? 'selected' : ''}>Bật</option>
            <option value="false" ${data.is_active === false ? 'selected' : ''}>Tắt</option>
          </select>
        </div>` : ``}
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn" id="f-cancel">Hủy</button>
      <button class="btn primary" id="f-submit">${isEdit ? 'Lưu' : 'Tạo'}</button>
    </div>
  `;

    const modal = openModal(htmlForm, ({ el, close }) => {
      const iTitle = el.querySelector('#f-title');
      const iLink = el.querySelector('#f-link');

      el.querySelector('#f-cancel').onclick = close;
      el.querySelector('#f-submit').onclick = async () => {
        // ✅ Validate tất cả
        let ok = true;
        ok = requireNotEmpty(iTitle, 'Tiêu đề') && ok;
        //ok = requireNotEmpty(iLink, 'Link') && ok;
        if (!ok) return;


        const body = {
          title: iTitle.value.trim(),
          link_url: iLink.value.trim()
        };
        if (isEdit) {
          body.is_active = el.querySelector('#f-active').value === 'true';
        }

        try {
          let res, dataRes;
          if (isEdit) res = await authFetch(`${API_BASE}/banners/${data._id}`, { method: 'PUT', body: JSON.stringify(body) });
          else res = await authFetch(`${API_BASE}/banners`, { method: 'POST', body: JSON.stringify(body) });
          dataRes = await res.json().catch(() => ({}));
          if (!res.ok) return alert(dataRes?.message || 'Thao tác thất bại.');
          close(); await loadList();
        } catch { alert('Lỗi kết nối.'); }
      };
    });
  }



  function openUploadDialog(bannerId) {
    const htmlForm = html`
      <div class="modal-head"><h3>Upload ảnh</h3><div class="spacer"></div></div>
      <div class="form">
        <div class="row">
          <div class="col-12">
            <input id="f-files" type="file" accept="image/*" multiple />
            <div class="help">Chọn tối đa 12 ảnh/lần.</div>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">Tải lên</button>
      </div>
    `;
    openModal(htmlForm, ({ el, close }) => {
      el.querySelector('#f-cancel').onclick = close;
      el.querySelector('#f-submit').onclick = async () => {
        const files = el.querySelector('#f-files').files;
        if (!files || !files.length) return alert('Chọn ít nhất 1 ảnh.');
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
          if (!res.ok) return alert(data?.message || 'Upload thất bại.');
          close();
          await loadList();
          if (selectedBanner && selectedBanner._id === bannerId) await loadImagesOf(bannerId);
        } catch { alert('Lỗi kết nối.'); }
      };
    });
  }

  async function loadImagesOf(bannerId) {
    els.selected.textContent = `Đang nạp ảnh cho banner ${bannerId}...`;
    els.images.innerHTML = '';
    try {
      // ✅ Dùng endpoint ADMIN (có _id, không phụ thuộc banner bật/tắt)
      const res = await authFetch(`${API_BASE}/banners/${bannerId}/images`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) {
        els.images.innerHTML = `<div class="muted">${payload?.message || 'Không tải được ảnh.'}</div>`;
        return;
      }

      // Cập nhật thông tin banner đang chọn
      selectedBanner = filtered().find(x => x._id === bannerId) || { _id: bannerId, title: payload?.banner?.title || '' };

      els.selected.innerHTML = selectedBanner
        ? `<div class="kv"><b>${selectedBanner.title || '(Chưa có tiêu đề)'}</b> <span class="pill">${selectedBanner._id}</span></div>`
        : 'Không tìm thấy banner.';

      const images = Array.isArray(payload.images) ? payload.images : [];
      if (!images.length) {
        els.images.innerHTML = `<div class="muted">Chưa có ảnh.</div>`;
        return;
      }

       els.images.innerHTML = images.map(img => {
   const src = toAbsImage(img.image_url) + (img.updatedAt ? `?v=${new Date(img.updatedAt).getTime()}` : '');
   return html`
      <div class="card banner-item">
        <img class="banner-thumb" src="${src}" alt="Banner image">

        <label class="movie-label">Gán movie_id (tuỳ chọn)</label>
        <input data-role="movieId"
              data-image-id="${img._id}"
              placeholder="Nhập ObjectId phim..."
              value="${img.movie_id || ''}"/>

        <div class="btn-group">
          ${canManage ? `
            <button class="btn" data-act="save-img" data-image-id="${img._id}">Lưu</button>
            <button class="btn danger" data-act="del-img" data-image-id="${img._id}">Xoá</button>
          ` : ``}
        </div>
      </div>
    `;
   }).join('');


      // Validate & Lưu movie_id
      els.images.querySelectorAll('[data-act="save-img"]').forEach(b => b.onclick = async (e) => {
        const imageId = e.currentTarget.getAttribute('data-image-id');
        const input = els.images.querySelector(`input[data-role="movieId"][data-image-id="${imageId}"]`);
        const raw = (input.value || '').trim();

        // Cho phép rỗng (null) hoặc ObjectId 24 hex
        if (raw && !/^[0-9a-fA-F]{24}$/.test(raw)) {
          alert('movie_id phải là ObjectId 24 ký tự hex, hoặc để trống.');
          input.focus();
          return;
        }

        try {
          const res = await authFetch(`${API_BASE}/banners/${bannerId}/images/${imageId}`, {
            method: 'PATCH',
            body: JSON.stringify({ movie_id: raw || null })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return alert(data?.message || 'Lưu thất bại.');
          alert('Đã lưu.');
        } catch { alert('Lỗi kết nối.'); }
      });

      // Xoá ảnh
      els.images.querySelectorAll('[data-act="del-img"]').forEach(b => b.onclick = async (e) => {
        const imageId = e.currentTarget.getAttribute('data-image-id');
        if (!confirm('Xoá ảnh này?')) return;
        try {
          const res = await authFetch(`${API_BASE}/banners/${bannerId}/images/${imageId}`, { method: 'DELETE' });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return alert(data?.message || 'Xoá thất bại.');
          await loadImagesOf(bannerId); // reload khung ảnh
          await loadList();             // cập nhật cột "Ảnh" trong bảng
        } catch { alert('Lỗi kết nối.'); }
      });

    } catch {
      els.images.innerHTML = `<div class="muted">Không tải được ảnh.</div>`;
    }
  }


  async function onRowAction(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');

    if (act === 'select') {
      await loadImagesOf(id);
      return;
    }
    if (act === 'toggle' && canManage) {
      try {
        const res = await authFetch(`${API_BASE}/banners/${id}/toggle`, { method: 'PATCH' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return alert(data?.message || 'Thất bại.');
        await loadList();
      } catch { alert('Lỗi kết nối.'); }
      return;
    }
    if (act === 'edit' && canManage) {
      const b = raw.find(x => x._id === id);
      if (!b) return;
      openBannerForm('edit', b);
      return;
    }
    if (act === 'upload' && canManage) {
      openUploadDialog(id);
      return;
    }
    if (act === 'del' && canManage) {
      if (!confirm('Xoá banner và toàn bộ ảnh của nó?')) return;
      try {
        const res = await authFetch(`${API_BASE}/banners/${id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return alert(data?.message || 'Xoá thất bại.');
        if (selectedBanner && selectedBanner._id === id) {
          selectedBanner = null; els.selected.textContent = 'Chưa chọn banner.'; els.images.innerHTML = '';
        }
        await loadList();
      } catch { alert('Lỗi kết nối.'); }
      return;
    }
  }

  container.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      container.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      tab = t.getAttribute('data-tab');
      renderList();
    };
  });

  window.fm_banners = {
    reload: () => loadList(),
    create: () => {
      if (!canManage) return alert('Chỉ Admin/Manager.');
      openBannerForm('create');
    }
  };

  loadList();
}

function renderNewsPage(container) {
  // stub để toolbar gọi từ ngoài
  window.fm_news = { reload: () => { }, create: () => { } };

  container.innerHTML = html`
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px">
        <h3 style="margin:0">Danh sách tin tức</h3>
        <div>
          <input id="news-q" class="search" placeholder="Tìm theo tiêu đề/nội dung..." style="width:280px">
          <select id="news-filter" style="margin-left:8px; padding:8px 12px; border-radius:10px; border:1px solid var(--line); background:#0f1530; color:#fff">
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

  async function fetchNewsAdmin(params = {}) {
    // /api/news?is_published=&q=&tag=
    const url = new URL(`${API_BASE}/news`);
    if (params.q) url.searchParams.set('q', params.q);
    if (typeof params.is_published === 'boolean') url.searchParams.set('is_published', String(params.is_published));

    const res = await authFetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error('load news failed');
    const js = await res.json();
    // API trả { items, total, page, limit } theo code của bạn
    return Array.isArray(js.items) ? js.items : js;
  }

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
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
    }
  }

  function applyFilterAndRender() {
    view = raw.slice();
    // client-side bổ sung (đã filter server, nhưng giữ đề phòng)
    const q = els.q.value.trim().toLowerCase();
    const f = els.filter.value;
    if (q) view = view.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
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
            <td>
              ${src ? `<img class="news-thumb" src="${src}" alt="cover">` : ''}
            </td>
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
                  <button class="btn warn" data-act="cover" data-id="${n._id}">Đổi ảnh bìa</button>
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

    els.info.textContent = total ? `Hiển thị ${Math.min(start + 1, total)}–${Math.min(start + rows.length, total)} / ${total}` : '';
    els.pg.textContent = String(page);
  }

  // ====== Form thêm/sửa (validate không để trống) ======
  function toSlug(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function openNewsForm(mode, data = {}) {
    const isEdit = mode === 'edit';

    // helper: chuyển đường dẫn tương đối (/public/uploads/...) → URL tuyệt đối
    // ví dụ API_BASE = http://localhost:3000/api  → origin = http://localhost:3000
    const abs = (u) => {
      const v = String(u || '').trim();
      if (!v) return '';
      if (/^https?:\/\//i.test(v)) return v;
      const origin = (API_BASE || '').replace(/\/api\/?$/, '');
      return origin + (v.startsWith('/') ? v : '/' + v);
    };

    const htmlForm = html`
    <div class="modal-head"><h3>${isEdit ? 'Sửa tin tức' : 'Thêm tin tức'}</h3><div class="spacer"></div></div>
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

        <!-- ✅ Preview ảnh bìa -->
        <div class="col-12">
          <div id="f-cover-preview-wrap" style="margin-top:8px">
            <img id="f-cover-preview" alt="preview" style="display:none;width:120px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">
          </div>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn" id="f-cancel">Hủy</button>
      <button class="btn primary" id="f-submit">${isEdit ? 'Lưu' : 'Tạo'}</button>
    </div>
  `;

    openModal(htmlForm, ({ el, close }) => {
      const iTitle = el.querySelector('#f-title');
      const iSlug = el.querySelector('#f-slug');
      const iEx = el.querySelector('#f-excerpt');
      const iCt = el.querySelector('#f-content');
      const iTags = el.querySelector('#f-tags');
      const iFile = el.querySelector('#f-cover-file');
      const iUrl = el.querySelector('#f-cover-url');
      const img = el.querySelector('#f-cover-preview');

      // hiển thị/ẩn preview
      const setPreview = (src) => {
        if (!src) { img.style.display = 'none'; img.removeAttribute('src'); return; }
        img.src = src; img.style.display = '';
      };

      // nếu đang sửa và đã có cover_image → hiện preview luôn
      if ((data.cover_image || '').trim()) setPreview(abs(data.cover_image));

      // đổi preview theo URL
      iUrl.addEventListener('input', () => {
        const v = iUrl.value.trim();
        setPreview(v ? abs(v) : '');
      });

      // đổi preview theo file
      iFile.addEventListener('change', () => {
        const f = iFile.files?.[0];
        if (!f) return setPreview('');
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(f);
      });

      // auto slug từ tiêu đề nếu slug trống
      iTitle.addEventListener('blur', () => {
        if (!iSlug.value.trim()) iSlug.value = toSlug(iTitle.value);
      });

      el.querySelector('#f-cancel').onclick = close;
      el.querySelector('#f-submit').onclick = async () => {
        // ===== VALIDATE: tất cả không được để trống =====
        let ok = true;
        ok = requireNotEmpty(iTitle, 'Tiêu đề') && ok;

        if (!iSlug.value.trim()) iSlug.value = toSlug(iTitle.value);
        ok = requireNotEmpty(iSlug, 'Slug') && ok;
        ok = requireNotEmpty(iEx, 'Tóm tắt') && ok;
        ok = requireNotEmpty(iCt, 'Nội dung') && ok;
        ok = requireNotEmpty(iTags, 'Tags') && ok;

        // Ảnh bìa: phải có ít nhất 1 (file hoặc URL)
        const hasFile = iFile.files && iFile.files.length > 0;
        const hasUrl = !!iUrl.value.trim();
        if (!hasFile && !hasUrl) {
          setInputError(iUrl, 'Ảnh bìa (file hoặc URL) không được để trống.');
          iUrl.focus();
          ok = false;
        } else {
          clearInputError(iUrl);
        }
        if (!ok) return;

        try {
          let res, dataRes;
          if (isEdit) {
            if (hasFile) {
              const fd = new FormData();
              fd.append('cover', iFile.files[0]);
              fd.append('title', iTitle.value.trim());
              fd.append('slug', iSlug.value.trim());
              fd.append('excerpt', iEx.value.trim());
              fd.append('content', iCt.value.trim());
              fd.append('tags', iTags.value.trim());
              const token = getToken();
              res = await fetch(`${API_BASE}/news/${data._id}`, {
                method: 'PUT',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: fd
              });
            } else {
              const body = {
                title: iTitle.value.trim(),
                slug: iSlug.value.trim(),
                excerpt: iEx.value.trim(),
                content: iCt.value.trim(),
                tags: iTags.value.trim(),
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
              fd.append('title', iTitle.value.trim());
              fd.append('slug', iSlug.value.trim());
              fd.append('excerpt', iEx.value.trim());
              fd.append('content', iCt.value.trim());
              fd.append('tags', iTags.value.trim());
              const token = getToken();
              res = await fetch(`${API_BASE}/news`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: fd
              });
            } else {
              const body = {
                title: iTitle.value.trim(),
                slug: iSlug.value.trim(),
                excerpt: iEx.value.trim(),
                content: iCt.value.trim(),
                tags: iTags.value.trim(),
                cover_image: iUrl.value.trim()
              };
              res = await authFetch(`${API_BASE}/news`, {
                method: 'POST',
                body: JSON.stringify(body)
              });
            }
          }

          dataRes = await res.json().catch(() => ({}));
          if (!res.ok) return alert(dataRes?.message || 'Thao tác thất bại.');
          close();
          await loadList();           // reload list để thấy ảnh ngay
          alert(isEdit ? 'Đã lưu.' : 'Đã tạo tin.');
        } catch {
          alert('Lỗi kết nối.');
        }
      };
    });
  }


  function openCoverDialog(newsId) {
    const htmlForm = html`
      <div class="modal-head"><h3>Đổi ảnh bìa</h3><div class="spacer"></div></div>
      <div class="form">
        <div class="row">
          <div class="col-6 field"><label>Chọn file ảnh *</label><input id="f-file" type="file" accept="image/*"></div>
          <div class="col-6 field"><label>Hoặc URL ảnh *</label><input id="f-url" placeholder="https://..."></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">Lưu</button>
      </div>
    `;
    openModal(htmlForm, ({ el, close }) => {
      const iFile = el.querySelector('#f-file');
      const iUrl = el.querySelector('#f-url');

      el.querySelector('#f-cancel').onclick = close;
      el.querySelector('#f-submit').onclick = async () => {
        // phải có ít nhất 1
        const hasFile = iFile.files && iFile.files.length > 0;
        const hasUrl = !!iUrl.value.trim();
        if (!hasFile && !hasUrl) {
          setInputError(iUrl, 'Ảnh bìa (file hoặc URL) không được để trống.');
          iUrl.focus();
          return;
        }
        try {
          let res, dataRes;
          if (hasFile) {
            const fd = new FormData();
            fd.append('cover', iFile.files[0]);
            const token = getToken();
            res = await fetch(`${API_BASE}/news/${newsId}`, {
              method: 'PUT',
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: fd
            });
          } else {
            res = await authFetch(`${API_BASE}/news/${newsId}`, {
              method: 'PUT',
              body: JSON.stringify({ cover_image: iUrl.value.trim() })
            });
          }
          dataRes = await res.json().catch(() => ({}));
          if (!res.ok) return alert(dataRes?.message || 'Cập nhật thất bại.');
          close(); await loadList();
        } catch { alert('Lỗi kết nối.'); }
      };
    });
  }

  async function onRowAction(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');

    if (act === 'toggle' && canManage) {
      try {
        const res = await authFetch(`${API_BASE}/news/${id}/publish`, { method: 'PATCH' });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) return alert(d?.message || 'Thất bại.');
        await loadList();
      } catch { alert('Lỗi kết nối.'); }
      return;
    }
    if (act === 'edit' && canManage) {
      try {
        const res = await authFetch(`${API_BASE}/news/${id}`);
        const n = await res.json();
        openNewsForm('edit', n);
      } catch { alert('Không lấy được chi tiết.'); }
      return;
    }
    if (act === 'cover' && canManage) {
      openCoverDialog(id);
      return;
    }
    if (act === 'del' && canManage) {
      if (!confirm('Xoá bài viết này?')) return;
      try {
        const res = await authFetch(`${API_BASE}/news/${id}`, { method: 'DELETE' });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) return alert(d?.message || 'Xoá thất bại.');
        await loadList();
      } catch { alert('Lỗi kết nối.'); }
      return;
    }
  }

  // events
  els.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadList(); });
  els.filter.addEventListener('change', loadList);
  els.prev.onclick = () => { if (page > 1) { page--; renderTable(); } };
  els.next.onclick = () => {
    const max = Math.ceil(view.length / pageSize) || 1;
    if (page < max) { page++; renderTable(); }
  };

  window.fm_news = {
    reload: () => loadList(),
    create: () => openNewsForm('create')
  };

  loadList();
}

