const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/Admin.controller');
const adminAuth = require('../middleware/adminAuth');

router.post('/create-admin', AdminController.createAdmin);
router.post('/login', AdminController.loginAdmin);
router.get('/dashboard/stats', adminAuth, AdminController.getDashboardStats);
router.get('/analytics/system', adminAuth, AdminController.getSystemAnalytics);
router.get('/users', adminAuth, AdminController.getAllUsers);
router.get('/users/:id', adminAuth, AdminController.getUserDetails);
router.get('/users/role/:role', adminAuth, AdminController.getUsersByRole);
router.patch('/users/:id/toggle-status', adminAuth, AdminController.toggleUserStatus);
router.delete('/users/:id', adminAuth, AdminController.deleteUser);
router.patch(
  '/mentors/:id/toggle-verification',
  adminAuth,
  AdminController.toggleMentorVerification
);
router.get('/mentors/:id/insights', adminAuth, AdminController.getMentorInsights);
router.get(
  '/analytics/profile-completion/:id',
  adminAuth,
  AdminController.getUserProfileCompletionStatus
);
router.post('/users/bulk-operations', adminAuth, AdminController.bulkUserOperations);
router.get('/export/users', adminAuth, AdminController.exportUsersData);

module.exports = router;
