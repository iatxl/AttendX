const express = require('express');
const router = express.Router();
const { generateSession, markAttendance, getStudentAttendance, markOnlineAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Faculty routes
router.post('/session', protect, authorize('faculty', 'admin'), generateSession);

// Student routes
router.post('/mark', protect, authorize('student'), markAttendance);
router.post('/mark-online', protect, authorize('student'), markOnlineAttendance);
router.get('/student', protect, authorize('student'), getStudentAttendance);

module.exports = router;
