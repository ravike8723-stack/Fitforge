"use strict";

/**
 * Booking Model
 *
 * Central transaction record for every appointment in the system.
 *
 * Relationships:
 *   customer   → User        (required)
 *   service    → Service     (required)
 *   therapist  → Therapist   (required)
 *
 * SNAPSHOT FIELDS — why we store price and duration here:
 *   If the Service price or duration changes after a booking is made,
 *   historical bookings must remain accurate.  We snapshot the values
 *   at booking time so reporting and invoicing never drift.
 *
 *   Snapshot fields:  price, duration, serviceName
 *
 * STATUS FLOW:
 *   pending → confirmed → completed
 *   pending → cancelled
 *   confirmed → cancelled
 *   confirmed → no_show
 *   (completed and cancelled are terminal — no further transitions)
 *
 * PAYMENT STATUS (for future payment integration):
 *   pending → paid | failed
 *   paid    → refunded
 *
 * Future references by: Payment, Review, Notification
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

// ─── Status enums ─────────────────────────────────────────────────────────────
const BOOKING_STATUSES    = ["pending", "confirmed", "completed", "cancelled", "no_show"];
const PAYMENT_STATUSES    = ["pending", "paid", "failed", "refunded"];

// Valid status transitions — keyed by current status, value is allowed next statuses
// Admin may override; this is the default business-logic matrix
const STATUS_TRANSITIONS = {
  pending:   ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],          // terminal
  cancelled: [],          // terminal
  no_show:   [],          // terminal
};

const bookingSchema = new Schema(
  {
    // ── Relationships ───────────────────────────────────────────────────────
    customer: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "Customer is required"],
    },

    service: {
      type:     Schema.Types.ObjectId,
      ref:      "Service",
      required: [true, "Service is required"],
    },

    therapist: {
      type:     Schema.Types.ObjectId,
      ref:      "Therapist",
      required: [true, "Therapist is required"],
    },

    // ── Appointment details ─────────────────────────────────────────────────
    // Date only — stored as midnight UTC for the appointment day
    appointmentDate: {
      type:     Date,
      required: [true, "Appointment date is required"],
    },

    // HH:mm 24-hour format — e.g. "10:00"
    startTime: {
      type:     String,
      required: [true, "Start time is required"],
      trim:     true,
      match:    [/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be HH:mm"],
    },

    // Calculated from startTime + duration at booking time (not client-provided)
    endTime: {
      type:     String,
      required: [true, "End time is required"],
      trim:     true,
      match:    [/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be HH:mm"],
    },

    // ── Snapshot fields — preserved for historical accuracy ─────────────────
    // Snapshot of Service.duration at booking time (minutes)
    duration: {
      type:     Number,
      required: [true, "Duration is required"],
      min:      [1, "Duration must be at least 1 minute"],
    },

    // Snapshot of Service.price at booking time (USD)
    price: {
      type:     Number,
      required: [true, "Price is required"],
      min:      [0, "Price cannot be negative"],
    },

    // Snapshot of Service.name for quick display without population
    serviceName: {
      type:  String,
      trim:  true,
    },

    // ── Status ──────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum: {
        values:  BOOKING_STATUSES,
        message: "Invalid booking status",
      },
      default: "pending",
    },

    // ── Payment status (placeholder for Phase 7 payment integration) ────────
    paymentStatus: {
      type:    String,
      enum: {
        values:  PAYMENT_STATUSES,
        message: "Invalid payment status",
      },
      default: "pending",
    },

    // ── Notes ────────────────────────────────────────────────────────────────
    // Submitted by customer at booking time
    customerNotes: {
      type:      String,
      trim:      true,
      maxlength: [500, "Customer notes must be 500 characters or fewer"],
    },

    // Added by therapist after/during the session
    therapistNotes: {
      type:      String,
      trim:      true,
      maxlength: [1000, "Therapist notes must be 1000 characters or fewer"],
    },

    // ── Lifecycle timestamps ─────────────────────────────────────────────────
    // Set when status changes to "cancelled"
    cancelledAt: {
      type: Date,
    },

    // Reason provided when cancelling
    cancellationReason: {
      type:      String,
      trim:      true,
      maxlength: [500, "Cancellation reason must be 500 characters or fewer"],
    },

    // Set when status changes to "completed"
    completedAt: {
      type: Date,
    },

    // Who performed the cancellation — for audit
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref:  "User",
    },

    // ── Email notification tracking (Phase A.2) ──────────────────────────────
    // Track whether confirmation email was successfully sent
    emailSent: {
      type:    Boolean,
      default: false,
    },

    // Timestamp of successful email delivery
    emailSentAt: {
      type: Date,
    },

    // Error message if email failed (for troubleshooting)
    emailError: {
      type:      String,
      trim:      true,
      maxlength: [500, "Email error must be 500 characters or fewer"],
    },

    // ── Calendar synchronization tracking (Phase A.2) ────────────────────────
    // External calendar event ID from Zoho Calendar
    calendarEventId: {
      type: String,
      trim: true,
    },

    // Sync status for calendar integration
    calendarSyncStatus: {
      type:    String,
      enum: {
        values:  ["pending", "synced", "failed"],
        message: "Invalid calendar sync status",
      },
      default: "pending",
    },

    // Timestamp of successful calendar sync
    calendarSyncedAt: {
      type: Date,
    },

    // Error message if calendar sync failed (for troubleshooting)
    calendarSyncError: {
      type:      String,
      trim:      true,
      maxlength: [500, "Calendar sync error must be 500 characters or fewer"],
    },

    // ── Rescheduling tracking (Phase A.3) ────────────────────────────────────
    rescheduledAt: {
      type: Date,
    },

    rescheduledFrom: {
      appointmentDate: { type: Date },
      startTime:       { type: String },
      endTime:         { type: String },
    },

    rescheduleCount: {
      type:    Number,
      default: 0,
    },
  },
  {
    timestamps: true,         // adds createdAt, updatedAt
    collection: "bookings",
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Primary access patterns:

// Customer views their own bookings
bookingSchema.index({ customer: 1, appointmentDate: -1 });

// Therapist views their appointments
bookingSchema.index({ therapist: 1, appointmentDate: 1 });

// Overlap detection — most critical query: therapist + date + time window
// This compound index makes the conflict check fast even with many bookings
bookingSchema.index({ therapist: 1, appointmentDate: 1, status: 1 });

// Admin filters by status
bookingSchema.index({ status: 1 });

// Admin filters by payment status
bookingSchema.index({ paymentStatus: 1 });

// Service analytics
bookingSchema.index({ service: 1 });

// ─── Static helpers ───────────────────────────────────────────────────────────

/**
 * Check whether a status transition is valid under the business rules.
 * Admin may bypass this with the force flag.
 *
 * @param {string}  currentStatus
 * @param {string}  newStatus
 * @param {boolean} isAdmin         — admins get a broader set of transitions
 * @returns {{ valid: boolean, message?: string }}
 */
bookingSchema.statics.isValidTransition = function (currentStatus, newStatus, isAdmin = false) {
  if (currentStatus === newStatus) {
    return { valid: false, message: `Booking is already in '${currentStatus}' status` };
  }

  // Admin can move completed/cancelled back to confirmed (e.g. mistake correction)
  if (isAdmin) {
    const adminAllowed = {
      ...STATUS_TRANSITIONS,
      completed: ["confirmed"],
      cancelled: ["pending", "confirmed"],
      no_show:   ["confirmed"],
    };
    const allowed = adminAllowed[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      return {
        valid:   false,
        message: `Admin transition from '${currentStatus}' to '${newStatus}' is not permitted`,
      };
    }
    return { valid: true };
  }

  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    return {
      valid:   false,
      message: `Cannot change status from '${currentStatus}' to '${newStatus}'`,
    };
  }
  return { valid: true };
};

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
module.exports.BOOKING_STATUSES  = BOOKING_STATUSES;
module.exports.PAYMENT_STATUSES  = PAYMENT_STATUSES;
module.exports.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
