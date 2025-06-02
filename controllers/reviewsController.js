const Teacher = require('../models/Teacher');
const mongoose = require('mongoose');

// Add a new review for a teacher
exports.addReview = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { studentId, comment, rating } = req.body;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'Rating must be between 1 and 5' 
      });
    }

    // Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ 
        message: 'Teacher not found' 
      });
    }

    // Create review object
    const newReview = {
      studentId,
      comment,
      rating,
      createdAt: new Date()
    };

    // Add review to teacher's reviews
    teacher.reviews.push(newReview);

    // Update rating statistics
    teacher.rating.breakdown[rating]++;
    teacher.rating.total += rating;
    teacher.rating.count++;
    teacher.rating.average = teacher.rating.total / teacher.rating.count;

    // Save updated teacher
    await teacher.save();

    res.status(201).json({
      message: 'Review added successfully',
      review: newReview,
      rating: teacher.rating
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ 
      message: 'Error adding review', 
      error: error.message 
    });
  }
};

// Get all reviews for a teacher
exports.getTeacherReviews = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find teacher and populate reviews
    const teacher = await Teacher.findById(teacherId)
      .select('reviews rating');

    if (!teacher) {
      return res.status(404).json({ 
        message: 'Teacher not found' 
      });
    }

    res.status(200).json({
      reviews: teacher.reviews,
      ratingStats: {
        averageRating: teacher.rating.average,
        totalReviews: teacher.rating.count,
        ratingBreakdown: teacher.rating.breakdown
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ 
      message: 'Error fetching reviews', 
      error: error.message 
    });
  }
};

// Edit an existing review
exports.editReview = async (req, res) => {
  try {
    const { teacherId, reviewId } = req.params;
    const { comment, rating } = req.body;

    // Validate input
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        message: 'Rating must be between 1 and 5' 
      });
    }

    // Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ 
        message: 'Teacher not found' 
      });
    }

    // Find the review
    const reviewIndex = teacher.reviews.findIndex(
      review => review._id.toString() === reviewId
    );

    if (reviewIndex === -1) {
      return res.status(404).json({ 
        message: 'Review not found' 
      });
    }

    // Get the original review
    const originalReview = teacher.reviews[reviewIndex];

    // Update review details
    if (comment) originalReview.comment = comment;
    
    // If rating is being changed, update rating statistics
    if (rating && rating !== originalReview.rating) {
      // Decrement old rating breakdown
      teacher.rating.breakdown[originalReview.rating]--;
      
      // Increment new rating breakdown
      teacher.rating.breakdown[rating]++;
      
      // Update total rating
      teacher.rating.total = teacher.rating.total - originalReview.rating + rating;
      
      // Update review rating
      originalReview.rating = rating;
      
      // Recalculate average
      teacher.rating.average = teacher.rating.total / teacher.rating.count;
    }

    // Save updated teacher
    await teacher.save();

    res.status(200).json({
      message: 'Review updated successfully',
      review: originalReview,
      rating: teacher.rating
    });
  } catch (error) {
    console.error('Error editing review:', error);
    res.status(500).json({ 
      message: 'Error editing review', 
      error: error.message 
    });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { teacherId, reviewId } = req.params;

    // Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ 
        message: 'Teacher not found' 
      });
    }

    // Find the review index
    const reviewIndex = teacher.reviews.findIndex(
      review => review._id.toString() === reviewId
    );

    if (reviewIndex === -1) {
      return res.status(404).json({ 
        message: 'Review not found' 
      });
    }

    // Get the review to be deleted
    const deletedReview = teacher.reviews[reviewIndex];

    // Update rating statistics
    teacher.rating.breakdown[deletedReview.rating]--;
    teacher.rating.total -= deletedReview.rating;
    teacher.rating.count--;

    // Recalculate average (avoid division by zero)
    teacher.rating.average = teacher.rating.count > 0 
      ? teacher.rating.total / teacher.rating.count 
      : 0;

    // Remove the review
    teacher.reviews.splice(reviewIndex, 1);

    // Save updated teacher
    await teacher.save();

    res.status(200).json({
      message: 'Review deleted successfully',
      rating: teacher.rating
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ 
      message: 'Error deleting review', 
      error: error.message 
    });
  }
};