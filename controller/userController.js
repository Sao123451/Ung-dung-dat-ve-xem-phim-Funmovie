// controller/userController.js
const User = require('../models/User');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) { next(err); }
};

exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json({ message: 'Updated', user: updated });
  } catch (err) { next(err); }
};
