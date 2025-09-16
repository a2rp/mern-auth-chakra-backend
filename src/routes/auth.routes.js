// tiny router that wires endpoints to controller functions
const express = require("express");
const router = express.Router();

const Auth = require("../controllers/auth.controller");
const requireAuth = require("../middlewares/requireAuth");

// create account + auto login
router.post("/register", Auth.register);

// login with email/password
router.post("/login", Auth.login);

// clear the cookie
router.post("/logout", Auth.logout);

// get current user (needs the cookie)
router.get("/me", requireAuth, Auth.me);

module.exports = router;
