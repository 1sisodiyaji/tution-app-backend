const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');



router.post('/teachers/:teacherId/reviews', reviewsController.addReview);
router.get('/teachers/:teacherId/reviews', reviewsController.getTeacherReviews);
router.put('/teachers/:teacherId/reviews/:reviewId', reviewsController.editReview);
router.delete('/teachers/:teacherId/reviews/:reviewId', reviewsController.deleteReview);

module.exports = router;
