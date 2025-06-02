const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter your name'],
      maxLength: [50, 'Name cannot exceed 50 characters'],
      minLength: [2, 'Name should have at least 2 characters'],
      trim: true,
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
      enum: ['user', 'mentor'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    cloudinary_id: {
      type: String
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
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
