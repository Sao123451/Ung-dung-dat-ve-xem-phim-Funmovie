const API_BASE = window.FM_CONFIG.API_BASE;

// Helpers
const $ = (s, r=document) => r.querySelector(s);
const saveToken = (t) => localStorage.setItem('fm_token', t);
const getToken  = () => localStorage.getItem('fm_token');
const saveUser  = (u) => localStorage.setItem('fm_user', JSON.stringify(u));
const getUser   = () => { try { return JSON.parse(localStorage.getItem('fm_user')||'null'); } catch { return null; } };

// Quyền
const isAdmin = () => getUser()?.role === 'admin';

// Modal helpers
function openModal(innerHtml, onMount){
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal">${innerHtml}</div>`;
  document.body.append(wrap);
  const api = { close: () => wrap.remove(), el: wrap.querySelector('.modal') };
  if (typeof onMount === 'function') onMount(api);
  wrap.addEventListener('click', (e)=> { if (e.target === wrap) api.close(); });
  return api;
}


const authFetch = (url, options={}) => {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers||{}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
};

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
};
const fmtDuration = (m) => m ? `${m} phút` : '';
const html = (strings, ...vals) => strings.map((s,i)=> s + (vals[i] ?? '')).join('');


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
    setTimeout(()=> card?.classList.remove('shake'), 300);
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
      headers: { 'Content-Type':'application/json' },
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
    if (!user || !['admin','manager'].includes(user.role)) {
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

  const navItems = ['Dashboard','Phim','Suất chiếu','Banner','Voucher','Người dùng','Tin tức'];
  const nav = $('#nav');
  const btnRefresh = $('#btn-refresh');
  const btnCreate  = $('#btn-create');

  // chặn user không hợp lệ
  const me = getUser();
  if (!me || !['admin','manager'].includes(me.role)) return logout();

  // Cập nhật toolbar theo trang hiện tại
  function updateToolbarFor(label) {
  const me = getUser();
  const btnRefresh = $('#btn-refresh');
  const btnCreate  = $('#btn-create');

  btnRefresh.disabled = false;

  let showCreate = false;
  let createText = '+ Thêm mới';

  if (label === 'Phim'   && me.role === 'admin')                 { showCreate = true; createText = '+ Thêm phim'; }
  if (label === 'Banner' && ['admin','manager'].includes(me.role)){ showCreate = true; createText = '+ Thêm banner'; }

  btnCreate.style.display = showCreate ? '' : 'none';
  btnCreate.textContent = createText;
}


  navItems.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (i === 0) btn.classList.add('active');
    btn.onclick = () => { 
      selectPage(label, btn); 
      updateToolbarFor(label);  // <-- cập nhật toolbar khi chuyển trang
    };
    nav.append(btn);
  });

  // Gắn hành vi 2 nút toolbar dùng các hàm đã triển khai ở mục #3
  btnRefresh.onclick = () => refreshPage();
  btnCreate.onclick  = () => createEntityForCurrentPage();
  $('#btn-logout').onclick = logout;

  // Khởi tạo trang đầu và toolbar
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
    // ➜ trang danh sách phim
    renderMoviesPage(page);
  } else if (label === 'Người dùng') {
    renderUserList(page);
  } else if (label === 'Banner') {
  renderBannersPage(page);
  } else {
    page.innerHTML = `<div class="card">Trang <b>${label}</b> đang phát triển.</div>`;
  }
}


async function renderUserList(container) {
  container.innerHTML = `<div class="card">Đang tải người dùng...</div>`;
  try {
    const res = await authFetch(`${API_BASE}/users`);
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error('Bad response');

    container.innerHTML = `
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px">
          <h3 style="margin:0">Người dùng</h3>
        </div>
        <table class="table">
          <thead><tr><th>Username</th><th>Email</th><th>Họ tên</th><th>Role</th><th>Trạng thái</th></tr></thead>
          <tbody>
            ${list.map(u=>`
              <tr>
                <td>${u.username||''}</td>
                <td>${u.email||''}</td>
                <td>${u.full_name||''}</td>
                <td>${u.role}</td>
                <td>${u.status}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="card" style="margin-top:12px">
        <h3 style="margin:0 0 8px">Tạo tài khoản nhân sự</h3>
        <div class="form">
          <div class="row">
            <div class="col-6"><label>Username</label><input id="cu-username"/></div>
            <div class="col-6"><label>Email</label><input id="cu-email"/></div>
            <div class="col-6"><label>Mật khẩu</label><input id="cu-password" type="password" placeholder="≥8 ký tự"/></div>
            <div class="col-6"><label>Họ tên</label><input id="cu-fullname"/></div>
            <div class="col-6"><label>SĐT</label><input id="cu-phone"/></div>
            <div class="col-6">
              <label>Vai trò</label>
              <select id="cu-role">
                <option value="staff">staff</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <div class="row">
            <div class="col-6"><button class="btn primary" id="btn-create-user">Tạo tài khoản</button></div>
            <div class="col-6" style="text-align:right"><span class="help" id="cu-help"></span></div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('btn-create-user').onclick = onCreateUserSubmit;
  } catch {
    container.innerHTML = `<div class="card">Không tải được người dùng.</div>`;
  }
}

async function onCreateUserSubmit() {
  const body = {
    username: $('#cu-username').value.trim(),
    email: $('#cu-email').value.trim(),
    password: $('#cu-password').value,
    full_name: $('#cu-fullname').value.trim(),
    phone: $('#cu-phone').value.trim(),
    role: $('#cu-role').value
  };
  const help = $('#cu-help'); help.textContent = 'Đang tạo...';

  try {
    const res = await authFetch(`${API_BASE}/users`, { method:'POST', body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { help.textContent = data?.message || 'Tạo thất bại'; return; }
    help.textContent = 'Tạo thành công!';
    const btn = [...document.querySelectorAll('.nav button')].find(b => b.textContent === 'Người dùng');
    selectPage('Người dùng', btn);
  } catch {
    help.textContent = 'Lỗi kết nối.';
  }
}

function getCurrentPageLabel(){
  return $('#page-title')?.textContent?.trim();
}

function refreshPage(){
  const label = $('#page-title')?.textContent?.trim();
  if (label === 'Phim'   && window.fm_movies?.reload)  window.fm_movies.reload();
  if (label === 'Banner' && window.fm_banners?.reload) window.fm_banners.reload();
}


function createEntityForCurrentPage(){
  const label = $('#page-title')?.textContent?.trim();
  const me = getUser();

  if (label === 'Phim') {
    if (!isAdmin()) return alert('Chỉ Admin mới được thêm phim.');
    return window.fm_movies?.create && window.fm_movies.create();
  }

  if (label === 'Banner') {
    if (!me || !['admin','manager'].includes(me.role))
      return alert('Chỉ Admin/Manager mới được thêm banner.');
    return window.fm_banners?.create && window.fm_banners.create();
  }
}



function statusBadge(status) {
  if (status === 'now_showing') return '<span class="badge ok">Đang chiếu</span>';
  if (status === 'coming') return '<span class="badge warn">Sắp chiếu</span>';
  return '<span class="badge muted">Đã lưu trữ</span>';
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
    table:  $('#mv-table'),
    info:   $('#mv-info'),
    prev:   $('#mv-prev'),
    next:   $('#mv-next'),
    page:   $('#mv-page')
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
    view = !q ? raw : raw.filter(m => (m.title||'').toLowerCase().includes(q));
    page = 1;
    renderTable();
  };

  function actionButtons(m){
    if (!isAdmin()) return ''; // Manager/khác: không có nút
    return `
      <button class="btn" data-act="edit" data-id="${m._id}">Sửa</button>
      <button class="btn danger" data-act="del" data-id="${m._id}">Xóa</button>
    `;
  }

  const renderTable = () => {
    const total = view.length;
    const start = (page-1)*pageSize;
    const rows = view.slice(start, start+pageSize);

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
      ? `Hiển thị ${Math.min(start+1, total)}–${Math.min(start+rows.length, total)} / ${total}`
      : '';
    els.page.textContent = String(page);

    els.table.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', onRowAction);
    });
  };

  const toArray = (s) => s.split(',').map(x=>x.trim()).filter(Boolean);

  function showMovieForm(mode, data = {}){
    const isEdit = mode === 'edit';
    const titleTxt = isEdit ? 'Sửa phim' : 'Thêm phim';

    const htmlForm = html`
      <div class="modal-head">
        <h3>${titleTxt}</h3>
        <div class="spacer"></div>
      </div>
      <div class="form">
        <div class="row">
          <div class="col-12">
            <label>Tiêu đề <span class="muted">*</span></label>
            <input id="f-title" value="${data.title||''}">
          </div>
          <div class="col-12">
            <label>Mô tả</label>
            <textarea id="f-desc">${data.description||''}</textarea>
          </div>
          <div class="col-6">
            <label>Thời lượng (phút)</label>
            <input id="f-duration" type="number" value="${data.duration||''}">
          </div>
          <div class="col-6">
            <label>Ngày phát hành</label>
            <input id="f-release" type="date" value="${data.release_date ? new Date(data.release_date).toISOString().slice(0,10) : ''}">
          </div>
          <div class="col-6">
            <label>Ngôn ngữ</label>
            <input id="f-lang" value="${data.language||''}">
          </div>
          <div class="col-6">
            <label>Điểm (0–10)</label>
            <input id="f-rating" type="number" step="0.1" min="0" max="10" value="${data.rating??''}">
          </div>
          <div class="col-6">
            <label>Đạo diễn</label>
            <input id="f-director" value="${data.director||''}">
          </div>
          <div class="col-6">
            <label>Poster (URL)</label>
            <input id="f-poster" value="${data.poster||''}">
          </div>
          <div class="col-6">
            <label>Diễn viên (phân tách dấu phẩy)</label>
            <input id="f-cast" value="${(data.cast||[]).join(', ')}">
          </div>
          <div class="col-6">
            <label>Thể loại (phân tách dấu phẩy)</label>
            <input id="f-genre" value="${(data.genre||[]).join(', ')}">
          </div>
          <div class="col-6">
            <label>Trạng thái</label>
            <select id="f-status">
              <option value="coming" ${data.status==='coming'?'selected':''}>Sắp chiếu</option>
              <option value="now_showing" ${data.status==='now_showing'?'selected':''}>Đang chiếu</option>
              <option value="archived" ${data.status==='archived'?'selected':''}>Đã lưu trữ</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">${isEdit?'Lưu thay đổi':'Tạo phim'}</button>
      </div>
    `;

    const modal = openModal(htmlForm, ({ el, close }) => {
      el.querySelector('#f-cancel').onclick = close;
      el.querySelector('#f-submit').onclick = async () => {
        if (!isAdmin()) { alert('Chỉ Admin mới được thao tác.'); return; }

        // Validate đơn giản
        const title = el.querySelector('#f-title').value.trim();
        if (!title) { alert('Vui lòng nhập tiêu đề.'); return; }

        const body = {
          title,
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
          if (isEdit) {
            res = await authFetch(`${API_BASE}/movies/${data._id}`, { method:'PUT', body: JSON.stringify(body) });
          } else {
            res = await authFetch(`${API_BASE}/movies`, { method:'POST', body: JSON.stringify(body) });
          }
          dataRes = await res.json().catch(()=> ({}));
          if (!res.ok) {
            alert(dataRes?.message || (isEdit?'Cập nhật thất bại.':'Tạo thất bại.'));
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
        const data = await res.json().catch(()=> ({}));
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
  els.prev.addEventListener('click', () => { if (page > 1) { page--; renderTable(); }});
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

function renderBannersPage(container){
  // stub để toolbar có thể gọi sớm
  window.fm_banners = { reload: ()=>{}, create: ()=>{} };

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
  const canManage = !!(me && ['admin','manager'].includes(me.role));

  let raw = [];
  let tab = 'all';
  let selectedBanner = null;

  const els = {
    table: $('#bn-table'),
    images: $('#bn-images'),
    selected: $('#bn-selected'),
  };

  async function fetchBanners(){
    const res = await authFetch(`${API_BASE}/banners`, { cache: 'no-store' });
    if (!res.ok) throw new Error('load banners failed');
    return res.json();
  }

  async function loadList(){
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
    try {
      raw = await fetchBanners();
      renderList();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
    }
  }

  function filtered(){
    if (tab === 'all') return raw;
    if (tab === 'active') return raw.filter(b => b.is_active);
    return raw.filter(b => !b.is_active);
  }

  function renderList(){
    const rows = filtered();
    if (!rows.length){
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

  function openBannerForm(mode, data={}){
    const isEdit = mode === 'edit';
    const htmlForm = html`
      <div class="modal-head"><h3>${isEdit?'Sửa banner':'Tạo banner'}</h3><div class="spacer"></div></div>
      <div class="form">
        <div class="row">
          <div class="col-12"><label>Tiêu đề *</label><input id="f-title" value="${data.title||''}"></div>
          <div class="col-12"><label>Link (optional)</label><input id="f-link" value="${data.link_url||''}"></div>
          <div class="col-12">
            <label>Trạng thái</label>
            <select id="f-active">
              <option value="true" ${data.is_active!==false?'selected':''}>Bật</option>
              <option value="false" ${data.is_active===false?'selected':''}>Tắt</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="f-cancel">Hủy</button>
        <button class="btn primary" id="f-submit">${isEdit?'Lưu':'Tạo'}</button>
      </div>
    `;
    const modal = openModal(htmlForm, ({ el, close }) => {
      el.querySelector('#f-cancel').onclick = close;
      el.querySelector('#f-submit').onclick = async () => {
        const title = el.querySelector('#f-title').value.trim();
        if (!title) return alert('Nhập tiêu đề.');
        const body = {
          title,
          link_url: el.querySelector('#f-link').value.trim(),
          is_active: el.querySelector('#f-active').value === 'true'
        };
        try{
          let res, dataRes;
          if (isEdit) res = await authFetch(`${API_BASE}/banners/${data._id}`, { method:'PUT', body: JSON.stringify(body) });
          else res = await authFetch(`${API_BASE}/banners`, { method:'POST', body: JSON.stringify(body) });
          dataRes = await res.json().catch(()=> ({}));
          if (!res.ok) return alert(dataRes?.message || 'Thao tác thất bại.');
          close(); await loadList();
        }catch{ alert('Lỗi kết nối.'); }
      };
    });
  }

  function openUploadDialog(bannerId){
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
        try{
          const fd = new FormData();
          [...files].forEach(f => fd.append('images', f));
          const token = getToken();
          const res = await fetch(`${API_BASE}/banners/${bannerId}/images`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: fd
          });
          const data = await res.json().catch(()=> ({}));
          if (!res.ok) return alert(data?.message || 'Upload thất bại.');
          close();
          await loadList();
          if (selectedBanner && selectedBanner._id === bannerId) await loadImagesOf(bannerId);
        }catch{ alert('Lỗi kết nối.'); }
      };
    });
  }

  async function loadImagesOf(bannerId){
    els.selected.textContent = `Đang nạp ảnh cho banner ${bannerId}...`;
    els.images.innerHTML = '';
    try{
      const res = await fetch(`${API_BASE}/banners/public/all`, { cache: 'no-store' });
      const arr = await res.json();
      const item = arr.find(x => x._id === bannerId);
      selectedBanner = filtered().find(x => x._id === bannerId) || null;

      els.selected.innerHTML = selectedBanner
        ? `<div class="kv"><b>${selectedBanner.title}</b> <span class="pill">${selectedBanner._id}</span></div>`
        : 'Không tìm thấy banner.';

      if (!item || !item.images?.length){
        els.images.innerHTML = `<div class="muted">Chưa có ảnh.</div>`;
        return;
      }

      els.images.innerHTML = item.images.map(img => html`
        <div class="card">
          <img class="banner-thumb" src="${img.image_url}" alt="">
          <div class="form" style="margin-top:8px">
            <label>Gán movie_id (tuỳ chọn)</label>
            <div class="row">
              <div class="col-8"><input data-role="movieId" data-image-id="${img._id||''}" placeholder="ObjectId hoặc để trống" value="${img.movie_id || ''}"></div>
              <div class="col-4" style="text-align:right">
                ${canManage ? `
                  <button class="btn" data-act="save-img" data-image-id="${img._id||''}">Lưu</button>
                  <button class="btn danger" data-act="del-img" data-image-id="${img._id||''}">Xoá</button>
                `:``}
              </div>
            </div>
          </div>
        </div>
      `).join('');

      els.images.querySelectorAll('[data-act="save-img"]').forEach(b => b.onclick = async (e)=>{
        const imageId = e.currentTarget.getAttribute('data-image-id');
        const input = els.images.querySelector(`input[data-role="movieId"][data-image-id="${imageId}"]`);
        try{
          const res = await authFetch(`${API_BASE}/banners/${bannerId}/images/${imageId}`, {
            method:'PATCH',
            body: JSON.stringify({ movie_id: input.value.trim() || null })
          });
          const data = await res.json().catch(()=> ({}));
          if (!res.ok) return alert(data?.message || 'Lưu thất bại.');
          alert('Đã lưu.');
        }catch{ alert('Lỗi kết nối.'); }
      });

      els.images.querySelectorAll('[data-act="del-img"]').forEach(b => b.onclick = async (e)=>{
        const imageId = e.currentTarget.getAttribute('data-image-id');
        if (!confirm('Xoá ảnh này?')) return;
        try{
          const res = await authFetch(`${API_BASE}/banners/${bannerId}/images/${imageId}`, { method:'DELETE' });
          const data = await res.json().catch(()=> ({}));
          if (!res.ok) return alert(data?.message || 'Xoá thất bại.');
          await loadImagesOf(bannerId);
          await loadList();
        }catch{ alert('Lỗi kết nối.'); }
      });

    }catch{
      els.images.innerHTML = `<div class="muted">Không tải được ảnh.</div>`;
    }
  }

  async function onRowAction(e){
    const id = e.currentTarget.getAttribute('data-id');
    const act = e.currentTarget.getAttribute('data-act');

    if (act === 'select'){
      await loadImagesOf(id);
      return;
    }
    if (act === 'toggle' && canManage){
      try{
        const res = await authFetch(`${API_BASE}/banners/${id}/toggle`, { method:'PATCH' });
        const data = await res.json().catch(()=> ({}));
        if (!res.ok) return alert(data?.message || 'Thất bại.');
        await loadList();
      }catch{ alert('Lỗi kết nối.'); }
      return;
    }
    if (act === 'edit' && canManage){
      const b = raw.find(x => x._id === id);
      if (!b) return;
      openBannerForm('edit', b);
      return;
    }
    if (act === 'upload' && canManage){
      openUploadDialog(id);
      return;
    }
    if (act === 'del' && canManage){
      if (!confirm('Xoá banner và toàn bộ ảnh của nó?')) return;
      try{
        const res = await authFetch(`${API_BASE}/banners/${id}`, { method:'DELETE' });
        const data = await res.json().catch(()=> ({}));
        if (!res.ok) return alert(data?.message || 'Xoá thất bại.');
        if (selectedBanner && selectedBanner._id === id){
          selectedBanner = null; els.selected.textContent = 'Chưa chọn banner.'; els.images.innerHTML = '';
        }
        await loadList();
      }catch{ alert('Lỗi kết nối.'); }
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
