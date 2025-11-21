window.FMPages = window.FMPages || {};

window.FMPages.users = async function (pageEl, ctx) {
  const {
    API_BASE, authFetch, showToast, openModal,
    html, $, $$, esc,
    setInputError, clearInputError,
    getUser, ymd
  } = ctx;

  /* ============================================================
   *  COPY TOÀN BỘ CODE CŨ — GIỮ NGUYÊN FULL LOGIC
   * ============================================================ */

  pageEl.innerHTML = await (await fetch("pages/users/users.html")).text();

  // ----------------- Query elements -------------------
  const els = {
    q: $('#usr-q', pageEl),
    table: $('#usr-table', pageEl),
    info: $('#usr-info', pageEl),
    prev: $('#usr-prev', pageEl),
    next: $('#usr-next', pageEl),
    pg: $('#usr-page', pageEl)
  };

  const cuEls = {
    username: $('#cu-username', pageEl),
    email: $('#cu-email', pageEl),
    password: $('#cu-password', pageEl),
    fullname: $('#cu-fullname', pageEl),
    phone: $('#cu-phone', pageEl),
    role: $('#cu-role', pageEl),
    birth: $('#cu-birth', pageEl),
    help: $('#cu-help', pageEl),
    cinemaWrap: $('#cu-cinema-wrap', pageEl),
    cinema: $('#cu-cinema', pageEl)
  };

  // ----------------- STATE -------------------
  let raw = [];
  let view = [];
  let page = 1;
  const pageSize = 6;
  let cinemas = [];

  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  const phoneRegex = /^0\d{9}$/;

  function fmtYMD(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // limit birth range 20–50
  function setBirthBounds(inputEl) {
    if (!inputEl) return;
    const now = new Date();
    const max = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
    const min = new Date(now.getFullYear() - 50, now.getMonth(), now.getDate());
    inputEl.setAttribute("max", fmtYMD(max));
    inputEl.setAttribute("min", fmtYMD(min));
  }
  setBirthBounds(cuEls.birth);

  function calcAge(isoDate) {
    if (!isoDate) return null;
    const dob = new Date(isoDate);
    if (isNaN(dob)) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const mo = now.getMonth() - dob.getMonth();
    if (mo < 0 || (mo === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  }

  // ----------------- LOAD CINEMAS -------------------
  async function loadCinemas() {
    try {
      const res = await authFetch(`${API_BASE}/cinemas?limit=1000`);
      const d = await res.json();
      const items = Array.isArray(d) ? d :
                    Array.isArray(d.items) ? d.items :
                    Array.isArray(d.data) ? d.data : [];
      cinemas = items;
      cuEls.cinema.innerHTML = [
        `<option value="">-- Chọn rạp --</option>`,
        ...cinemas.map(c => `<option value="${c._id}">${c.name}${c.city?' - '+c.city:''}</option>`)
      ].join('');
    } catch {
      cuEls.cinema.innerHTML = `<option value="">Không tải được danh sách rạp</option>`;
    }
  }

  // ----------------- LOAD USERS -------------------
  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải người dùng...</div>`;
    try {
      const res = await authFetch(`${API_BASE}/users`);
      const data = await res.json();
      raw = Array.isArray(data) ? data : [];
      applyFilter();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được người dùng.</div>`;
    }
  }

  function applyFilter() {
    const q = (els.q.value || "").trim().toLowerCase();
    view = !q ? raw : raw.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
    page = 1;
    renderTable();
  }

  function badgeStatus(s) {
    if (s === "disabled") return `<span class="badge muted">disabled</span>`;
    return `<span class="badge ok">active</span>`;
  }

  function renderTable() {
    const total = view.length;
    const start = (page - 1) * pageSize;
    const rows = view.slice(start, start + pageSize);

    if (!rows.length) {
      els.table.innerHTML = `<div class="muted">Không có người dùng.</div>`;
      return;
    }

    els.table.innerHTML = html`
      <table class="table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Họ tên</th>
            <th>Role</th>
            <th>Rạp</th>
            <th>Trạng thái</th>
            <th style="width:240px">Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(u => html`
            <tr data-id="${u._id}">
              <td>${u.username}</td>
              <td>${u.email}</td>
              <td>${u.full_name || ''}</td>
              <td>${u.role}</td>
              <td>${u.cinema?.name || ''}</td>
              <td>${badgeStatus(u.status)}</td>
              <td>
                <div class="row-actions">
                  <button class="btn" data-act="edit" data-id="${u._id}">Sửa</button>
                  ${u.status === "disabled"
                    ? `<button class="btn" data-act="restore" data-id="${u._id}">Khôi phục</button>`
                    : `<button class="btn danger" data-act="del" data-id="${u._id}">Xoá</button>`
                  }
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    els.pg.textContent = page;
    els.table.querySelectorAll("[data-act]").forEach(btn => btn.onclick = onRowAction);
  }

  // ----------------- EDIT USER MODAL -------------------
  function openEditUserForm(user) {
    const formHtml = html`
      <div class="modal-head"><h3>Sửa người dùng</h3></div>
      <div class="form">
        <div class="row">
          <div class="col-6 field"><label>Username</label><input id="eu-username" value="${user.username}" disabled></div>
          <div class="col-6 field"><label>Email *</label><input id="eu-email" value="${user.email}"></div>
          <div class="col-6 field"><label>Họ tên *</label><input id="eu-fullname" value="${user.full_name || ''}"></div>
          <div class="col-6 field"><label>SĐT *</label><input id="eu-phone" value="${user.phone || ''}"></div>
          <div class="col-6 field"><label>Ngày sinh</label><input id="eu-birth" type="date" value="${user.birth_date || ''}" class="fm-date"></div>
          <div class="col-6 field"><label>Avatar (URL)</label><input id="eu-avatar" value="${user.avatar || ''}"></div>
          <div class="col-6 field">
            <label>Vai trò *</label>
            <select id="eu-role">
              <option value="customer" ${user.role==="customer"?'selected':''}>customer</option>
              <option value="staff" ${user.role==="staff"?'selected':''}>staff</option>
              <option value="manager" ${user.role==="manager"?'selected':''}>manager</option>
              <option value="admin" ${user.role==="admin"?'selected':''}>admin</option>
            </select>
          </div>

          <div class="col-6 field">
            <label>Trạng thái</label>
            <select id="eu-status">
              <option value="active" ${user.status!=="disabled"?'selected':''}>active</option>
              <option value="disabled" ${user.status==="disabled"?'selected':''}>disabled</option>
            </select>
          </div>
        </div>
        <div id="eu-error" class="error-text" style="margin-top:6px"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="eu-cancel">Hủy</button>
        <button class="btn primary" id="eu-submit">Lưu</button>
      </div>
    `;

    openModal(formHtml, ({ el, close }) => {
      const $g = id => el.querySelector(`#${id}`);

      const emailEl = $g("eu-email");
      const fullEl = $g("eu-fullname");
      const phoneEl = $g("eu-phone");
      const birthEl = $g("eu-birth");
      const roleEl = $g("eu-role");
      const errEl = $g("eu-error");

      setBirthBounds(birthEl);

      function requireField(el) {
        if (!(el.value || "").trim()) {
          setInputError(el, "Hãy nhập đủ thông tin");
          return false;
        }
        clearInputError(el);
        return true;
      }

      $g("eu-cancel").onclick = close;
      $g("eu-submit").onclick = async () => {
        errEl.textContent = "";

        let ok = true;
        ok = requireField(emailEl) && ok;
        ok = requireField(fullEl) && ok;
        ok = requireField(phoneEl) && ok;

        const email = emailEl.value.trim().toLowerCase();
        if (!emailRegex.test(email)) {
          setInputError(emailEl, "Email phải @gmail.com hợp lệ");
          ok = false;
        }

        const phone = phoneEl.value.trim();
        if (!phoneRegex.test(phone)) {
          setInputError(phoneEl, "SĐT phải bắt đầu 0 và đủ 10 số");
          ok = false;
        }

        const birthVal = birthEl.value.trim();
        if (birthVal) {
          const age = calcAge(birthVal);
          if (age !== null && (age < 20 || age > 50)) {
            setInputError(birthEl, "Tuổi phải 20–50");
            ok = false;
          }
        }

        if (!ok) return;

        const body = {
          email,
          full_name: fullEl.value.trim(),
          phone,
          avatar: ($g("eu-avatar").value || "").trim(),
          role: roleEl.value,
          status: $g("eu-status").value
        };
        if (birthVal) body.birth_date = birthVal;

        try {
          const res = await authFetch(`${API_BASE}/users/${user._id}`, {
            method: "PUT",
            body
          });
          const data = await res.json();

          if (!res.ok) {
            errEl.textContent = data?.message || "Cập nhật thất bại";
            return;
          }
          close();
          loadList();
        } catch {
          errEl.textContent = "Lỗi kết nối";
        }
      };
    });
  }

  // ----------------- ROW ACTIONS -------------------
  async function onRowAction(e) {
    const id = e.currentTarget.dataset.id;
    const act = e.currentTarget.dataset.act;
    const user = raw.find(x => x._id === id);
    if (!user) return;

    if (act === "edit") return openEditUserForm(user);

    if (act === "del") {
      const cfHtml = html`
        <div class="modal-head"><h3>Vô hiệu hoá tài khoản</h3></div>
        <div class="form"><p>Bạn chắc chắn muốn vô hiệu hoá tài khoản này?</p></div>
        <div class="modal-foot">
          <button class="btn" id="cf-cancel">Hủy</button>
          <button class="btn danger" id="cf-ok">Xác nhận</button>
        </div>
      `;
      openModal(cfHtml, ({ el, close }) => {
        el.querySelector("#cf-cancel").onclick = close;
        el.querySelector("#cf-ok").onclick = async () => {
          close();
          try {
            const res = await authFetch(`${API_BASE}/users/${id}`, { method:"DELETE" });
            if (!res.ok) {
              await authFetch(`${API_BASE}/users/${id}`, {
                method:"PUT",
                body:{ status:"disabled" }
              });
            }
            loadList();
          } catch { showToast("Lỗi kết nối", "err"); }
        };
      });
      return;
    }

    if (act === "restore") {
      try {
        await authFetch(`${API_BASE}/users/${id}`, {
          method:"PUT",
          body:{ status:"active" }
        });
        loadList();
      } catch {
        showToast("Lỗi kết nối", "err");
      }
      return;
    }
  }

  // ----------------- CREATE USER -------------------
  async function onCreateUserSubmit() {
    cuEls.help.textContent = "";
    [cuEls.username, cuEls.email, cuEls.password,
     cuEls.fullname, cuEls.phone, cuEls.role,
     cuEls.birth, cuEls.cinema].forEach(el => el && clearInputError(el));

    let ok = true;

    function requireField(el) {
      if (!el) return true;
      if (!(el.value || "").trim()) {
        setInputError(el, "Hãy nhập đủ thông tin"); ok = false;
        return false;
      }
      clearInputError(el);
      return true;
    }

    // basic required
    requireField(cuEls.username);
    requireField(cuEls.email);
    requireField(cuEls.password);
    requireField(cuEls.fullname);
    requireField(cuEls.phone);
    requireField(cuEls.role);

    const roleVal = cuEls.role.value;
    const needCinema = roleVal === "staff" || roleVal === "manager";
    if (needCinema) requireField(cuEls.cinema);

    const emailVal = cuEls.email.value.trim().toLowerCase();
    if (!emailRegex.test(emailVal)) {
      setInputError(cuEls.email, "Email @gmail.com hợp lệ");
      ok = false;
    }

    const phoneVal = cuEls.phone.value.trim();
    if (!phoneRegex.test(phoneVal)) {
      setInputError(cuEls.phone, "SĐT phải bắt đầu 0 và đủ 10 số");
      ok = false;
    }

    const birthVal = cuEls.birth.value.trim();
    if (birthVal) {
      const age = calcAge(birthVal);
      if (age !== null && (age < 20 || age > 50)) {
        setInputError(cuEls.birth, "Tuổi phải 20–50");
        ok = false;
      }
    }

    if (cuEls.password.value.length < 8) {
      setInputError(cuEls.password, "Mật khẩu ≥8 ký tự");
      ok = false;
    }

    if (!ok) {
      if (!cuEls.help.textContent)
        cuEls.help.textContent = "Vui lòng kiểm tra các trường tô đỏ.";
      return;
    }

    const body = {
      username: cuEls.username.value.trim(),
      email: emailVal,
      password: cuEls.password.value,
      full_name: cuEls.fullname.value.trim(),
      phone: phoneVal,
      role: roleVal
    };
    if (birthVal) body.birth_date = birthVal;
    if (needCinema) body.cinema = cuEls.cinema.value;

    try {
      const res = await authFetch(`${API_BASE}/users/admin-create`, {
        method:"POST",
        body
      });
      const data = await res.json();
      if (!res.ok) {
        cuEls.help.textContent = data?.message || "Tạo tài khoản thất bại";
        return;
      }

      showToast("Đã tạo tài khoản nhân sự", "ok");
      cuEls.username.value = "";
      cuEls.email.value = "";
      cuEls.password.value = "";
      cuEls.fullname.value = "";
      cuEls.phone.value = "";
      cuEls.birth.value = "";
      cuEls.role.value = "staff";
      cuEls.cinema.value = "";

      loadList();
    } catch {
      cuEls.help.textContent = "Lỗi kết nối";
    }
  }

  // ----------------- EVENTS -------------------
  $("#btn-create-user", pageEl).onclick = onCreateUserSubmit;

  cuEls.role.onchange = () => {
    const need = cuEls.role.value === "staff" || cuEls.role.value === "manager";
    cuEls.cinemaWrap.style.display = need ? "" : "none";
    if (!need) cuEls.cinema.value = "";
  };

  els.q.oninput = () => { page = 1; applyFilter(); };
  els.prev.onclick = () => { if (page > 1) { page--; renderTable(); } };
  els.next.onclick = () => {
    const max = Math.ceil(view.length / pageSize);
    if (page < max) { page++; renderTable(); }
  };

  // INIT
  await loadCinemas();
  await loadList();

  // Toolbar
  return {
    onToolbar: {
      reload: () => loadList(),
      create: () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };
};
