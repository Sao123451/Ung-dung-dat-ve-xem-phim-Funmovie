window.FMPages = window.FMPages || {};
window.FMPages.products = async function (container, ctx) {
  const { API_BASE, authFetch, getUser, html, $, $$, esc,
          openModal, showToast, setInputError, clearInputError,
          toAbsImage } = ctx;

  const me = getUser();
  const canManage = !!(me && ['admin', 'manager', 'staff'].includes(me.role));

  container.innerHTML = html`${await (await fetch("pages/products/products.html")).text()}`;

  const els = {
    q: $('#pd-q'),
    type: $('#pd-type'),
    table: $('#pd-table'),
    info: $('#pd-info'),
    prev: $('#pd-prev'),
    next: $('#pd-next'),
    pg: $('#pd-page')
  };

  let raw = [];
  let view = [];
  let page = 1;
  const pageSize = 10;

  const vnd = (n) => (typeof n === "number" ? n.toLocaleString("vi-VN") + "₫" : "");

  function badgeActive(a) {
    return a ? '<span class="badge ok">active</span>' :
               '<span class="badge muted">inactive</span>';
  }

  function showInfo(msg, isErr = false) {
    els.info.textContent = msg || "";
    if (isErr) els.info.classList.add("error-text");
    else els.info.classList.remove("error-text");
  }

  // Confirm modal
  function showConfirmDialog(title, message, onConfirm) {
    const htmlConfirm = html`
      <div class="modal-head"><h3>${title}</h3></div>
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
    try {
      const res = await authFetch(`${API_BASE}/products`);
      raw = await res.json();
      applyFilter();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
      showInfo("Không tải được danh sách sản phẩm.", true);
    }
  }

  function applyFilter() {
    const q = els.q.value.trim().toLowerCase();
    const t = els.type.value;

    view = raw.filter(p => {
      const okQ = !q || (p.name || "").toLowerCase().includes(q);
      const okT = t === "all" || p.type === t;
      return okQ && okT;
    });

    page = 1;
    renderTable();
  }

  function resolveImg(src) {
    const v = String(src || "");
    if (v.startsWith("data:")) return v;
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
          ${rows.map(p => html`
            <tr data-id="${p._id}">
              <td>${p.image ? `<img class="news-thumb" src="${resolveImg(p.image)}">` : ""}</td>
              <td>${p.name}</td>
              <td>${p.type}</td>
              <td>${vnd(p.price)}</td>
              <td>${p.description || ""}</td>
              <td>${badgeActive(p.active)}</td>
              <td>
                <div class="row-actions">
                  ${canManage ? html`
                    <button class="btn" data-act="toggle" data-id="${p._id}">
                      ${p.active ? "Disable" : "Enable"}
                    </button>
                    <button class="btn" data-act="edit" data-id="${p._id}">Sửa</button>
                    <button class="btn danger" data-act="del" data-id="${p._id}">Xóa</button>
                  ` : ""}
                </div>
              </td>
            </tr>
          `).join("")}
          </tbody>
        </table>
      `;
    }

    els.info.textContent = total
      ? `Hiển thị ${Math.min(start + 1, total)}–${Math.min(start + rows.length, total)} / ${total}`
      : "";

    els.pg.textContent = page;

    els.table.querySelectorAll("[data-act]").forEach(btn => btn.onclick = onRowAction);
  }

  async function fileToDataURL(file) {
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  function openProductForm(mode, data = {}) {
    const isEdit = mode === "edit";

    const htmlForm = html`
      <div class="modal-head"><h3>${isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h3></div>
      <div class="form">
        <div class="row">
          <div class="col-6 field">
            <label>Tên *</label>
            <input id="pd-name" value="${data.name || ""}">
            <div class="error-text"></div>
          </div>

          <div class="col-3 field">
            <label>Loại *</label>
            <select id="pd-type-sel">
              <option value="popcorn" ${data.type === "popcorn" ? "selected" : ""}>popcorn</option>
              <option value="drink" ${data.type === "drink" ? "selected" : ""}>drink</option>
              <option value="combo" ${data.type === "combo" ? "selected" : ""}>combo</option>
            </select>
            <div class="error-text"></div>
          </div>

          <div class="col-3 field">
            <label>Giá (VND) *</label>
            <input id="pd-price" type="number" min="0" step="1000" value="${data.price ?? ""}">
            <div class="error-text"></div>
          </div>

          <div class="col-12"><div class="pill">Ảnh sản phẩm (chọn 1 trong 2 cách)</div></div>

          <div class="col-6 field">
            <label>Chọn file ảnh</label>
            <input id="pd-file" type="file" accept="image/*">
            <div class="error-text"></div>
          </div>

          <div class="col-6 field">
            <label>Hoặc URL ảnh</label>
            <input id="pd-img" value="${data.image || ""}">
            <div class="error-text"></div>
          </div>

          <div class="col-12 field">
            <label>Mô tả *</label>
            <textarea id="pd-desc">${data.description || ""}</textarea>
            <div class="error-text"></div>
          </div>

          <div class="col-12">
            <img id="pd-preview" style="display:none">
          </div>
        </div>

        <div id="pd-error" class="error-text"></div>
      </div>

      <div class="modal-foot">
        <button class="btn" id="pd-cancel">Hủy</button>
        <button class="btn primary" id="pd-submit">${isEdit ? "Lưu" : "Tạo"}</button>
      </div>
    `;

    openModal(htmlForm, ({ el, close }) => {
      const g = id => el.querySelector("#" + id);

      const iName = g("pd-name");
      const iType = g("pd-type-sel");
      const iPrice = g("pd-price");
      const iImg = g("pd-img");
      const iFile = g("pd-file");
      const iDesc = g("pd-desc");
      const iPrev = g("pd-preview");
      const errEl = g("pd-error");

      function preview() {
        const file = iFile.files?.[0];
        const url = iImg.value.trim();
        if (file) {
          iPrev.src = URL.createObjectURL(file);
          iPrev.style.display = "";
        } else if (url) {
          iPrev.src = url;
          iPrev.style.display = "";
        } else {
          iPrev.style.display = "none";
        }
      }

      iFile.addEventListener("change", preview);
      iImg.addEventListener("input", preview);

      const required = el => {
        if (!el.value.trim()) {
          setInputError(el, "Trường này bắt buộc");
          return false;
        }
        clearInputError(el);
        return true;
      };

      el.querySelector("#pd-cancel").onclick = close;

      el.querySelector("#pd-submit").onclick = async () => {
        errEl.textContent = "";

        let ok = true;
        ok = required(iName) && ok;
        ok = required(iType) && ok;
        ok = required(iPrice) && ok;
        ok = required(iDesc) && ok;

        const hasFile = iFile.files?.length > 0;
        const hasUrl = !!iImg.value.trim();

        if (!hasFile && !hasUrl) {
          setInputError(iImg, "Phải chọn ảnh hoặc URL");
          ok = false;
        }

        if (!ok) {
          errEl.textContent = "Vui lòng kiểm tra các trường bắt buộc.";
          return;
        }

        try {
          let imageValue = iImg.value.trim();
          if (hasFile) imageValue = await fileToDataURL(iFile.files[0]);

          const body = {
            name: iName.value.trim(),
            type: iType.value,
            price: Number(iPrice.value),
            image: imageValue,
            description: iDesc.value.trim(),
            active: isEdit ? data.active !== false : true
          };

          let res;
          if (isEdit) {
            res = await authFetch(`${API_BASE}/products/${data._id}`, {
              method: "PUT",
              body: JSON.stringify(body)
            });
          } else {
            res = await authFetch(`${API_BASE}/products`, {
              method: "POST",
              body: JSON.stringify(body)
            });
          }

          const js = await res.json();
          if (!res.ok) {
            errEl.textContent = js?.message || "Thao tác thất bại.";
            return;
          }

          close();
          await loadList();
          showInfo(isEdit ? "Đã lưu sản phẩm." : "Đã tạo sản phẩm mới.");
        } catch {
          errEl.textContent = "Lỗi khi tải ảnh.";
        }
      };
    });
  }

  async function onRowAction(e) {
    const id = e.currentTarget.dataset.id;
    const act = e.currentTarget.dataset.act;
    const item = raw.find(x => x._id === id);
    if (!item) return;

    if (act === "edit") {
      openProductForm("edit", item);
      return;
    }

    if (act === "toggle") {
      try {
        const res = await authFetch(`${API_BASE}/products/${id}`, {
          method: "PUT",
          body: JSON.stringify({ active: !item.active })
        });

        if (!res.ok) return showInfo("Cập nhật thất bại.", true);

        await loadList();
        showInfo("Đã cập nhật trạng thái.");
      } catch {
        showInfo("Lỗi kết nối.", true);
      }
      return;
    }

    if (act === "del") {
      showConfirmDialog("Xóa sản phẩm", `Bạn có chắc muốn xóa "${item.name}"?`, async () => {
        try {
          const res = await authFetch(`${API_BASE}/products/${id}`, {
            method: "DELETE"
          });

          if (!res.ok) return showInfo("Xóa thất bại.", true);

          await loadList();
          showInfo("Đã xóa sản phẩm.");
        } catch {
          showInfo("Lỗi kết nối.", true);
        }
      });
    }
  }

  els.q.addEventListener("input", applyFilter);
  els.type.addEventListener("change", applyFilter);

  els.prev.onclick = () => {
    if (page > 1) {
      page--;
      renderTable();
    }
  };

  els.next.onclick = () => {
    const max = Math.ceil(view.length / pageSize);
    if (page < max) {
      page++;
      renderTable();
    }
  };

  // Expose toolbar hooks
  return {
    onToolbar: {
      reload: () => loadList(),
      create: () => openProductForm("create")
    }
  };

  loadList();
};
