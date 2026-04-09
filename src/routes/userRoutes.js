const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/',
  authMiddleware,
  roleMiddleware([1]),
  userController.createKader
);

router.get('/',
  authMiddleware,
  roleMiddleware([1]),
  userController.getAllUsers
);

router.delete('/:id',
  authMiddleware,
  roleMiddleware([1]),
  userController.deleteUser
);

router.put('/:id/reset-password',
  authMiddleware,
  roleMiddleware([1]),
  userController.resetUserPassword
);

router.put('/:id',
  authMiddleware,
  roleMiddleware([1]),
  userController.updateUser
);

router.post("/save-fcm-token", authMiddleware, userController.saveFcmToken);
router.post(
  "/test-notif",
  authMiddleware,
  roleMiddleware([1]),
  userController.testNotif
);
module.exports = router;
