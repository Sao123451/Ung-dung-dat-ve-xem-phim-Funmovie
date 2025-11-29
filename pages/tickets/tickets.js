window.FMPages = window.FMPages || {};

window.FMPages.tickets = async function (pageEl, ctx) {
  const {
    API_BASE, authFetch,
    showToast, openModal, html, $, $$, esc,
    z2, fmtDate, fmtTime, ymd, formatVND
  } = ctx;

  let page = 1;
  const limit = 10;
  let total = 0;

  // ===== INIT HTML =====
  pageEl.innerHTML = await (await fetch("pages/tickets/tickets.html")).text();

  // ===== ELEMENTS =====
  const tbody = $("#tk-table tbody");
  const pager = $("#tk-pager");

  const fStatus = $("#tk-status");
  const fDate = $("#tk-date");
  const fEmail = $("#tk-email");
  const fCode = $("#tk-code");

  // ===== FILTER BUTTONS =====
  $("#tk-search").onclick = () => { page = 1; loadTickets(); };
  $("#tk-reset").onclick = () => {
    fStatus.value = "";
    fDate.value = "";
    fEmail.value = "";
    fCode.value = "";
    page = 1;
    loadTickets();
  };

  // ============================
  // LOAD USERS (cache 1 lần)
  // ============================
  let userMap = new Map();

  async function loadAllUsers() {
    const res = await authFetch(`/users?limit=5000`);
    if (!res.ok) return;

    const data = await res.json();
    (data.items || data).forEach(u => {
      userMap.set(String(u._id), u);
    });
  }

  // ===================================================================
  // LOAD TICKETS (FULL) + JOIN USER + JOIN SHOWTIME (CHUẨN BACKEND)
  // ===================================================================
  async function loadTickets() {

    await loadAllUsers(); // ⭐ tải user 1 lần

    const res = await authFetch(`/tickets`);
    let items = await res.json();

    // JOIN showtime
    items = await Promise.all(items.map(async t => {
      t.showtime_full = await loadShowtime(t.showtime);
      t.user_full = userMap.get(String(t.user)) || null;
      return t;
    }));

    // ==========================
    // ⭐ ÁP DỤNG BỘ LỌC
    // ==========================
    const status = fStatus.value.trim();
    const date = fDate.value.trim();
    const email = fEmail.value.trim().toLowerCase();
    const code = fCode.value.trim();

    items = items.filter(t => {

      // 1) trạng thái
      if (status && t.status !== status) return false;

      // 2) theo ngày
      if (date) {
        const st = t.showtime_full;
        if (!st?.start_time) return false;

        const d = new Date(st.start_time);
        const dStr = `${d.getFullYear()}-${z2(d.getMonth()+1)}-${z2(d.getDate())}`;
        if (dStr !== date) return false;
      }

      // 3) email khách hàng
      if (email) {
        const e = (t.user_full?.email || "").toLowerCase();
        if (!e.includes(email)) return false;
      }

      // 4) mã đặt vé
      if (code) {
        if (!String(t.reservation_code).includes(code)) return false;
      }

      return true;
    });

    // ===========
    // PHÂN TRANG
    // ===========
    total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    renderTable(paged);
    renderPager();
  }

  // ===== LOAD SHOWTIME =====
  async function loadShowtime(id) {
    if (!id) return null;
    const res = await authFetch(`/showtimes/${id}`);
    if (!res.ok) return null;
    return await res.json();
  }

  // =============================
  // RENDER TABLE
  // =============================
  function renderTable(items) {
    tbody.innerHTML = items.map(t => {
      const st = t.showtime_full || {};
      const mv = st.movie || {};
      const cn = st.cinema || {};
      const stDate = st.start_time ? new Date(st.start_time) : null;

      return html`
        <tr>
          <td>${esc(t.reservation_code)}</td>
          <td>${esc(t.user_full?.email || "—")}</td>
          <td>${esc(mv.title || "—")}</td>
          <td>${esc(cn.name || "—")}</td>
          <td>${stDate ? `${fmtDate(stDate)} ${fmtTime(stDate)}` : "—"}</td>
          <td><span class="tk-badge ${t.status}">${esc(t.status)}</span></td>
          <td>${formatVND(t.total_after)}</td>
          <td>
            <button class="btn small" data-id="${t._id}" data-act="detail">Chi tiết</button>
          </td>
        </tr>
      `;
    }).join("");

    $$("button[data-act]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        if (act === "detail") openDetail(id);
      };
    });
  }


  // =============================
  // PAGER
  // =============================
  function renderPager() {
    const pages = Math.ceil(total / limit);
    if (pages <= 1) {
      pager.innerHTML = "";
      return;
    }

    let htmlStr = "";
    for (let i = 1; i <= pages; i++) {
      htmlStr += `<button class="pg-btn ${i === page ? "active" : ""}" data-p="${i}">${i}</button>`;
    }
    pager.innerHTML = htmlStr;

    $$("[data-p]", pager).forEach(b => {
      b.onclick = () => {
        page = Number(b.dataset.p);
        loadTickets();
      };
    });
  }

  // ============================================================
  // 🔥 MODAL CHI TIẾT VÉ (CHUẨN – KHÔNG CÒN QR)
  // ============================================================
  async function openDetail(id) {

    // 1) Ticket
    const res = await authFetch(`/tickets/${id}`);
    if (!res.ok) return showToast("Không tải được vé", "err");
    const t = await res.json();

    // 2) Showtime FULL
    const stRes = await authFetch(`/showtimes/${t.showtime}`);
    const st = stRes.ok ? await stRes.json() : null;

    // 3) Seats
    const seatRes = await authFetch(`/ticket-seats/by-ticket/${id}`);
    const seats = seatRes.ok ? await seatRes.json() : [];

    const seatLabels = seats.map(s => `${s.row}${s.number}`);

    const stDate = st?.start_time ? new Date(st.start_time) : null;

    // 4) RENDER
    openModal(html`
      <div class="card" style="max-width:650px; padding:20px;">

        <h2>Chi tiết vé</h2>
        <p><b>Mã vé:</b> ${esc(t.reservation_code)}</p>
        <p><b>Trạng thái:</b> <span class="tk-badge ${t.status}">${esc(t.status)}</span></p>

        <hr/>

        <h3>Phim & Suất chiếu</h3>
        <p><b>Phim:</b> ${esc(st?.movie?.title || "—")}</p>
        <p><b>Rạp:</b> ${esc(st?.cinema?.name || "—")}</p>
        <p><b>Phòng:</b> ${esc(st?.room?.name || "—")}</p>
        <p><b>Thời gian:</b>
          ${stDate ? `${fmtDate(stDate)} ${fmtTime(stDate)}` : "—"}
        </p>

        <hr/>

        <h3>Ghế</h3>
        <div>
          ${seatLabels.length
            ? seatLabels.map(lb => `<span class="tk-seat-badge">${lb}</span>`).join("")
            : "—"}
        </div>

        <hr/>

        <h3>Thanh toán</h3>
        <p><b>Tiền ghế:</b> ${formatVND(t.seat_subtotal)}</p>
        <p><b>Combo:</b> ${formatVND(t.combo_subtotal)}</p>
        <p><b>Giảm giá:</b> -${formatVND(
          (t.discount_seat || 0) +
          (t.discount_combo || 0) +
          (t.discount_order || 0)
        )}</p>

        <h3 style="color:#2e7d32;">
          Tổng thanh toán: ${formatVND(t.total_after)}
        </h3>

        <hr/>

        <div style="display:flex; gap:10px; margin-top:12px;">
          <button class="btn warn" id="tk-cancel-ticket">Hủy vé</button>
          
        </div>

      </div>
    `, ({ close, el }) => {

      // ---------------------------------------------
      // ⭐ RESEND EMAIL (CHUẨN BACKEND)
      // ---------------------------------------------
      $("#tk-resend-email", el).onclick = async () => {

        const email =
          t.user?.email ||
          t.user_full?.email ||
          null;

        if (!email) return showToast("Không có email của khách!", "warn");

        const sendRes = await authFetch(`/bookings/${t._id}/send-email`, {
          method: "POST",
          body: JSON.stringify({ email })
        });

        const data = await sendRes.json();

        if (sendRes.ok)
          showToast("Đã gửi email!", "ok");
        else
          showToast(data.message || "Gửi email thất bại", "err");
      };

      // ---------------------------------------------
      // ⭐ CANCEL TICKET
      // ---------------------------------------------
      $("#tk-cancel-ticket", el).onclick = async () => {
        if (!confirm("Bạn chắc chắn muốn hủy vé này?")) return;

        const cancelRes = await authFetch(`/bookings/${t._id}/cancel`, {
          method: "POST"
        });

        const data = await cancelRes.json();

        if (cancelRes.ok) {
          showToast("Đã hủy vé", "ok");
          close();
          loadTickets();
        } else {
          showToast(data.message || "Hủy vé thất bại", "err");
        }
      };

    });
  }


  // First load
  loadTickets();

  return {
    onToolbar: {
      reload: () => loadTickets(),
      create: null // không tạo vé tại admin
    }
  };
};
