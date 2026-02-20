const express = require('express');
const router = express.Router();
const pemeriksaanController = require('../controllers/pemeriksaanController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// GET riwayat
router.get('/', authMiddleware, roleMiddleware([2,3]), pemeriksaanController.getPemeriksaan);

// POST pemeriksaan
router.post('/', authMiddleware, roleMiddleware([2,3]), pemeriksaanController.createPemeriksaan);

// PUT update
router.put('/:id', authMiddleware, roleMiddleware([2,3]), pemeriksaanController.updatePemeriksaan);

// DELETE
router.delete('/:id', authMiddleware, roleMiddleware([2,3]), pemeriksaanController.deletePemeriksaan);

module.exports = router;