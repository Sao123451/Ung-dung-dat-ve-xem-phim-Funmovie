// pages/rooms/rooms.js
window.FMPages = window.FMPages || {};

window.FMPages.rooms = async function (container, ctx) {
  const { $, $$, html, authFetch, API_BASE, showToast, setInputError, clearInputError, openModal, getUser } = ctx;

  // Load HTML vào container
  const htmlUrl = "pages/rooms/rooms.html";
  const htmlText = await fetch(htmlUrl).then(r => r.text());
  container.innerHTML = htmlText;

  /* =======================
   * DOM Elements
   * ======================= */
  const els = {
    q:        $('#rm-q', container),
    cinema:   $('#rm-cinema', container),
    type:     $('#rm-type', container),
    table:    $('#rm-table', container),
    info:     $('#rm-info', container),
    prev:     $('#rm-prev', container),
    next:     $('#rm-next', container),
    page:     $('#rm-page', container),
  };

  const me = getUser();
  const canManage = ['admin','manager'].includes(me.role);

  /* =======================
   * State
   * ======================= */
  let raw = [];
  let view = [];
  let page = 1;
  const pageSize = 10;

  /* =======================
   * Helpers
   * ======================= */
  function showListError(msg, isError = false) {
    els.info.textContent = msg || "";
    els.info.classList.toggle("error-text", isError);
  }

  function debounce(fn, t = 300) {
    let id;
    return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), t); };
  }

  /* =======================
   * Nạp danh sách rạp
   * ======================= */
  async function fetchCinemasAll() {
    const url = new URL(`${API_BASE}/cinemas`);
    url.searchParams.set("limit", "200");

    const res = await authFetch(url);
    const js = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(js?.message || "load cinemas failed");

    return js.items || [];
  }

  async function fillCinemaSelect(selectEl) {
    try {
      const list = await fetchCinemasAll();
      selectEl.innerHTML = `<option value="">-- Tất cả rạp --</option>`;
      list.forEach(c => {
        const o = document.createElement("option");
        o.value = c._id;
        o.textContent = `${c.name}${c.city ? ' • ' + c.city : ''}`;
        selectEl.appendChild(o);
      });
    } catch { }
  }

  /* =======================
   * Fetch Rooms
   * ======================= */
  async function fetchRooms(params = {}) {
    const url = new URL(`${API_BASE}/rooms`);
    if (params.q) url.searchParams.set("q", params.q);
    if (params.cinema) url.searchParams.set("cinema", params.cinema);
    if (params.type) url.searchParams.set("type", params.type);
    url.searchParams.set("limit", "500");

    const res = await authFetch(url);
    const js = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(js?.message || "load rooms failed");

    return js.items || [];
  }

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
    showListError("");

    try {
      const params = {
        q: els.q.value.trim(),
        cinema: els.cinema.value,
        type: els.type.value,
      };
      raw = await fetchRooms(params);
      applyFilterAndRender();
    } catch (e) {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
      showListError("Không tải được danh sách phòng.", true);
    }
  }

  function applyFilterAndRender() {
    const q = els.q.value.trim().toLowerCase();
    view = raw.filter(r => !q || (r.name || "").toLowerCase().includes(q));
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
            <th>Phòng</th>
            <th>Rạp</th>
            <th>Loại</th>
            <th>Layout</th>
            <th>RxC</th>
            <th>Sức chứa</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => html`
            <tr data-id="${r._id}">
              <td>${r.name}</td>
              <td>${r.cinema?.name || ""}</td>
              <td>${r.type}</td>
              <td>${r.layout_key}</td>
              <td>${r.rows}×${r.cols}</td>
              <td>${r.capacity}</td>
              <td>
                <div class="row-actions">
                  ${canManage ? `
                    <button class="btn" data-act="edit" data-id="${r._id}">Sửa</button>
                    <button class="btn danger" data-act="del" data-id="${r._id}">Xóa</button>
                  ` : ""}
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    $$("#rm-table [data-act]", container).forEach(btn => {
      btn.onclick = onRowAction;
    });

    els.info.textContent = `Hiển thị ${start + 1}–${Math.min(start + rows.length, total)} / ${total}`;
  }

  /* =======================
   * Modal Form
   * ======================= */
  function openRoomForm(mode, data = {}) {
  const isEdit = mode === "edit";

  const htmlForm = html`
    <div class="modal-head"><h3>${isEdit ? "Sửa phòng" : "Thêm phòng"}</h3></div>
    <div class="form">
      <div class="row">
        <div class="col-6 field">
          <label>Rạp *</label>
          <select id="f-cinema"></select>
        </div>

        <div class="col-6 field">
          <label>Tên phòng *</label>
          <input id="f-name" value="${data.name || ""}">
        </div>

        <div class="col-6 field">
          <label>Loại *</label>
          <select id="f-type">
            <option value="2D"   ${data.type === '2D' ? 'selected' : ''}>2D</option>
            <option value="3D"   ${data.type === '3D' ? 'selected' : ''}>3D</option>
            <option value="IMAX" ${data.type === 'IMAX' ? 'selected' : ''}>IMAX</option>
          </select>
        </div>

        <!-- ============ LAYOUT ============ -->
        ${isEdit ? html`
          <div class="col-6 field">
            <label>Layout hiện tại</label>
            <div class="muted" style="padding:8px 0; font-weight:600;">
              ${data.layout_key}
            </div>
          </div>
        ` : html`
          <div class="col-6 field">
            <label>Layout *</label>
            <select id="f-layout">
              <option value="STD_10x10" ${data.layout_key === 'STD_10x10' ? 'selected' : ''}>STD_10x10</option>
              <option value="STD_10x12" ${data.layout_key === 'STD_10x12' ? 'selected' : ''}>STD_10x12</option>
              <option value="STD_8x10"  ${data.layout_key === 'STD_8x10'  ? 'selected' : ''}>STD_8x10</option>
              <option value="STD_8x8"   ${data.layout_key === 'STD_8x8'   ? 'selected' : ''}>STD_8x8</option>
            </select>
          </div>
        `}
      </div>

      <div id="f-error" class="error-text"></div>
    </div>

    <div class="modal-foot">
      <button class="btn" id="f-cancel">Hủy</button>
      <button class="btn primary" id="f-submit">${isEdit ? "Lưu" : "Tạo phòng"}</button>
    </div>
  `;

  openModal(htmlForm, async ({ el, close }) => {
    const iCinema = $('#f-cinema', el);
    const iName   = $('#f-name', el);
    const iType   = $('#f-type', el);
    const iLayout = $('#f-layout', el); // (undefined ở chế độ edit)
    const errEl   = $('#f-error', el);

    // Load rạp
    await fillCinemaSelect(iCinema);
    if (data.cinema?._id) iCinema.value = data.cinema._id;

    $('#f-cancel', el).onclick = close;

    $('#f-submit', el).onclick = async () => {
      [iCinema, iName, iType].forEach(clearInputError);
      errEl.textContent = "";

      let ok = true;
      if (!iCinema.value) { setInputError(iCinema, "Chọn rạp"); ok = false; }
      if (!iName.value.trim()) { setInputError(iName, "Nhập tên phòng"); ok = false; }
      if (!iType.value) { setInputError(iType, "Chọn loại"); ok = false; }

      // Chỉ yêu cầu layout khi tạo
      if (!isEdit && !iLayout.value) {
        setInputError(iLayout, "Chọn layout");
        ok = false;
      }
      if (!ok) return;

      /* ===========================
       * CREATE
       * =========================== */
      if (!isEdit) {
        try {
          const res = await authFetch(`${API_BASE}/rooms`, {
            method: "POST",
            body: {
              cinema: iCinema.value,
              name: iName.value.trim(),
              type: iType.value,
              layout_key: iLayout.value
            }
          });
          const js = await res.json();
          if (!res.ok) return errEl.textContent = js.message || "Tạo phòng thất bại.";
          close();
          await loadList();
          showToast("Đã tạo phòng", "ok");
        } catch {
          errEl.textContent = "Lỗi kết nối";
        }
        return;
      }

      /* ===========================
       * EDIT (Không cho sửa layout)
       * =========================== */
      try {
        const putRes = await authFetch(`${API_BASE}/rooms/${data._id}`, {
          method: "PUT",
          body: {
            cinema: iCinema.value,
            name: iName.value.trim(),
            type: iType.value
          }
        });
        const putJs = await putRes.json();
        if (!putRes.ok)
          return errEl.textContent = putJs.message || "Cập nhật phòng thất bại";

        // ❌ Không regenerate seats
        // Không tái sinh ghế khi sửa

        close();
        await loadList();
        showToast("Lưu thành công", "ok");

      } catch {
        errEl.textContent = "Lỗi kết nối";
      }
    };
  });
}


  /* =======================
   * Row Actions
   * ======================= */
  async function onRowAction(e) {
    const id = e.currentTarget.dataset.id;
    const act = e.currentTarget.dataset.act;
    const room = raw.find(r => r._id === id);
    if (!room) return;

    if (act === "edit") return openRoomForm("edit", room);

    if (act === "del") {
      const htmlConfirm = html`
        <div class="modal-head"><h3>Xác nhận xoá</h3></div>
        <div class="form"><p>Bạn có chắc muốn xoá phòng "${room.name}"?</p></div>
        <div class="modal-foot">
          <button class="btn" id="cf-cancel">Hủy</button>
          <button class="btn danger" id="cf-ok">Xác nhận</button>
        </div>
      `;
      openModal(htmlConfirm, ({ el, close }) => {
        $('#cf-cancel', el).onclick = close;
        $('#cf-ok', el).onclick = async () => {
          try {
            const res = await authFetch(`${API_BASE}/rooms/${id}`, { method: 'DELETE' });
            const js = await res.json();
            if (!res.ok) {
              showListError(js.message || "Xoá thất bại", true);
            } else {
              await loadList();
              showListError("Đã xoá phòng", false);
            }
          } catch {
            showListError("Lỗi kết nối khi xoá", true);
          }
          close();
        };
      });
    }
  }

  /* =======================
   * Events
   * ======================= */
  els.q.addEventListener("input", debounce(loadList, 300));
  els.cinema.addEventListener("change", loadList);
  els.type.addEventListener("change", loadList);
  els.prev.onclick = () => { if (page > 1) { page--; renderTable(); } };
  els.next.onclick = () => {
    const max = Math.ceil(view.length / pageSize) || 1;
    if (page < max) { page++; renderTable(); }
  };

  /* =======================
   * Init
   * ======================= */
  await fillCinemaSelect(els.cinema);
  await loadList();

  return {
    onToolbar: {
      reload: () => loadList(),
      create: () => openRoomForm("create")
    }
  };
};
