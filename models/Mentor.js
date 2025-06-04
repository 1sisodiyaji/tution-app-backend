const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: String,
  rating: { type: Number, min: 1, max: 5 }
}, { timestamps: true });

const classSchema = new mongoose.Schema({
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

const mentorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  proficiency: String,
  rating: { type: Number, default: 0 },
  subjects: [String],
  classesOffered: [classSchema],
  qualifications: [qualificationSchema],
  reviews: [reviewSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('MentorProfile', mentorSchema);