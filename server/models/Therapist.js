"use strict";

/**
 * Therapist Model
 *
 * Extended profile for users with role "therapist".
 * Keeps professional information separate from the core User record.
 *
 * References:
 *   user → User  (required 1-to-1 link)
 *
 * Referenced by: Availability.therapist, Future: Booking.therapist
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const therapistSchema = new Schema(
  {
    // Must link to a User whose role is "therapist"
    // Index: on user for fast profile lookup given a userId
    user: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "A therapist must be linked to a user account"],
      unique:   true, // one therapist profile per user account
    },

    // Professional biography shown on the website
    bio: {
      type:      String,
      trim:      true,
      maxlength: [2000, "Bio must be 2000 characters or fewer"],
    },

    // Areas of focus — stored as strings for simplicity in Phase 3
    // Examples: ["Deep Tissue", "Neck & Shoulder", "Relaxation"]
    specializations: [
      {
        type:      String,
        trim:      true,
        maxlength: [100, "Each specialization must be 100 characters or fewer"],
      },
    ],

    // Total years of professional experience (non-negative integer)
    yearsOfExperience: {
      type: Number,
      min:  [0, "Years of experience cannot be negative"],
    },

    // URL or file path to profile photo (resolved in a future media phase)
    profileImage: {
      type:  String,
      trim:  true,
    },

    // Soft-delete — inactive therapists should not be bookable
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "therapists",
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
// user unique index defined above via `unique: true`.
therapistSchema.index({ isActive: 1 }); // fast filter for active therapists

const Therapist = mongoose.model("Therapist", therapistSchema);

module.exports = Therapist;
