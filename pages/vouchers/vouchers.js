// vouchers.js — BẢN KẾT HỢP GIỐNG 100% VOUCHER CŨ (UI + LOGIC)
// -------------------------------------------------------------

window.FMPages = window.FMPages || {};

window.FMPages.vouchers = async function (pageEl, ctx) {
  const {
    API_BASE, authFetch, showToast, openModal,
    html, $, $$, esc, ymd,
    setInputError, clearInputError
  } = ctx;

  let page = 1;
  const pageSize = 8;
  let total = 0;
  let items = [];
  let q = "";

  // Load HTML template
  pageEl.innerHTML = await (await fetch("pages/vouchers/vouchers.html")).text();

  const els = {
    q: $('#vc-q', pageEl),
    tb: $('#vc-table', pageEl),
    info: $('#vc-info', pageEl),
    pg: $('#vc-page', pageEl),
    prev: $('#vc-prev', pageEl),
    next: $('#vc-next', pageEl)
  };

  /* -------------------------
     Helpers
  -------------------------- */
  function badgeScope(s) {
    if (s === 'seat') return `<span class="badge">seat</span>`;
    if (s === 'combo') return `<span class="badge warn">combo</span>`;
    return `<span class="badge ok">order</span>`;
  }

  const fmtYMD = (d) => {
    const dt = new Date(d);
    return isNaN(dt) ? '' : `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  /* -------------------------
     Load list
  -------------------------- */
  async function loadList() {
    
    els.tb.innerHTML = `<div class="muted">Đang tải...</div>`;
    try {
      const res = await authFetch(
        `${API_BASE}/vouchers/public?q=${encodeURIComponent(q)}&page=${page}&limit=${pageSize}`
      );
      const d = await res.json();

      items = d.items || [];
      total = d.total || 0;

      renderTable();
    } catch {
      els.tb.innerHTML = `<div class="muted">Lỗi tải dữ liệu</div>`;
    }
  }

  /* -------------------------
     Render table
  -------------------------- */
  function renderTable() {
    if (!items.length) {
      els.tb.innerHTML = `<div class="muted">Không có voucher nào</div>`;
      return;
    }

    els.tb.innerHTML = html`
        <table class="table">
          <thead>
            <tr>
              <th>Mã</th><th>Phạm vi</th><th>Loại</th><th>Giá trị</th><th>Tối đa</th>
              <th>Đơn tối thiểu</th><th>Hiệu lực</th><th>Dùng/Giới hạn</th><th>Hành động</th>
            </tr>
          </thead>
          <tbody>
          ${items.map(v => {
      const dtype = v.discount_type || v.type;
      const val = dtype === 'percent'
        ? `${v.value}%`
        : `${v.value.toLocaleString('vi-VN')}đ`;

      const cap = v.max_discount
        ? `${v.max_discount.toLocaleString('vi-VN')}đ`
        : '—';

      const min = (v.min_order ?? v.min_total ?? 0).toLocaleString('vi-VN') + 'đ';


      const end = v.end_date ? fmtYMD(v.end_date) : '—';
      const used = `${v.used_count || 0}/${v.usage_limit || '∞'}`;

      return html`
              <tr>
                <td><code>${v.code}</code></td>
                <td>${badgeScope(v.scope)}</td>
                <td>${v.discount_type || v.type}</td>
                <td>${val}</td>
                <td>${cap}</td>
                <td>${((v.min_order ?? v.min_total ?? 0)).toLocaleString('vi-VN')}đ</td>
                <td>đến ${end}</td>
                <td>${used}</td>
                <td>
                  <button class="btn" data-act="validate" data-code="${v.code}">Kiểm tra</button>
                  <button class="btn" data-act="edit" data-code="${v.code}">Sửa</button>
                  <button class="btn danger" data-act="del" data-code="${v.code}">Xóa</button>
                </td>
              </tr>`;
    }).join("")}
          </tbody>
        </table>
        `;

    $$("[data-act]", els.tb).forEach(btn => btn.onclick = onRowAction);

    const maxPg = Math.max(1, Math.ceil(total / pageSize));
    els.pg.textContent = `${page}/${maxPg}`;
    els.info.textContent = total ? `Tổng ${total} voucher` : '';
  }

  /* -------------------------
     Fetch detail
  -------------------------- */
  async function fetchDetail(code) {
    const res = await authFetch(`${API_BASE}/vouchers/${encodeURIComponent(code)}/validate`);
    const d = await res.json();
    if (!res.ok || !d.voucher) throw new Error(d.message || "Không lấy được chi tiết");

    return d.voucher;
  }

  /* -------------------------
     Confirm modal (UI chuẩn cũ)
  -------------------------- */
  function openConfirm(msg, onYes) {
    const markup = html`
      <div class="modal-head"><h3>Xác nhận</h3></div>
      <div style="padding:16px">${msg}</div>
      <div class="modal-foot">
        <button class="btn" id="cf-no">Hủy</button>
        <button class="btn danger" id="cf-yes">Xác nhận</button>
      </div>
    `;
    openModal(markup, ({ el, close }) => {
      $('#cf-no', el).onclick = close;
      $('#cf-yes', el).onclick = () => { close(); onYes && onYes(); };
    });
  }

  /* -------------------------
     Row actions
  -------------------------- */
  async function onRowAction(e) {
    const code = e.target.getAttribute("data-code");
    const act = e.target.getAttribute("data-act");
    if (!code) return;

    if (act === "validate") {
      try {
        const res = await fetch(`${API_BASE}/vouchers/${encodeURIComponent(code)}/validate`);
        const d = await res.json();
        showToast(
          d.valid ? `Mã ${code} hợp lệ` : `Voucher không hợp lệ hoặc hết hạn`,
          d.valid ? 'ok' : 'err'
        );
      } catch {
        showToast("Lỗi kiểm tra", "err");
      }
      return;
    }

    if (act === "edit") {
      try {
        const full = await fetchDetail(code);
        openVoucherForm("edit", full);
      } catch (err) {
        showToast(err.message, "err");
      }
      return;
    }

    if (act === "del") {
      openConfirm(`Xóa voucher ${code}?`, async () => {
        try {
          const full = await fetchDetail(code);
          const res = await authFetch(`${API_BASE}/vouchers/${full._id}`, {
            method: "DELETE",
          });
          if (!res.ok) return showToast("Xóa thất bại", "err");
          showToast(`Đã xóa voucher ${code}`, "ok");
          loadList();
        } catch {
          showToast("Lỗi kết nối", "err");
        }
      });
    }
  }

  /* -------------------------
     Voucher Form — 100% bản cũ
  -------------------------- */
  function openVoucherForm(mode = "create", data = null) {
    const isEdit = mode === "edit";
    const V = data || {};

    const markup = html`
      <div class="modal-head">
        <h3>${isEdit ? "Sửa Voucher" : "Thêm Voucher"}</h3>
        <div class="spacer"></div>
      </div>

      <div class="form fm-voucher-form">
        <div class="row">
          <div class="col-6 field">
            <label>Mã voucher *</label>
            <input id="v-code" placeholder="VD: SUMMER50"
              value="${(V.code || "").toUpperCase()}"
              ${isEdit ? "disabled" : ""}>
          </div>

          <div class="col-6 field">
            <label>Phạm vi *</label>
            <select id="v-scope">
              <option value="">-- Chọn --</option>
              <option value="seat" ${V.scope === "seat" ? "selected" : ""}>seat</option>
              <option value="combo" ${V.scope === "combo" ? "selected" : ""}>combo</option>
              <option value="order" ${V.scope === "order" ? "selected" : ""}>order</option>
            </select>
          </div>

          <div class="col-6 field">
            <label>Loại giảm giá *</label>
            <select id="v-type">
              <option value="">-- Chọn --</option>
              <option value="percent" ${V.discount_type === "percent" ? "selected" : ""}>percent (%)</option>
              <option value="amount" ${V.discount_type === "amount" ? "selected" : ""}>amount (đ)</option>
            </select>
          </div>

          <div class="col-6 field">
            <label>Giá trị *</label>
            <input id="v-value" type="number" min="1" step="1" value="${V.value ?? ""}">
          </div>

          <div class="col-6 field">
            <label>Giảm tối đa (bắt buộc nếu %)</label>
            <input id="v-max" type="number" min="1" step="1000" value="${V.max_discount ?? ""}">
          </div>

          <div class="col-6 field">
            <label>Đơn tối thiểu *</label>
            <input id="v-min" type="number" min="0" step="1000" value="${V.min_order ?? ""}">
          </div>

          <div class="col-6 field">
            <label>Ngày bắt đầu *</label>
            <input id="v-start" type="date" value="${V.start_date ? ymd(new Date(V.start_date)) : ""}">
          </div>

          <div class="col-6 field">
            <label>Ngày kết thúc *</label>
            <input id="v-end" type="date" value="${V.end_date ? ymd(new Date(V.end_date)) : ""}">
          </div>

          <div class="col-6 field">
            <label>Giới hạn lượt dùng</label>
            <input id="v-limit" type="number" min="0" value="${V.usage_limit ?? 0}">
          </div>

          <div class="col-6 field">
            <label>Trạng thái</label>
            <select id="v-active">
              <option value="true" ${(V.active ?? true) ? "selected" : ""}>active</option>
              <option value="false" ${!(V.active ?? true) ? "selected" : ""}>inactive</option>
            </select>
          </div>
        </div>

        <div id="v-err" class="error"></div>
      </div>

      <div class="modal-foot">
        <button class="btn" id="v-cancel">Hủy</button>
        <button class="btn primary" id="v-submit">${isEdit ? "Lưu" : "Tạo mới"}</button>
      </div>
    `;

    openModal(markup, ({ el, close }) => {
      const $g = id => el.querySelector("#" + id);

      const iCode = $g("v-code"),
        iScope = $g("v-scope"),
        iType = $g("v-type"),
        iVal = $g("v-value"),
        iMax = $g("v-max"),
        iMin = $g("v-min"),
        iStart = $g("v-start"),
        iEnd = $g("v-end"),
        iLim = $g("v-limit"),
        iAct = $g("v-active"),
        iErr = $g("v-err");

      const today = ymd(new Date());
      iStart.min = today;
      iEnd.min = today;

      function syncMax() {
        if (iType.value === "amount") {
          iMax.disabled = true;
          iMax.value = "";
          clearInputError(iMax);
        } else {
          iMax.disabled = false;
        }
      }

      syncMax();
      iType.addEventListener("change", syncMax);

      function requireField(el, label) {
        if (!el.value.trim()) {
          setInputError(el, `${label} không được để trống`);
          return false;
        }
        clearInputError(el);
        return true;
      }

      $g("v-cancel").onclick = close;

      $g("v-submit").onclick = async () => {
        iErr.textContent = "";

        let ok = true;
        ok = requireField(iCode, "Mã voucher") && ok;
        ok = requireField(iScope, "Phạm vi") && ok;
        ok = requireField(iType, "Loại giảm giá") && ok;
        ok = requireField(iVal, "Giá trị") && ok;
        ok = requireField(iMin, "Đơn tối thiểu") && ok;
        ok = requireField(iStart, "Ngày bắt đầu") && ok;
        ok = requireField(iEnd, "Ngày kết thúc") && ok;

        const code = iCode.value.trim().toUpperCase();
        if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
          setInputError(iCode, "Mã chỉ gồm A-Z, số, -, _, 3–32 ký tự");
          ok = false;
        }

        const valueNum = Number(iVal.value);
        if (!Number.isFinite(valueNum) || valueNum <= 0) {
          setInputError(iVal, "Giá trị phải > 0");
          ok = false;
        }

        let maxNum = null;
        if (iType.value === "percent") {
          if (!requireField(iMax, "Giảm tối đa")) ok = false;
          maxNum = Number(iMax.value);
          if (!Number.isFinite(maxNum) || maxNum <= 0) {
            setInputError(iMax, "Giảm tối đa phải > 0");
            ok = false;
          }
        }

        if (!ok) return;

        function toLocalDateISO(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  // Tạo Date theo múi giờ LOCAL (VN +07)
  const dt = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
  return dt.toISOString(); // gửi lên dạng ISO có timezone
}

const body = {
  code,
  scope: iScope.value,
  discount_type: iType.value,
  value: valueNum,
  max_discount: maxNum,
  min_order: Number(iMin.value || 0),
  // ⭐ gửi start/end theo "00:00 giờ LOCAL", không phải chuỗi yyyy-mm-dd
  start_date: toLocalDateISO(iStart.value),
  end_date: toLocalDateISO(iEnd.value),
  usage_limit: Number(iLim.value || 0),
  active: iAct.value === "true"
};


        try {
          let res;
          if (isEdit) {
            res = await authFetch(`${API_BASE}/vouchers/${V._id}`, {
              method: "PUT",
              body
            });
          } else {
            res = await authFetch(`${API_BASE}/vouchers`, {
              method: "POST",
              body
            });
          }

          const d = await res.json();

          if (!res.ok) {
            showToast(d.message || "Lỗi lưu voucher", "err");
            return;
          }

          showToast(isEdit ? "Đã cập nhật voucher" : "Đã tạo voucher mới", "ok");
          close();
          loadList();

        } catch (err) {
          showToast("Lỗi kết nối", "err");
        }
      };
    });
  }

  /* -------------------------
     Events
  -------------------------- */

  els.q.oninput = () => {
    q = els.q.value.trim();
    page = 1;
    loadList();
  };

  els.prev.onclick = () => {
    if (page > 1) {
      page--;
      loadList();
    }
  };

  els.next.onclick = () => {
    const maxPg = Math.ceil(total / pageSize);
    if (page < maxPg) {
      page++;
      loadList();
    }
  };


  loadList();

  return {
  onToolbar: {
    reload: () => loadList(),
    create: () => openVoucherForm("create", null)
  }
};

};
