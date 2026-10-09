"use strict";

/**
 * Booking Controller — thin HTTP layer
 *
 * All business logic is delegated to bookingService.js.
 * This file only handles: request parsing, input validation,
 * authorization checks, and HTTP response formatting.
 *
 * Routes summary:
 *
 * CUSTOMER:
 *   POST   /api/bookings                     → createBooking
 *   GET    /api/bookings/my                  → getMyBookings
 *   GET    /api/bookings/available-slots      → getAvailableSlots
 *   GET    /api/bookings/:id                 → getBookingById
 *   PATCH  /api/bookings/:id/cancel          → cancelMyBooking
 *
 * THERAPIST:
 *   GET    /api/bookings/therapist/my        → getTherapistBookings
 *   GET    /api/bookings/therapist/today     → getTodayBookings
 *   PATCH  /api/bookings/:id/status          → updateBookingStatus
 *   PATCH  /api/bookings/:id/notes           → updateTherapistNotes
 *
 * ADMIN:
 *   GET    /api/admin/bookings               → adminListBookings
 *   GET    /api/admin/bookings/:id           → adminGetBooking
 *   PATCH  /api/admin/bookings/:id/status    → adminUpdateStatus
 *   PATCH  /api/admin/bookings/:id           → adminUpdateBooking
 *   DELETE /api/admin/bookings/:id           → adminDeleteBooking
 */

const mongoose = require("mongoose");
const {
  validateCreateBooking,
  validateCancelBooking,
  validateRescheduleBooking,
  validateStatusUpdate,
  validateTherapistNotes,
  validateAvailableSlotsQuery,
  isValidObjectId,
} = require("../validators/bookingValidator");

const {
  createBooking,
  getAvailableSlots,
  rescheduleBooking,
  cancelBooking,
  updateStatus,
  normalizeToDateOnly,
} = require("../services/bookingService");

// ─── Helper: load booking with ownership/existence check ─────────────────────
async function loadBooking(id, filter = {}) {
  const Booking = mongoose.model("Booking");
  if (!isValidObjectId(id)) return null;
  return Booking.findOne({ _id: id, ...filter })
    .populate("customer",  "firstName lastName email phone")
    .populate("service",   "name slug duration price category")
    .populate("therapist", "bio specializations isActive");
}

// ─── CUSTOMER — createBooking ─────────────────────────────────────────────────
async function createBookingHandler(req, res, next) {
  try {
    const customerId = req.user.id.toString();
    const service = req.body.service || req.body.serviceId;
    const therapist = req.body.therapist || req.body.therapistId;
    const { appointmentDate, startTime, customerNotes } = req.body;

    // Validate — customer identity is always taken from JWT, never from body
    const check = validateCreateBooking({
      customer: customerId, service, therapist, appointmentDate, startTime, customerNotes,
    });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const booking = await createBooking({
      customerId,
      serviceId:   service,
      therapistId: therapist,
      appointmentDate,
      startTime,
      customerNotes,
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data:    booking,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

// ─── CUSTOMER — getMyBookings ─────────────────────────────────────────────────
async function getMyBookings(req, res, next) {
  try {
    const Booking = mongoose.model("Booking");
    const filter  = { customer: req.user.id };

    if (req.query.status) filter.status = req.query.status;

    const bookings = await Booking.find(filter)
      .populate("service",   "name slug duration price")
      .populate("therapist", "bio specializations")
      .sort({ appointmentDate: -1, startTime: -1 });

    return res.status(200).json({
      success: true,
      count:   bookings.length,
      data:    bookings,
    });
  } catch (err) { next(err); }
}

// ─── CUSTOMER — getBookingById ────────────────────────────────────────────────
async function getBookingById(req, res, next) {
  try {
    const booking = await loadBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Customers can only view their own bookings
    if (req.user.role === "customer" &&
        booking.customer._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Therapists can only view their own bookings
    if (req.user.role === "therapist") {
      const Therapist = mongoose.model("Therapist");
      const profile   = await Therapist.findOne({ user: req.user.id });
      if (!profile || booking.therapist._id.toString() !== profile._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    return res.status(200).json({ success: true, data: booking });
  } catch (err) { next(err); }
}

// ─── CUSTOMER — cancelMyBooking ───────────────────────────────────────────────
async function cancelMyBooking(req, res, next) {
  try {
    const check = validateCancelBooking(req.body);
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const booking = await loadBooking(req.params.id,
      { customer: req.user.id }   // ownership enforced here
    );
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const cancelled = await cancelBooking(booking, req.user.id, req.body.cancellationReason, req.user.role === "admin");

    return res.status(200).json({
      success: true,
      message: "Booking cancelled",
      data:    cancelled,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

// ─── CUSTOMER — rescheduleMyBooking ───────────────────────────────────────────
async function rescheduleMyBooking(req, res, next) {
  try {
    const newAppointmentDate = req.body.newAppointmentDate || req.body.appointmentDate;
    const newStartTime = req.body.newStartTime || req.body.startTime;
    const check = validateRescheduleBooking({ newAppointmentDate, newStartTime });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const filter = req.user.role === "admin" ? {} : { customer: req.user.id };
    const booking = await loadBooking(req.params.id, filter);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const rescheduled = await rescheduleBooking(
      booking,
      newAppointmentDate,
      newStartTime,
      req.user.role === "admin"
    );

    return res.status(200).json({
      success: true,
      message: "Booking rescheduled successfully",
      data:    rescheduled,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

// ─── AVAILABLE SLOTS ─────────────────────────────────────────────────────────
async function getAvailableSlotsHandler(req, res, next) {
  try {
    const { therapist, service, date } = req.query;

    const check = validateAvailableSlotsQuery({ therapist, service, date });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const result = await getAvailableSlots(therapist, service, date);

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

// ─── THERAPIST — getTherapistBookings ─────────────────────────────────────────
async function getTherapistBookings(req, res, next) {
  try {
    const Therapist = mongoose.model("Therapist");
    const Booking   = mongoose.model("Booking");

    const profile = await Therapist.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Therapist profile not found" });
    }

    const filter = { therapist: profile._id };
    if (req.query.status) filter.status = req.query.status;

    const bookings = await Booking.find(filter)
      .populate("customer",  "firstName lastName phone")
      .populate("service",   "name duration price")
      .sort({ appointmentDate: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count:   bookings.length,
      data:    bookings,
    });
  } catch (err) { next(err); }
}

// ─── THERAPIST — getTodayBookings ─────────────────────────────────────────────
async function getTodayBookings(req, res, next) {
  try {
    const Therapist = mongoose.model("Therapist");
    const Booking   = mongoose.model("Booking");

    const profile = await Therapist.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Therapist profile not found" });
    }

    const today = normalizeToDateOnly(new Date());
    const bookings = await Booking.find({
      therapist:       profile._id,
      appointmentDate: today,
      status:          { $in: ["pending", "confirmed"] },
    })
      .populate("customer",  "firstName lastName phone")
      .populate("service",   "name duration price")
      .sort({ startTime: 1 });

    return res.status(200).json({
      success: true,
      date:    today,
      count:   bookings.length,
      data:    bookings,
    });
  } catch (err) { next(err); }
}

// ─── THERAPIST — updateBookingStatus ─────────────────────────────────────────
async function updateBookingStatus(req, res, next) {
  try {
    const check = validateStatusUpdate(req.body);
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const Therapist = mongoose.model("Therapist");
    const profile   = await Therapist.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Therapist profile not found" });
    }

    const booking = await loadBooking(req.params.id, { therapist: profile._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Therapists cannot change payment status or price — handled in controller
    const THERAPIST_ALLOWED_STATUSES = ["confirmed", "completed", "no_show", "cancelled"];
    if (!THERAPIST_ALLOWED_STATUSES.includes(req.body.status)) {
      return res.status(403).json({
        success: false,
        message: `Therapists can only set status to: ${THERAPIST_ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const updated = await updateStatus(booking, req.body.status, false);

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

// ─── THERAPIST — updateTherapistNotes ────────────────────────────────────────
async function updateTherapistNotes(req, res, next) {
  try {
    const check = validateTherapistNotes(req.body);
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const Therapist = mongoose.model("Therapist");
    const profile   = await Therapist.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Therapist profile not found" });
    }

    const booking = await loadBooking(req.params.id, { therapist: profile._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    booking.therapistNotes = String(req.body.therapistNotes).trim();
    await booking.save();

    return res.status(200).json({ success: true, data: booking });
  } catch (err) { next(err); }
}

// ─── ADMIN — adminListBookings ────────────────────────────────────────────────
async function adminListBookings(req, res, next) {
  try {
    const Booking = mongoose.model("Booking");
    const filter  = {};

    if (req.query.status)        filter.status        = req.query.status;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.customer && isValidObjectId(req.query.customer))
      filter.customer  = req.query.customer;
    if (req.query.therapist && isValidObjectId(req.query.therapist))
      filter.therapist = req.query.therapist;
    if (req.query.service && isValidObjectId(req.query.service))
      filter.service   = req.query.service;
    if (req.query.date) {
      const d = normalizeToDateOnly(req.query.date);
      if (!isNaN(d.getTime())) filter.appointmentDate = d;
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("customer",  "firstName lastName email")
        .populate("service",   "name price")
        .populate("therapist", "bio specializations")
        .sort({ appointmentDate: -1, startTime: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success:    true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      count:      bookings.length,
      data:       bookings,
    });
  } catch (err) { next(err); }
}

// ─── ADMIN — adminGetBooking ──────────────────────────────────────────────────
async function adminGetBooking(req, res, next) {
  try {
    const booking = await loadBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    return res.status(200).json({ success: true, data: booking });
  } catch (err) { next(err); }
}

// ─── ADMIN — adminUpdateStatus ────────────────────────────────────────────────
async function adminUpdateStatus(req, res, next) {
  try {
    const check = validateStatusUpdate(req.body);
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const booking = await loadBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const updated = await updateStatus(booking, req.body.status, true); // isAdmin=true

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

// ─── ADMIN — adminUpdateBooking ───────────────────────────────────────────────
// Admin can update operational fields; price and customer are protected
async function adminUpdateBooking(req, res, next) {
  try {
    const booking = await loadBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const ALLOWED = ["customerNotes", "therapistNotes", "cancellationReason", "paymentStatus"];
    ALLOWED.forEach(field => {
      if (req.body[field] !== undefined) booking[field] = req.body[field];
    });

    await booking.save();
    return res.status(200).json({ success: true, data: booking });
  } catch (err) { next(err); }
}

// ─── ADMIN — adminDeleteBooking ───────────────────────────────────────────────
// Hard delete — admin only; use only for data cleanup, not routine cancellation
async function adminDeleteBooking(req, res, next) {
  try {
    const Booking = mongoose.model("Booking");
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    await booking.deleteOne();
    return res.status(200).json({ success: true, message: "Booking permanently deleted" });
  } catch (err) { next(err); }
}

module.exports = {
  createBookingHandler,
  getMyBookings,
  getBookingById,
  cancelMyBooking,
  rescheduleMyBooking,
  getAvailableSlotsHandler,
  getTherapistBookings,
  getTodayBookings,
  updateBookingStatus,
  updateTherapistNotes,
  adminListBookings,
  adminGetBooking,
  adminUpdateStatus,
  adminUpdateBooking,
  adminDeleteBooking,
};
