"use strict";

/**
 * WellnessGoal Model
 *
 * Represents a non-medical wellness objective that a client may want to address.
 * Examples: Stress Relief, Muscle Recovery, Neck & Shoulder Tension, Relaxation.
 *
 * Referenced by: Service.wellnessGoals
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const wellnessGoalSchema = new Schema(
  {
    // Human-readable name displayed to clients
    name: {
      type:      String,
      required:  [true, "Wellness goal name is required"],
      unique:    true,
      trim:      true,
      maxlength: [100, "Name must be 100 characters or fewer"],
    },

    // URL-friendly identifier, e.g. "stress-relief"
    // Index: unique — used for lookups and future URL routing
    slug: {
      type:      String,
      required:  [true, "Slug is required"],
      unique:    true,
      trim:      true,
      lowercase: true,
      match:     [/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens"],
    },

    // Optional longer description for detail pages or admin UI
    description: {
      type:      String,
      trim:      true,
      maxlength: [500, "Description must be 500 characters or fewer"],
    },

    // Soft-delete / visibility flag
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  {
    // Adds createdAt and updatedAt automatically
    timestamps: true,
    // Explicit collection name for clarity
    collection: "wellnessgoals",
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
// name and slug are already unique via the schema field options above.
// An additional compound index is not needed at this stage.
wellnessGoalSchema.index({ isActive: 1 }); // fast filter for active goals

const WellnessGoal = mongoose.model("WellnessGoal", wellnessGoalSchema);

module.exports = WellnessGoal;
