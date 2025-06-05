const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse } = require('../utils/response');
const log = require('../config/logger');
const uploadToCloudinary = require('../config/cloudinary');
const generateAvatar = require('../utils/generateAvatar');
const { del } = require('../utils/cacheService');
const sendEmailViaWorker = require('../workers/emailDispatcher');
const { generateUniqueUsername } = require('../utils/GenrateUsername');
const saveImage = require('../utils/saveImage');

exports.Register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists && userExists.isEmailVerified) {
      return errorResponse(res, 400, 'Email already registered. Please Login');
    }

    const username = generateUniqueUsername(name);
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}?email=${email}`;

    if (userExists) {
      userExists.name = name;
      userExists.username = username;
      userExists.role = role;
      userExists.password = hashedPassword;
      userExists.emailVerificationToken = emailVerificationToken;
      userExists.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
      await userExists.save();
    } else {
      const newUser = new User({
        name,
        username,
        email,
        role,
        password: hashedPassword,
        isEmailVerified: false,
        emailVerificationToken: emailVerificationToken,
        emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000,
      });

      const savedUser = await newUser.save();
      if (!savedUser) {
        return errorResponse(res, 500, 'Failed to save user data');
      }
    }
    successResponse(res, 200, 'User Created Successfully. Please Verify your Email');

    const options = {
      email: email,
      subject: 'Email Verification',
      message: `Please click on the link to verify your email: ${verificationUrl}`,
      type: 'verification',
      data: {
        name: name,
        verificationUrl: verificationUrl,
      },
    };
    const mailSending = await sendEmailViaWorker(options);
    if (!mailSending) {
      return errorResponse(res, 503, 'Failed to Send Mail');
    }
  } catch (error) {
    log.error('Error in Registering User:', error);
    return errorResponse(res, 500, 'Failed to Create User Account');
  }
};
exports.VerifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const { email } = req.query;
    if (!token || !email) {
      return errorResponse(res, 400, 'Token and email are required');
    }
    const isUserPresent = await User.findOne({ email });

    if (!isUserPresent) return errorResponse(res, 401, 'User Not Present. Please Register');
    if (isUserPresent.isAccountDeactivated) {
      return errorResponse(
        res,
        403,
        'Illegal Access , Account has been terminated , Please use another email'
      );
    }
    if (isUserPresent.isEmailVerified)
      return successResponse(res, 200, 'User Already Verified. You can Login.');

    const user = await User.findOne({
      emailVerificationToken: crypto.createHash('sha256').update(token).digest('hex'),
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) return errorResponse(res, 400, 'Invalid verification token');

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();
    return successResponse(res, 200, 'Email Verified Successfully. You can Login');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to Verify Email');
  }
};
exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return errorResponse(res, 400, 'Please Provide Email and Password');
    }

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 401, 'Invalid Credentials');
    }
    if (user.isAccountDeactivated) {
      return errorResponse(
        res,
        403,
        'Illegal Access , Account has been terminated , Please use another email'
      );
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return errorResponse(res, 403, 'Account is Locked . Please try After 15 Min');
    }
    if (!user.isEmailVerified) {
      return errorResponse(res, 403, 'Please Verify Your Email');
    }
    if (user.isGoogleUser) {
      return errorResponse(
        res,
        401,
        'Pleae use Google Login Button as you have register through google ID'
      );
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000;
      }

      await user.save();

      return errorResponse(res, 401, 'Invalid Credentials');
    }
    log.info('user.avatar ', user.avatar);
    if (!user.avatar) {
      const file = generateAvatar(user.name, '#9C4DF4');
      const address = await saveImage(file, user.name, 'profile');
      user.avatar = address;
    }
    user.loginAttempts = 0;
    user.lastLogin = Date.now();
    const saveUserData = await user.save();
    if (!saveUserData) {
      return errorResponse(res, 500, 'Failed to Save User Data');
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });
    const cookieExpireDays = Number(process.env.COOKIE_EXPIRE);

    if (isNaN(cookieExpireDays)) {
      return errorResponse(res, 500, 'COOKIE_EXPIRE must be a number', process.env.COOKIE_EXPIRE);
    }
    const options = {
      expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }
    del('Website_User:');
    res
      .status(200)
      .cookie('auth-token', token, options)
      .json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          age: user.age,
          About: user.About,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          latitude: user.latitude,
          longitude: user.longitude,
          Address: user.Address,
          tenthPercentage: user.tenthPercentage,
          twelfthPercentage: user.twelfthPercentage,
          mobileNumber: user.mobileNumber,
        },
      });
  } catch (error) {
    log.error(error);
    return errorResponse(res, 500, 'Failed to Login', error);
  }
};
exports.Logout = async (req, res) => {
  res.clearCookie('auth-token');
  return successResponse(res, 200, 'Logged Out successfully');
};
exports.ChangePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword && !newPassword) {
      return errorResponse(res, 403, 'Password and confirm Password are required');
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 404, 'User not Found');
    }
    if (user.isAccountDeactivated) {
      return errorResponse(
        res,
        403,
        'Illegal Access , Account has been terminated , Please use another email'
      );
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid Old Password');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    return successResponse(res, 200, 'Password Changed Successfully');
  } catch (error) {
    log.error('Error in Changing Password:', error);
    return errorResponse(res, 500, 'Failed to Change Password');
  }
};
exports.ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return errorResponse(res, 400, 'Please Provide your email Address');
    const user = await User.findOne({ email });
    if (!user) return errorResponse(res, 404, 'No user Found with these credentials');
    if (user.isAccountDeactivated) {
      return errorResponse(
        res,
        403,
        'Illegal Access , Account has been terminated , Please use another email'
      );
    }
    if (user.resetPasswordExpire && user.resetPasswordExpire > Date.now()) {
      const timeLeft = Math.ceil((user.resetPasswordExpire - Date.now()) / 1000 / 60);
      return errorResponse(
        res,
        429,
        `Please wait ${timeLeft} minutes before requesting another reset`
      );
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
      const options = {
        email: user.email,
        subject: 'Password Reset Request',
        message: `Please click on the link to Reset Your Password: ${resetUrl}`,
        type: 'resetPassword',
        data: {
          name: user.name,
          resetUrl: resetUrl,
          expiryTime: '10 minutes',
        },
      };

      successResponse(res, 200, 'Password Reset Link Sent to your Email. Please Check your Email');
      const mailSending = await sendEmailViaWorker(options);
      if (!mailSending) {
        return errorResponse(res, 503, 'Failed to send Mail');
      }
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      log.error('Password reset email failed to send', error);
      return errorResponse(res, 500, 'Failed to send Email');
    }
  } catch (error) {
    log.error('Password reset request failed', error);
    return errorResponse(res, 500, 'Failed to Reset Password');
  }
};
exports.ResetPassword = async (req, res) => {
  try {
    const { resetToken } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return errorResponse(res, 400, 'Please Provide Both Password and confirm Password');
    }

    if (password !== confirmPassword) {
      return errorResponse(res, 402, 'Password Does not Match');
    }

    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      log.warn('Invalid or expired reset token used', { resetToken });
      return errorResponse(res, 400, 'Invalid or Token Get Expired');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.tokens = [];
    await user.save();

    try {
      const options = {
        email: user.email,
        subject: 'Password Reset Successful',
        message: `Your Password get changed successfully , you can login with your new Password`,
        type: 'passwordResetSuccess',
        data: {
          name: user.name,
          loginUrl: `${process.env.CLIENT_URL}/login`,
        },
      };

      successResponse(res, 200, 'Password Reset Successfully. Please Login with your new Password');

      const mailSending = await sendEmailViaWorker(options);
      if (!mailSending) return errorResponse(res, 503, 'Failed to send Email');
    } catch (error) {
      log.error('Password reset confirmation email failed to send', error);
      return successResponse(
        res,
        200,
        'Password Reset Successfully. But failed to send confirmation email'
      );
    }
  } catch (error) {
    log.error('Password reset failed', error);
    return errorResponse(res, 500, 'Failed to Reset Password');
  }
};
exports.GoogleAuth = async (req, res) => {
  try {
    const { email, name, picture, role } = req.body;

    if (!email || !name || !picture) {
      return errorResponse(res, 400, 'Please Provide Email , name and Profile Image');
    }
    const validRoles = ['mentor', 'user', 'admin'];
    if (role && !validRoles.includes(role)) {
      return errorResponse(res, 400, 'Invalid role specified');
    }
    let user = await User.findOne({ email });

    let profileIncomplete = false;
    if (user) {
      if (user.password) {
        return errorResponse(
          res,
          403,
          'Your Email id is already used . Please go through Password Verification.'
        );
      }
      if (user.isAccountDeactivated) {
        return errorResponse(
          res,
          403,
          'Illegal Access , Account has been terminated , Please use another email'
        );
      }
      if (!user.role && role) {
        user.role = role;
        await user.save();
      } else if (!user.role && !role) {
        profileIncomplete = true;
      }

      if (user.name !== name || user.avatar !== picture) {
        user.name = name;
        user.avatar = picture;
        await user.save();
      }
    } else {
      if (!role) {
        profileIncomplete = true;
      }
      user = await User.create({
        email,
        name,
        avatar: picture,
        isGoogleUser: true,
        isEmailVerified: true,
      });
      log.info(`New Google user created: ${email}`);
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    const options = {
      expires: new Date(Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }
    log.info(
      `Google authentication successful for user: ${email}, profileIncomplete: ${profileIncomplete}`
    );
    res
      .status(200)
      .cookie('auth-token', token, options)
      .json({
        success: true,
        token,
        profileIncomplete,
        user: {
          id: user._id,
          name: user.name,
          age: user.age,
          About: user.About,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          latitude: user.latitude,
          longitude: user.longitude,
          Address: user.Address,
          tenthPercentage: user.tenthPercentage,
          twelfthPercentage: user.twelfthPercentage,
          mobileNumber: user.mobileNumber,
        },
      });
  } catch (error) {
    log.error('Error in Google Authentication:', error);
    return errorResponse(res, 500, 'Failed to Authenticate with Google');
  }
};
exports.GetMe = async (req, res) => {
  try {
    if (!req.user) return errorResponse(res, 401, 'User Not Found. Please Login Again');
    const user = req.user;
    return successResponse(res, 200, 'User Found', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isGoogleUser: user.isGoogleUser,
      latitude: user.latitude,
      longitude: user.longitude,
      Address: user.Address,
      tenthPercentage: user.tenthPercentage,
      twelfthPercentage: user.twelfthPercentage,
      mobileNumber: user.mobileNumber,
    });
  } catch (error) {
    log.error('Error in Getting User Data:', error);
    return errorResponse(res, 500, 'Failed to Get User Data');
  }
};
exports.UpdateProfile = async (req, res) => {
  try {
    const {
      name,
      age,
      About,
      mobileNumber,
      Address,
      tenthPercentage,
      twelfthPercentage,
      proficiency,
      subjects,
      classesOffered,
      qualifications,
    } = req.body.formData || req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    if (req.body.password && user.isGoogleUser) {
      return errorResponse(res, 400, 'Google users cannot update password');
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name || '';
    if (age !== undefined) updateFields.age = Number(age) || 0;
    if (About !== undefined) updateFields.About = About || '';
    if (mobileNumber !== undefined) {
      const mobile = Number(mobileNumber);
      if (mobile && (mobile < 1000000000 || mobile > 9999999999)) {
        return errorResponse(res, 400, 'Mobile number must be 10 digits');
      }
      updateFields.mobileNumber = mobile || 0;
    }
    if (Address !== undefined) updateFields.Address = Address || '';
    if (tenthPercentage !== undefined) {
      const tenth = Number(tenthPercentage);
      if (tenth && (tenth < 0 || tenth > 100)) {
        return errorResponse(res, 400, 'Tenth percentage must be between 0 and 100');
      }
      updateFields.tenthPercentage = tenth || 0;
    }
    if (twelfthPercentage !== undefined) {
      const twelfth = Number(twelfthPercentage);
      if (twelfth && (twelfth < 0 || twelfth > 100)) {
        return errorResponse(res, 400, 'Twelfth percentage must be between 0 and 100');
      }
      updateFields.twelfthPercentage = twelfth || 0;
    }

    // Handle mentor-specific fields only if user is a mentor
    if (user.role === 'mentor') {
      if (proficiency !== undefined) {
        updateFields.proficiency = proficiency;
      }

      if (Array.isArray(subjects)) {
        updateFields.subjects = subjects.filter((subject) => subject && subject.trim());
      }

      if (Array.isArray(classesOffered)) {
        const validClasses = classesOffered.filter((classItem) => {
          return (
            classItem && typeof classItem === 'object' && classItem.subject && classItem.format
          );
        });
        updateFields.classesOffered = validClasses;
      }

      if (Array.isArray(qualifications)) {
        const validQualifications = qualifications.filter((qual) => {
          return qual && typeof qual === 'object' && qual.degree && qual.field && qual.institution;
        });
        updateFields.qualifications = validQualifications;
      }
    } else {
      if (
        proficiency !== undefined ||
        subjects !== undefined ||
        classesOffered !== undefined ||
        qualifications !== undefined
      ) {
        return errorResponse(res, 403, 'Only mentors can update mentor-specific fields');
      }
    }

    if (req.file && req.file.publicPath) {
      const file = req.file;
      try {
        const address = await saveImage(file, user.name, 'profile');
        updateFields.avatar = address;
      } catch (uploadError) {
        log.error('Error uploading to cloudinary:', uploadError);
        return errorResponse(res, 500, 'Failed to upload avatar');
      }
    }

    log.info('Update fields:', updateFields);

    if (Object.keys(updateFields).length === 0) {
      return errorResponse(res, 400, 'No changes provided for update');
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return errorResponse(res, 500, 'Failed to update user profile');
    }

    const responseData = {
      id: updatedUser._id,
      name: updatedUser.name,
      age: updatedUser.age,
      About: updatedUser.About,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar: updatedUser.avatar,
      latitude: updatedUser.latitude,
      longitude: updatedUser.longitude,
      Address: updatedUser.Address,
      tenthPercentage: updatedUser.tenthPercentage,
      twelfthPercentage: updatedUser.twelfthPercentage,
      mobileNumber: updatedUser.mobileNumber,
    };
    if (updatedUser.role === 'mentor') {
      responseData.proficiency = updatedUser.proficiency;
      responseData.rating = updatedUser.rating;
      responseData.subjects = updatedUser.subjects;
      responseData.classesOffered = updatedUser.classesOffered;
      responseData.qualifications = updatedUser.qualifications;
      responseData.reviews = updatedUser.reviews;
    }

    return successResponse(res, 200, 'Profile updated successfully', responseData);
  } catch (error) {
    log.error('Error in updating user profile:', error.message);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((e) => e.message);
      return errorResponse(res, 400, `Validation Error: ${validationErrors.join(', ')}`);
    }

    if (error.code === 11000) {
      return errorResponse(res, 400, 'Duplicate field value entered');
    }

    return errorResponse(
      res,
      500,
      process.env.NODE_ENV === 'production' ? 'Failed to update profile' : `Error: ${error.message}`
    );
  }
};
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide both latitude and longitude',
      });
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Latitude and longitude must be valid numbers',
      });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { latitude: lat, longitude: lng },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};
exports.deactivateAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isAccountDeactivated: true },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return errorResponse(res, 404, 'user not found');
    }
    res.clearCookie('auth-token');
    return successResponse(res, 200, 'Accound deleted Successfully');
  } catch (error) {
    log.error('[Email Deactivate] Failed ', error);
    return errorResponse(res, 500, 'Failed to delete user', error);
  }
};
