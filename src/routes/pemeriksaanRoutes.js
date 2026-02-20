const express = require('express');
const router = express.Router();
const pemeriksaanController = require('../controllers/pemeriksaanController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, pemeriksaanController.createPemeriksaan);
router.get('/riwayat', authMiddleware, pemeriksaanController.getRiwayatPemeriksaan);

module.exports = router;
