const express = require('express');
const {
  getAllUsers,
  createUser,
  updateUser,
  updateUserRole,
  getAttendanceRules,
  createAttendanceRule,
  updateAttendanceRule,
  getAuditLogs,
  getDashboardStats,
  deleteUser
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

// User management
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);  
router.patch('/users/:id/role', updateUserRole);

// Attendance rules
router.get('/rules', getAttendanceRules);
router.post('/rules', createAttendanceRule);
router.put('/rules/:id', updateAttendanceRule);

// Audit logs
router.get('/audit-logs', getAuditLogs);

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

module.exports = router;