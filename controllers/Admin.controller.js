const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const log = require('../config/logger');

exports.createAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existingAdmin = await User.findOne({ email, role: 'admin' });
    if (existingAdmin) return res.status(400).json({ message: 'Admin already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new User({
      email,
      password: hashedPassword,
      name,
      role: 'admin',
      isEmailVerified: true,
      lastLogin: new Date(),
    });
    await admin.save();
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    res.status(200).json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalMentors = await User.countDocuments({ role: 'mentor' });
    const totalStudents = await User.countDocuments({ role: 'user' });
    const verifiedMentors = await User.countDocuments({ role: 'mentor', isMentorVerified: true });
    const unverifiedMentors = await User.countDocuments({
      role: 'mentor',
      isMentorVerified: false,
    });
    const deactivatedUsers = await User.countDocuments({ isAccountDeactivated: true });
    const activeUsers = await User.countDocuments({
      isAccountDeactivated: false,
      role: { $ne: 'admin' },
    });

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      role: { $ne: 'admin' },
    });

    // User growth over last 12 months
    const monthlyGrowth = [];
    for (let i = 11; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const count = await User.countDocuments({
        createdAt: { $gte: startDate, $lt: endDate },
        role: { $ne: 'admin' },
      });

      monthlyGrowth.push({
        month: startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: count,
      });
    }

    res.status(200).json({
      totalUsers,
      totalMentors,
      totalStudents,
      verifiedMentors,
      unverifiedMentors,
      activeUsers,
      deactivatedUsers,
      recentRegistrations,
      monthlyGrowth,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error: err.message });
  }
};
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      verified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;
    const filter = { role: { $ne: 'admin' } };
    if (role && role !== 'all') {
      filter.role = role;
    } else {
      filter.role = { $ne: 'admin' };
    }
    if (status === 'active') filter.isAccountDeactivated = false;
    if (status === 'deactivated') filter.isAccountDeactivated = true;
    if (verified === 'true') filter.isMentorVerified = true;
    if (verified === 'false') filter.isMentorVerified = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(filter)
      .select('-password -resetPasswordToken -emailVerificationToken')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    res.status(200).json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
};
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select('-password -resetPasswordToken -emailVerificationToken')
      .populate('reviews.studentId', 'name email avatar');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user details', error: err.message });
  }
};
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isAccountDeactivated = !user.isAccountDeactivated;
    await user.save();

    res.status(200).json({
      message: `User ${user.isAccountDeactivated ? 'deactivated' : 'activated'}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAccountDeactivated: user.isAccountDeactivated,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user status', error: err.message });
  }
};
exports.toggleMentorVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const mentor = await User.findById(id);

    if (!mentor) return res.status(404).json({ message: 'Mentor not found' });
    if (mentor.role !== 'mentor') return res.status(400).json({ message: 'User is not a mentor' });

    mentor.isMentorVerified = !mentor.isMentorVerified;
    await mentor.save();

    res.status(200).json({
      message: `Mentor ${mentor.isMentorVerified ? 'verified' : 'unverified'}`,
      mentor: {
        id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        isMentorVerified: mentor.isMentorVerified,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating mentor verification', error: err.message });
  }
};
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin user' });

    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
};
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 10, search } = req.query;

    const filter = { role };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(filter);

    res.status(200).json({
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users by role', error: err.message });
  }
};
exports.getUserProfileCompletionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).lean();

    if (!user) return res.status(404).json({ message: 'User not found' });

    const totalFields = 15;
    let filledFields = 0;

    const keysToCheck = [
      'name',
      'email',
      'username',
      'age',
      'About',
      'avatar',
      'mobileNumber',
      'proficiency',
      'subjects',
      'classesOffered',
      'qualifications',
      'Address',
      'teachingExperiences',
      'isEmailVerified',
    ];

    const fieldStatus = {};
    keysToCheck.forEach((key) => {
      const val = user[key];
      let isFilled = false;

      if (Array.isArray(val)) {
        isFilled = val.length > 0;
      } else if (typeof val === 'boolean') {
        isFilled = val === true;
      } else {
        isFilled = val !== undefined && val !== null && val !== '';
      }

      fieldStatus[key] = isFilled;
      if (isFilled) filledFields++;
    });

    const completion = Math.round((filledFields / totalFields) * 100);

    res.status(200).json({
      completion,
      filledFields,
      totalFields,
      fieldStatus,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating profile status', error: err.message });
  }
};
exports.getMentorInsights = async (req, res) => {
  try {
    const { id } = req.params;
    const mentor = await User.findById(id)
      .select('reviews rating name subjects classesOffered qualifications createdAt')
      .populate('reviews.studentId', 'name email avatar');

    if (!mentor || mentor.role !== 'mentor') {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    const totalReviews = mentor.reviews.length;
    const avgRating =
      totalReviews > 0
        ? (mentor.reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(2)
        : 0;

    // Rating distribution
    const ratingDistribution = {
      5: mentor.reviews.filter((r) => r.rating === 5).length,
      4: mentor.reviews.filter((r) => r.rating === 4).length,
      3: mentor.reviews.filter((r) => r.rating === 3).length,
      2: mentor.reviews.filter((r) => r.rating === 2).length,
      1: mentor.reviews.filter((r) => r.rating === 1).length,
    };

    // Recent reviews (last 5)
    const recentReviews = mentor.reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.status(200).json({
      mentor: {
        id: mentor._id,
        name: mentor.name,
        joinedDate: mentor.createdAt,
        subjects: mentor.subjects,
        totalClasses: mentor.classesOffered.length,
        qualifications: mentor.qualifications.length,
      },
      reviews: {
        totalReviews,
        avgRating: parseFloat(avgRating),
        ratingDistribution,
        recentReviews,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching mentor insights', error: err.message });
  }
};
exports.getSystemAnalytics = async (req, res) => {
  try {
    // Top performing mentors
    const topMentors = await User.find({ role: 'mentor' })
      .select('name email username avatar rating reviews')
      .sort({ rating: -1 })
      .limit(10)
      .lean();

    // Most popular subjects
    const subjectStats = await User.aggregate([
      { $match: { role: 'mentor', subjects: { $exists: true, $not: { $size: 0 } } } },
      { $unwind: '$subjects' },
      { $group: { _id: '$subjects', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      topMentors: topMentors.map((mentor) => ({
        id: mentor._id,
        name: mentor.name,
        username: mentor.username,
        avatar: mentor.avatar,
        email: mentor.email,
        rating: mentor.rating,
        totalReviews: mentor.reviews.length,
      })),
      popularSubjects: subjectStats.map((item) => ({
        subject: item._id,
        mentorCount: item.count,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching system analytics', error: err.message });
  }
};
exports.bulkUserOperations = async (req, res) => {
  try {
    const { operation, userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    let updateResult;

    switch (operation) {
      case 'activate':
        updateResult = await User.updateMany(
          { _id: { $in: userIds }, role: { $ne: 'admin' } },
          { $set: { isAccountDeactivated: false } }
        );
        break;

      case 'deactivate':
        updateResult = await User.updateMany(
          { _id: { $in: userIds }, role: { $ne: 'admin' } },
          { $set: { isAccountDeactivated: true } }
        );
        break;

      case 'verify_mentors':
        updateResult = await User.updateMany(
          { _id: { $in: userIds }, role: 'mentor' },
          { $set: { isMentorVerified: true } }
        );
        break;

      case 'unverify_mentors':
        updateResult = await User.updateMany(
          { _id: { $in: userIds }, role: 'mentor' },
          { $set: { isMentorVerified: false } }
        );
        break;

      case 'delete':
        updateResult = await User.deleteMany({ _id: { $in: userIds }, role: { $ne: 'admin' } });
        break;

      default:
        return res.status(400).json({ message: 'Invalid operation' });
    }

    res.status(200).json({
      message: `Bulk ${operation} completed`,
      modifiedCount: updateResult.modifiedCount || updateResult.deletedCount,
      requestedCount: userIds.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error in bulk operation', error: err.message });
  }
};
exports.exportUsersData = async (req, res) => {
  try {
    const { format = 'json', role, status } = req.query;

    const filter = { role: { $ne: 'admin' } };
    if (role && role !== 'all') filter.role = role;
    if (status === 'active') filter.isAccountDeactivated = false;
    if (status === 'deactivated') filter.isAccountDeactivated = true;

    const users = await User.find(filter)
      .select('-password -resetPasswordToken -emailVerificationToken -reviews')
      .lean();

    if (format === 'csv') {
      const csvHeaders = 'ID,Name,Email,Role,Status,Verified,Created At\n';
      const csvData = users
        .map(
          (user) =>
            `${user._id},${user.name},${user.email},${user.role},${user.isAccountDeactivated ? 'Deactivated' : 'Active'},${user.isMentorVerified ? 'Yes' : 'No'},${user.createdAt}`
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
      res.status(200).send(csvHeaders + csvData);
    } else {
      res.status(200).json({
        exportDate: new Date(),
        totalUsers: users.length,
        users,
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error exporting users data', error: err.message });
  }
};
