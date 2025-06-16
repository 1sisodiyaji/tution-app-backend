const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');

router.get('/all-teachers', teacherController.GetAllMentors);
router.get('/profile/:username', teacherController.GetMentorByUserName);

module.exports = router;
