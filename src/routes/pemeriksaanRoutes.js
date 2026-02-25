const express = require('express');
const router = express.Router();

const pemeriksaanController = require('../controllers/pemeriksaanController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

/* =================================
   GET RIWAYAT PEMERIKSAAN
================================= */
router.get(
  '/',
  authMiddleware,
  roleMiddleware([2, 3]),
  pemeriksaanController.getPemeriksaan
);

/* =================================
   GET DETAIL PEMERIKSAAN BY ID
================================= */
router.get(
  '/:id',
  authMiddleware,
  roleMiddleware([2, 3]),
  pemeriksaanController.getPemeriksaanById
);

/* =================================
   POST PEMERIKSAAN
================================= */
router.post(
  '/',
  authMiddleware,
  roleMiddleware([2, 3]),
  pemeriksaanController.createPemeriksaan
);

/* =================================
   PUT UPDATE PEMERIKSAAN
================================= */
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware([2, 3]),
  pemeriksaanController.updatePemeriksaan
);

/* =================================
   DELETE PEMERIKSAAN
================================= */
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware([2, 3]),
  pemeriksaanController.deletePemeriksaan
);

module.exports = router;