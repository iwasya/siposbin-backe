const express = require('express');
const router = express.Router();
const posbinduController = require('../controllers/posbinduController');

router.post('/', posbinduController.createPosbindu);
router.get('/', posbinduController.getAllPosbindu);

module.exports = router;
