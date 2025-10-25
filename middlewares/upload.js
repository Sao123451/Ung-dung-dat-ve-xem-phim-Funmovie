// middlewares/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dest = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(dest, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, dest),
  filename:    (_, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});

const fileFilter = (_, file, cb) => {
  const ok = ['.png','.jpg','.jpeg','.webp'].includes(path.extname(file.originalname).toLowerCase());
  cb(ok ? null : new Error('Only image files allowed'), ok);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});
