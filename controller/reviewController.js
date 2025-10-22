// controller/reviewController.js
const Review = require('../models/Review');

exports.createReview = async (req, res, next) => {
  try {
    const { userId, movieId, rating, comment } = req.body;
    const r = await Review.create({ user: userId, movie: movieId, rating, comment });
    res.status(201).json({ message: 'Review created', review: r });
  } catch (err) { next(err); }
};

exports.getByMovie = async (req, res, next) => {
  try {
    const movieId = req.params.movieId;
    const reviews = await Review.find({ movie: movieId }).populate('user', 'username full_name');
    res.json(reviews);
  } catch (err) { next(err); }
};
