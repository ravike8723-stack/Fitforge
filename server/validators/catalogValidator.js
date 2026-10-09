"use strict";

/**
 * Catalog Validators
 *
 * Pure validation functions for Phase 5 catalog resources.
 * No Express dependency, no database calls.
 * Each returns { valid: true } or { valid: false, message: "..." }.
 */

const mongoose = require("mongoose");

const SLUG_REGEX = /^[a-z0-9-]+$/;
const HH_MM      = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseTimeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// ─── WellnessGoal ─────────────────────────────────────────────────────────────

function validateWellnessGoal({ name, slug }) {
  if (!name || !name.trim()) {
    return { valid: false, message: "Wellness goal name is required" };
  }
  if (name.trim().length > 100) {
    return { valid: false, message: "Name must be 100 characters or fewer" };
  }
  if (!slug || !slug.trim()) {
    return { valid: false, message: "Slug is required" };
  }
  if (!SLUG_REGEX.test(slug.trim().toLowerCase())) {
    return {
      valid:   false,
      message: "Slug may only contain lowercase letters, numbers and hyphens",
    };
  }
  return { valid: true };
}

// ─── Service ──────────────────────────────────────────────────────────────────

function validateService({ name, slug, duration, price, wellnessGoals, displayOrder }) {
  if (!name || !name.trim()) {
    return { valid: false, message: "Service name is required" };
  }
  if (!slug || !slug.trim()) {
    return { valid: false, message: "Slug is required" };
  }
  if (!SLUG_REGEX.test(slug.trim().toLowerCase())) {
    return {
      valid:   false,
      message: "Slug may only contain lowercase letters, numbers and hyphens",
    };
  }
  if (duration === undefined || duration === null || duration === "") {
    return { valid: false, message: "Duration is required" };
  }
  const dur = Number(duration);
  if (isNaN(dur) || dur < 1) {
    return { valid: false, message: "Duration must be at least 1 minute" };
  }
  if (price === undefined || price === null || price === "") {
    return { valid: false, message: "Price is required" };
  }
  const p = Number(price);
  if (isNaN(p) || p < 0) {
    return { valid: false, message: "Price cannot be negative" };
  }
  if (displayOrder !== undefined && displayOrder !== null && displayOrder !== "") {
    const d = Number(displayOrder);
    if (isNaN(d) || d < 0) {
      return { valid: false, message: "Display order cannot be negative" };
    }
  }
  if (wellnessGoals && Array.isArray(wellnessGoals)) {
    for (const id of wellnessGoals) {
      if (!isValidObjectId(id)) {
        return {
          valid:   false,
          message: `Invalid wellness goal ID: ${id}`,
        };
      }
    }
  }
  return { valid: true };
}

// ─── Therapist ────────────────────────────────────────────────────────────────

function validateTherapist({ user, yearsOfExperience }) {
  if (!user || !String(user).trim()) {
    return { valid: false, message: "User reference is required" };
  }
  if (!isValidObjectId(String(user).trim())) {
    return { valid: false, message: "Invalid user ID" };
  }
  if (yearsOfExperience !== undefined && yearsOfExperience !== null && yearsOfExperience !== "") {
    const y = Number(yearsOfExperience);
    if (isNaN(y) || y < 0) {
      return { valid: false, message: "Years of experience cannot be negative" };
    }
  }
  return { valid: true };
}

// ─── Availability ─────────────────────────────────────────────────────────────

function validateAvailability({ therapist, dayOfWeek, startTime, endTime }) {
  if (!therapist || !String(therapist).trim()) {
    return { valid: false, message: "Therapist reference is required" };
  }
  if (!isValidObjectId(String(therapist).trim())) {
    return { valid: false, message: "Invalid therapist ID" };
  }
  if (dayOfWeek === undefined || dayOfWeek === null || dayOfWeek === "") {
    return { valid: false, message: "Day of week is required" };
  }
  const day = Number(dayOfWeek);
  if (isNaN(day) || day < 0 || day > 6) {
    return { valid: false, message: "Day of week must be 0 (Sun) to 6 (Sat)" };
  }
  if (!startTime || !startTime.trim()) {
    return { valid: false, message: "Start time is required" };
  }
  if (!HH_MM.test(startTime.trim())) {
    return { valid: false, message: "Start time must be in HH:mm format (e.g. 09:00)" };
  }
  if (!endTime || !endTime.trim()) {
    return { valid: false, message: "End time is required" };
  }
  if (!HH_MM.test(endTime.trim())) {
    return { valid: false, message: "End time must be in HH:mm format (e.g. 18:00)" };
  }
  if (parseTimeToMinutes(startTime.trim()) >= parseTimeToMinutes(endTime.trim())) {
    return { valid: false, message: "Start time must be before end time" };
  }
  return { valid: true };
}

module.exports = {
  validateWellnessGoal,
  validateService,
  validateTherapist,
  validateAvailability,
  isValidObjectId,
};
