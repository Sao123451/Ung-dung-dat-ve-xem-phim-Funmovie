// pages/dashboard/dashboard.js
window.FMPages = window.FMPages || {};

window.FMPages.dashboard = async function (pageEl, ctx) {
  const {
    authFetch,
    showToast,
    html,
    $,
    $$,
    esc,
    formatVND,
    fmtDate,
  } = ctx;

  // Load HTML
  pageEl.innerHTML = await (await fetch("pages/dashboard/dashboard.html")).text();

//load lan 1 kiem tra
  let ALL_TICKETS = [];

  async function loadAllTickets() {
    try {
      const res = await authFetch("tickets");
      ALL_TICKETS = await res.json();
    } catch (err) {
      console.error(err);
      showToast("Không tải được danh sách vé", "err");
    }
  }

  await loadAllTickets();


  const tabs = $$(".dash-tab", pageEl);
  const sections = $$(".dash-section", pageEl);

  tabs.forEach((btn) => {
    btn.onclick = () => {
      tabs.forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      sections.forEach((s) => s.classList.add("hidden"));
      const sec = $("#tab-" + tab, pageEl);
      sec.classList.remove("hidden");

      // Khi mở tab 4 thì load dữ liệu
      if (tab === "movie") {
        loadMovieRevenue();
      }
    };
  });

//doanh thu theo rap
  const cinemaCanvas = $("#chartCinema", pageEl);
  const tblCinema = $("#tblCinemaRevenue", pageEl);
  let chartCinema = null;

  async function loadCinemaRevenue() {
    try {
      const res = await authFetch("reports/revenue-by-cinema", {
        method: "GET",
      });
      const data = await res.json();

      const labels = data.map((c) => c.cinema_name);
      const values = data.map((c) => c.total_revenue || 0);

      if (chartCinema) chartCinema.destroy();
      chartCinema = new Chart(cinemaCanvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Doanh thu",
              data: values,
              backgroundColor: "rgba(88, 101, 242, 0.6)",
            },
          ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } },
      });

      tblCinema.innerHTML = data
        .map(
          (c) => html`
            <tr>
              <td>${esc(c.cinema_name)}</td>
              <td>${c.total_tickets}</td>
              <td>${formatVND(c.total_revenue)}</td>
            </tr>
          `
        )
        .join("");
    } catch (e) {
      console.error(e);
      showToast("Không tải được doanh thu theo rạp", "err");
    }
  }

//doanh thu theo thang
  const selYear = $("#yearSelect", pageEl);
  const monthCanvas = $("#chartMonth", pageEl);
  const tblMonth = $("#tblMonthRevenue", pageEl);
  let chartMonth = null;

  function initMonthYear() {
    const currentYear = new Date().getFullYear();
    selYear.innerHTML = Array.from({ length: 6 }, (_, i) => {
      const y = currentYear - 3 + i;
      return `<option value="${y}">${y}</option>`;
    }).join("");

    selYear.value = currentYear;
  }

  async function loadMonthRevenue() {
    try {
      const res = await authFetch("reports/revenue-by-month");
      const data = await res.json();

      const year = Number(selYear.value);

      // tạo mảng 12 tháng mặc định = 0
      const values = Array(12).fill(0);
      //mảng số vé
      const ticketCounts = Array(12).fill(0);

      // FE tự tính số vé bán trong tháng từ ALL_TICKETS
      ALL_TICKETS.forEach((t) => {
        if (t.payment_status === "paid" && t.payment_time) {
          const d = new Date(t.payment_time);
          if (d.getFullYear() === year) {
            const m = d.getMonth(); // 0..11
            ticketCounts[m] += 1;
          }
        }
      });

      data.forEach((item) => {
        if (item.year === year) {
          values[item.month - 1] = item.total_revenue;
        }
      });

      const labels = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);

      if (chartMonth) chartMonth.destroy();
      chartMonth = new Chart(monthCanvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Doanh thu theo tháng",
              data: values,
              borderColor: "#4facfe",
              backgroundColor: "rgba(79, 172, 254, 0.3)",
              tension: 0.3,
              fill: true,
            },
          ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } },
      });

      tblMonth.innerHTML = values
        .map(
          (v, i) => html`
            <tr>
              <td>${i + 1}/${year}</td>
              <td>${formatVND(v)}</td>
              <td>${ticketCounts[i]}</td>
            </tr>
          `
        )
        .join("");
    } catch (e) {
      console.error(e);
      showToast("Không tải được thống kê tháng", "err");
    }
  }

//doanh thu theo ngay
  const selDayMonth = $("#dayMonthSelect", pageEl);
  const selDayYear = $("#dayYearSelect", pageEl);
  const dayCanvas = $("#chartDay", pageEl);
  const tblDay = $("#tblDayRevenue", pageEl);
  let chartDay = null;

  // load dropdown tháng/năm
  (function initDayMonthYear() {
    selDayMonth.innerHTML = Array.from(
      { length: 12 },
      (_, i) => `<option value="${i + 1}">${i + 1}</option>`
    ).join("");
    selDayYear.innerHTML = Array.from({ length: 6 }, (_, i) => {
      const y = new Date().getFullYear() - 3 + i;
      return `<option value="${y}">${y}</option>`;
    }).join("");

    selDayMonth.value = new Date().getMonth() + 1;
    selDayYear.value = new Date().getFullYear();
  })();

  function daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
  }

  async function loadDayRevenue() {
    const month = Number(selDayMonth.value);
    const year = Number(selDayYear.value);

    try {
      const from = `${year}-${String(month).padStart(2, "0")}-01`;
      const to = `${year}-${String(month).padStart(2, "0")}-${String(
        daysInMonth(month, year)
      ).padStart(2, "0")}`;

      const res = await authFetch(
        `reports/revenue-by-day?from=${from}&to=${to}`
      );
      const data = await res.json();

      const days = daysInMonth(month, year);
      const values = Array(days).fill(0);

      data.forEach((d) => {
        const day = Number(d.date.split("-")[2]);
        values[day - 1] = d.total_revenue;
      });

      const labels = Array.from(
        { length: days },
        (_, i) => `${i + 1}/${month}`
      );

      if (chartDay) chartDay.destroy();
      chartDay = new Chart(dayCanvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Doanh thu theo ngày",
              data: values,
              borderColor: "#ff6b81",
              backgroundColor: "rgba(255, 107, 129, 0.2)",
              tension: 0.3,
              fill: true,
            },
          ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } },
      });

      tblDay.innerHTML = values
        .map((v, i) => {
          const rec = data.find(
            (d) => Number(d.date.split("-")[2]) === i + 1
          );
          return html`
            <tr>
              <td>${i + 1}/${month}/${year}</td>
              <td>${formatVND(v)}</td>
              <td>${rec ? rec.total_tickets : 0}</td>
            </tr>
          `;
        })
        .join("");
    } catch (e) {
      console.error(e);
      showToast("Không tải được thống kê ngày", "err");
    }
  }



// doanh thu theo phim
  const movieCanvas = $("#chartMovie", pageEl);
  const tblMovie = $("#tblMovieRevenue", pageEl);
  let chartMovie = null;

  // Cache showtime giống trang Vé
  const showtimeCache = new Map();

  async function loadShowtime(id) {
    if (!id) return null;
    const key = String(id);
    if (showtimeCache.has(key)) return showtimeCache.get(key);

    const res = await authFetch(`/showtimes/${id}`);
    if (!res.ok) {
      showtimeCache.set(key, null);
      return null;
    }
    const data = await res.json();
    showtimeCache.set(key, data);
    return data;
  }

  // Gom nhóm vé theo phim
  function buildMovieStats() {
    const map = new Map();

    ALL_TICKETS.forEach((t) => {
      // Chỉ tính vé đã thanh toán
      const isPaid =
        t.status === "paid" ||
        t.payment_status === "paid" ||
        t.payment_status === "succeeded";

      if (!isPaid) return;

      const amount = t.total_after ?? t.total_before ?? 0;

      const st = showtimeCache.get(String(t.showtime)) || {};
      const mv = st.movie || {};

      const movieId = mv._id || mv.id || null;
      const movieTitle = mv.title || mv.name || "Không rõ tên phim";


      const key = movieId || `unknown-${movieTitle}-${t._id}`;

      if (!map.has(key)) {
        map.set(key, {
          movieId: movieId || null,
          movieTitle,
          totalRevenue: 0,
          totalTickets: 0,
        });
      }

      const stat = map.get(key);
      stat.totalRevenue += amount;
      stat.totalTickets += 1;
    });

    return Array.from(map.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );
  }

  async function loadMovieRevenue() {
    try {
      // 1) Load showtime cho TẤT CẢ showtime id xuất hiện trong ALL_TICKETS
      const ids = Array.from(
        new Set(
          ALL_TICKETS.map((t) => t.showtime).filter((id) => id != null)
        )
      );

      await Promise.all(ids.map((id) => loadShowtime(id)));

      // 2) Tính thống kê theo phim
      const stats = buildMovieStats();

      const topN = stats.slice(0, 10);
      const labels = topN.map((m) => m.movieTitle);
      const values = topN.map((m) => m.totalRevenue);

      if (chartMovie) chartMovie.destroy();
      chartMovie = new Chart(movieCanvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Doanh thu",
              data: values,
              backgroundColor: "rgba(88, 101, 242, 0.6)",
            },
          ],
        },
        options: {
          responsive: true,
          indexAxis: "y",
          scales: {
            x: { beginAtZero: true },
          },
        },
      });

      tblMovie.innerHTML = stats
        .map(
          (m, idx) => html`
            <tr>
              <td>#${idx + 1}</td>
              <td>${esc(m.movieTitle)}</td>
              <td>${m.totalTickets}</td>
              <td>${formatVND(m.totalRevenue)}</td>
            </tr>
          `
        )
        .join("");
    } catch (e) {
      console.error(e);
      showToast("Không tải được thống kê theo phim", "err");
    }
  }

  // BUTTON EVENTS
  $("#btnLoadMonth", pageEl).onclick = loadMonthRevenue;
  $("#btnLoadDay", pageEl).onclick = loadDayRevenue;


  initMonthYear();
  loadCinemaRevenue(); // tab mặc định

  return {
    onToolbar: {
      reload: async () => {
        showtimeCache.clear();
        await loadAllTickets();
        await loadCinemaRevenue();

      },
      create: null,
    },
  };
};
