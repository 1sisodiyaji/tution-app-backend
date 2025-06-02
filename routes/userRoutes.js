const express = require('express');
const userController = require('../controllers/userController');
const upload = require('../middleware/multer');
const { validateRegister, validateLogin, validforgotPassword } = require('../middleware/validator');
const protect = require('../middleware/auth');
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
router.patch('/update-profile', upload.single('avatar'), userController.UpdateProfile);
router.get('/all-users', userController.GetAllUsers);

module.exports = router;
