const express = require("express");
const router = express.Router();

const requireAuth = require("../middlewares/requireAuth");
const UserCtrl = require("../controllers/user.controller");

// current user profile
router.get("/me", requireAuth, UserCtrl.getMe);

// update name/email
router.put("/me", requireAuth, UserCtrl.updateMe);

// change password
router.put("/me/password", requireAuth, UserCtrl.changeMyPassword);

module.exports = router;
