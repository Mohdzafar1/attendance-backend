const express = require('express');
const { createRequest, getMyRequests, getRequestStatus } = require('../controllers/correctionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', createRequest);
router.get('/', getMyRequests);
router.get('/:id', getRequestStatus);

module.exports = router;