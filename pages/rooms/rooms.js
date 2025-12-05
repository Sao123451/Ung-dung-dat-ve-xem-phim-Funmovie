// pages/rooms/rooms.js
window.FMPages = window.FMPages || {};

window.FMPages.rooms = async function (container, ctx) {
  const {
    $, $$, html, authFetch, API_BASE, showToast,
    setInputError, clearInputError, openModal, getUser
  } = ctx;

  // ⭐ DÙNG LẠI CSS SƠ ĐỒ GHẾ CỦA SUẤT CHIẾU
  (function ensureShowtimeCss() {
    if (document.querySelector('link[data-fm-showtimes-css]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "pages/showtimes/showtimes.css?v=" + Date.now();
    link.dataset.fmShowtimesCss = "1";
    document.head.appendChild(link);
  })();

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

  // ⭐ Helper: chuyển danh sách ghế -> grid theo hàng (có _id để PATCH)
  function toSeatGridForRoom(seats) {
    const map = {};
    (seats || []).forEach(s => {
      if (!s.row) return;
      if (!map[s.row]) map[s.row] = [];
      map[s.row].push({
        _id: s._id,
        row: s.row,
        number: s.number,
        seat_type: s.seat_type || "normal",
        seat_status: s.seat_status || s.status || "available"
      });
    });

    return Object.keys(map).sort().map(row => ({
      row,
      seats: map[row].sort((a, b) => a.number - b.number)
    }));
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
    } catch {
      selectEl.innerHTML = `<option value="">Không tải được danh sách rạp</option>`;
    }
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
   * Modal Form + Seat Map
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

        ${isEdit ? html`
          <hr>
          <h4>Sơ đồ ghế</h4>

          <div class="st-legend">
            <span class="st-tag normal"><span class="dot"></span> Thường</span>
            <span class="st-tag vip"><span class="dot"></span> VIP</span>
            <span class="st-tag couple"><span class="dot"></span> Couple</span>
            <span class="st-tag sold"><span class="dot"></span> Đã bán</span>
            <span class="st-tag broken"><span class="dot"></span> Hỏng</span>
          </div>

          <p class="muted" style="margin-bottom:6px">
            Nhấp vào ghế để chuyển trạng thái: Trống ↔ Hỏng (ghế đã bán chỉ xem, không sửa).
          </p>

          <div id="rm-seat-wrap">
            <div class="muted">Đang tải sơ đồ ghế...</div>
          </div>
        ` : ""}

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

      // ⭐ Track ghế bị đổi trạng thái: { seatId: newStatus }
      const seatChanges = {};

      // ⭐ Load sơ đồ ghế cho phòng (EDIT mode)
      async function loadSeatMapForRoom(roomId) {
        const wrap = $('#rm-seat-wrap', el);
        if (!wrap) return;

        wrap.innerHTML = `<div class="muted">Đang tải ghế...</div>`;

        try {
          const res = await authFetch(`${API_BASE}/seats?room=${roomId}&limit=500`);
          const js = await res.json().catch(() => ({}));

          let list = [];
          if (Array.isArray(js.items)) list = js.items;
          else if (Array.isArray(js.data)) list = js.data;
          else if (Array.isArray(js)) list = js;

          const grid = toSeatGridForRoom(list);

          if (!grid.length) {
            wrap.innerHTML = `<div class="muted">Không có ghế nào trong phòng này.</div>`;
            return;
          }

          // Render html
          wrap.innerHTML = `
            <div class="seat-map">
              ${grid.map(row => `
                <div class="st-row">
                  <div class="st-label">${row.row}</div>
                  <div class="st-cells">
                    ${row.seats.map(s => {
                      const status = s.seat_status || "available";
                      const statusClass =
                        status === "broken" ? "broken" :
                        status === "sold"   ? "sold"   : "";
                      return `
                        <div class="st-seat ${s.seat_type} ${statusClass}"
                             data-id="${s._id}"
                             data-status="${status}">
                          ${s.number}
                        </div>
                      `;
                    }).join("")}
                  </div>
                </div>
              `).join("")}
            </div>
          `;

          // Click để đổi trạng thái
          wrap.onclick = (e) => {
            const seatEl = e.target.closest(".st-seat");
            if (!seatEl) return;

            const id = seatEl.dataset.id;
            if (!id) return;

            let status = seatEl.dataset.status || "available";

            // Không cho sửa ghế đã bán (sold)
            if (status === "sold") return;

            // Toggle available <-> broken
            let next = status === "broken" ? "available" : "broken";

            seatEl.dataset.status = next;

            // Cập nhật class để đổi màu
            seatEl.classList.remove("broken");
            if (next === "broken") {
              seatEl.classList.add("broken");
            }

            seatChanges[id] = next;
          };

        } catch (err) {
          console.error(err);
          wrap.innerHTML = `<div class="muted error-text">Lỗi tải sơ đồ ghế</div>`;
        }
      }

      // Load rạp
      await fillCinemaSelect(iCinema);
      if (data.cinema?._id) iCinema.value = data.cinema._id;

      // Nếu đang sửa thì nạp luôn sơ đồ ghế
      if (isEdit && data._id) {
        loadSeatMapForRoom(data._id);
      }

      $('#f-cancel', el).onclick = close;

      $('#f-submit', el).onclick = async () => {
        [iCinema, iName, iType].forEach(clearInputError);
        if (iLayout) clearInputError(iLayout);
        errEl.textContent = "";

        let ok = true;
        if (!iCinema.value) { setInputError(iCinema, "Chọn rạp"); ok = false; }
        if (!iName.value.trim()) { setInputError(iName, "Nhập tên phòng"); ok = false; }
        if (!iType.value) { setInputError(iType, "Chọn loại"); ok = false; }

        // Chỉ yêu cầu layout khi tạo
        if (!isEdit && (!iLayout || !iLayout.value)) {
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
         * EDIT (không đổi layout) + CẬP NHẬT GHẾ
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

          // ⭐ Nếu có ghế bị đổi trạng thái → PATCH lên /seats/:id/status
          const seatIds = Object.keys(seatChanges);
          if (seatIds.length) {
            try {
              await Promise.all(
                seatIds.map(sid =>
                  authFetch(`${API_BASE}/seats/${sid}/status`, {
                    method: "PATCH",
                    body: {
                      seat_status: seatChanges[sid],
                      status: seatChanges[sid] // phòng khi backend dùng field khác
                    }
                  })
                )
              );
            } catch (e) {
              console.warn("Lỗi cập nhật trạng thái ghế", e);
              showToast("Cập nhật một số ghế không thành công", "warn");
            }
          }

          close();
          await loadList();
          showToast("Lưu phòng & sơ đồ ghế thành công", "ok");

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
    const id  = e.currentTarget.dataset.id;
    const act = e.currentTarget.dataset.act;
    const room = raw.find(r => r._id === id);
    if (!room) return;

    if (act === "edit") {
      return openRoomForm("edit", room);
    }

    if (act === "del") {
      if (!canManage) {
        showListError("Chỉ Admin/Manager mới được xoá phòng.", true);
        return;
      }

      // ... PHẦN XOÁ PHÒNG GIỮ NGUYÊN NHƯ CŨ ...
      try {
        const u = new URL(`${API_BASE}/showtimes`);
        u.searchParams.set("room", id);
        u.searchParams.set("limit", "50");

        const resSt = await authFetch(u.toString());
        const jsSt  = await resSt.json().catch(() => ({}));

        let list = [];
        if (Array.isArray(jsSt.items)) list = jsSt.items;
        else if (Array.isArray(jsSt.data)) list = jsSt.data;
        else if (Array.isArray(jsSt))      list = jsSt;

        const related = list.filter(st => {
          const r = st.room || st.room_id || st.roomId;
          if (!r) return false;
          if (typeof r === "string") return r === id;
          if (typeof r === "object") return r._id === id;
          return false;
        });

        if (related.length > 0) {
          openModal(html`
            <div class="modal-head"><h3>Không thể xoá phòng</h3></div>
            <div class="form">
              <p>Phòng <b>${room.name}</b> hiện vẫn còn suất chiếu.</p>
              <p class="muted" style="margin-top:4px">
                Vui lòng xoá hoặc chuyển hết suất chiếu sang phòng khác trước khi xoá phòng này.
              </p>
            </div>
            <div class="modal-foot">
              <button class="btn" id="ok">Đã hiểu</button>
            </div>
          `, ({ el, close }) => {
            $('#ok', el).onclick = close;
          });
          return;
        }
      } catch (err) {
        showToast("Không kiểm tra được suất chiếu của phòng. Vui lòng thử lại.", "err");
        return;
      }

      const htmlConfirm = html`
        <div class="modal-head"><h3>Xác nhận xoá</h3></div>
        <div class="form">
          <p>Bạn có chắc muốn xoá phòng "<b>${room.name}</b>"?</p>
        </div>
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
            const js  = await res.json().catch(() => ({}));
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
