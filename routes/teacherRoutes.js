const express = require('express');
const router = express.Router();
const {
  registerTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
} = require('../controllers/teacherController');

router.route('/').post(registerTeacher).get(getTeachers);
router
  .route('/:id')
  .get(getTeacherById)
  .put(updateTeacher)
  .delete(deleteTeacher);

module.exports = router; 