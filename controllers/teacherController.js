// const Teacher = require('../models/Teacher');
// const asyncHandler = require('express-async-handler');
// const cloudinary = require('../config/cloudinary');

// const registerTeacher = asyncHandler(async (req, res) => {
//   const {
//     name, age, proficiency, 
//     tenthPercentage, twelfthPercentage, locality, 
//     latitude, longitude, subjects, 
//     classesOffered, qualifications, about
//   } = req.body;

//   // Check if teacher already exists (assuming unique identifier is name)
//   const teacherExists = await Teacher.findOne({ name });
//   if (teacherExists) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Teacher already exists'
//     });
//   }

//   const teacher = await Teacher.create({
//     name,
//     age,
//     proficiency,
//     tenthPercentage,
//     twelfthPercentage,
//     locality,
//     latitude,
//     longitude,
//     subjects,
//     classesOffered,
//     qualifications,
//     about
//   });

//   if (teacher) {
//     res.status(201).json({
//       status: 'success',
//       data: { teacher }
//     });
//   } else {
//     res.status(400).json({
//       status: 'fail',
//       message: 'Invalid teacher data'
//     });
//   }
// });
// const updateTeacher = asyncHandler(async (req, res) => {
//   const teacher = await Teacher.findById(req.params.id);

//   if (teacher) {
//     // Update basic fields
//     teacher.name = req.body.name || teacher.name;
//     teacher.age = req.body.age || teacher.age;
//     teacher.proficiency = req.body.proficiency || teacher.proficiency;
//     teacher.tenthPercentage = req.body.tenthPercentage || teacher.tenthPercentage;
//     teacher.twelfthPercentage = req.body.twelfthPercentage || teacher.twelfthPercentage;
//     teacher.locality = req.body.locality || teacher.locality;
//     teacher.latitude = req.body.latitude || teacher.latitude;
//     teacher.longitude = req.body.longitude || teacher.longitude;
//     teacher.subjects = req.body.subjects || teacher.subjects;
//     teacher.classesOffered = req.body.classesOffered || teacher.classesOffered;
//     teacher.qualifications = req.body.qualifications || teacher.qualifications;
//     teacher.about = req.body.about || teacher.about;

//     // Handle image upload
//     if (req.file) {
//       // Delete old image from cloudinary if exists
//       if (teacher.cloudinary_id) {
//         await cloudinary.uploader.destroy(teacher.cloudinary_id);
//       }

//       // Upload new image to cloudinary
//       const result = await cloudinary.uploader.upload(req.file.path, {
//         folder: 'teacher_photos',
//         width: 300,
//         crop: "scale"
//       });

//       // Update image details
//       teacher.image = result.secure_url;
//       teacher.cloudinary_id = result.public_id;
//     }

//     const updatedTeacher = await teacher.save();

//     res.json({
//       status: 'success',
//       data: { teacher: updatedTeacher }
//     });
//   } else {
//     res.status(404).json({
//       status: 'fail',
//       message: 'Teacher not found'
//     });
//   }
// });
// const deleteTeacher = asyncHandler(async (req, res) => {
//   const teacher = await Teacher.findById(req.params.id);

//   if (teacher) {
//     // Delete image from cloudinary if exists
//     if (teacher.cloudinary_id) {
//       await cloudinary.uploader.destroy(teacher.cloudinary_id);
//     }

//     await teacher.remove();
//     res.json({ 
//       status: 'success',
//       message: 'Teacher removed' 
//     });
//   } else {
//     res.status(404).json({
//       status: 'fail',
//       message: 'Teacher not found'
//     });
//   }
// });
const User = require('../models/User');
const MentorProfile = require('../models/Mentor');
const { getOrSetWebsiteUsers } = require('../utils/cacheService');
const { errorResponse, successResponse } = require('../utils/response');
const log = require('../config/logger');
const { validationResult } = require('express-validator');

exports.GetAllMentors = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, locality, minRating, standard, format } = req.query;
    const filter = {};
    if (subject) {
      filter.subjects = { $in: [subject] };
    }
    if (locality) {
      filter.locality = { $regex: locality, $options: 'i' };
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

    const mentors = await MentorProfile.find(filter)
      .populate('userId', 'name email avatar')
      .populate('reviews.studentId', 'name avatar')
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MentorProfile.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: mentors,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: skip + mentors.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
exports.GetMentorById = async (req, res) => {
  try {
    const { id } = req.params;

    const mentor = await MentorProfile.findById(id)
      .populate('userId', 'name email avatar lastLogin')
      .populate('reviews.studentId', 'name avatar');

    if (!mentor) {
      return errorResponse(res, 404, "Mentor Not Found");
    }
    return successResponse(res, 200, "Fetched Succesfully", mentor)
  } catch (error) {
    log.error("Failed to fetch the USer Details", error.message);
    return errorResponse(res, 500, "Failed to Fetch", error);
  }
};

// Create or Update mentor profile
const UpdateMentorProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const {
      age,
      proficiency,
      tenthPercentage,
      twelfthPercentage,
      locality,
      latitude,
      longitude,
      subjects,
      classesOffered,
      qualifications,
      about
    } = req.body;

    // Check if user has mentor role
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'mentor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only mentors can update mentor profiles'
      });
    }

    const updateData = {
      userId,
      age,
      proficiency,
      tenthPercentage,
      twelfthPercentage,
      locality,
      latitude,
      longitude,
      subjects: Array.isArray(subjects) ? subjects : [subjects],
      classesOffered,
      qualifications,
      about
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const mentor = await MentorProfile.findOneAndUpdate(
      { userId },
      updateData,
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    ).populate('userId', 'name email avatar');

    res.status(200).json({
      success: true,
      message: 'Mentor profile updated successfully',
      data: mentor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
const DeleteMentorProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const mentor = await MentorProfile.findOneAndDelete({ userId });

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor profile not found'
      });
    }
    await User.findOneAndDelete({ userId });
    res.status(200).json({
      success: true,
      message: 'Mentor profile deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Add review to mentor
const AddReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const { mentorId } = req.params;
    const { comment, rating } = req.body;
    const studentId = req.user.id;

    // Check if user is trying to review themselves
    const mentor = await MentorProfile.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    if (mentor.userId.toString() === studentId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot review yourself'
      });
    }

    // Check if user already reviewed this mentor
    const existingReview = mentor.reviews.find(
      review => review.studentId.toString() === studentId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this mentor'
      });
    }

    // Add new review
    mentor.reviews.push({
      studentId,
      comment,
      rating
    });

    // Calculate new average rating
    const totalRating = mentor.reviews.reduce((sum, review) => sum + review.rating, 0);
    mentor.rating = parseFloat((totalRating / mentor.reviews.length).toFixed(1));

    await mentor.save();

    // Populate the new review
    await mentor.populate('reviews.studentId', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: mentor.reviews[mentor.reviews.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update review
const UpdateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const { mentorId, reviewId } = req.params;
    const { comment, rating } = req.body;
    const studentId = req.user.id;

    const mentor = await MentorProfile.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    const review = mentor.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.studentId.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews'
      });
    }

    // Update review
    review.comment = comment;
    review.rating = rating;

    // Recalculate average rating
    const totalRating = mentor.reviews.reduce((sum, review) => sum + review.rating, 0);
    mentor.rating = parseFloat((totalRating / mentor.reviews.length).toFixed(1));

    await mentor.save();
    await mentor.populate('reviews.studentId', 'name avatar');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete review
const DeleteReview = async (req, res) => {
  try {
    const { mentorId, reviewId } = req.params;
    const studentId = req.user.id;

    const mentor = await MentorProfile.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    const review = mentor.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.studentId.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
    }

    // Remove review
    mentor.reviews.pull(reviewId);

    // Recalculate average rating
    if (mentor.reviews.length > 0) {
      const totalRating = mentor.reviews.reduce((sum, review) => sum + review.rating, 0);
      mentor.rating = parseFloat((totalRating / mentor.reviews.length).toFixed(1));
    } else {
      mentor.rating = 0;
    }

    await mentor.save();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get reviews for a mentor
const GetMentorReviews = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const mentor = await MentorProfile.findById(mentorId)
      .populate('reviews.studentId', 'name avatar')
      .select('reviews');

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reviews = mentor.reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(mentor.reviews.length / parseInt(limit)),
        total: mentor.reviews.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
