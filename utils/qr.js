// utils/qr.js
const QRCode = require('qrcode');

exports.generateQRDataURL = async (payloadObj) => {
  try {
    const str = JSON.stringify(payloadObj);
    const dataUrl = await QRCode.toDataURL(str);
    return dataUrl;
  } catch (err) {
    console.error('QR generation error', err);
    throw err;
  }
};
