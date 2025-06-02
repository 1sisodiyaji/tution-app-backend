const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  id: String,
  studentId: String,
  comment: String,
  rating: Number
});

const classSchema = new mongoose.Schema({
  id: String,
  subject: String,
  standard: [Number],
  format: String
});

const qualificationSchema = new mongoose.Schema({
  degree: String,
  field: String,
  institution: String,
  year: Number
});

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  proficiency: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 0
  },
  // image: {
  //   type: String
  // },
  tenthPercentage: {
    type: Number
  },
  twelfthPercentage: {
    type: Number
  },
  locality: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  reviews: [reviewSchema],
  subjects: [String],
  classesOffered: [classSchema],
  qualifications: [qualificationSchema],
  about: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Teacher', teacherSchema); 