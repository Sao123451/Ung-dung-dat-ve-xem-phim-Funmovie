(() => {
  window.FMPages = window.FMPages || {};

  window.FMPages.cinemas = async function mountCinemas(container, ctx) {
    const { API_BASE, getUser, authFetch, showToast, openModal, setInputError, clearInputError, html, $ } = ctx;

    // ===== Quyền =====
    const me = getUser() || {};
    const canManage = ['admin', 'manager'].includes(me.role);

    // ===== State =====
    let filter = { q: '', city: '' };
    let page = 1;
    const limit = 10;

    let items = [];
    let total = 0;
    let cities = [];

    // ===== Danh sách 34 tỉnh/thành dùng cho form =====
    const VN_PROVINCES_34 = [
      'Hà Nội','Hải Phòng','Quảng Ninh','Bắc Ninh','Bắc Giang','Lạng Sơn','Cao Bằng','Bắc Kạn',
      'Thái Nguyên','Tuyên Quang','Hà Giang','Yên Bái','Lào Cai','Phú Thọ','Vĩnh Phúc','Hưng Yên',
      'Hải Dương','Thái Bình','Nam Định','Ninh Bình','Hà Nam','Hòa Bình','Sơn La','Điện Biên',
      'Lai Châu','Thanh Hóa','Nghệ An','Hà Tĩnh','Quảng Bình','Quảng Trị','Thừa Thiên Huế',
      'Đà Nẵng','Quảng Nam','Lạng Sơn','Bắc Giang'
    ].slice(0,34);

    // ===== Helpers =====
    const esc = s => (typeof s === 'string' ? s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) : s);
    function parseList(json) {
      if (Array.isArray(json)) return { items: json, total: json.length };
      if (Array.isArray(json.items)) return { items: json.items, total: Number(json.total || json.count || json.items.length) };
      if (Array.isArray(json.data)) return { items: json.data, total: Number(json.total || json.data.length) };
      return { items: [], total: 0 };
    }
    function buildMapLink(c) {
      const lat = Number(c?.latitude ?? c?.lat);
      const lng = Number(c?.longitude ?? c?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return `https://www.google.com/maps?q=${lat},${lng}&z=16`;
      const q = encodeURIComponent(`${c?.name || ''} ${c?.address || ''} ${c?.city || ''}`);
      return `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    const pinPink = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ff4da6" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>`;

    // Giới hạn VN (xấp xỉ)
    const LAT_MIN = 8.18, LAT_MAX = 23.5;
    const LNG_MIN = 102.14, LNG_MAX = 109.65;

    // ===== Load skeleton =====
    try {
      const tpl = await fetch('pages/cinemas/cinemas.html', { cache: 'no-store' }).then(r => r.text());
      container.innerHTML = tpl;
    } catch {
      container.innerHTML = `<div class="card"><div class="muted">Không tải được giao diện cinemas.html</div></div>`;
      return {};
    }

    // ===== Elements =====
    const els = {
      table:  $('#cn-table', container),
      q:      $('#cn-q', container),
      city:   $('#cn-city', container),
      info:   $('#cn-info', container),
      prev:   $('#cn-prev', container),
      next:   $('#cn-next', container),
      page:   $('#cn-page', container),
    };

    // ===== API calls =====
    async function loadCitiesOptions() {
      try {
        const res = await authFetch(`${API_BASE}/cinemas?limit=1000`, { cache: 'no-store' });
        const raw = await res.json().catch(() => ({}));
        const { items: all } = parseList(raw);
        const set = new Set(all.map(c => (c.city || '').trim()).filter(Boolean));
        cities = Array.from(set).sort((a,b)=>a.localeCompare(b,'vi'));
        els.city.innerHTML = `<option value="">Tất cả thành phố</option>` + 
          cities.map(c => `<option value="${esc(c)}" ${c===filter.city?'selected':''}>${esc(c)}</option>`).join('');
      } catch {}
    }

    async function loadCinemas() {
      els.table.innerHTML = `<div class="muted">Đang tải danh sách rạp...</div>`;
      showInfo('');
      const u = new URL(`${API_BASE}/cinemas`);
      if (filter.q)    u.searchParams.set('q', filter.q);
      if (filter.city) u.searchParams.set('city', filter.city);
      u.searchParams.set('page', String(page));
      u.searchParams.set('limit', String(limit));

      try {
        const res = await authFetch(u.toString(), { cache: 'no-store' });
        const json = await res.json().catch(()=> ({}));
        const parsed = parseList(json);
        items = parsed.items || [];
        total = Number.isFinite(parsed.total) ? parsed.total : items.length;
        renderTable();
      } catch {
        els.table.innerHTML = `<div class="muted">Không tải được danh sách rạp.</div>`;
        showInfo('Không tải được danh sách rạp.', true);
      }
    }

    function showInfo(msg, isError=false){
      const el = $('#cn-info', container);
      el.textContent = msg || '';
      el.classList.toggle('error-text', !!isError);
    }

    // ===== Render =====
    function renderTable() {
      if (!items.length) {
        els.table.innerHTML = `<div class="muted">Không có rạp cho bộ lọc hiện tại.</div>`;
      } else {
        els.table.innerHTML = html`
          <table class="table">
            <thead>
              <tr>
                <th style="width:26%">Tên rạp</th>
                <th style="width:14%">Thành phố</th>
                <th>Địa chỉ</th>
                <th style="width:18%">Tọa độ</th>
                <th style="width:16%">Hotline</th>
                <th style="width:190px">Hành động</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(c => {
                const lat = c.latitude ?? c.lat;
                const lng = c.longitude ?? c.lng;
                const hasCoord = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
                const coordStr = hasCoord ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : '—';
                const coordLink = hasCoord ? buildMapLink(c) : '#';
                return html`
                <tr data-id="${c._id}">
                  <td>${esc(c.name || '')}</td>
                  <td>${esc(c.city || '')}</td>
                  <td>${esc(c.address || '')}</td>
                  <td>
                    ${hasCoord ? `<a href="${coordLink}" target="_blank" style="display:inline-flex;align-items:center;gap:6px">${pinPink}<span>${coordStr}</span></a>` : '<span class="muted">—</span>'}
                  </td>
                  <td class="cn-hotline">${esc(c.hotline || '')}</td>
                  <td>
                    <div class="row-actions">
                      ${canManage ? `<button class="btn" data-act="edit" data-id="${c._id}">Sửa</button>` : ''}
                      ${canManage ? `<button class="btn danger" data-act="del" data-id="${c._id}">Xoá</button>` : ''}
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        `;
        els.table.querySelectorAll('[data-act]').forEach(b => b.onclick = onRowAction);
      }

      // cập nhật pager
      const hasServerPaging = total > items.length || page > 1;
      const maxPage = Math.max(1, Math.ceil(total / limit));
      els.page.textContent = hasServerPaging ? `${page}/${maxPage}` : `${items.length} mục`;
    }

    // ===== Actions =====
    async function onRowAction(e) {
      const id  = e.currentTarget.getAttribute('data-id');
      const act = e.currentTarget.getAttribute('data-act');
      const c   = items.find(x => x._id === id);

      if (act === 'edit') {
        if (!canManage) { showInfo('Chỉ Admin/Manager mới được sửa rạp.', true); return; }
        openCinemaForm('edit', c);
        return;
      }
      if (act === 'del') {
        if (!canManage) { showInfo('Chỉ Admin/Manager mới được xoá rạp.', true); return; }
        const markup = html`
          <div class="modal-head"><h3>Xoá rạp</h3></div>
          <div class="form"><p>Bạn có chắc muốn xoá rạp "<b>${esc(c?.name || '')}</b>"?</p></div>
          <div class="modal-foot">
            <button class="btn" id="cf-cancel">Hủy</button>
            <button class="btn danger" id="cf-ok">Xác nhận</button>
          </div>`;
        openModal(markup, ({ el, close }) => {
          el.querySelector('#cf-cancel').onclick = close;
          el.querySelector('#cf-ok').onclick = async () => {
            try {
              const res = await authFetch(`${API_BASE}/cinemas/${id}`, { method: 'DELETE' });
              const j = await res.json().catch(()=> ({}));
              if (!res.ok) { showInfo(j?.message || 'Xoá không thành công.', true); return; }
              await loadCinemas();
              close(); showInfo('Đã xoá 1 rạp.');
            } catch { showInfo('Lỗi mạng khi xoá.', true); }
          };
        });
        return;
      }
    }

    function optionList(options, selected) {
      const cur = String(selected || '').trim();
      return `<option value="">-- Chọn tỉnh/thành --</option>` +
        options.map(o => `<option value="${esc(o)}" ${o===cur?'selected':''}>${esc(o)}</option>`).join('');
    }

    function openCinemaForm(mode, data={}) {
      const isEdit = mode === 'edit';
      const title = isEdit ? 'Sửa rạp' : 'Thêm rạp';

      const mk = html`
        <div class="modal-head"><h3>${title}</h3><div class="spacer"></div></div>
        <div class="form">
          <div class="row">
            <div class="col-6 field">
              <label>Tên rạp *</label>
              <input id="f-name" placeholder="VD: FunMovie Nguyễn Trãi" value="${esc(data.name || '')}">
            </div>
            <div class="col-6 field">
              <label>Thành phố *</label>
              <select id="f-city">${optionList(VN_PROVINCES_34, data.city)}</select>
            </div>

            <div class="col-12 field">
              <label>Địa chỉ *</label>
              <input id="f-address" placeholder="Số nhà, đường, quận/huyện..." value="${esc(data.address || '')}">
            </div>

            <div class="col-6 field">
              <label>Vĩ độ (latitude) *</label>
              <input id="f-lat" type="number" step="any" placeholder="VD: 21.0278" value="${esc(data.latitude ?? data.lat ?? '')}">
            </div>
            <div class="col-6 field">
              <label>Kinh độ (longitude) *</label>
              <input id="f-lng" type="number" step="any" placeholder="VD: 105.8342" value="${esc(data.longitude ?? data.lng ?? '')}">
            </div>

            <div class="col-6 field">
              <label>Hotline *</label>
              <input id="f-hotline" placeholder="VD: 0912345678" value="${esc(data.hotline || '')}">
            </div>
          </div>
          <div id="f-error" class="error-text" style="margin-top:4px"></div>
        </div>
        <div class="modal-foot">
          <button class="btn" id="f-cancel">Hủy</button>
          <button class="btn primary" id="f-submit">${isEdit ? 'Lưu' : 'Tạo rạp'}</button>
        </div>
      `;

      openModal(mk, ({ el, close }) => {
        const $g = id => el.querySelector('#' + id);
        const iName = $g('f-name');
        const iCity = $g('f-city');
        const iAddr = $g('f-address');
        const iLat  = $g('f-lat');
        const iLng  = $g('f-lng');
        const iPhone= $g('f-hotline');
        const iErr  = $g('f-error');

        function clearAllErr() {
          [iName, iCity, iAddr, iLat, iLng, iPhone].forEach(x => x && clearInputError(x));
          iErr.textContent = '';
        }
        [iName, iCity, iAddr, iLat, iLng, iPhone].forEach(elm => elm.addEventListener('input', ()=> {
          clearInputError(elm); iErr.textContent = '';
        }));

        $g('f-cancel').onclick = close;

        $g('f-submit').onclick = async () => {
          clearAllErr();

          // bắt buộc
          let ok = true;
          const req = (el, msg)=>{ const v=(el.value||'').trim(); if(!v){ setInputError(el, msg); ok=false; } };
          req(iName,'Tên rạp không được để trống.');
          req(iCity,'Vui lòng chọn tỉnh/thành.');
          req(iAddr,'Địa chỉ không được để trống.');
          req(iLat ,'Nhập vĩ độ.');
          req(iLng ,'Nhập kinh độ.');
          req(iPhone,'Nhập hotline.');

          const lat = Number(iLat.value);
          const lng = Number(iLng.value);
          if (!(Number.isFinite(lat) && lat >= LAT_MIN && lat <= LAT_MAX)) {
            setInputError(iLat, `Vĩ độ phải thuộc Việt Nam (${LAT_MIN} → ${LAT_MAX}).`);
            ok = false;
          }
          if (!(Number.isFinite(lng) && lng >= LNG_MIN && lng <= LNG_MAX)) {
            setInputError(iLng, `Kinh độ phải thuộc Việt Nam (${LNG_MIN} → ${LNG_MAX}).`);
            ok = false;
          }

          // Hotline: chỉ kiểm tra khi bấm Lưu — phải đúng 10 chữ số, bắt đầu 0, không ký tự khác
          const phoneRaw = (iPhone.value || '').trim();
          if (!/^0\d{9}$/.test(phoneRaw)) {
            setInputError(iPhone, 'Hotline phải gồm 10 chữ số, bắt đầu bằng 0 (VD: 0912345678).');
            ok = false;
          }

          if (!ok) { iErr.textContent = 'Vui lòng sửa các trường bôi đỏ.'; return; }

          const body = {
            name: iName.value.trim(),
            city: iCity.value.trim(),
            address: iAddr.value.trim(),
            latitude: lat,
            longitude: lng,
            hotline: phoneRaw,
          };

          try {
            let res, json;
            if (isEdit) {
              res = await authFetch(`${API_BASE}/cinemas/${data._id}`, { method: 'PUT', body });
            } else {
              res = await authFetch(`${API_BASE}/cinemas`, { method: 'POST', body });
            }
            json = await res.json().catch(()=> ({}));
            if (!res.ok) {
              iErr.textContent = json?.message || (isEdit ? 'Cập nhật không thành công.' : 'Tạo không thành công.');
              return;
            }
            close();
            await loadCitiesOptions();
            await loadCinemas();
            showInfo(isEdit ? 'Đã lưu thay đổi rạp.' : 'Đã tạo rạp mới.');
          } catch {
            iErr.textContent = 'Lỗi kết nối máy chủ.';
          }
        };
      });
    }

    // ===== Events =====
    els.q.addEventListener('input', () => {
      filter.q = els.q.value.trim();
      page = 1;
      loadCinemas();
    });
    els.city.addEventListener('change', () => {
      filter.city = els.city.value;
      page = 1;
      loadCinemas();
    });
    els.prev.onclick = () => { if (page > 1) { page--; loadCinemas(); } };
    els.next.onclick = () => {
      const maxPage = Math.max(1, Math.ceil(total / limit));
      if (page < maxPage) { page++; loadCinemas(); }
    };

    // ===== First load =====
    await loadCitiesOptions();
    await loadCinemas();

    // ===== Toolbar hooks =====
    return {
      onToolbar: {
        reload: () => loadCinemas(),
        create: () => { if (!canManage) { showInfo('Chỉ Admin/Manager được tạo rạp.', true); return; } openCinemaForm('create'); }
      }
    };
  };
})();
