const express = require('express');
const router = express.Router();
const edukasiController = require('../controllers/edukasiController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, edukasiController.getEdukasi);

module.exports = router;
