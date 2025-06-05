const User = require('../models/User');
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
