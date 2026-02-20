const express = require('express');
const router = express.Router();
const jadwalController = require('../controllers/jadwalController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware'); // ← WAJIB

router.post(
  '/',
  authMiddleware,
  roleMiddleware([2]), // hanya kader
  jadwalController.createJadwal
);

module.exports = router;
