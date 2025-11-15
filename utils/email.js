const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

exports.sendOTP = async (to, code) => {
  await transporter.sendMail({
    from: `"FunMovie" <${process.env.MAIL_USER}>`,
    to,
    subject: "Mã OTP xác thực FunMovie",
    html: `
      <h2>Mã OTP của bạn là:</h2>
      <h1 style="color:#ff6600">${code}</h1>
      <p>Mã có hiệu lực trong 5 phút.</p>
    `
  });
};
