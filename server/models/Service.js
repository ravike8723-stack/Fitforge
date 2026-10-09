"use strict";

/**
 * Service Model
 *
 * Represents a wellness service offered by the business.
 * Examples: Therapeutic Massage (60 min), Deep Tissue (60 min), Neck & Shoulder Focus.
 *
 * References: WellnessGoal (many-to-many via array of ObjectIds)
 *
 * Future reference by: Booking.service
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const serviceSchema = new Schema(
  {
    // Display name shown to clients
    name: {
      type:      String,
      required:  [true, "Service name is required"],
      trim:      true,
      maxlength: [100, "Name must be 100 characters or fewer"],
    },

    // URL-friendly identifier, e.g. "therapeutic-massage-60"
    // Index: unique — used for lookups and future URL routing
    slug: {
      type:      String,
      required:  [true, "Slug is required"],
      unique:    true,
      trim:      true,
      lowercase: true,
      match:     [/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens"],
    },

    // Full description for detail/booking pages
    description: {
      type:      String,
      trim:      true,
      maxlength: [2000, "Description must be 2000 characters or fewer"],
    },

    // Short summary for cards and listings
    shortDescription: {
      type:      String,
      trim:      true,
      maxlength: [250, "Short description must be 250 characters or fewer"],
    },

    // Session length in minutes (must be a positive integer)
    duration: {
      type:     Number,
      required: [true, "Duration is required"],
      min:      [1, "Duration must be at least 1 minute"],
    },

    // Price in USD (non-negative; stored as a number, formatted on display)
    price: {
      type:     Number,
      required: [true, "Price is required"],
      min:      [0, "Price cannot be negative"],
    },

    // Broad grouping label (e.g. "therapeutic", "relaxation", "deep-tissue")
    // Kept as a plain string for Phase 3; can be promoted to a ref later
    category: {
      type:    String,
      trim:    true,
      maxlength: [50, "Category must be 50 characters or fewer"],
    },

    // Wellness goals this service addresses
    // References: WellnessGoal — enables "find services for my goal" queries
    wellnessGoals: [
      {
        type: Schema.Types.ObjectId,
        ref:  "WellnessGoal",
      },
    ],

    // Soft-delete — inactive services should not appear in booking flow
    isActive: {
      type:    Boolean,
      default: true,
    },

    // Controls ordering in listings (lower = earlier)
    displayOrder: {
      type:    Number,
      default: 0,
      min:     [0, "Display order cannot be negative"],
    },
  },
  {
    timestamps: true,
    collection: "services",
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
// slug unique index defined above via `unique: true`.
serviceSchema.index({ isActive: 1 });           // fast filter for active services
serviceSchema.index({ category: 1 });           // fast filter by category
serviceSchema.index({ wellnessGoals: 1 });      // fast lookup by wellness goal
serviceSchema.index({ displayOrder: 1 });       // fast ordered listing

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
