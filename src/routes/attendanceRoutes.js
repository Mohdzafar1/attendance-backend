const express = require('express');
const { authenticate } = require('../middleware/auth');
const { clockIn, clockOut, getTodayStatus, getHistory } = require('../controllers/attendanceController');

const router = express.Router();

router.use(authenticate);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/today', getTodayStatus);
router.get('/history', getHistory);

module.exports = router;