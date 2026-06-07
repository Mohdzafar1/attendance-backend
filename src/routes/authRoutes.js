const express = require('express');
const { login, getMe, logout, debugUsers } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.get('/debug-users', debugUsers); // Use this to check users

module.exports = router;