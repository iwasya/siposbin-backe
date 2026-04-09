const express = require('express');
const router = express.Router();
const posbinduController = require('../controllers/posbinduController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', posbinduController.getAllPosbindu);
router.get('/:id', posbinduController.getPosbinduById);
router.post('/', authMiddleware, roleMiddleware([1]), posbinduController.createPosbindu);
router.put('/:id', authMiddleware, roleMiddleware([1]), posbinduController.updatePosbindu);
router.delete('/:id', authMiddleware, roleMiddleware([1]), posbinduController.deletePosbindu);
module.exports = router;
