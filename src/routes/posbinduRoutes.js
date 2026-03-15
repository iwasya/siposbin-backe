const express = require('express');
const router = express.Router();
const posbinduController = require('../controllers/posbinduController');

router.get('/', posbinduController.getAllPosbindu);
router.get('/:id', posbinduController.getPosbinduById);
router.post('/', posbinduController.createPosbindu);
router.put('/:id', posbinduController.updatePosbindu);
router.delete('/:id', posbinduController.deletePosbindu);
module.exports = router;
