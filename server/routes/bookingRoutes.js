"use strict";

/**
 * Booking Routes
 *
 * Customer routes:   /api/bookings/*
 * Admin routes:      /api/admin/bookings/*  (mounted separately)
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  CUSTOMER ROUTES (role: customer or therapist for read)              │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │  POST   /api/bookings                  Create a new booking           │
 * │  GET    /api/bookings/my               List own bookings              │
 * │  GET    /api/bookings/available-slots  Get available time slots       │
 * │  GET    /api/bookings/:id              Get single booking             │
 * │  PATCH  /api/bookings/:id/cancel       Cancel own booking             │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │  THERAPIST ROUTES                                                     │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │  GET    /api/bookings/therapist/my     List own assigned bookings     │
 * │  GET    /api/bookings/therapist/today  List today's bookings          │
 * │  PATCH  /api/bookings/:id/status       Update appointment status      │
 * │  PATCH  /api/bookings/:id/notes        Update therapist notes         │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * NOTE: /api/admin/bookings/* routes are in adminBookingRoutes.js
 */

const express = require("express");
const router  = express.Router();

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
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
} = require("../controllers/bookingController");

// ── Public — available slots (no auth required — customers browsing) ──────────
router.get("/available-slots", getAvailableSlotsHandler);

// ── Customer ──────────────────────────────────────────────────────────────────
router.post("/",            protect, authorizeRoles("customer"),    createBookingHandler);
router.get( "/my",          protect, authorizeRoles("customer"),    getMyBookings);
router.patch("/:id/cancel",    protect, authorizeRoles("customer"), cancelMyBooking);
router.patch("/:id/reschedule", protect, authorizeRoles("customer"), rescheduleMyBooking);

// ── Therapist ─────────────────────────────────────────────────────────────────
router.get( "/therapist/my",    protect, authorizeRoles("therapist"),       getTherapistBookings);
router.get( "/therapist/today", protect, authorizeRoles("therapist"),       getTodayBookings);
router.patch("/:id/status",     protect, authorizeRoles("therapist"),       updateBookingStatus);
router.patch("/:id/notes",      protect, authorizeRoles("therapist"),       updateTherapistNotes);

// ── Shared — authenticated (customer + therapist + admin can read by ID) ──────
router.get("/:id", protect, getBookingById);

module.exports = router;


/**
 * Admin Booking Routes — exported separately so they can be mounted at
 * /api/admin/bookings in server/index.js.
 */
const adminRouter = express.Router();

const {
  adminListBookings,
  adminGetBooking,
  adminUpdateStatus,
  adminUpdateBooking,
  adminDeleteBooking,
} = require("../controllers/bookingController");

adminRouter.get(   "/",        protect, authorizeRoles("admin"), adminListBookings);
adminRouter.get(   "/:id",     protect, authorizeRoles("admin"), adminGetBooking);
adminRouter.patch( "/:id/status", protect, authorizeRoles("admin"), adminUpdateStatus);
adminRouter.patch( "/:id",     protect, authorizeRoles("admin"), adminUpdateBooking);
adminRouter.delete("/:id",     protect, authorizeRoles("admin"), adminDeleteBooking);

module.exports.adminRouter = adminRouter;
