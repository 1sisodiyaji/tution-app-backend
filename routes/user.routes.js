const express = require('express');
const userController = require('../controllers/userController');
const { validateRegister, validateLogin, validforgotPassword } = require('../middleware/validator');
const protect = require('../middleware/auth');
const {
  handleMulterError,
  cleanupOldAvatar,
  convertToWebp,
  upload,
} = require('../config/MulterConfig');
const router = express.Router();

router.post('/register', validateRegister, userController.Register);
router.get('/verify-email/:token', userController.VerifyEmail);
router.post('/login', validateLogin, userController.Login);
router.post('/google', userController.GoogleAuth);
router.get('/logout', userController.Logout);
router.post('/forgot-password', validforgotPassword, userController.ForgotPassword);
router.put('/change-password', protect, userController.ChangePassword);
router.put('/reset-password/:resetToken', userController.ResetPassword);
router.get('/me', protect, userController.GetMe);
router.patch('/updateLocation', protect, userController.updateLocation);
router.put('/update-profile', protect, userController.UpdateProfile);
router.post('/delete-profile', protect, userController.deactivateAccount);
router.put(
  '/update-profile-photo',
  protect,
  upload.single('avatar'),
  convertToWebp,
  handleMulterError,
  cleanupOldAvatar,
  userController.UpdateProfilePhoto
);
router.post('/mentor/:mentorId/review', protect, userController.addReview);

module.exports = router;
