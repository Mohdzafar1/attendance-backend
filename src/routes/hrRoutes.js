const express = require('express');
const { getPendingRequests, reviewRequest, getAllAttendance } = require('../controllers/hrController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('hr', 'admin'));

router.get('/corrections/pending', getPendingRequests);
router.put('/corrections/:id/review', reviewRequest);
router.get('/attendance/all', getAllAttendance);

module.exports = router;