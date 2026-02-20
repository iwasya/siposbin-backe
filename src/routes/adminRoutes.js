const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// 🔒 Semua endpoint admin wajib login & role admin
router.get('/reset-logs',
  authMiddleware,
  roleMiddleware([1]),
  adminController.getResetLogs
);

router.get('/reset-logs/stats',
  authMiddleware,
  roleMiddleware([1]),
  adminController.getResetStats
);

module.exports = router;
