window.FMPages = window.FMPages || {};

window.FMPages.news = async function (pageEl, ctx) {
  const {
    API_BASE, authFetch, showToast, openModal,
    html, $, $$, esc, debounce,
    setInputError, clearInputError, toAbsImage
  } = ctx;

  /* RENDER HTML */
  pageEl.innerHTML = html`
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px">
        <h3 style="margin:0">Danh sách tin tức</h3>

        <div style="display:flex; align-items:center; gap:8px">
          <input id="news-q" class="search" placeholder="Tìm theo tiêu đề/nội dung..." style="width:280px">

          <select id="news-filter" style="padding:8px 12px; border-radius:10px; border:1px solid var(--line); background:#0f1530; color:#fff">
            <option value="all">Tất cả</option>
            <option value="published">Đã publish</option>
            <option value="draft">Nháp</option>
          </select>
        </div>
      </div>

      <div id="news-table" class="table-wrap">
        <div class="muted">Đang tải...</div>
      </div>

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

  /* ELEMENTS */
  const els = {
    q: $('#news-q', pageEl),
    filter: $('#news-filter', pageEl),
    table: $('#news-table', pageEl),
    info: $('#news-info', pageEl),
    prev: $('#news-prev', pageEl),
    next: $('#news-next', pageEl),
    pg: $('#news-page', pageEl)
  };

  /* STATE */
  let raw = [];
  let view = [];
  let page = 1;
  const pageSize = 10;

  function fmtDateTime(d) {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }

  function statusBadge(n) {
    return n.is_published
      ? `<span class="badge ok">Đã publish</span>`
      : `<span class="badge muted">Nháp</span>`;
  }

  async function fetchNewsAdmin(params = {}) {
    const url = new URL(`${API_BASE}/news`);
    if (params.q) url.searchParams.set("q", params.q);
    if (typeof params.is_published === "boolean")
      url.searchParams.set("is_published", params.is_published);

    const res = await authFetch(url);
    const js = await res.json();
    return js.items || [];
  }

  function categoryLabel(cat) {
  if (cat === 'promotion') return 'Khuyến mãi';
  return 'Tin tức';
}

  async function loadList() {
    els.table.innerHTML = `<div class="muted">Đang tải...</div>`;
    try {
      const params = {};
      if (els.filter.value === "published") params.is_published = true;
      if (els.filter.value === "draft") params.is_published = false;

      const q = els.q.value.trim();
      if (q) params.q = q;

      raw = await fetchNewsAdmin(params);
      applyFilterAndRender();
    } catch {
      els.table.innerHTML = `<div class="muted">Không tải được dữ liệu.</div>`;
    }
  }

  function applyFilterAndRender() {
    view = raw.slice();

    const q = els.q.value.trim().toLowerCase();
    if (q) view = view.filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));

    if (els.filter.value === "published") view = view.filter(n => n.is_published);
    if (els.filter.value === "draft") view = view.filter(n => !n.is_published);

    page = 1;
    renderTable();
  }

  function renderTable() {
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
            <th>Danh mục</th>     <!-- ⭐ THÊM -->
            <th>Trạng thái</th>
            <th>Publish at</th>
            <th>Views</th>
            <th style="width:260px">Hành động</th>
          </tr>
        </thead>

        <tbody>
          ${rows.map(n => {
            const src = toAbsImage(n.cover_image);
            return html`
              <tr data-id="${n._id}">
                <td>${src ? `<img class="news-thumb" src="${src}">` : ''}</td>
                <td>${esc(n.title)}</td>
                <td>${esc(n.slug)}</td>
                <td>${(n.tags || []).join(', ')}</td>
                <td>${categoryLabel(n.category)}</td>   <!-- ⭐ THÊM -->
                <td>${statusBadge(n)}</td>
                <td>${fmtDateTime(n.published_at)}</td>
                <td>${n.view_count ?? 0}</td>
                <td>
                  <button class="btn" data-act="toggle" data-id="${n._id}">
                    ${n.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button class="btn" data-act="edit" data-id="${n._id}">Sửa</button>
                  <button class="btn danger" data-act="del" data-id="${n._id}">Xoá</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    els.table.querySelectorAll('button[data-act]').forEach(btn =>
      btn.addEventListener('click', onRowAction)
    );
  }

  els.pg.textContent = page;
  els.info.textContent = `Trang ${page}`;
}


  /* CREATE / EDIT FORM */
  async function openNewsForm(mode, data = {}) {
    const isEdit = mode === 'edit';

    openModal(html`
      <div class="modal-head">
        <h3>${isEdit ? "Sửa bài viết" : "Thêm bài viết"}</h3>
      </div>

      <div class="form">
        <label>Tiêu đề</label>
        <input id="f-title" value="${esc(data.title)}">

        <label>Slug</label>
        <input id="f-slug" value="${esc(data.slug)}">

        <label>Trích dẫn</label>
        <input id="f-excerpt" value="${esc(data.excerpt)}">

         <label>Danh mục</label>
        <select id="f-category">
          <option value="news">Tin tức</option>
          <option value="promotion">Khuyến mãi</option>
        </select>

        <label>Nội dung</label>
        <textarea id="f-content" rows="6">${esc(data.content)}</textarea>

        <label>Tags (phân cách bằng dấu ,)</label>
        <input id="f-tags" value="${esc((data.tags || []).join(", "))}">

        <label>Ảnh bìa (URL hoặc upload)</label>
        <input id="f-cover-url" placeholder="Dán URL ảnh..." value="${esc(data.cover_image)}">
        <input id="f-cover-file" type="file" accept="image/*">
      </div>

      <div class="modal-foot">
        <button class="btn" id="cancel">Hủy</button>
        <button class="btn brand" id="save">${isEdit ? "Lưu" : "Tạo mới"}</button>
      </div>
    `, ({ el, close }) => {

      const iTitle = el.querySelector('#f-title');
      const iSlug = el.querySelector('#f-slug');
      const iEx = el.querySelector('#f-excerpt');
      const iCat   = el.querySelector('#f-category');
      const iCt = el.querySelector('#f-content');
      const iTags = el.querySelector('#f-tags');
      const iUrl = el.querySelector('#f-cover-url');
      const iFile = el.querySelector('#f-cover-file');

      iCat.value = data.category || 'news';

      /* AUTO SLUG FROM TITLE */
      iTitle.addEventListener("input", () => {
        const slug = iTitle.value
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        iSlug.value = slug;
      });

      el.querySelector('#cancel').onclick = close;

      el.querySelector('#save').onclick = async () => {
        // Clear toàn bộ lỗi cũ
        [iTitle, iSlug, iEx, iCt, iTags, iUrl].forEach(clearInputError);

        let hasError = false;

        const markError = (input) => {
          setInputError(input, "Hãy nhập đầy đủ thông tin");
          hasError = true;
        };

        // Validate từng trường nhưng đánh lỗi đồng thời
        if (!iTitle.value.trim()) markError(iTitle);
        if (!iSlug.value.trim()) markError(iSlug);
        if (!iEx.value.trim()) markError(iEx);
        if (!iCt.value.trim()) markError(iCt);
        if (!iTags.value.trim()) markError(iTags);

        const fileChosen = iFile.files.length > 0;
        const urlFilled = iUrl.value.trim().length > 0;

        if (!fileChosen && !urlFilled) {
          markError(iUrl);
        }

        // Nếu có bất kỳ lỗi → không submit
        if (hasError) {
          showToast("Vui lòng kiểm tra các trường bị đánh dấu đỏ", "err");
          return;
        }

        // ==== Nếu hợp lệ → xử lý API như cũ ====
        const title = iTitle.value.trim();
        const slug = iSlug.value.trim();
        const excerpt = iEx.value.trim();
        const content = iCt.value.trim();
        const tags = iTags.value.trim().split(",").map(t => t.trim()).filter(Boolean);
        const category = iCat.value; 
        let cover = iUrl.value.trim();

        let body, method, url;

        if (fileChosen) {
          body = new FormData();
          body.append("cover", iFile.files[0]);
          body.append("title", title);
          body.append("slug", slug);
          body.append("excerpt", excerpt);
          body.append("content", content);
          body.append("tags", JSON.stringify(tags));
          body.append("category", category);
        } else {
          body = {
            title, slug, excerpt, content, tags,
            cover_image: cover,
            category
          };
        }

        if (isEdit) {
          url = `${API_BASE}/news/${data._id}`;
          method = "PUT";
        } else {
          url = `${API_BASE}/news`;
          method = "POST";
        }

        const res = await authFetch(url, { method, body });
        if (!res.ok) {
          showToast("Lưu thất bại", "err");
          return;
        }

        showToast(isEdit ? "Đã lưu!" : "Đã tạo mới!", "ok");
        close();
        loadList();
      };

    });
  }


  async function onRowAction(e) {
    const id = e.currentTarget.dataset.id;
    const act = e.currentTarget.dataset.act;

    if (act === 'toggle') {
      await authFetch(`${API_BASE}/news/${id}/publish`, { method: 'PATCH' });
      loadList();
      return;
    }

    if (act === 'edit') {
      const res = await authFetch(`${API_BASE}/news/${id}`);
      const item = await res.json();
      openNewsForm('edit', item);
      return;
    }

    if (act === 'del') {
      openModal(html`
        <div class="modal-head"><h3>Xoá bài viết?</h3></div>
        <div class="modal-foot">
          <button class="btn" id="no">Hủy</button>
          <button class="btn danger" id="yes">Xoá</button>
        </div>
      `, ({ el, close }) => {
        el.querySelector('#no').onclick = close;
        el.querySelector('#yes').onclick = async () => {
          await authFetch(`${API_BASE}/news/${id}`, { method: 'DELETE' });
          close();
          loadList();
        };
      });
    }
  }


  let timer;
  els.q.oninput = () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadList(), 300);
  };

  els.filter.onchange = () => loadList();

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

  /* INIT */
  await loadList();

  /* RETURN FOR TOOLBAR */
  return {
    onToolbar: {
      reload: () => loadList(),
      create: () => openNewsForm("create")
    }
  };

};
