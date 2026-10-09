"use strict";

/**
 * Auth Service
 *
 * Encapsulates all authentication business logic so controllers stay thin.
 * Responsibilities:
 *   - Hash passwords with bcrypt
 *   - Compare plain password against stored hash
 *   - Generate signed JWT
 *   - Build a safe (no passwordHash) user object for API responses
 */

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");

const BCRYPT_SALT_ROUNDS = 12;

// ─── Password helpers ─────────────────────────────────────────────────────────

/**
 * Hash a plaintext password.
 * @param {string} plainPassword
 * @returns {Promise<string>} bcrypt hash
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a stored bcrypt hash.
 * @param {string} plainPassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

/**
 * Sign a JWT for the given user.
 * Payload contains only userId and role — no sensitive fields.
 * @param {{ _id: ObjectId, role: string }} user
 * @returns {string} signed JWT
 */
function generateToken(user) {
  const secret    = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  if (!secret) {
    throw new Error("JWT_SECRET is not configured in .env");
  }

  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    secret,
    { expiresIn }
  );
}

/**
 * Verify a JWT string and return the decoded payload.
 * Throws if the token is invalid or expired.
 * @param {string} token
 * @returns {{ userId: string, role: string }}
 */
function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured in .env");
  }
  return jwt.verify(token, secret);
}

// ─── Safe user builder ────────────────────────────────────────────────────────

/**
 * Build a safe user object for API responses.
 * Strips passwordHash and any other internal fields.
 * @param {import('../models/User')} userDoc  Mongoose document
 * @returns {object}
 */
function buildSafeUser(userDoc) {
  return {
    id:          userDoc._id,
    firstName:   userDoc.firstName,
    lastName:    userDoc.lastName,
    email:       userDoc.email,
    phone:       userDoc.phone || null,
    role:        userDoc.role,
    isActive:    userDoc.isActive,
    lastLoginAt: userDoc.lastLoginAt || null,
    createdAt:   userDoc.createdAt,
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  buildSafeUser,
};
