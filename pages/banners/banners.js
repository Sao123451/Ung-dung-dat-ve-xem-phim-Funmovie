window.FMPages = window.FMPages || {};

window.FMPages.banners = async function (pageEl, ctx) {
  const {
    API_BASE, authFetch, showToast, openModal, getToken,
    html, $, $$, esc, toAbsImage, setInputError, clearInputError
  } = ctx;

  /* Load HTML */
  pageEl.innerHTML = await (await fetch("pages/banners/banners.html")).text();

  /* Elements */
  const els = {
    table: $('#bn-table', pageEl),
    info: $('#bn-info', pageEl),
    images: $('#bn-images', pageEl),
    imgInfo: $('#bn-img-info', pageEl),
    selected: $('#bn-selected', pageEl)
  };

  let raw = [];
  let tab = "all";
  let selectedBanner = null;

  function showInfo(msg, err = false) {
    els.info.textContent = msg;
    els.info.classList.toggle("error-text", err);
  }
  function showImgInfo(msg, err = false) {
    els.imgInfo.textContent = msg;
    els.imgInfo.classList.toggle("error-text", err);
  }

  /* FETCH list */
  async function fetchList() {
    const res = await authFetch(`${API_BASE}/banners`);
    return res.json();
  }

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
    try {
      raw = await fetchList();
      renderList();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
      showInfo("Lỗi tải dữ liệu.", true);
    }
  }

  function filtered() {
    if (tab === "all") return raw;
    if (tab === "active") return raw.filter(x => x.is_active);
    return raw.filter(x => !x.is_active);
  }

  /* Render table */
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
            <th style="width:260px">Hành động</th>
          </tr>
        </thead>
        <tbody>
        ${rows.map(b => html`
          <tr data-id="${b._id}">
            <td>${esc(b.title)}</td>
            <td>${esc(b.link_url)}</td>
            <td>${b.is_active ? `<span class="badge ok">Bật</span>` : `<span class="badge muted">Tắt</span>`}</td>
            <td>${b.image_count ?? 0}</td>

            <td>
              <div class="row-actions">
                <button class="btn" data-act="select" data-id="${b._id}">Chọn</button>
                <button class="btn" data-act="toggle" data-id="${b._id}">${b.is_active ? "Tắt" : "Bật"}</button>
                <button class="btn" data-act="edit" data-id="${b._id}">Sửa</button>
                <button class="btn warn" data-act="upload" data-id="${b._id}">Upload ảnh</button>
                <button class="btn danger" data-act="del" data-id="${b._id}">Xoá</button>
              </div>
            </td>
          </tr>
        `).join("")}
        </tbody>
      </table>
    `;

    els.table.querySelectorAll("[data-act]").forEach(btn =>
      btn.onclick = onRowAction
    );
  }

  /* ========= FORM BANNER ========= */
  function openBannerForm(mode, data = {}) {
    const isEdit = mode === "edit";

    openModal(html`
      <div class="modal-head">
        <h3>${isEdit ? "Sửa banner" : "Tạo banner"}</h3>
      </div>

      <div class="form">
        <label>Tiêu đề *</label>
        <input id="f-title" value="${esc(data.title)}">

        <label>Link</label>
        <input id="f-link" value="${esc(data.link_url)}">

        ${isEdit ? html`
          <label>Trạng thái</label>
          <select id="f-active">
            <option value="true" ${data.is_active ? "selected" : ""}>Bật</option>
            <option value="false" ${!data.is_active ? "selected" : ""}>Tắt</option>
          </select>
        ` : ""}

        <div id="f-error" class="error-text" style="margin-top:6px"></div>
      </div>

      <div class="modal-foot">
        <button class="btn" id="cancel">Hủy</button>
        <button class="btn primary" id="save">${isEdit ? "Lưu" : "Tạo"}</button>
      </div>
    `, ({ el, close }) => {

      const iTitle = el.querySelector("#f-title");
      const iLink = el.querySelector("#f-link");
      const iActive = el.querySelector("#f-active");
      const err = el.querySelector("#f-error");

      el.querySelector("#cancel").onclick = close;

      el.querySelector("#save").onclick = async () => {
        err.textContent = "";
        clearInputError(iTitle);

        if (!iTitle.value.trim()) {
          setInputError(iTitle, "Hãy nhập tiêu đề");
          err.textContent = "Vui lòng kiểm tra các trường tô đỏ.";
          return;
        }

        const body = {
          title: iTitle.value.trim(),
          link_url: iLink.value.trim()
        };

        if (isEdit) body.is_active = iActive.value === "true";

        const url = isEdit
          ? `${API_BASE}/banners/${data._id}`
          : `${API_BASE}/banners`;

        const m = isEdit ? "PUT" : "POST";

        const res = await authFetch(url, { method: m, body });
        if (!res.ok) {
          err.textContent = "Thao tác thất bại.";
          return;
        }

        close();
        await loadList();
        showInfo(isEdit ? "Đã lưu banner." : "Đã tạo banner mới.");
      };
    });
  }

  /* ========= UPLOAD DIALOG ========= */
  function openUploadDialog(bannerId) {
    openModal(html`
    <div class="modal-head"><h3>Upload ảnh</h3></div>

    <div class="form">
      <label>Chọn ảnh (tối đa 12)</label>
      <input id="bn-files" type="file" accept="image/*" multiple />

      <div id="bn-err" class="error-text" style="margin-top:6px"></div>
    </div>

    <div class="modal-foot">
      <button class="btn" id="bn-cancel">Hủy</button>
      <button class="btn primary" id="bn-upload">Upload</button>
    </div>
  `, ({ el, close }) => {

      const fileInput = el.querySelector("#bn-files");
      const err = el.querySelector("#bn-err");
      const btnUpload = el.querySelector("#bn-upload");
      const btnCancel = el.querySelector("#bn-cancel");

      btnCancel.onclick = close;

      btnUpload.onclick = async () => {
        err.textContent = "";

        if (!fileInput.files.length) {
          err.textContent = "Hãy chọn ít nhất 1 ảnh.";
          return;
        }

        const fd = new FormData();
        [...fileInput.files].forEach(f => fd.append("images", f));

        console.log("Uploading...", fd);

        try {
          // ⭐ SỬ DỤNG authFetch → KHÔNG dùng getToken nữa
          const res = await authFetch(`${API_BASE}/banners/${bannerId}/images`, {
            method: "POST",
            body: fd
          });

          if (!res.ok) {
            const tx = await res.text();
            console.error("UPLOAD ERROR:", tx);
            err.textContent = "Upload thất bại!";
            return;
          }

          showToast("Upload thành công!");
          close();
          loadList();
          loadImages(bannerId);

        } catch (e) {
          console.error("UPLOAD EXCEPTION", e);
          err.textContent = "Lỗi kết nối.";
        }
      };

    });
  }


  /* ========= LOAD IMAGES ========= */
  async function loadImages(id) {
    els.images.innerHTML = `<div class="muted">Đang nạp ảnh...</div>`;
    showImgInfo("");

    const res = await authFetch(`${API_BASE}/banners/${id}/images`);
    const js = await res.json();

    selectedBanner = js.banner;
    els.selected.innerHTML = `<b>${esc(js.banner.title)}</b> <span class="pill">${js.banner._id}</span>`;

    const images = js.images || [];
    if (!images.length) {
      els.images.innerHTML = `<div class="muted">Chưa có ảnh.</div>`;
      return;
    }

    els.images.innerHTML = images.map(img => html`
      <div class="card banner-item">
        <img class="banner-thumb" src="${img.image_url}">
        <div class="form" style="margin-top:8px">
          <div class="muted">${img.movie_id ? `Đang gán: ${img.movie_id}` : "Chưa gán phim"}</div>
          <div class="row-actions" style="margin-top:8px">
            <button class="btn" data-act="assign" data-img="${img._id}">Gán</button>
            ${img.movie_id ? `<button class="btn warn" data-act="unassign" data-img="${img._id}">Bỏ gán</button>` : ""}
            <button class="btn danger" data-act="del-img" data-img="${img._id}">Xoá</button>
          </div>
        </div>
      </div>
    `).join("");

    els.images.querySelectorAll("[data-act]").forEach(btn =>
      btn.onclick = e => onImageAction(e, id)
    );
  }

  /* ========= IMAGE ACTIONS ========= */
  function onImageAction(e, bannerId) {
    const act = e.target.dataset.act;
    const imgId = e.target.dataset.img;

    if (act === "assign") {

      openModal(html`
    <div class="modal-head"><h3>Gán phim</h3></div>

    <div class="form">
      <label>Chọn phim</label>
      <select id="mv-select">
        <option value="">-- Chưa gán --</option>
      </select>
      <div id="mv-err" class="error-text"></div>
    </div>

    <div class="modal-foot">
      <button class="btn" id="cancel">Hủy</button>
      <button class="btn primary" id="save">Lưu</button>
    </div>
  `, async ({ el, close }) => {

        const sel = el.querySelector("#mv-select");
        const err = el.querySelector("#mv-err");

        // lấy danh sách phim đúng chuẩn FunMovie API
        let movies = [];
        const rs = await authFetch(`${API_BASE}/movies`);
        movies = await rs.json();
        movies = movies.items ?? movies; // auto adapt

        sel.innerHTML = `
      <option value="">-- Chọn phim --</option>
      ${movies.map(m => `
        <option value="${m._id}">${esc(m.title)}</option>
      `).join("")}
    `;

        el.querySelector("#cancel").onclick = close;

        el.querySelector("#save").onclick = async () => {
          const movieId = sel.value || null;

          const res = await authFetch(`${API_BASE}/banners/${bannerId}/images/${imgId}`, {
            method: "PATCH",
            body: { movie_id: movieId }
          });

          if (!res.ok) {
            err.textContent = "Không thể gán.";
            return;
          }

          close();
          loadImages(bannerId);
        };
      });
    }



    if (act === "unassign") {
      authFetch(`${API_BASE}/banners/${bannerId}/images/${imgId}`, {
        method: "PATCH",
        body: { movie_id: null }
      }).then(() => loadImages(bannerId));
    }

    if (act === "del-img") {
      authFetch(`${API_BASE}/banners/${bannerId}/images/${imgId}`, {
        method: "DELETE"
      }).then(() => {
        loadImages(bannerId);
        loadList();
      });
    }
  }

  /* ========= ROW ACTION ========= */
  async function onRowAction(e) {
    const act = e.target.dataset.act;
    const id = e.target.dataset.id;

    if (act === "select") {
      loadImages(id);
      return;
    }
    if (act === "toggle") {
      await authFetch(`${API_BASE}/banners/${id}/toggle`, { method: "PATCH" });
      loadList();
      return;
    }
    if (act === "edit") {
      const b = raw.find(x => x._id === id);
      if (b) openBannerForm("edit", b);
      return;
    }
    if (act === "upload") {
      openUploadDialog(id);
      return;
    }
    if (act === "del") {
      authFetch(`${API_BASE}/banners/${id}`, { method: "DELETE" })
        .then(() => {
          if (selectedBanner?._id === id) {
            els.selected.textContent = "Chưa chọn banner.";
            els.images.innerHTML = "";
          }
          loadList();
        });
    }
  }

  /* ========= TABS ========= */
  pageEl.querySelectorAll(".tab").forEach(t => {
    t.onclick = () => {
      pageEl.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      tab = t.dataset.tab;
      renderList();
    };
  });

  /* Toolbar Hooks */
  return {
    onToolbar: {
      reload: loadList,
      create: () => openBannerForm("create")
    }
  };

  /* INIT */
  loadList();
};
