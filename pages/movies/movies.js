(() => {
  window.FMPages = window.FMPages || {};

  window.FMPages.movies = async function mountMovies(container, ctx) {
    const {
      API_BASE, getUser, authFetch, showToast, openModal,
      setInputError, clearInputError, html, $
    } = ctx;

    
    const tpl = await fetch('pages/movies/movies.html', { cache: 'no-store' }).then(r => r.text());
    container.innerHTML = tpl;

   
    const me = getUser() || {};
    const isAdmin = me?.role === 'admin';

    let items = [];
    let view  = [];
    let page = 1;
    const pageSize = 8;
    let currentTab = 'all'; // all|now|coming|archived
    let q = '';

    
    const els = {
      table: $('#mv-table', container),
      info:  $('#mv-info', container),
      pg:    $('#mv-page', container),
      prev:  $('#mv-prev', container),
      next:  $('#mv-next', container),
      q:     $('#mv-q', container),
      tabs:  [...container.querySelectorAll('.tab')]
    };


    const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const asText = v => (Array.isArray(v) ? v.join(', ') : (v || ''));

    const badgeStatus = (st) => {
      if (st === 'now_showing') return '<span class="badge ok">Đang chiếu</span>';
      if (st === 'coming')      return '<span class="badge warn">Sắp chiếu</span>';
      return '<span class="badge muted">Suất chiếu sớm</span>';
    };

    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth()+m); return x; };

    function readFileAsDataURL(file){
      return new Promise((resolve,reject)=>{
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error('Không đọc được file'));
        fr.readAsDataURL(file);
      });
    }


    async function loadList() {
      els.table.innerHTML = `<div class="muted">Đang tải danh sách phim...</div>`;
      els.info.textContent = '';

      let url = `${API_BASE}/movies`;
      if (currentTab === 'now')      url = `${API_BASE}/movies/now-showing`;
      if (currentTab === 'coming')   url = `${API_BASE}/movies/coming`;
      if (currentTab === 'archived') url = `${API_BASE}/movies/archived`;

      try {
        const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
        const data = await res.json().catch(()=>[]);
        items = Array.isArray(data) ? data : [];
        applyFilter();
      } catch {
        items = [];
        els.table.innerHTML = `<div class="muted">Không tải được danh sách phim.</div>`;
        els.info.textContent = 'Lỗi khi tải phim.';
      }
    }


    function applyFilter(){
      const ql = (q||'').trim().toLowerCase();
      view = items.filter(m => {
        if (!ql) return true;
        const t  = String(m.title||'').toLowerCase();
        const dr = String(m.director||'').toLowerCase();
        const cs = Array.isArray(m.cast) ? m.cast.join(', ').toLowerCase() : String(m.cast||'').toLowerCase();
        return t.includes(ql) || dr.includes(ql) || cs.includes(ql);
      });
      page = 1;
      renderTable();
    }

    // dung bang tu cac item
    function renderTable(){
      const start = (page - 1) * pageSize;
      const rows  = view.slice(start, start + pageSize);
      const total = view.length;

      if (!rows.length){
        els.table.innerHTML = `<div class="muted">Không có phim phù hợp.</div>`;
      } else {
        els.table.innerHTML = html`
          <table class="table">
            <thead>
              <tr>
                <th style="width:68px">Poster</th>
                <th style="width:32%">Tiêu đề</th>
                <th style="width:18%">Thể loại</th>
                <th style="width:10%">Thời lượng</th>
                <th style="width:8%">Độ tuổi</th>
                <th style="width:12%">Trạng thái</th>
                <th style="width:20%">Hành động</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(m => html`
                <tr data-id="${m._id}">
                  <td>${m.poster ? `<img class="poster" src="${esc(m.poster)}" alt="">` : ''}</td>
                  <td>
                    <div style="font-weight:600">${esc(m.title || '')}</div>
                    <div class="muted" style="font-size:12px">Đạo diễn: ${esc(m.director || '—')}</div>
                  </td>
                  <td>${esc(asText(m.genre))}</td>
                  <td>${m.duration ? `${m.duration} phút` : '—'}</td>
                  <td>${Number.isFinite(m.age_limit)? m.age_limit : '—'}</td>
                  <td>${badgeStatus(m.status)}</td>
                  <td>
                    <div class="row-actions">
                      ${isAdmin ? `<button class="btn" data-act="edit" data-id="${m._id}">Sửa</button>` : ''}
                      ${isAdmin ? `<button class="btn danger" data-act="del" data-id="${m._id}">Xoá</button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        els.table.querySelectorAll('[data-act]').forEach(b => b.onclick = onRowAction);
      }

      const shown = Math.min(start + rows.length, total);
      els.info.textContent = total ? `Hiển thị ${total ? start+1 : 0}–${shown} / ${total}` : '';
      els.pg.textContent   = String(page);
    }

    // form khi sua va them
    function openMovieForm(mode='create', data={}){
      if (!isAdmin){ showToast?.('Chỉ Admin được phép thao tác phim.', 'err'); return; }
      const isEdit = mode === 'edit';
      const title = isEdit ? 'Sửa phim' : 'Thêm phim';

      const V = {
        title: data.title || '',
        duration: data.duration ?? '',
        age_limit: Number.isFinite(data.age_limit)? data.age_limit : 0,
        release_date: data.release_date ? new Date(data.release_date) : null,
        status: data.status || 'coming',
        language: data.language || '',
        genre: Array.isArray(data.genre) ? data.genre.join(', ') : (data.genre || ''),
        director: data.director || '',
        cast: Array.isArray(data.cast) ? data.cast.join(', ') : (data.cast || ''),
        poster: data.poster || '',
        description: data.description || ''
      };
      const rd = V.release_date ? ymd(V.release_date) : '';


      const markup = html`
        <div class="modal-head"><h3>${title}</h3><div class="spacer"></div></div>
        <div class="form">
          <div class="row">
            <div class="field" style="grid-column: span 8">
              <label>Tên phim *</label>
              <input id="f-title" value="${esc(V.title)}">
            </div>
            <div class="field" style="grid-column: span 2">
              <label>Thời lượng (phút) *</label>
              <input id="f-duration" type="number" value="${esc(V.duration)}">
            </div>
            <div class="field" style="grid-column: span 2">
              <label>Độ tuổi *</label>
              <select id="f-age">
                ${[0,13,16,18].map(a => `<option value="${a}" ${Number(V.age_limit)===a?'selected':''}>${a}</option>`).join('')}
              </select>
            </div>

            <div class="field" style="grid-column: span 6">
              <label>Ngày phát hành *</label>
              <input id="f-release" type="date" value="${rd}">
            </div>
            <div class="field" style="grid-column: span 6">
              <label>Trạng thái *</label>
              <select id="f-status">
                <option value="coming" ${V.status==='coming'?'selected':''}>Sắp chiếu</option>
                <option value="now_showing" ${V.status==='now_showing'?'selected':''}>Đang chiếu</option>
                <option value="archived" ${V.status==='archived'?'selected':''}>Suất chiếu sớm</option>
              </select>
            </div>

            <div class="field" style="grid-column: span 6">
              <label>Ngôn ngữ *</label>
              <input id="f-lang" value="${esc(V.language)}">
            </div>
            <div class="field" style="grid-column: span 6">
              <label>Thể loại (phân tách dấu phẩy) *</label>
              <input id="f-genre" value="${esc(V.genre)}" placeholder="Hành động, Tâm lý">
            </div>

            <div class="field" style="grid-column: span 6">
              <label>Đạo diễn *</label>
              <input id="f-director" value="${esc(V.director)}">
            </div>
            <div class="field" style="grid-column: span 6">
              <label>Diễn viên (phân tách dấu phẩy) *</label>
              <input id="f-cast" value="${esc(V.cast)}" placeholder="Ngô Thanh Vân, Tom Hardy">
            </div>

            <div class="field" style="grid-column: span 12">
              <label>Poster — chọn tệp hoặc nhập URL *</label>
              <div class="row">
                <div class="field" style="grid-column: span 6">
                  <input id="f-file" type="file" accept=".png,.jpg,.jpeg,.webp">
                </div>
                <div class="field" style="grid-column: span 6">
                  <input id="f-poster" placeholder="/uploads/posters/xxx.jpg hoặc https://..." value="${esc(V.poster)}">
                </div>
              </div>
              <div style="margin-top:8px">
                <img class="mv-poster-preview" id="f-preview" src="${esc(V.poster)}" alt="" style="width:130px;height:174px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">
              </div>
            </div>

            <div class="field" style="grid-column: span 12">
              <label>Mô tả *</label>
              <textarea id="f-desc" rows="5">${esc(V.description)}</textarea>
            </div>
          </div>
          <div id="f-err" class="error-text"></div>
        </div>
        <div class="modal-foot">
          <button class="btn" id="f-cancel">Hủy</button>
          <button class="btn primary" id="f-submit">${isEdit ? 'Lưu' : 'Tạo phim'}</button>
        </div>
      `;

      openModal(markup, ({ el, close }) => {
        const $g = id => el.querySelector('#' + id);

        const iTitle = $g('f-title');
        const iDur   = $g('f-duration');
        const iAge   = $g('f-age');
        const iRel   = $g('f-release');
        const iStatus= $g('f-status');
        const iLang  = $g('f-lang');
        const iGenre = $g('f-genre');
        const iDir   = $g('f-director');
        const iCast  = $g('f-cast');
        const iPoster= $g('f-poster');
        const iFile  = $g('f-file');
        const iPrev  = $g('f-preview');
        const iDesc  = $g('f-desc');
        const iErr   = $g('f-err');

        
        iPoster.addEventListener('input', () => { iPrev.src = iPoster.value.trim(); });
        iFile.addEventListener('change', async () => {
          const f = iFile.files?.[0];
          if (!f) return;
          try { iPrev.src = await readFileAsDataURL(f); }
          catch { showToast('Không đọc được file ảnh.', 'err'); }
        });

        function clearAllErr(){
          [iTitle,iDur,iAge,iRel,iStatus,iLang,iGenre,iDir,iCast,iPoster,iDesc].forEach(x=>clearInputError(x));
          iErr.textContent = '';
        }
        ['input','change'].forEach(ev=>{
          [iTitle,iDur,iAge,iRel,iStatus,iLang,iGenre,iDir,iCast,iPoster,iDesc].forEach(x=>x.addEventListener(ev, clearAllErr));
        });

        $g('f-cancel').onclick = close;

        //validate sau khi bấm
        $g('f-submit').onclick = async () => {
          clearAllErr();
          let ok = true;

          const req = (el, msg) => { if (!String(el.value||'').trim()){ setInputError(el, msg); ok=false; } };

          // bắt buộc mọi trường
          req(iTitle, 'Tên phim bắt buộc.');
          req(iDur  , 'Thời lượng bắt buộc.');
          req(iAge  , 'Chọn độ tuổi.');
          req(iRel  , 'Chọn ngày phát hành.');
          req(iStatus,'Chọn trạng thái.');
          req(iLang , 'Nhập ngôn ngữ.');
          req(iGenre, 'Nhập thể loại.');
          req(iDir  , 'Nhập đạo diễn.');
          req(iCast , 'Nhập diễn viên.');
          req(iDesc , 'Nhập mô tả.');

          // Poster: cần hoặc file hoặc URL
          const hasFile  = iFile.files && iFile.files.length > 0;
          const posterUrl= iPoster.value.trim();
          if (!hasFile && !posterUrl){
            setInputError(iPoster, 'Cần chọn tệp hoặc nhập URL poster.');
            ok=false;
          }

          // validate logic sau khi bấm
          const dur = Number(iDur.value);
          if (!(Number.isFinite(dur) && dur >= 40 && dur <= 240)) {
            setInputError(iDur, 'Thời lượng phải trong khoảng 40–240 phút.');
            ok=false;
          }

          const age = Number(iAge.value);
          if (![0,13,16,18].includes(age)) {
            setInputError(iAge, 'Độ tuổi chỉ: 0 / 13 / 16 / 18');
            ok=false;
          }

          const relStr = iRel.value;
          let relDate;
          if (relStr) {
            const t = new Date(relStr + 'T00:00:00');
            if (isNaN(t.getTime())) {
              setInputError(iRel, 'Ngày phát hành không hợp lệ.');
              ok=false;
            } else {
              relDate = t;
              const today = new Date(); today.setHours(0,0,0,0);

              if (iStatus.value === 'coming') {
                const maxFuture = addMonths(today, 3);
                if (!(relDate > today && relDate <= maxFuture)) {
                  setInputError(iRel, `Sắp chiếu: chỉ chọn ngày tương lai ≤ ${ymd(maxFuture)}.`);
                  ok=false;
                }
              } else {
                const minPast = addMonths(today, -2);
                if (!(relDate <= today && relDate >= minPast)) {
                  setInputError(iRel, `Đang chiếu/Suất chiếu sớm: chỉ chọn ngày quá khứ từ ${ymd(minPast)} → ${ymd(today)}.`);
                  ok=false;
                }
              }
            }
          }

          if (!ok) { iErr.textContent = 'Vui lòng sửa các trường bôi đỏ rồi thử lại.'; return; }

          // Chuẩn hoá payload
          let posterFinal = posterUrl || '';
          if (hasFile) {
            try { posterFinal = await readFileAsDataURL(iFile.files[0]); }
            catch { setInputError(iPoster, 'Không đọc được file ảnh.'); iErr.textContent='Không đọc được file ảnh.'; return; }
          }

          const body = {
            title: iTitle.value.trim(),
            duration: dur,
            age_limit: age,
            release_date: relDate ? relDate.toISOString() : null,
            status: iStatus.value,
            language: iLang.value.trim(),
            genre: iGenre.value.split(',').map(s=>s.trim()).filter(Boolean),
            director: iDir.value.trim(),
            cast: iCast.value.split(',').map(s=>s.trim()).filter(Boolean),
            poster: posterFinal,
            description: iDesc.value.trim()
          };

          try{
            let res, json;
            if (isEdit) res = await authFetch(`${API_BASE}/movies/${data._id}`, { method:'PUT', body });
            else        res = await authFetch(`${API_BASE}/movies`,          { method:'POST', body });

            json = await res.json().catch(()=> ({}));
            if (!res.ok) {
              iErr.textContent = json?.message || (isEdit ? 'Cập nhật không thành công.' : 'Tạo phim không thành công.');
              return;
            }
            close();
            showToast?.(isEdit ? 'Đã lưu thay đổi phim.' : 'Đã tạo phim mới.', 'ok');
            await loadList();
          } catch {
            iErr.textContent = 'Lỗi kết nối máy chủ.';
          }
        };
      });
    }

//hanh dong sua, xoa trong item
    async function onRowAction(e){
      const id  = e.currentTarget.getAttribute('data-id');
      const act = e.currentTarget.getAttribute('data-act');
      const m   = items.find(x => x._id === id);
      if (!id) return;


      if (act === 'edit'){
        if (!isAdmin){ showToast?.('Chỉ Admin được sửa.', 'err'); return; }
        try{
          const res = await fetch(`${API_BASE}/movies/${id}`, { cache:'no-store' });
          const one = await res.json().catch(()=> ({}));
          if (!res.ok) {
            showToast?.(one?.message || 'Không tải được dữ liệu để sửa.', 'err');
            return;
          }
          openMovieForm('edit', one);
        } catch {
          showToast?.('Lỗi mạng khi tải dữ liệu.', 'err');
        }
        return;
      }

   
      if (act === 'del'){
        if (!isAdmin){ showToast?.('Chỉ Admin được xoá.', 'err'); return; }

        //Kiểm tra xem phim này có suất chiếu hay không
        try {
          const u = new URL(`${API_BASE}/showtimes`);
          u.searchParams.set('movie', id);
          u.searchParams.set('limit', '50');

          const resSt = await authFetch(u.toString());
          const jsSt  = await resSt.json().catch(() => ({}));

          let list = [];
          if (Array.isArray(jsSt.items)) list = jsSt.items;
          else if (Array.isArray(jsSt.data)) list = jsSt.data;
          else if (Array.isArray(jsSt))      list = jsSt;

          // Lọc các suất chiếu thuộc phim này
          const related = list.filter(st => {
            const mv = st.movie || st.movie_id || st.movieId;
            if (!mv) return false;
            if (typeof mv === 'string') return mv === id;
            if (typeof mv === 'object') return mv._id === id;
            return false;
          });

          if (related.length > 0) {
            // Có suất chiếu → không cho xoá
            openModal(html`
              <div class="modal-head"><h3>Không thể xoá phim</h3></div>
              <div class="form">
                <p>Phim <b>${esc(m?.title || 'này')}</b> hiện vẫn còn suất chiếu trong hệ thống.</p>
                <p class="muted" style="margin-top:4px">
                  Vui lòng xoá hoặc cập nhật các suất chiếu liên quan trước khi xoá phim này.
                </p>
              </div>
              <div class="modal-foot">
                <button class="btn" id="ok-btn">Đã hiểu</button>
              </div>
            `, ({ el, close }) => {
              $('#ok-btn', el).onclick = close;
            });
            return;
          }
        } catch (err) {
          
          showToast?.('Không kiểm tra được suất chiếu của phim. Vui lòng thử lại.', 'err');
          return;
        }

        //Không còn suất chiếu → cho phép xoá
        const markup = html`
          <div class="modal-head"><h3>Xoá phim</h3></div>
          <div class="form">
            <p>Bạn có chắc muốn xoá <b>${esc(m?.title || 'phim này')}</b>?</p>
          </div>
          <div class="modal-foot">
            <button class="btn" id="cf-cancel">Hủy</button>
            <button class="btn danger" id="cf-ok">Xoá</button>
          </div>`;
        openModal(markup, ({ el, close }) => {
          el.querySelector('#cf-cancel').onclick = close;
          el.querySelector('#cf-ok').onclick = async () => {
            try{
              const res = await authFetch(`${API_BASE}/movies/${id}`, { method:'DELETE' });
              const d   = await res.json().catch(()=> ({}));
              if (!res.ok){
                showToast?.(d?.message || 'Xoá không thành công.', 'err');
                return;
              }
              close();
              showToast?.('Đã xoá 1 phim.', 'ok');
              await loadList();
            } catch {
              showToast?.('Lỗi kết nối khi xoá.', 'err');
            }
          };
        });
        return;
      }
    }



    els.q.addEventListener('input', () => { q = els.q.value; applyFilter(); });
    els.prev.onclick = () => { if (page > 1){ page--; renderTable(); } };
    els.next.onclick = () => { const max = Math.ceil(view.length / pageSize) || 1; if (page < max){ page++; renderTable(); } };
    els.tabs.forEach(t => t.addEventListener('click', async () => {
      els.tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      currentTab = t.getAttribute('data-status'); // all|now|coming|archived
      await loadList();
    }));

    
    const toolbar = {
      reload: () => loadList(),
      create: isAdmin ? () => openMovieForm('create') : null
    };

    
    await loadList();
    return { onToolbar: toolbar };
  };
})();
