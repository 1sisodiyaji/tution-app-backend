const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

router.get('/all-teachers', teacherController.GetAllMentors);
router.get('/profile/:id', teacherController.GetMentorById);

module.exports = router; 