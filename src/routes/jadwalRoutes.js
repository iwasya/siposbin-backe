const express = require('express');
const router = express.Router();
const jadwalController = require('../controllers/jadwalController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// GET semua jadwal
router.get('/', authMiddleware, jadwalController.getJadwal);

// GET by id
router.get('/:id', authMiddleware, jadwalController.getJadwalById);

// POST (kader & admin)
router.post('/', authMiddleware, roleMiddleware([1,2]), jadwalController.createJadwal);

// PUT (kader & admin)
router.put('/:id', authMiddleware, roleMiddleware([1,2]), jadwalController.updateJadwal);

// DELETE (admin only)
router.delete('/:id', authMiddleware, roleMiddleware([1,2]), jadwalController.deleteJadwal);

module.exports = router;