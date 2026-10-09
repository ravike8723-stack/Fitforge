"use strict";

/**
 * Auth Routes
 *
 * Base: /api/auth
 *
 * Public:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *
 * Protected (requires valid JWT):
 *   GET  /api/auth/me
 *
 * Development / test only:
 *   GET  /api/auth/test        — any authenticated user
 *   GET  /api/auth/admin-test  — admin role only
 */

const express = require("express");
const router  = express.Router();

const {
  register,
  login,
  getCurrentUser,
  logout,
  updateProfile,
  changePassword,
} = require("../controllers/authController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// ── Public routes ─────────────────────────────────────────────────────────────
router.post("/register", register);
router.post("/login",    login);
router.post("/logout",   logout);

// ── Protected routes ──────────────────────────────────────────────────────────
router.get("/me",        protect, getCurrentUser);
router.put("/profile",   protect, updateProfile);
router.put("/password",  protect, changePassword);

// ── Development / test routes (mark clearly — remove or gate in production) ───
/**
 * [DEV] GET /api/auth/test
 * Requires valid JWT. Returns the req.user payload.
 * Use to confirm that authentication middleware is working.
 */
router.get("/test", protect, (req, res) => {
  res.json({
    success: true,
    message: "[DEV] Authentication working",
    user:    req.user,
  });
});

/**
 * [DEV] GET /api/auth/admin-test
 * Requires valid JWT AND role = "admin".
 * Use to confirm that role-based authorization is working.
 */
router.get("/admin-test", protect, authorizeRoles("admin"), (req, res) => {
  res.json({
    success: true,
    message: "[DEV] Admin authorization working",
    user:    req.user,
  });
});

module.exports = router;
