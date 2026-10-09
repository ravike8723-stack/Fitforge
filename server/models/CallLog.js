"use strict";

/**
 * CallLog Model (Phase A.4)
 *
 * Persists comprehensive call history, duration, transcripts, routing outcomes,
 * and associated appointment bookings for Shanglian Therapeutic Bodywork.
 */

const mongoose = require("mongoose");

const CALL_HANDLERS = ["human", "ai", "missed", "escalated"];

const CALL_OUTCOMES = [
  "inquiry_answered",
  "booking_created",
  "booking_rescheduled",
  "booking_cancelled",
  "escalated_to_human",
  "caller_hung_up",
  "failed",
  "human_answered",
];

const callLogSchema = new mongoose.Schema(
  {
    callSid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    callerPhone: {
      type: String,
      default: "Unknown",
      trim: true,
    },
    recipientPhone: {
      type: String,
      default: "",
      trim: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endTime: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    handledBy: {
      type: String,
      enum: CALL_HANDLERS,
      default: "ai",
    },
    outcome: {
      type: String,
      enum: CALL_OUTCOMES,
      default: "inquiry_answered",
    },
    isAfterHours: {
      type: Boolean,
      default: false,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    escalatedTo: {
      type: String,
      default: null,
    },
    transcript: [
      {
        role: {
          type: String,
          enum: ["system", "assistant", "user"],
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    summary: {
      type: String,
      default: "",
      trim: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    isSandbox: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

callLogSchema.index({ createdAt: -1 });
callLogSchema.index({ callerPhone: 1, createdAt: -1 });

module.exports = mongoose.model("CallLog", callLogSchema);
