// pages/activity/activity.js
window.FMPages = window.FMPages || {};

window.FMPages.activity = async function (pageEl, ctx) {
  const {
    authFetch,
    showToast,
    html,
    $,
    $$,
    esc,
    fmtDate,
    fmtTime,
    ymd,
  } = ctx;

  // Load HTML
  pageEl.innerHTML = await (await fetch("pages/activity/activity.html")).text();

  // State phân trang
  let page = 1;
  const limit = 20;
  let total = 0;


  const tbody = $("#actTableBody", pageEl);
  const pager = $("#actPager", pageEl);

  const fFrom = $("#actFrom", pageEl);
  const fTo = $("#actTo", pageEl);
  const fAction = $("#actAction", pageEl);
  const fSuccess = $("#actSuccess", pageEl);

  $("#actSearch", pageEl).onclick = () => {
    page = 1;
    loadLogs();
  };

  $("#actReset", pageEl).onclick = () => {
    fFrom.value = "";
    fTo.value = "";
    fAction.value = "";
    fSuccess.value = "";
    page = 1;
    loadLogs();
  };

  async function loadLogs() {
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", limit);

      if (fFrom.value) params.set("from", fFrom.value);
      if (fTo.value) params.set("to", fTo.value);
      if (fAction.value.trim()) params.set("action", fAction.value.trim());
      if (fSuccess.value) params.set("success", fSuccess.value);

      const res = await authFetch(`audit-logs/my?${params.toString()}`);
      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();
      const items = data.items || [];
      total = data.total || items.length;

      renderTable(items);
      renderPager();
    } catch (err) {
      console.error(err);
      showToast("Không tải được lịch sử hoạt động", "err");
    }
  }

  function renderTable(items) {
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:12px; text-align:center; color:#aaa;">Không có dữ liệu</td></tr>`;
      return;
    }

    tbody.innerHTML = items
      .map((log) => {
        const created = log.created_at ? new Date(log.created_at) : null;

        const timeStr = created
          ? `${fmtDate(created)} ${fmtTime(created)}`
          : "—";

        const targetText = log.target_name
          ? `${log.target_type || ""} ${log.target_name}`.trim()
          : log.target_type || "—";

        return html`
          <tr>
            <td>${timeStr}</td>
            <td>${esc(log.action || "")}</td>
            <td>${esc(log.summary || "")}</td>
            <td>${esc(targetText)}</td>
            <td class="audit-result">
            <span class="tk-badge ${log.success ? "paid" : "cancelled"}">
                ${log.success ? "Thành công" : "Thất bại"}
            </span>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderPager() {
    const pages = Math.ceil(total / limit);
    if (pages <= 1) {
      pager.innerHTML = "";
      return;
    }

    let s = "";
    for (let i = 1; i <= pages; i++) {
      s += `<button class="pg-btn ${i === page ? "active" : ""}" data-p="${i}">${i}</button>`;
    }
    pager.innerHTML = s;

    $$("[data-p]", pager).forEach((b) => {
      b.onclick = () => {
        page = Number(b.dataset.p);
        loadLogs();
      };
    });
  }

  // load lan dau
  loadLogs();

  return {
    onToolbar: {
      reload: () => loadLogs(),
      create: null,
    },
  };
};
