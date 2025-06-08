const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/Meeting.controller');
const protect = require('../middleware/auth');
const { createMeetingValidator } = require('../middleware/validator');

router.get('/all-meeting', protect, meetingController.GetmeetingDetails);
router.post('/create-meeting', protect, createMeetingValidator, meetingController.CreateMeeting);

module.exports = router;
