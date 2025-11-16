const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

async function sendTicketEmail(toEmail, ticket, showtime, seats, combos) {

  const qrImage = await QRCode.toBuffer(ticket.qr_data);

  const seatLabels = seats.map(s => `${s.row}${s.number}`).join(", ");
  const comboList = combos.length
    ? combos.map(c => `${c.name} x${c.qty}`).join(", ")
    : "Không có";

  // ===========================
  // ⭐ LẤY RẠP VÀ ĐỊA CHỈ THEO 2 TRƯỜNG HỢP
  // 1) Staff → dùng snapshot
  // 2) App → fallback về showtime.cinema
  // ===========================
  const cinemaName =
    ticket.cinema_snapshot?.name ||
    showtime.cinema?.name ||
    "Không xác định";

  const cinemaAddress =
    ticket.cinema_snapshot?.address ||
    showtime.cinema?.address ||
    "Không xác định";

  // ===========================
  // HTML
  // ===========================
  const html = `
    <div style="font-family:Arial;padding:20px;">
      <h2 style="text-align:center;color:#d32f2f;">VÉ XEM PHIM FUNMOVIE</h2>

      <h3>${showtime.movie.title}</h3>

      <p><b>Rạp:</b> ${cinemaName}</p>
      <p><b>Địa chỉ:</b> ${cinemaAddress}</p>

      <hr/>

      <p><b>Mã vé:</b> <span style="font-size:22px">${ticket.reservation_code}</span></p>

      <div style="text-align:center;margin:20px 0;">
        <img src="cid:qrcode_funmovie" width="200"
             style="background:#ffffff;padding:12px;border-radius:8px;"/>
      </div>

      <p><b>Ngày chiếu:</b> ${new Date(showtime.start_time).toLocaleDateString("vi-VN")}</p>
      <p><b>Giờ chiếu:</b> ${new Date(showtime.start_time).toLocaleTimeString("vi-VN")}</p>

      <p><b>Phòng chiếu:</b> ${showtime.room.name}</p>
      <p><b>Ghế:</b> ${seatLabels}</p>

      <hr/>

      <p><b>Tiền ghế:</b> ${ticket.seat_subtotal.toLocaleString("vi-VN")} VND</p>
      <p><b>Tiền combo:</b> ${ticket.combo_subtotal.toLocaleString("vi-VN")} VND</p>
      <p><b>Giảm giá:</b> -${(
        ticket.discount_seat +
        ticket.discount_combo +
        ticket.discount_order
      ).toLocaleString("vi-VN")} VND</p>

      <h3 style="color:#2e7d32;">TỔNG THANH TOÁN: ${ticket.total_after.toLocaleString("vi-VN")} VND</h3>

      <hr/>

      <h4>Lưu ý:</h4>
      <p>Vui lòng mang mã vé hoặc QR code đến quầy dịch vụ để nhận vé.</p>

      <p style="margin-top:30px;text-align:center;">Cảm ơn bạn đã đặt vé tại FUNMOVIE 🎬</p>
    </div>
  `;

  // ===========================
  // SEND MAIL
  // ===========================
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"FunMovie" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: `FUNMOVIE – Vé xem phim của bạn (${ticket.reservation_code})`,
    html,
    attachments: [
      {
        filename: "qrcode.png",
        content: qrImage,
        cid: "qrcode_funmovie",
      }
    ]
  });
}

module.exports = sendTicketEmail;
