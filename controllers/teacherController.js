const User = require('../models/User');
const MentorProfile = require('../models/Mentor');
const { errorResponse, successResponse } = require('../utils/response');
const log = require('../config/logger');

exports.GetAllMentors = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, locality, minRating, standard, format } = req.query;
    const filter = {
      role: 'mentor',
      isAccountDeactivated: false,
    };
    if (subject) {
      filter.subjects = { $in: [subject] };
    }
    if (locality) {
      filter.Address = { $regex: locality, $options: 'i' };
    }
    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }
    if (standard) {
      filter['classesOffered.standard'] = { $in: [parseInt(standard)] };
    }
    if (format) {
      filter['classesOffered.format'] = format;
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const mentors = await User.find(filter)
      .select(
        'name avatar rating proficiency latitude longitude subjects classesOffered qualifications reviews'
      )
      .populate('reviews.studentId', 'name avatar')
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: mentors,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: skip + mentors.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};
exports.GetMentorById = async (req, res) => {
  try {
    const { id } = req.params;

    const mentor = await User.findById(id)
      .where({
        role: 'mentor',
        isAccountDeactivated: false,
      })
      .select('-password -emailVerificationToken -resetPasswordToken -loginAttempts -lockUntil')
      .populate('reviews.studentId', 'name avatar');

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found',
      });
    }
    return successResponse(res, 200, 'Fetched Succesfully', mentor);
  } catch (error) {
    log.error('Failed to fetch the USer Details', error.message);
    return errorResponse(res, 500, 'Failed to Fetch', error);
  }
};
// exports.UpdateMentorProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     console.log(`[UpdateMentorProfile] Request received from user: ${userId}`);

//     const {
//       name,
//       age,
//       mobileNumber,
//       Address,
//       About,
//       tenthPercentage,
//       twelfthPercentage,
//       proficiency,
//       subjects,
//       classesOffered,
//       qualifications,
//       latitude,
//       longitude
//     } = req.body;

//     const user = await User.findById(userId);
//     if (!user) {
//       log.warn(`[UpdateMentorProfile] User not found: ${userId}`);
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     if (user.role !== 'mentor') {
//       log.warn(`[UpdateMentorProfile] Access denied for user ${userId} with role ${user.role}`);
//       return res.status(403).json({ success: false, message: 'Access denied. Only mentors can update mentor profiles' });
//     }

//     const userUpdates = {};
//     if (name !== undefined) userUpdates.name = name;
//     if (age !== undefined) userUpdates.age = Number(age);
//     if (mobileNumber !== undefined) userUpdates.mobileNumber = Number(mobileNumber);
//     if (Address !== undefined) userUpdates.Address = Address;
//     if (About !== undefined) userUpdates.About = About;
//     if (tenthPercentage !== undefined) userUpdates.tenthPercentage = Number(tenthPercentage);
//     if (twelfthPercentage !== undefined) userUpdates.twelfthPercentage = Number(twelfthPercentage);
//     if (latitude !== undefined) userUpdates.latitude = Number(latitude);
//     if (longitude !== undefined) userUpdates.longitude = Number(longitude);

//    if (Object.keys(userUpdates).length > 0) {
//     log.info(`[UpdateMentorProfile] Updating user fields for ${userId}:`, userUpdates);
//     const updatedUser = await User.findByIdAndUpdate(userId, userUpdates, {
//       new: true,
//       runValidators: true
//     });

//     if (!updatedUser) {
//       return res.status(400).json({
//         success: false,
//         message: 'Failed to update user profile'
//       });
//     }
//   }
//    const mentorUpdates = {};
//     if (proficiency !== undefined) mentorUpdates.proficiency = proficiency;
//     if (Array.isArray(subjects)) mentorUpdates.subjects = subjects;
//     if (Array.isArray(classesOffered)) mentorUpdates.classesOffered = classesOffered;
//     if (Array.isArray(qualifications)) mentorUpdates.qualifications = qualifications;

//     log.info(`[UpdateMentorProfile] Updating mentor profile for ${userId}:`, mentorUpdates);

//     const updatedMentor = await MentorProfile.findOneAndUpdate(
//       { userId },
//       { ...mentorUpdates, userId },
//       { new: true, upsert: true, runValidators: true }
//     ).populate('userId', 'name email avatar');

//     log.info(`[UpdateMentorProfile] Mentor profile update successful for ${user}`);

//     return res.status(200).json({
//       success: true,
//       message: "Successfully Updated",
//       data: {
//        id: user._id,
//         name: user.name,
//         age: user.age,
//         About: user.About,
//         email: user.email,
//         role: user.role,
//         avatar: user.avatar,
//         latitude: user.latitude,
//         longitude: user.longitude,
//         Address: user.Address,
//         tenthPercentage: user.tenthPercentage,
//         twelfthPercentage: user.twelfthPercentage,
//         mobileNumber: user.mobileNumber,
//         proficiency: updatedMentor.proficiency,
//         subjects: updatedMentor.subjects,
//         classesOffered: updatedMentor.classesOffered,
//         qualifications: updatedMentor.qualifications,
//       }
//     });
//   } catch (error) {
//     console.error("UpdateMentorProfile Error:", error);
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//       error: error.message
//     });
//   }
// };

// Add review to mentor
// const AddReview = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation Error',
//         errors: errors.array()
//       });
//     }

//     const { mentorId } = req.params;
//     const { comment, rating } = req.body;
//     const studentId = req.user.id;

//     // Check if user is trying to review themselves
//     const mentor = await MentorProfile.findById(mentorId);
//     if (!mentor) {
//       return res.status(404).json({
//         success: false,
//         message: 'Mentor not found'
//       });
//     }

//     if (mentor.userId.toString() === studentId) {
//       return res.status(400).json({
//         success: false,
//         message: 'You cannot review yourself'
//       });
//     }

//     // Check if user already reviewed this mentor
//     const existingReview = mentor.reviews.find(
//       review => review.studentId.toString() === studentId
//     );

//     if (existingReview) {
//       return res.status(400).json({
//         success: false,
//         message: 'You have already reviewed this mentor'
//       });
//     }

//     // Add new review
//     mentor.reviews.push({
//       studentId,
//       comment,
//       rating
//     });

//     // Calculate new average rating
//     const totalRating = mentor.reviews.reduce((sum, review) => sum + review.rating, 0);
//     mentor.rating = parseFloat((totalRating / mentor.reviews.length).toFixed(1));

//     await mentor.save();

//     // Populate the new review
//     await mentor.populate('reviews.studentId', 'name avatar');

//     res.status(201).json({
//       success: true,
//       message: 'Review added successfully',
//       data: mentor.reviews[mentor.reviews.length - 1]
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//       error: error.message
//     });
//   }
// };
// const UpdateReview = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation Error',
//         errors: errors.array()
//       });
//     }

//     const { mentorId, reviewId } = req.params;
//     const { comment, rating } = req.body;
//     const studentId = req.user.id;

//     const mentor = await MentorProfile.findById(mentorId);
//     if (!mentor) {
//       return res.status(404).json({
//         success: false,
//         message: 'Mentor not found'
//       });
//     }

//     const review = mentor.reviews.id(reviewId);
//     if (!review) {
//       return res.status(404).json({
//         success: false,
//         message: 'Review not found'
//       });
//     }

//     // Check if user owns this review
//     if (review.studentId.toString() !== studentId) {
//       return res.status(403).json({
//         success: false,
//         message: 'You can only update your own reviews'
//       });
//     }

//     // Update review
//     review.comment = comment;
//     review.rating = rating;

//     // Recalculate average rating
//     const totalRating = mentor.reviews.reduce((sum, review) => sum + review.rating, 0);
//     mentor.rating = parseFloat((totalRating / mentor.reviews.length).toFixed(1));

//     await mentor.save();
//     await mentor.populate('reviews.studentId', 'name avatar');

//     res.status(200).json({
//       success: true,
//       message: 'Review updated successfully',
//       data: review
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//       error: error.message
//     });
//   }
// };
// const DeleteReview = async (req, res) => {
//   try {
//     const { mentorId, reviewId } = req.params;
//     const studentId = req.user.id;

//     const mentor = await MentorProfile.findById(mentorId);
//     if (!mentor) {
//       return res.status(404).json({
//         success: false,
//         message: 'Mentor not found'
//       });
//     }

//     const review = mentor.reviews.id(reviewId);
//     if (!review) {
//       return res.status(404).json({
//         success: false,
//         message: 'Review not found'
//       });
//     }

//     // Check if user owns this review
//     if (review.studentId.toString() !== studentId) {
//       return res.status(403).json({
//         success: false,
//         message: 'You can only delete your own reviews'
//       });
//     }

//     // Remove review
//     mentor.reviews.pull(reviewId);

//     // Recalculate average rating
//     if (mentor.reviews.length > 0) {
//       const totalRating = mentor.reviews.reduce((sum, review) => sum + review.rating, 0);
//       mentor.rating = parseFloat((totalRating / mentor.reviews.length).toFixed(1));
//     } else {
//       mentor.rating = 0;
//     }

//     await mentor.save();

//     res.status(200).json({
//       success: true,
//       message: 'Review deleted successfully'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//       error: error.message
//     });
//   }
// };
// const GetMentorReviews = async (req, res) => {
//   try {
//     const { mentorId } = req.params;
//     const { page = 1, limit = 10 } = req.query;

//     const mentor = await MentorProfile.findById(mentorId)
//       .populate('reviews.studentId', 'name avatar')
//       .select('reviews');

//     if (!mentor) {
//       return res.status(404).json({
//         success: false,
//         message: 'Mentor not found'
//       });
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const reviews = mentor.reviews
//       .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
//       .slice(skip, skip + parseInt(limit));

//     res.status(200).json({
//       success: true,
//       data: reviews,
//       pagination: {
//         current: parseInt(page),
//         pages: Math.ceil(mentor.reviews.length / parseInt(limit)),
//         total: mentor.reviews.length
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//       error: error.message
//     });
//   }
// };
