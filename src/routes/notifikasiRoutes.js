const express = require('express');
const router = express.Router();
const notifikasiController = require('../controllers/notifikasiController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, notifikasiController.getMyNotifications);
router.patch('/:id/read', authMiddleware, notifikasiController.markAsRead);

module.exports = router;
