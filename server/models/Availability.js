"use strict";

/**
 * Availability Model
 *
 * Defines when a therapist is available to accept bookings.
 * Each document represents one day-of-week slot for one therapist.
 *
 * Day-of-week mapping (matches JavaScript's Date.getDay()):
 *   0 = Sunday
 *   1 = Monday
 *   2 = Tuesday
 *   3 = Wednesday
 *   4 = Thursday
 *   5 = Friday
 *   6 = Saturday
 *
 * References: Therapist (required)
 *
 * NOTE: This is working availability, NOT booked appointments.
 *       Appointments / bookings are a separate future collection.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

// Regex for HH:mm time strings (00:00 – 23:59)
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const availabilitySchema = new Schema(
  {
    // The therapist this availability belongs to
    // Index: therapist + dayOfWeek compound (see below)
    therapist: {
      type:     Schema.Types.ObjectId,
      ref:      "Therapist",
      required: [true, "Therapist reference is required"],
    },

    // 0 (Sunday) – 6 (Saturday)
    dayOfWeek: {
      type:     Number,
      required: [true, "Day of week is required"],
      min:      [0, "Day of week must be between 0 (Sun) and 6 (Sat)"],
      max:      [6, "Day of week must be between 0 (Sun) and 6 (Sat)"],
    },

    // Working hours in HH:mm 24-hour format, e.g. "09:00"
    startTime: {
      type:     String,
      required: [true, "Start time is required"],
      trim:     true,
      match:    [HH_MM, "Start time must be in HH:mm format (e.g. 09:00)"],
    },

    // End time must be after startTime — enforced at API layer in a later phase
    endTime: {
      type:     String,
      required: [true, "End time is required"],
      trim:     true,
      match:    [HH_MM, "End time must be in HH:mm format (e.g. 18:00)"],
    },

    // Can be toggled to temporarily block a recurring slot
    isAvailable: {
      type:    Boolean,
      default: true,
    },

    // Optional date range — allows seasonal or temporary schedules
    effectiveFrom: {
      type: Date,
    },

    effectiveUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "availabilities",
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
// Compound index: most common query is "give me all slots for therapist X on day Y"
availabilitySchema.index({ therapist: 1, dayOfWeek: 1 });
availabilitySchema.index({ isAvailable: 1 });

const Availability = mongoose.model("Availability", availabilitySchema);

module.exports = Availability;
