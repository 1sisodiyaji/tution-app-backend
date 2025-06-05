const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comment: String,
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);
const classSchema = new mongoose.Schema({
  subject: String,
  educationLevel: String,
  specificClasses: [String],
  format: String,
});
const qualificationSchema = new mongoose.Schema({
  degree: String,
  field: String,
  institution: String,
  year: Number,
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter your name'],
      maxLength: [50, 'Name cannot exceed 50 characters'],
      minLength: [2, 'Name should have at least 2 characters'],
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Please enter your email'],
      unique: true,
      trim: true,
      index: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
        },
        message: 'Please enter a valid email',
      },
    },
    mobileNumber: {
      type: Number,
      maxLength: 10,
      min: 1000000000,
      max: 9999999999,
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be less than 0'],
      max: [100, 'Age cannot be more than 100'],
    },
    About: {
      type: String,
      validate: {
        validator: function (v) {
          return v.trim().split(/\s+/).length <= 1000;
        },
        message: 'About section cannot exceed 1000 words',
      },
    },
    password: {
      type: String,
      required: function () {
        return !this.isGoogleUser;
      },
    },
    isGoogleUser: {
      type: Boolean,
      default: false,
    },
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'mentor', 'admin'],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    cloudinary_id: {
      type: String,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    Address: {
      type: String,
    },
    tenthPercentage: {
      type: Number,
    },
    twelfthPercentage: {
      type: Number,
    },
    isAccountDeactivated: {
      type: Boolean,
      default: false,
    },
    isMentorVerified: {
      type: Boolean,
      default: false,
    },
    proficiency: String,
    rating: { type: Number, default: 0 },
    subjects: [String],
    classesOffered: [classSchema],
    qualifications: [qualificationSchema],
    reviews: [reviewSchema],
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
