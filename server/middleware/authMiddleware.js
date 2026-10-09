"use strict";

/**
 * Auth Middleware
 *
 * protect()          — verifies JWT, loads user, attaches to req.user
 * authorizeRoles()   — checks req.user.role against allowed list
 *
 * Error codes:
 *   401  Not authenticated (missing/invalid/expired token, inactive user)
 *   403  Authenticated but role not permitted
 */

const mongoose  = require("mongoose");
const { verifyToken } = require("../services/authService");

// ─── protect ─────────────────────────────────────────────────────────────────

/**
 * Middleware: require a valid JWT.
 *
 * Expects:  Authorization: Bearer <token>
 * Attaches: req.user = { id, firstName, lastName, email, role, isActive }
 */
async function protect(req, res, next) {
  try {
    // 1. Read the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // 2. Extract and verify the token
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // 3. Load the user from the database — use +passwordHash select to keep it
    //    available for this middleware but it won't be on req.user (safe object only)
    const User = mongoose.model("User");
    const user = await User.findById(decoded.userId).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // 4. Reject if account has been deactivated since token was issued
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // 5. Attach a safe user object — NO passwordHash
    req.user = {
      id:        user._id,
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      phone:     user.phone || null,
      role:      user.role,
      isActive:  user.isActive,
    };

    next();
  } catch (err) {
    // Unexpected errors — do not expose internals
    next(err);
  }
}

// ─── authorizeRoles ───────────────────────────────────────────────────────────

/**
 * Middleware factory: restrict access to specified roles.
 *
 * Usage:  router.get("/admin-only", protect, authorizeRoles("admin"), handler)
 *         router.get("/staff",      protect, authorizeRoles("admin","therapist"), handler)
 *
 * Must always be used AFTER protect() so req.user is available.
 *
 * @param {...string} roles  Allowed role strings
 */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
    next();
  };
}

module.exports = { protect, authorizeRoles };
