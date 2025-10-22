// middlewares/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  if (req.originalUrl.startsWith('/api/')) {
    res.status(status).json({ message: err.message || 'Server error', error: err.stack ? undefined : err });
  } else {
    res.status(status).send(err.message || 'Server error');
  }
};
