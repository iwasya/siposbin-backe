const express = require('express');
const router = express.Router();
const statistikController = require('../controllers/statistikController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, statistikController.getStatistik);

module.exports = router;
