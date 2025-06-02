const Teacher = require('../models/Teacher');
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinary');

// @desc    Register a new teacher
// @route   POST /api/teachers
// @access  Public
const registerTeacher = asyncHandler(async (req, res) => {
  const {
    name, age, proficiency, 
    tenthPercentage, twelfthPercentage, locality, 
    latitude, longitude, subjects, 
    classesOffered, qualifications, about
  } = req.body;

  // Check if teacher already exists (assuming unique identifier is name)
  const teacherExists = await Teacher.findOne({ name });
  if (teacherExists) {
    return res.status(400).json({
      status: 'fail',
      message: 'Teacher already exists'
    });
  }

  const teacher = await Teacher.create({
    name,
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
  });

  if (teacher) {
    res.status(201).json({
      status: 'success',
      data: { teacher }
    });
  } else {
    res.status(400).json({
      status: 'fail',
      message: 'Invalid teacher data'
    });
  }
});

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Public
const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find({});
  res.json({
    status: 'success',
    results: teachers.length,
    data: { teachers }
  });
});

// @desc    Get teacher by ID
// @route   GET /api/teachers/:id
// @access  Public
const getTeacherById = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);

  if (teacher) {
    res.json({
      status: 'success',
      data: { teacher }
    });
  } else {
    res.status(404).json({
      status: 'fail',
      message: 'Teacher not found'
    });
  }
});

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private
const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);

  if (teacher) {
    // Update basic fields
    teacher.name = req.body.name || teacher.name;
    teacher.age = req.body.age || teacher.age;
    teacher.proficiency = req.body.proficiency || teacher.proficiency;
    teacher.tenthPercentage = req.body.tenthPercentage || teacher.tenthPercentage;
    teacher.twelfthPercentage = req.body.twelfthPercentage || teacher.twelfthPercentage;
    teacher.locality = req.body.locality || teacher.locality;
    teacher.latitude = req.body.latitude || teacher.latitude;
    teacher.longitude = req.body.longitude || teacher.longitude;
    teacher.subjects = req.body.subjects || teacher.subjects;
    teacher.classesOffered = req.body.classesOffered || teacher.classesOffered;
    teacher.qualifications = req.body.qualifications || teacher.qualifications;
    teacher.about = req.body.about || teacher.about;

    // Handle image upload
    if (req.file) {
      // Delete old image from cloudinary if exists
      if (teacher.cloudinary_id) {
        await cloudinary.uploader.destroy(teacher.cloudinary_id);
      }

      // Upload new image to cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'teacher_photos',
        width: 300,
        crop: "scale"
      });

      // Update image details
      teacher.image = result.secure_url;
      teacher.cloudinary_id = result.public_id;
    }

    const updatedTeacher = await teacher.save();
    
    res.json({
      status: 'success',
      data: { teacher: updatedTeacher }
    });
  } else {
    res.status(404).json({
      status: 'fail',
      message: 'Teacher not found'
    });
  }
});

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
// @access  Private
const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);

  if (teacher) {
    // Delete image from cloudinary if exists
    if (teacher.cloudinary_id) {
      await cloudinary.uploader.destroy(teacher.cloudinary_id);
    }

    await teacher.remove();
    res.json({ 
      status: 'success',
      message: 'Teacher removed' 
    });
  } else {
    res.status(404).json({
      status: 'fail',
      message: 'Teacher not found'
    });
  }
});

module.exports = {
  registerTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
};