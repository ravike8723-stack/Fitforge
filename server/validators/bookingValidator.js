"use strict";

/**
 * Booking Validator
 *
 * Pure validation functions — no DB calls, no Express dependency.
 * Each returns { valid: true } or { valid: false, message: "..." }.
 *
 * TRUST RULES:
 *   Never trust from client: price, duration, status, paymentStatus.
 *   These are controlled exclusively by backend business logic.
 */

const mongoose = require("mongoose");
const { BOOKING_STATUSES } = require("../models/Booking");

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(String(id));
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// ─── validateCreateBooking ────────────────────────────────────────────────────
/**
 * Validate input for creating a new booking.
 *
 * @param {object} params
 * @param {string} params.customer       - must be valid ObjectId
 * @param {string} params.service        - must be valid ObjectId
 * @param {string} params.therapist      - must be valid ObjectId
 * @param {*}      params.appointmentDate - must parse to a future date
 * @param {string} params.startTime      - HH:mm
 * @param {string} [params.customerNotes]
 * @param {string} [params.requestedCustomerId] - for ownership check; customer must equal auth user
 */
function validateCreateBooking({ customer, service, therapist, appointmentDate, startTime, customerNotes }) {
  if (!isValidObjectId(customer)) {
    return { valid: false, message: "Valid customer ID is required" };
  }
  if (!isValidObjectId(service)) {
    return { valid: false, message: "Valid service ID is required" };
  }
  if (!isValidObjectId(therapist)) {
    return { valid: false, message: "Valid therapist ID is required" };
  }

  // Date validation
  if (!appointmentDate) {
    return { valid: false, message: "Appointment date is required" };
  }
  const apptDate = new Date(appointmentDate);
  if (isNaN(apptDate.getTime())) {
    return { valid: false, message: "Appointment date is not a valid date" };
  }

  // Must be today or in the future (compare date portion only)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (apptDate < todayStart) {
    return { valid: false, message: "Appointment date cannot be in the past" };
  }

  // Time validation
  if (!startTime || !startTime.trim()) {
    return { valid: false, message: "Start time is required" };
  }
  if (!HH_MM.test(startTime.trim())) {
    return { valid: false, message: "Start time must be in HH:mm format (e.g. 10:00)" };
  }

  // Notes length
  if (customerNotes && customerNotes.length > 500) {
    return { valid: false, message: "Customer notes must be 500 characters or fewer" };
  }

  return { valid: true };
}

// ─── validateCancelBooking ────────────────────────────────────────────────────
function validateCancelBooking({ cancellationReason }) {
  if (cancellationReason && cancellationReason.length > 500) {
    return { valid: false, message: "Cancellation reason must be 500 characters or fewer" };
  }
  return { valid: true };
}

// ─── validateStatusUpdate ─────────────────────────────────────────────────────
function validateStatusUpdate({ status }) {
  if (!status) {
    return { valid: false, message: "Status is required" };
  }
  if (!BOOKING_STATUSES.includes(status)) {
    return {
      valid:   false,
      message: `Invalid status. Must be one of: ${BOOKING_STATUSES.join(", ")}`,
    };
  }
  return { valid: true };
}

// ─── validateTherapistNotes ───────────────────────────────────────────────────
function validateTherapistNotes({ therapistNotes }) {
  if (therapistNotes === undefined || therapistNotes === null) {
    return { valid: false, message: "Therapist notes content is required" };
  }
  if (String(therapistNotes).length > 1000) {
    return { valid: false, message: "Therapist notes must be 1000 characters or fewer" };
  }
  return { valid: true };
}

// ─── validateAvailableSlotsQuery ──────────────────────────────────────────────
function validateAvailableSlotsQuery({ therapist, service, date }) {
  if (!isValidObjectId(therapist)) {
    return { valid: false, message: "Valid therapist ID is required" };
  }
  if (!isValidObjectId(service)) {
    return { valid: false, message: "Valid service ID is required" };
  }
  if (!date) {
    return { valid: false, message: "Date is required (YYYY-MM-DD)" };
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return { valid: false, message: "Date is not a valid date" };
  }
  return { valid: true };
}

// ─── validateRescheduleBooking ────────────────────────────────────────────────
/**
 * Validate input for rescheduling an existing booking.
 *
 * @param {object} params
 * @param {string} params.newAppointmentDate - date string
 * @param {string} params.newStartTime       - HH:mm
 */
function validateRescheduleBooking({ newAppointmentDate, newStartTime }) {
  if (!newAppointmentDate) {
    return { valid: false, message: "New appointment date is required" };
  }
  const apptDate = new Date(newAppointmentDate);
  if (isNaN(apptDate.getTime())) {
    return { valid: false, message: "New appointment date is not a valid date" };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (apptDate < todayStart) {
    return { valid: false, message: "New appointment date cannot be in the past" };
  }

  if (!newStartTime || !newStartTime.trim()) {
    return { valid: false, message: "New start time is required" };
  }
  if (!HH_MM.test(newStartTime.trim())) {
    return { valid: false, message: "New start time must be in HH:mm format (e.g. 10:00)" };
  }

  return { valid: true };
}

module.exports = {
  validateCreateBooking,
  validateCancelBooking,
  validateRescheduleBooking,
  validateStatusUpdate,
  validateTherapistNotes,
  validateAvailableSlotsQuery,
  isValidObjectId,
  toMinutes,
};
