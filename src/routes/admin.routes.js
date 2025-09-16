// admin routes: list users, create user, update user
const express = require("express");
const router = express.Router();

const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const Admin = require("../controllers/admin.controller");

// GET /api/admin/users
router.get("/users", requireAuth, requireRole("admin"), Admin.listUsers);

// POST /api/admin/users
router.post("/users", requireAuth, requireRole("admin"), Admin.createUser);

// PUT /api/admin/users/:id
router.put("/users/:id", requireAuth, requireRole("admin"), Admin.updateUser);

module.exports = router;
