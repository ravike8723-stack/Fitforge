"use strict";

/**
 * Auth Controller
 *
 * Thin HTTP layer — delegates business logic to authService.
 * Routes:
 *   POST /api/auth/register   → register
 *   POST /api/auth/login      → login
 *   GET  /api/auth/me         → getCurrentUser  (requires protect middleware)
 *   POST /api/auth/logout     → logout
 *
 *   [DEV] GET /api/auth/test             → requires authentication
 *   [DEV] GET /api/auth/admin-test       → requires admin role
 */

const mongoose = require("mongoose");

const { validateRegister, validateLogin } = require("../validators/authValidator");
const {
  hashPassword,
  comparePassword,
  generateToken,
  buildSafeUser,
} = require("../services/authService");

// ─── register ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 *
 * Public registrations are ALWAYS assigned role = "customer".
 * The request body cannot override this.
 */
async function register(req, res, next) {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // 1. Validate input
    const check = validateRegister({ firstName, lastName, email, password });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const User = mongoose.model("User");

    // 2. Check for duplicate email (case-insensitive — model lowercases it)
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // 3. Hash the password — never store plaintext
    const passwordHash = await hashPassword(password);

    // 4. Create the user — role is ALWAYS "customer" for public registration
    const user = await User.create({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.trim().toLowerCase(),
      phone:     phone ? phone.trim() : undefined,
      passwordHash,
      role:      "customer",   // cannot be overridden by the request body
      isActive:  true,
    });

    // 5. Generate JWT
    const token = generateToken(user);

    // 6. Return safe response — no passwordHash
    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user:    buildSafeUser(user),
      token,
    });
  } catch (err) {
    next(err);
  }
}

// ─── login ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 *
 * Uses a generic error message for both "user not found" and "wrong password"
 * to prevent account enumeration.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    const check = validateLogin({ email, password });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const User = mongoose.model("User");

    // 2. Find user — explicitly select passwordHash (it is excluded by default)
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+passwordHash");

    // 3. Generic failure for unknown email — do not distinguish from wrong password
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 4. Reject inactive accounts before comparing password
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "This account has been deactivated",
      });
    }

    // 5. Compare password
    const match = await comparePassword(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 6. Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // 7. Generate JWT
    const token = generateToken(user);

    // 8. Return safe response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user:    buildSafeUser(user),
      token,
    });
  } catch (err) {
    next(err);
  }
}

// ─── getCurrentUser ───────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 *
 * Requires: protect middleware (sets req.user)
 * Returns the currently authenticated user's profile.
 */
async function getCurrentUser(req, res, next) {
  try {
    // req.user is already safe — set by protect middleware
    return res.status(200).json({
      success: true,
      user:    req.user,
    });
  } catch (err) {
    next(err);
  }
}

// ─── updateProfile ───────────────────────────────────────────────────────────

/**
 * PUT /api/auth/profile
 * Allows logged-in user to update their first name, last name, and phone.
 */
async function updateProfile(req, res, next) {
  try {
    const User = mongoose.model("User");
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { firstName, lastName, phone } = req.body;
    if (firstName && firstName.trim()) user.firstName = firstName.trim();
    if (lastName && lastName.trim()) user.lastName = lastName.trim();
    if (phone !== undefined) user.phone = phone ? phone.trim() : undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: buildSafeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

// ─── changePassword ───────────────────────────────────────────────────────────

/**
 * PUT /api/auth/password
 * Allows logged-in user to change their password by validating current password.
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    const User = mongoose.model("User");
    const user = await User.findById(req.user.id).select("+passwordHash");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const match = await comparePassword(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
  updateProfile,
  changePassword,
};
