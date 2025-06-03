const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse } = require('../utils/response');
const log = require('../config/logger');
const uploadToCloudinary = require('../config/cloudinary');
const generateAvatar = require('../utils/generateAvatar');
const { getOrSetWebsiteUsers, del } = require('../utils/cacheService');

exports.Register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists && userExists.isEmailVerified) {
      return errorResponse(res, 400, 'Email already registered. Please Login');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}?email=${email}`;
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
    const mailSending = await sendEmail(options);
    if (!mailSending) {
      return errorResponse(res, 503, 'Failed to Send Mail');
    }
    if (userExists) {
      userExists.name = name;
      userExists.role = role;
      userExists.password = hashedPassword;
      userExists.emailVerificationToken = emailVerificationToken;
      userExists.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
      await userExists.save();
    } else {
      const newUser = new User({
        name,
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
    return successResponse(res, 200, 'User Created Successfully. Please Verify your Email');
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

    if (isUserPresent.isEmailVerified) return successResponse(res, 200, 'User Already Verified. You can Login.');

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

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return errorResponse(res, 403, 'Account is Locked . Please try After 15 Min');
    }
    if (!user.isEmailVerified) {
      return errorResponse(res, 403, 'Please Verify Your Email');
    }
    if (user.isGoogleUser) {
      return errorResponse(res, 401, 'Pleae use Google Login Button as you have register through google ID');
    }
    const isMatch = bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000;
      }

      await user.save();

      return errorResponse(res, 401, 'Invalid Cedentials');
    }

    if (!user.avatar || user.avatar.trim() === '') {
      const file = generateAvatar(user.name, '#000000');
      const address = await uploadToCloudinary(file);
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
      return errorResponse(res, 500, "COOKIE_EXPIRE must be a number", process.env.COOKIE_EXPIRE);
    }
    const options = {
      expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }
    del('Website_User:')
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
          Address: user.Address
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

    if (user.resetPasswordExpire && user.resetPasswordExpire > Date.now()) {
      const timeLeft = Math.ceil((user.resetPasswordExpire - Date.now()) / 1000 / 60);
      return errorResponse(res, 429, `Please wait ${timeLeft} minutes before requesting another reset`);
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
      const mailSending = await sendEmail(options);
      if (!mailSending) {
        return errorResponse(res, 503, 'Failed to send Mail');
      }
      return successResponse(res, 200, 'Password Reset Link Sent to your Email. Please Check your Email');
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

      const mailSending = await sendEmail(options);
      if (!mailSending) return errorResponse(res, 503, 'Failed to send Email');
      return successResponse(res, 200, 'Password Reset Successfully. Please Login with your new Password');
    } catch (error) {
      log.error('Password reset confirmation email failed to send', error);
      return successResponse(res, 200, 'Password Reset Successfully. But failed to send confirmation email');
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
    const validRoles = ['mentor', 'user'];
    if (role && !validRoles.includes(role)) {
      return errorResponse(res, 400, 'Invalid role specified');
    }
    let user = await User.findOne({ email });

    let profileIncomplete = false;
    if (user) {
      if (user.password) {
        return errorResponse(res, 403, 'Your Email id is already used . Please go through Password Verification.');
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
        isEmailVerified: true
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
    log.info(`Google authentication successful for user: ${email}, profileIncomplete: ${profileIncomplete}`);
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
          Address: user.Address
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
    });
  } catch (error) {
    log.error('Error in Getting User Data:', error);
    return errorResponse(res, 500, 'Failed to Get User Data');
  }
};
exports.UpdateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }
    if (email !== user.email) {
      return errorResponse(res, 403, 'Email verification failed');
    }
    if (req.body.password && user.isGoogleUser) {
      return errorResponse(res, 400, 'Google users cannot update password');
    }
    const updateFields = {};
    if (name && name.trim()) {
      if (name.trim().length < 2 || name.trim().length > 50) {
        return errorResponse(res, 400, 'Name must be between 2 and 50 characters');
      }
      updateFields.name = name.trim();
    }
    if (req.file && req.file.publicPath) {
      updateFields.avatar = req.file.publicPath;
    }

    if (Object.keys(updateFields).length === 0) {
      return errorResponse(res, 400, 'No changes provided for update');
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return errorResponse(res, 500, 'Failed to update user profile');
    }

    return successResponse(res, 200, 'Profile updated successfully', {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar: updatedUser.avatar,
      isGoogleUser: updatedUser.isGoogleUser || false,
    });
  } catch (error) {
    log.error('Error in updating user profile:', error);
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

    // Validate inputs
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide both latitude and longitude'
      });
    }

    // Ensure latitude and longitude are valid numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Latitude and longitude must be valid numbers'
      });
    }

    // Update user location
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { latitude: lat, longitude: lng },
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};