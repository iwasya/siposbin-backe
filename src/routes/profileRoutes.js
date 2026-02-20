const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const sharp = require('sharp');


router.get('/', authMiddleware, profileController.getProfile);
router.put('/', authMiddleware, profileController.updateProfile);
router.post('/upload-photo', authMiddleware, upload.single('foto'), profileController.uploadProfilePhoto);
router.put('/change-password',
  authMiddleware,
  profileController.changePassword
);

module.exports = router;
