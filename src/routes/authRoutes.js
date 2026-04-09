const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter, resetLimiter } = require('../middleware/rateLimiters');

router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/request-reset', resetLimiter, authController.requestReset);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
