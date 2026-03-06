const express = require('express');
const router = express.Router();

const notifikasiController = require('../controllers/notifikasiController');
const authMiddleware = require('../middleware/authMiddleware');

/*
========================================
AMBIL SEMUA NOTIFIKASI USER
Endpoint:
GET /api/notifikasi
Optional:
GET /api/notifikasi?unread=true
========================================
*/
router.get(
  '/',
  authMiddleware,
  notifikasiController.getMyNotifications
);

/*
========================================
TANDAI NOTIFIKASI SUDAH DIBACA
Endpoint:
PATCH /api/notifikasi/:id/read
========================================
*/
router.patch(
  '/:id/read',
  authMiddleware,
  notifikasiController.markAsRead
);

/*
========================================
JUMLAH NOTIFIKASI BELUM DIBACA
UNTUK BADGE ICON LONCENG
Endpoint:
GET /api/notifikasi/unread-count
========================================
*/
router.get(
  '/unread-count',
  authMiddleware,
  notifikasiController.getUnreadCount
);

module.exports = router;