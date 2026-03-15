const express = require('express');
const router = express.Router();
const edukasiController = require('../controllers/edukasiController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, edukasiController.getEdukasi);
router.post('/', authMiddleware, edukasiController.createEdukasi);
router.put('/:id', authMiddleware, edukasiController.updateEdukasi);
router.delete('/:id', authMiddleware, edukasiController.deleteEdukasi);
module.exports = router;
