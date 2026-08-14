const express = require('express');
const router = express.Router();
const riwayatController = require('../controllers/riwayatController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, riwayatController.createRiwayatPenyakit);
router.get('/', authMiddleware, riwayatController.getRiwayatPenyakit);
router.put('/:id', authMiddleware, riwayatController.updateRiwayatPenyakit);
router.delete('/:id', authMiddleware, riwayatController.deleteRiwayatPenyakit);

module.exports = router;
