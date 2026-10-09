"use strict";

/**
 * Setting Model (Singleton)
 *
 * Stores dynamic business information and operational rules for
 * FitForge Personal Training & Online Coaching.
 */

const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    // ─── Business Information ──────────────────────────────────────────────
    businessName: {
      type: String,
      default: "FitForge Personal Training",
      trim: true,
    },
    tagline: {
      type: String,
      default: "Train Smarter. Get Stronger. Live Better.",
      trim: true,
    },
    description: {
      type: String,
      default:
        "Personalized personal training, online coaching, strength training, and fitness programs designed around your goals.",
      trim: true,
    },
    phone: {
      type: String,
      default: "+1 (415) 890-4321",
      trim: true,
    },
    email: {
      type: String,
      default: "coach@fitforge.training",
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      default: "https://fitforge.training",
      trim: true,
    },
    address: {
      street: { type: String, default: "450 Performance Way, Suite 200", trim: true },
      city: { type: String, default: "San Francisco", trim: true },
      state: { type: String, default: "CA", trim: true },
      zip: { type: String, default: "94107", trim: true },
      formatted: { type: String, default: "450 Performance Way, Suite 200, San Francisco, CA 94107", trim: true },
    },
    timezone: {
      type: String,
      default: "America/Los_Angeles",
      trim: true,
    },
    hoursDescription: {
      type: String,
      default: "Mon – Fri: 6:00 AM – 8:00 PM • Sat: 8:00 AM – 2:00 PM",
      trim: true,
    },
    socialLinks: {
      instagram: { type: String, default: "@fitforge.coaching", trim: true },
      facebook: { type: String, default: "FitForge Performance", trim: true },
      yelp: { type: String, default: "", trim: true },
    },
    bookingPolicy: {
      type: String,
      default:
        "1-on-1 training and consultations by appointment. Please arrive 5-10 minutes prior to your scheduled session.",
      trim: true,
    },
    cancellationPolicy: {
      type: String,
      default:
        "Cancellations and rescheduling requests must be submitted at least 24 hours prior to your scheduled session.",
      trim: true,
    },

    // ─── Configurable Business Rules ───────────────────────────────────────
    minimumBookingNoticeHours: {
      type: Number,
      default: 2,
      min: 0,
      max: 72,
    },
    maxAdvanceBookingDays: {
      type: Number,
      default: 60,
      min: 1,
      max: 365,
    },
    cancellationCutoffHours: {
      type: Number,
      default: 24,
      min: 0,
      max: 168,
    },
    reschedulingCutoffHours: {
      type: Number,
      default: 24,
      min: 0,
      max: 168,
    },
    bufferTimeMinutes: {
      type: Number,
      default: 15,
      min: 0,
      max: 60,
    },

    // ─── Feature Toggles ──────────────────────────────────────────────────
    emailNotificationsEnabled: {
      type: Boolean,
      default: true,
    },
    calendarSyncEnabled: {
      type: Boolean,
      default: true,
    },
    onlineBookingEnabled: {
      type: Boolean,
      default: true,
    },

    // ─── AI Voice Receptionist Settings ───────────────────────────────────
    aiVoiceSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },
      receptionistName: {
        type: String,
        default: "Alex Assistant",
        trim: true,
      },
      greetingMessage: {
        type: String,
        default:
          "Thank you for calling FitForge Personal Training. How can we help you reach your strength and fitness goals today?",
        trim: true,
      },
      afterHoursGreeting: {
        type: String,
        default:
          "Thank you for calling FitForge Personal Training. Our studio is currently closed, but I can check session availability or schedule your free fitness consultation. How may I assist you?",
        trim: true,
      },
      humanFirstMode: {
        type: Boolean,
        default: true, // Ring staff line first during business hours
      },
      ringTimeoutSeconds: {
        type: Number,
        default: 20, // 20s ringing before AI picks up
        min: 5,
        max: 60,
      },
      humanEscalationPhone: {
        type: String,
        default: "(408) 123-4567",
        trim: true,
      },
      voiceName: {
        type: String,
        default: "Polly.Joanna-Neural",
        trim: true,
      },
      sandboxMode: {
        type: Boolean,
        default: false,
      },
      callLoggingRetentionDays: {
        type: Number,
        default: 90,
      },
      businessHoursSchedule: {
        type: [
          {
            dayOfWeek: { type: Number, required: true }, // 0=Sun, 1=Mon, ..., 6=Sat
            isOpen: { type: Boolean, default: true },
            openTime: { type: String, default: "10:00" }, // HH:mm
            closeTime: { type: String, default: "21:00" }, // HH:mm
          },
        ],
        default: [
          { dayOfWeek: 0, isOpen: true, openTime: "10:00", closeTime: "21:00" },
          { dayOfWeek: 1, isOpen: true, openTime: "10:00", closeTime: "21:00" },
          { dayOfWeek: 2, isOpen: true, openTime: "10:00", closeTime: "21:00" },
          { dayOfWeek: 3, isOpen: true, openTime: "10:00", closeTime: "21:00" },
          { dayOfWeek: 4, isOpen: true, openTime: "10:00", closeTime: "21:00" },
          { dayOfWeek: 5, isOpen: true, openTime: "10:00", closeTime: "21:00" },
          { dayOfWeek: 6, isOpen: true, openTime: "10:00", closeTime: "21:00" },
        ],
      },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Singleton getter: Retrieves the current settings document or initializes default.
 */
settingSchema.statics.getSettings = async function () {
  if (mongoose.connection.readyState !== 1) {
    return new this({});
  }
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

/**
 * Update settings singleton.
 */
settingSchema.statics.updateSettings = async function (updateData) {
  let doc = await this.findOne();
  if (!doc) {
    doc = new this(updateData);
    await doc.save();
    return doc;
  }
  Object.assign(doc, updateData);
  await doc.save();
  return doc;
};

module.exports = mongoose.model("Setting", settingSchema);
