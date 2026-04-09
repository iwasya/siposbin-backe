const express = require('express');
const router = express.Router();
const edukasiController = require('../controllers/edukasiController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, edukasiController.getEdukasi);
router.post('/', authMiddleware, roleMiddleware([1, 2]), edukasiController.createEdukasi);
router.put('/:id', authMiddleware, roleMiddleware([1, 2]), edukasiController.updateEdukasi);
router.delete('/:id', authMiddleware, roleMiddleware([1, 2]), edukasiController.deleteEdukasi);
module.exports = router;
