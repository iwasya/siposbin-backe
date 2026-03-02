const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

// 🔐 Login limiter
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: {
    message: "Terlalu banyak percobaan login, coba lagi nanti. Mohon tunggu 5 menit."
  }
});
const resetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 5, 
  message: {
    message: "Terlalu banyak permintaan reset password. Coba lagi 10 menit lagi."
  }
});

router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/request-reset', resetLimiter, authController.requestReset);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
