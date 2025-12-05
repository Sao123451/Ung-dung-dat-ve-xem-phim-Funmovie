window.FMPages = window.FMPages || {};

window.FMPages.showtimes = async function (pageEl, ctx) {

  // Load HTML template
  pageEl.innerHTML = await (await fetch("pages/showtimes/showtimes.html")).text();
  await loadCSS("pages/showtimes/showtimes.css");

  // ===== ctx shortcuts =====
  const { $, $$, html, esc, authFetch, showToast, ymd, fmtTime, fmtDate,
    openModal, setInputError, clearInputError } = ctx;

  // ===== DOM =====
  const elCinema = $("#st-cinema");
  const elRoom = $("#st-room");
  const elMovie = $("#st-movie");
  const elDate = $("#st-date");
  const elStatus = $("#st-status");
  const btnFilter = $("#st-btn-filter");
  const tbody = $("#st-tbody");
  const pager = $("#st-pager");

  /* ============================================================
   * 1) LOAD CINEMAS
   * ============================================================ */
  async function loadCinemas() {
    const res = await authFetch("cinemas?limit=1000");
    const data = await res.json().catch(() => []);
    elCinema.innerHTML = data?.items?.length
      ? data.items.map(c => `<option value="${c._id}">${esc(c.name)}</option>`).join("")
      : `<option value="">Không có rạp</option>`;
  }

  /* ============================================================
   * 2) LOAD ROOMS THEO CINEMA
   * ============================================================ */
  async function loadRooms() {
    const cinema = elCinema.value;
    elRoom.innerHTML = `<option value="">Tất cả</option>`;

    if (!cinema) return;

    const res = await authFetch(`rooms?cinema=${cinema}&limit=500`);
    const data = await res.json().catch(() => []);

    if (data?.items?.length) {
      elRoom.innerHTML += data.items
        .map(r => `<option value="${r._id}">${esc(r.name)} • ${r.type}</option>`)
        .join("");
    }
  }

  /* ============================================================
   * 3) LOAD MOVIES
   * ============================================================ */
  async function loadMovies() {
    const res = await authFetch("movies");
    const data = await res.json().catch(() => []);
    elMovie.innerHTML = `<option value="">Tất cả</option>`;
    if (Array.isArray(data)) {
      elMovie.innerHTML += data
        .map(m => `<option value="${m._id}">${esc(m.title)}</option>`)
        .join("");
    }
  }

  /* ============================================================
   * 4) LOAD SHOWTIMES
   * ============================================================ */
  async function loadShowtimes() {

    const q = {
      cinema: elCinema.value,
      room: elRoom.value,
      movie: elMovie.value,
      date: elDate.value,
      status: elStatus.value,
    };

    const query = Object.entries(q)
      .filter(([k, v]) => v !== "" && v != null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    const res = await authFetch(`showtimes?${query}`);
    const data = await res.json().catch(() => null);

    let list = Array.isArray(data) ? data : [];
    const now = new Date();

    list = list.map(st => {
      if (st.status === "cancelled") {
        return st;   // giữ nguyên nếu đã bị hủy
      }

      const start = new Date(st.start_time);
      const end = new Date(st.end_time);

      if (now < start) {
        st.status = "scheduled";   // chưa chiếu
      } 
      else if (now >= start && now <= end) {
        st.status = "ongoing";     // đang chiếu
      } 
      else {
        st.status = "finished";    // đã chiếu
      }

      return st;
    });


    // ========== FILTER CLIENT-SIDE ==========

    // Lọc theo rạp
    if (elCinema.value) {
      list = list.filter(st => String(st.cinema?._id) === elCinema.value);
    }

    // Lọc theo phòng
    if (elRoom.value) {
      list = list.filter(st => String(st.room?._id) === elRoom.value);
    }

    // Lọc theo phim
    if (elMovie.value) {
      list = list.filter(st => String(st.movie?._id) === elMovie.value);
    }

    // Lọc theo trạng thái
    if (elStatus.value) {
      list = list.filter(st => st.status === elStatus.value);
    }

    // Lọc theo ngày chiếu KHÔNG bị +1 ngày
    if (elDate.value) {
      list = list.filter(st => {
        const d = new Date(st.start_time);

        // format yyyy-mm-dd LOCAL
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");

        const localStr = `${yyyy}-${mm}-${dd}`;
        return localStr === elDate.value;
      });
    }


    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center muted">Không có dữ liệu</td></tr>`;
      pager.innerHTML = "";
      return;
    }

    tbody.innerHTML = list
      .map(st => html`
        <tr>
          <td>${esc(st.movie?.title || "")}</td>
          <td>${esc(st.cinema?.name || "")}</td>
          <td>${esc(st.room?.name || "")} • ${st.room?.type}</td>
          <td>${(st.ticket_price || 0).toLocaleString("vi-VN")}đ</td>
          <td>${fmtDate(new Date(st.start_time))} ${fmtTime(new Date(st.start_time))}</td>
          <td>${fmtTime(new Date(st.end_time))}</td>
          <td><span class="badge st ${st.status}">${st.status}</span></td>
          <td class="text-right">
            <button class="action-btn" data-id="${st._id}" data-act="detail">Chi tiết</button>
            <button class="action-btn" data-id="${st._id}" data-act="edit">Sửa</button>
            <button class="action-btn" data-id="${st._id}" data-act="del">Xóa</button>
          </td>
        </tr>
      `)
      .join("");

    pager.innerHTML = "";
  }

    /* ============================================================
   * DELETE SHOWTIME — CHẶN NẾU ĐANG CÓ VÉ ĐẶT
   * ============================================================ */
  async function deleteShowtime(id) {
    // 1) Lấy danh sách vé (có thể backend không lọc theo showtime,
    //    nên mình sẽ tự lọc trên FE bằng t.showtime)
    let tickets = [];
    try {
      const resTk = await authFetch(`tickets?showtime=${encodeURIComponent(id)}&limit=500`);
      const jsTk  = await resTk.json().catch(() => ({}));

      if (Array.isArray(jsTk.items))      tickets = jsTk.items;
      else if (Array.isArray(jsTk.data))  tickets = jsTk.data;
      else if (Array.isArray(jsTk))       tickets = jsTk;
      else                                tickets = [];
    } catch (err) {
      console.error(err);
      showToast("Không kiểm tra được vé của suất chiếu. Vui lòng thử lại.", "err");
      return;
    }

    // 2) Chỉ giữ vé thuộc đúng suất chiếu này + chưa bị hủy
    const activeTickets = tickets.filter(t => {
      const st = (t.status || "").toLowerCase();
      const showtimeId =
        (t.showtime && (t.showtime._id || t.showtime.id || t.showtime)) ||
        t.showtimeId ||
        t.showtime_id;

      const sameShowtime = String(showtimeId) === String(id);

      return sameShowtime && !["cancelled", "canceled"].includes(st);
    });

    // Nếu CÒN vé active → chặn xoá
    if (activeTickets.length > 0) {
      const htmlBlock = html`
        <h3>Không thể xoá suất chiếu</h3>
        <p>Suất chiếu này đang có <b>${activeTickets.length}</b> vé trong hệ thống.</p>
        <p class="muted" style="margin-top:4px">
          Vui lòng huỷ hoặc xử lý các vé liên quan trước khi xoá suất chiếu.
        </p>
        <div class="mt-3 text-right">
          <button class="btn primary" id="ok-btn">Đã hiểu</button>
        </div>
      `;
      const { el, close } = openModal(htmlBlock);
      $("#ok-btn", el).onclick = close;
      return;
    }

    // 3) Không còn vé → cho phép xoá như bình thường
    const modalHtml = html`
      <h3>Xóa suất chiếu?</h3>
      <p>Bạn có chắc chắn muốn xóa suất chiếu này không?</p>
      <div class="mt-3 text-right">
        <button class="btn" id="cf-cancel">Hủy</button>
        <button class="btn danger" id="cf-ok">Xóa</button>
      </div>
    `;

    const { el, close } = openModal(modalHtml);

    $("#cf-cancel", el).onclick = close;

    $("#cf-ok", el).onclick = async () => {
      const res  = await authFetch(`showtimes/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showToast(data?.message || "Không thể xóa suất chiếu", "err");
        return;
      }

      showToast("Đã xóa suất chiếu", "ok");
      close();
      loadShowtimes();
    };
  }



  /* HÀM HIỂN THỊ CHI TIẾT SUẤT CHIẾU + SƠ ĐỒ GHẾ*/
async function openShowtimeDetail(id) {
  try {
    // 1) GET SHOWTIME DETAIL
    const res1 = await authFetch(`showtimes/${id}`);
    const st = await res1.json().catch(() => null);
    // ===== Cập nhật trạng thái theo thời gian thực =====
    if (st.status !== "cancelled") {
      const now = new Date();
      const start = new Date(st.start_time);
      const end = new Date(st.end_time);

      if (now < start) st.status = "scheduled";
      else if (now >= start && now <= end) st.status = "ongoing";
      else st.status = "finished";
    }


    if (!res1.ok || !st?._id) {
      return showToast("Không thể tải suất chiếu", "err");
    }

    // 2) GET SEAT GRID (theo phòng)
    const roomId = st.room?._id;
    // ===== Lấy ghế theo suất chiếu =====
    const res2 = await authFetch(`showtimes/${id}/seats`);
    const seatData = await res2.json().catch(() => []);

    // seatData.seats là dạng list, cần chuyển sang grid
    const grid = toSeatGrid(seatData.seats);


    // 3) Render nội dung modal
    const htmlDetail = html`
      <h3>Chi tiết suất chiếu</h3>

      <div class="st-info-box">
        <div><b>Phim:</b> ${st.movie?.title}</div>
        <div><b>Rạp:</b> ${st.cinema?.name}</div>
        <div><b>Phòng:</b> ${st.room?.name}</div>
        <div><b>Loại phòng:</b> ${st.room?.type}</div>
        <div><b>Giá vé:</b> ${st.ticket_price.toLocaleString()}đ</div>
        <div><b>Bắt đầu:</b> ${fmtDate(new Date(st.start_time))} ${fmtTime(new Date(st.start_time))}</div>
        <div><b>Kết thúc:</b> ${fmtTime(new Date(st.end_time))}</div>
        <div><b>Trạng thái:</b> <span class="badge st ${st.status}">${st.status}</span></div>
      </div>

      <hr>

      <h4>🪑 Sơ đồ ghế</h4>

      <div class="st-legend">
        <span class="st-tag normal"><span class="dot"></span> Thường</span>
        <span class="st-tag vip"><span class="dot"></span> VIP</span>
        <span class="st-tag couple"><span class="dot"></span> Couple</span>
        <span class="st-tag sold"><span class="dot"></span> Đã bán</span>
        <span class="st-tag broken"><span class="dot"></span> Hỏng</span>
      </div>

      <div class="seat-map">
        ${renderSeatMap(grid)}
      </div>

      <div class="text-right mt-3">
        <button class="btn" id="st-detail-close">Đóng</button>
      </div>
    `;

    const { el, close } = openModal(htmlDetail);
    $("#st-detail-close", el).onclick = close;

  } catch (err) {
    console.error(err);
    showToast("Lỗi khi tải chi tiết suất chiếu", "err");
  }
}


function renderSeatMap(grid) {
  if (!Array.isArray(grid) || grid.length === 0) {
    return `<div class="muted text-center">Không có sơ đồ ghế</div>`;
  }

  let out = "";

  grid.forEach(row => {
    out += `
      <div class="st-row">
        <div class="st-label">${row.row}</div>
        <div class="st-cells">
          ${row.seats
            .map(seat => `
              <div class="st-seat ${seat.seat_type} ${seat.seat_status}">
                ${seat.number}
              </div>

            `)
            .join("")}
        </div>
      </div>
    `;
  });

  return out;
}



  function renderShowtimeDetail(st, room, grid) {
    const box = $("#st-detail-body");

    let html = `
    <div class="st-meta">
      <div><b>Phim:</b> ${st.movie.title}</div>
      <div><b>Rạp:</b> ${st.cinema.name}</div>
      <div><b>Phòng:</b> ${st.room.name}</div>
      <div><b>Giá vé:</b> ${st.ticket_price.toLocaleString()}đ</div>
      <div><b>Giờ chiếu:</b> ${new Date(st.start_time).toLocaleString()}</div>
      <div><b>Trạng thái:</b> ${st.status}</div>
    </div>
  `;

    html += `<div class="st-screen">MÀN HÌNH</div>`;
    html += `<div class="st-rows">`;

    // Vẽ từng hàng
    grid.forEach(row => {
      html += `<div class="st-row">
      <div class="st-label">${row.row}</div>
      <div class="st-cells">`;

      row.seats.forEach(seat => {
        const cls = `st-seat type-${seat.seat_type} st-${seat.seat_status}`;
        html += `<div class="${cls}">${seat.number}</div>`;
      });

      html += `</div></div>`;
    });

    html += `</div>`;

    html += `
    <div class="st-legend">
      <div class="st-tag"><span class="st-dot normal"></span> Thường</div>
      <div class="st-tag"><span class="st-dot vip"></span> VIP</div>
      <div class="st-tag"><span class="st-dot couple"></span> Couple</div>
      <div class="st-tag"><span class="st-dot sold"></span> Đã bán</div>
      <div class="st-tag"><span class="st-dot holding"></span> Giữ tạm</div>
      <div class="st-tag"><span class="st-dot broken"></span> Hỏng</div>
    </div>
  `;

    box.innerHTML = html;
  }

  function toSeatGrid(seats) {
  const map = {};

  seats.forEach(s => {
    if (!map[s.row]) map[s.row] = [];

    // 🔴 ƯU TIÊN TRẠNG THÁI HỎNG TỪ GHẾ VẬT LÝ
    const seatStatus =
      s.seat_status === "broken"
        ? "broken"
        : (s.status || "available");   // status theo suất chiếu

    map[s.row].push({
      number: s.number,
      seat_type: s.seat_type,
      seat_status: seatStatus
    });
  });

  return Object.keys(map).sort().map(rowLabel => ({
    row: rowLabel,
    seats: map[rowLabel].sort((a,b) => a.number - b.number)
  }));
}



  /* ============================================================
   * EVENTS
   * ============================================================ */
  elCinema.onchange = () => loadRooms();
  btnFilter.onclick = () => loadShowtimes();

  tbody.onclick = (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === "del") deleteShowtime(id);
    if (btn.dataset.act === "edit") showEditModal(id);
    if (btn.dataset.act === "detail") openShowtimeDetail(id);
  };

  /* ============================================================
   * CREATE / EDIT MODAL
   * ============================================================ */
  function showCreateModal() {
    showEditModal(null);
  }

  async function showEditModal(id) {

  let st = null;

  if (id) {
    const res = await authFetch(`showtimes/${id}`);
    st = await res.json().catch(() => null);

    if (!res.ok || !st) {
      return showToast("Không thể tải dữ liệu!", "err");
    }
  }

  const formHtml = html`
    <h3>${id ? "Chỉnh sửa suất chiếu" : "Tạo suất chiếu"}</h3>

    <div class="form mt-2">

      <label>Phim</label>
      <select id="fm-movie"></select>
      <div class="error-text"></div>

      <label>Rạp</label>
      <select id="fm-cinema"></select>
      <div class="error-text"></div>

      <label>Phòng</label>
      <select id="fm-room"></select>
      <div class="error-text"></div>

      <label>Giờ bắt đầu</label>
      <input type="datetime-local" id="fm-start">
      <div class="error-text"></div>

      <label>Giá vé</label>
      <input type="number" id="fm-price" min="1000">
      <div class="error-text"></div>

      <div class="mt-3 text-right">
        <button class="btn" id="fm-cancel">Hủy</button>
        <button class="btn primary" id="fm-save">Lưu</button>
      </div>

    </div>
  `;

  const { el, close } = openModal(formHtml);

  const fmMovie = $("#fm-movie", el);
  const fmCinema = $("#fm-cinema", el);
  const fmRoom = $("#fm-room", el);
  const fmStart = $("#fm-start", el);
  const fmPrice = $("#fm-price", el);

  // ====== LOAD MOVIES + MAP DURATION (để tính end_time) ======
  const mv = await (await authFetch("movies")).json().catch(() => []);
  const durationMap = {}; // movieId -> duration (phút)

  fmMovie.innerHTML = mv
    .map(m => {
      durationMap[m._id] = m.duration || 120;
      return `<option value="${m._id}">${esc(m.title)}</option>`;
    })
    .join("");

  // ====== LOAD CINEMAS ======
  const ci = await (await authFetch("cinemas?limit=1000")).json().catch(() => []);
  fmCinema.innerHTML = (ci.items || [])
    .map(c => `<option value="${c._id}">${esc(c.name)}</option>`)
    .join("");

  async function loadRoomsForCinema() {
    if (!fmCinema.value) {
      fmRoom.innerHTML = "";
      return;
    }
    const rm = await (await authFetch(`rooms?cinema=${fmCinema.value}&limit=500`))
      .json()
      .catch(() => []);
    fmRoom.innerHTML = (rm.items || [])
      .map(r => `<option value="${r._id}">${esc(r.name)} • ${r.type}</option>`)
      .join("");
  }

  fmCinema.onchange = loadRoomsForCinema;

  // ====== EDIT MODE: FILL DATA + KHÓA PHIM & RẠP ======
  if (id && st) {
    // set movie, cinema
    fmMovie.value = st.movie?._id;
    fmCinema.value = st.cinema?._id;

    await loadRoomsForCinema();
    fmRoom.value = st.room?._id;

    const d = new Date(st.start_time);
    fmStart.value = d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm

    fmPrice.value = st.ticket_price;

    // 👉 KHÓA KHÔNG CHO SỬA PHIM & RẠP
    fmMovie.disabled = true;
    fmCinema.disabled = true;
    // (Phòng vẫn cho đổi, vì bạn có thể muốn chuyển sang phòng khác trong cùng rạp)
  } else {
    // CREATE MODE: load rooms lần đầu
    if (fmCinema.value) {
      await loadRoomsForCinema();
    }
  }

  $("#fm-cancel", el).onclick = close;

  $("#fm-save", el).onclick = async () => {

    let ok = true;
    [fmMovie, fmCinema, fmRoom, fmStart, fmPrice].forEach(clearInputError);

    if (!fmMovie.value) { setInputError(fmMovie, "Chọn phim"); ok = false; }
    if (!fmCinema.value) { setInputError(fmCinema, "Chọn rạp"); ok = false; }
    if (!fmRoom.value) { setInputError(fmRoom, "Chọn phòng"); ok = false; }

    // ==== Validate datetime-local (NO PAST) ====
    if (!fmStart.value) {
      setInputError(fmStart, "Nhập thời gian");
      ok = false;
    } else {
      const chosen = new Date(fmStart.value);
      const now = new Date();
      if (chosen < now) {
        setInputError(fmStart, "Thời gian không được ở quá khứ");
        ok = false;
      }
    }

    if (!fmPrice.value || fmPrice.value <= 0) {
      setInputError(fmPrice, "Giá không hợp lệ");
      ok = false;
    }

    if (!ok) return showToast("Vui lòng kiểm tra dữ liệu.", "warn");

    const body = {
      movie: fmMovie.value,
      cinema: fmCinema.value,
      room: fmRoom.value,
      start_time: fmStart.value,
      ticket_price: Number(fmPrice.value),
    };

    // ====== TÍNH end_time TRÊN FE ĐỂ GIỜ KẾT THÚC CŨNG CẬP NHẬT ======
    let durationMin = 120;

    if (id && st && st.movie && st.movie.duration) {
      // edit: ưu tiên duration từ showtime hiện tại
      durationMin = st.movie.duration;
    } else if (durationMap[fmMovie.value]) {
      // create: lấy từ danh sách phim
      durationMin = durationMap[fmMovie.value];
    }

    try {
      const startDate = new Date(fmStart.value);
      const endDate = new Date(startDate.getTime() + durationMin * 60000);
      body.end_time = endDate.toISOString(); // gửi luôn cho backend
    } catch (e) {
      console.warn("Không tính được end_time, dùng mặc định backend", e);
    }

    let url = "showtimes";
    let method = "POST";

    if (id) {
      url = `showtimes/${id}`;
      method = "PUT";
    }

    const res = await authFetch(url, { method, body });
    const data = await res.json().catch(() => null);

    if (!res.ok) return showToast(data?.message || "Lưu thất bại", "err");

    showToast(id ? "Đã cập nhật suất chiếu" : "Đã tạo suất chiếu", "ok");
    close();
    loadShowtimes();
  };

}


  /* ============================================================
   * INIT
   * ============================================================ */
  await loadCinemas();
  await loadRooms();
  await loadMovies();
  loadShowtimes();

  return {
    onToolbar: {
      reload: loadShowtimes,
      create: showCreateModal,
    }
  };
};


/* Load external CSS dynamically */
async function loadCSS(url) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url + "?v=" + Date.now();
  document.head.appendChild(link);
}
