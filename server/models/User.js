"use strict";

/**
 * User Model
 *
 * Central identity record for every person in the system.
 * Role determines how the account is used:
 *   "customer"  — books appointments
 *   "therapist" — linked to a Therapist profile
 *   "admin"     — manages the platform
 *
 * Authentication fields added in Phase 4:
 *   passwordHash — bcrypt hash, NEVER plaintext
 *   lastLoginAt  — updated on successful login
 *
 * Referenced by: Therapist.user
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    firstName: {
      type:      String,
      required:  [true, "First name is required"],
      trim:      true,
      maxlength: [50, "First name must be 50 characters or fewer"],
    },

    lastName: {
      type:      String,
      required:  [true, "Last name is required"],
      trim:      true,
      maxlength: [50, "Last name must be 50 characters or fewer"],
    },

    // Index: unique — primary identifier; normalised to lowercase before save
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      trim:      true,
      lowercase: true,
      match:     [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },

    // Optional — stored as string to preserve formatting and country codes
    phone: {
      type:  String,
      trim:  true,
      match: [
        /^[+\d\s\-().]{7,20}$/,
        "Please provide a valid phone number",
      ],
    },

    // Determines system access and UI routing
    role: {
      type:     String,
      required: [true, "Role is required"],
      enum: {
        values:  ["customer", "therapist", "admin"],
        message: "Role must be customer, therapist or admin",
      },
      default: "customer",
    },

    // Soft-delete — inactive users cannot log in (enforced in auth phase)
    isActive: {
      type:    Boolean,
      default: true,
    },

    // ── Authentication fields (added Phase 4) ─────────────────────────────
    // bcrypt hash of the user's password — NEVER store plaintext here
    passwordHash: {
      type:     String,
      required: [true, "Password hash is required"],
      select:   false,   // excluded from all queries by default
    },

    // Updated every time the user logs in successfully
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
// email unique index defined above via `unique: true`.
// role index for fast admin queries (e.g. list all therapists)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
