const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

async function sendTicketEmail(to, ticket, showtime, seats) {
  // Tạo QR CODE dạng base64
  const qrImage = await QRCode.toDataURL(ticket.qr_data);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const html = `
    <h2>Vé xem phim của bạn</h2>

    <p><b>Mã đặt vé:</b> ${ticket.reservation_code}</p>

    <p><b>Phim:</b> ${showtime.movie.title}</p>
    <p><b>Rạp:</b> ${showtime.cinema.name}</p>
    <p><b>Phòng:</b> ${showtime.room.name}</p>
    <p><b>Suất chiếu:</b> ${new Date(showtime.start_time).toLocaleString()}</p>

    <p><b>Ghế:</b> ${seats.map(s => `${s.row}${s.number}`).join(", ")}</p>

    <p><b>Tổng tiền:</b> ${ticket.total_after.toLocaleString()} VNĐ</p>

    <h3>QR Check-in:</h3>
    <img src="${qrImage}" width="180"/>
  `;

  await transporter.sendMail({
    from: `"FunMovie" <${process.env.MAIL_USER}>`,
    to,
    subject: "Vé xem phim của bạn – FunMovie",
    html,
  });
}

module.exports = sendTicketEmail;
