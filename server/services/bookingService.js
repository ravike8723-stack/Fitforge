"use strict";

/**
 * Booking Service — Phase A.3 Enhanced
 *
 * All core booking business logic lives here.
 * Controllers stay thin — they call these functions and return HTTP responses.
 *
 * DOUBLE-BOOKING & BUSINESS RULE PROTECTION STRATEGY:
 *   1. Dynamic business rule retrieval from Setting model (minimum notice,
 *      max advance days, cancellation cutoff, rescheduling cutoff, buffer time).
 *   2. Symmetrical buffer-time overlap detection preventing tight back-to-back
 *      appointments.
 *   3. Safe rescheduling flow with cutoffs, conflict checks, email notification,
 *      and calendar event sync.
 *   4. Safe cancellation flow with cutoffs, notification, and calendar sync.
 */

const mongoose = require("mongoose");
const { toMinutes } = require("../validators/bookingValidator");
const Setting = require("../models/Setting");

// Phase A.2 & A.3: Notification and calendar services
const notificationService = require("./notificationService");
const calendarService = require("./calendarService");

// Statuses that occupy a therapist's time slot
const ACTIVE_STATUSES = ["pending", "confirmed"];

// ─── Time helpers ─────────────────────────────────────────────────────────────

/**
 * Add minutes to an HH:mm string.
 * e.g. addMinutes("10:00", 60) → "11:00"
 */
function addMinutes(hhmm, minutes) {
  const total = toMinutes(hhmm) + minutes;
  const h     = Math.floor(total / 60) % 24;
  const m     = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Determine whether two HH:mm time ranges overlap with buffer time.
 * Adjacent ranges with buffer:
 *   Conflict if: startA < endB + buffer AND endA + buffer > startB
 */
function timesOverlapWithBuffer(startA, endA, startB, endB, bufferMinutes = 0) {
  return toMinutes(startA) < toMinutes(endB) + bufferMinutes &&
         toMinutes(endA) + bufferMinutes > toMinutes(startB);
}

function timesOverlap(startA, endA, startB, endB) {
  return timesOverlapWithBuffer(startA, endA, startB, endB, 0);
}

// ─── Normalize date ───────────────────────────────────────────────────────────
function normalizeToDateOnly(dateInput) {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── checkOverlappingBookings ─────────────────────────────────────────────────
/**
 * Query MongoDB for any active bookings that would conflict with requested slot.
 *
 * @param {string|ObjectId} therapistId
 * @param {Date}            appointmentDate  (midnight UTC)
 * @param {string}          startTime        HH:mm
 * @param {string}          endTime          HH:mm
 * @param {string|null}     excludeId        exclude this booking (for updates/rescheduling)
 * @param {object|null}     session          Mongoose session (optional)
 * @param {number}          bufferMinutes    Buffer time in minutes
 */
async function checkOverlappingBookings(
  therapistId,
  appointmentDate,
  startTime,
  endTime,
  excludeId = null,
  session = null,
  bufferMinutes = 0
) {
  const Booking = mongoose.model("Booking");

  const filter = {
    therapist:       therapistId,
    appointmentDate: appointmentDate,
    status:          { $in: ACTIVE_STATUSES },
  };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const opts = session ? { session } : {};
  const existing = await Booking.find(filter, null, opts)
    .select("startTime endTime status")
    .lean();

  return existing.filter(b =>
    timesOverlapWithBuffer(startTime, endTime, b.startTime, b.endTime, bufferMinutes)
  );
}

// ─── createBooking ────────────────────────────────────────────────────────────
/**
 * Core booking creation flow with dynamic business rules.
 */
async function createBooking({
  customerId,
  serviceId,
  therapistId,
  appointmentDate,
  startTime,
  customerNotes,
}) {
  const User         = mongoose.model("User");
  const Service      = mongoose.model("Service");
  const Therapist    = mongoose.model("Therapist");
  const Availability = mongoose.model("Availability");
  const Booking      = mongoose.model("Booking");

  const settings = await Setting.getSettings();

  if (settings.onlineBookingEnabled === false) {
    const e = new Error("Online booking is currently paused. Please call the clinic directly.");
    e.statusCode = 403; throw e;
  }

  // ── 1. Validate service ──────────────────────────────────────────────────
  const service = await Service.findById(serviceId);
  if (!service) {
    const e = new Error("Service not found"); e.statusCode = 404; throw e;
  }
  if (!service.isActive) {
    const e = new Error("This service is not currently available for booking"); e.statusCode = 400; throw e;
  }

  // ── 2. Validate therapist ────────────────────────────────────────────────
  const therapist = await Therapist.findById(therapistId);
  if (!therapist) {
    const e = new Error("Therapist not found"); e.statusCode = 404; throw e;
  }
  if (!therapist.isActive) {
    const e = new Error("This therapist is not currently accepting bookings"); e.statusCode = 400; throw e;
  }

  // ── 3. Validate customer ─────────────────────────────────────────────────
  const customer = await User.findById(customerId);
  if (!customer) {
    const e = new Error("Customer account not found"); e.statusCode = 404; throw e;
  }
  if (!customer.isActive) {
    const e = new Error("Customer account is deactivated"); e.statusCode = 400; throw e;
  }

  // ── 4. Calculate times & enforce business rule windows ───────────────────
  const apptDate  = normalizeToDateOnly(appointmentDate);
  const endTime   = addMinutes(startTime, service.duration);

  if (toMinutes(endTime) > 24 * 60) {
    const e = new Error("Appointment would extend past midnight"); e.statusCode = 400; throw e;
  }

  const now = new Date();

  // Full start datetime
  const [startH, startM] = startTime.split(":").map(Number);
  const fullApptStart = new Date(apptDate);
  fullApptStart.setHours(startH, startM, 0, 0);

  // Enforce Minimum Booking Notice
  const minNoticeMs = (settings.minimumBookingNoticeHours || 0) * 60 * 60 * 1000;
  if (fullApptStart.getTime() - now.getTime() < minNoticeMs) {
    const e = new Error(
      `Appointments must be booked at least ${settings.minimumBookingNoticeHours} hour(s) in advance.`
    );
    e.statusCode = 400; throw e;
  }

  // Enforce Max Advance Booking Window
  const maxAdvanceMs = (settings.maxAdvanceBookingDays || 60) * 24 * 60 * 60 * 1000;
  if (apptDate.getTime() - now.getTime() > maxAdvanceMs) {
    const e = new Error(
      `Appointments can only be scheduled up to ${settings.maxAdvanceBookingDays} days in advance.`
    );
    e.statusCode = 400; throw e;
  }

  // ── 5. Check therapist weekly schedule ──────────────────────────────────
  const dayOfWeek = apptDate.getDay();   // 0=Sun, 6=Sat
  const slots = await Availability.find({
    therapist:   therapistId,
    dayOfWeek:   dayOfWeek,
    isAvailable: true,
  }).lean();

  if (slots.length === 0) {
    const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const e = new Error(`Therapist is not available on ${DAY_NAMES[dayOfWeek]}`);
    e.statusCode = 409; throw e;
  }

  // ── 6. Verify appointment falls within a working slot ───────────────────
  const startMin = toMinutes(startTime);
  const endMin   = toMinutes(endTime);

  const withinSlot = slots.some(slot => {
    const slotStart = toMinutes(slot.startTime);
    const slotEnd   = toMinutes(slot.endTime);
    return startMin >= slotStart && endMin <= slotEnd;
  });

  if (!withinSlot) {
    const hours = slots.map(s => `${s.startTime}–${s.endTime}`).join(", ");
    const e = new Error(`Requested time is outside therapist working hours (${hours})`);
    e.statusCode = 409; throw e;
  }

  // ── 7. Overlap detection with buffer time ────────────────────────────────
  const bufferMinutes = settings.bufferTimeMinutes || 0;
  const conflicts = await checkOverlappingBookings(
    therapistId,
    apptDate,
    startTime,
    endTime,
    null,
    null,
    bufferMinutes
  );
  if (conflicts.length > 0) {
    const c = conflicts[0];
    const e = new Error(`That time slot is already booked or conflicts with another session (${c.startTime}–${c.endTime})`);
    e.statusCode = 409; throw e;
  }

  // ── 8. Create booking ────────────────────────────────────────────────────
  let booking;
  const conn = mongoose.connection;
  const topologyType = conn.client?.topology?.description?.type || "";
  const isReplicaSet = topologyType.includes("ReplicaSet") || topologyType === "Sharded";

  if (isReplicaSet && typeof conn.startSession === "function") {
    const session = await conn.startSession();
    try {
      await session.withTransaction(async () => {
        const recheck = await checkOverlappingBookings(
          therapistId,
          apptDate,
          startTime,
          endTime,
          null,
          session,
          bufferMinutes
        );
        if (recheck.length > 0) {
          const c = recheck[0];
          const e = new Error(`Slot was just taken (${c.startTime}–${c.endTime})`);
          e.statusCode = 409; throw e;
        }

        const docs = await Booking.create([{
          customer:        customerId,
          service:         serviceId,
          therapist:       therapistId,
          appointmentDate: apptDate,
          startTime,
          endTime,
          duration:        service.duration,
          price:           service.price,
          serviceName:     service.name,
          customerNotes:   customerNotes || undefined,
          status:          "pending",
          paymentStatus:   "pending",
        }], { session });
        booking = docs[0];
      });
    } finally {
      await session.endSession();
    }
  } else {
    booking = await Booking.create({
      customer:        customerId,
      service:         serviceId,
      therapist:       therapistId,
      appointmentDate: apptDate,
      startTime,
      endTime,
      duration:        service.duration,
      price:           service.price,
      serviceName:     service.name,
      customerNotes:   customerNotes || undefined,
      status:          "pending",
      paymentStatus:   "pending",
    });
  }

  // ── 9. Return populated booking ──────────────────────────────────────────
  const populatedBooking = await Booking.findById(booking._id)
    .populate("customer",  "firstName lastName email phone")
    .populate("service",   "name slug duration price category")
    .populate("therapist", "bio specializations isActive")
    .populate({ path: "therapist", populate: { path: "user", select: "firstName lastName email" } });

  // ── Phase A.2: Notifications & Calendar Sync ─────────────────────────────
  if (settings.emailNotificationsEnabled !== false) {
    try {
      await notificationService.notifyBookingCreated(populatedBooking);
    } catch (err) {
      console.error("[BookingService] Notification failed (booking preserved):", err.message);
    }
  }

  if (settings.calendarSyncEnabled !== false) {
    try {
      await calendarService.createCalendarEvent(populatedBooking);
    } catch (err) {
      console.error("[BookingService] Calendar sync failed (booking preserved):", err.message);
    }
  }

  return populatedBooking;
}

// ─── getAvailableSlots ────────────────────────────────────────────────────────
/**
 * Calculate available time slots for a therapist/service/date combination
 * honoring buffer times and minimum notice.
 */
async function getAvailableSlots(therapistId, serviceId, date) {
  const Service      = mongoose.model("Service");
  const Therapist    = mongoose.model("Therapist");
  const Availability = mongoose.model("Availability");
  const Booking      = mongoose.model("Booking");

  const settings = await Setting.getSettings();

  const service = await Service.findById(serviceId).lean();
  if (!service)           { const e = new Error("Service not found");   e.statusCode = 404; throw e; }
  if (!service.isActive)  { const e = new Error("Service is not active"); e.statusCode = 400; throw e; }

  const therapist = await Therapist.findById(therapistId).lean();
  if (!therapist)          { const e = new Error("Therapist not found");   e.statusCode = 404; throw e; }
  if (!therapist.isActive) { const e = new Error("Therapist is not active"); e.statusCode = 400; throw e; }

  const apptDate  = normalizeToDateOnly(date);
  const dayOfWeek = apptDate.getDay();

  const now = new Date();
  const todayOnly = normalizeToDateOnly(now);

  // Past dates
  if (apptDate < todayOnly) {
    return { date: apptDate, therapistId, serviceId, slots: [] };
  }

  // Working slots for this day
  const availSlots = await Availability.find({
    therapist:   therapistId,
    dayOfWeek,
    isAvailable: true,
  }).lean();

  if (availSlots.length === 0) {
    return { date: apptDate, therapistId, serviceId, slots: [] };
  }

  // Existing bookings on this date
  const existingBookings = await Booking.find({
    therapist:       therapistId,
    appointmentDate: apptDate,
    status:          { $in: ACTIVE_STATUSES },
  }).select("startTime endTime").lean();

  const duration = service.duration;
  const bufferMinutes = settings.bufferTimeMinutes || 0;
  const minNoticeHours = settings.minimumBookingNoticeHours || 0;
  const minNoticeMs = minNoticeHours * 60 * 60 * 1000;

  const freeSlots = [];

  for (const workSlot of availSlots) {
    let cursor = toMinutes(workSlot.startTime);
    const workEnd = toMinutes(workSlot.endTime);

    while (cursor + duration <= workEnd) {
      const slotStart = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
      const slotEnd   = addMinutes(slotStart, duration);

      // Check conflict with existing appointments and buffer
      const blocked = existingBookings.some(b =>
        timesOverlapWithBuffer(slotStart, slotEnd, b.startTime, b.endTime, bufferMinutes)
      );

      // Check minimum notice if slot is on today's date
      let isPastNotice = false;
      if (apptDate.getTime() === todayOnly.getTime()) {
        const [slotH, slotM] = slotStart.split(":").map(Number);
        const slotDateTime = new Date(apptDate);
        slotDateTime.setHours(slotH, slotM, 0, 0);

        if (slotDateTime.getTime() - now.getTime() < minNoticeMs) {
          isPastNotice = true;
        }
      }

      freeSlots.push({
        startTime: slotStart,
        endTime:   slotEnd,
        available: !blocked && !isPastNotice,
      });

      cursor += duration;
    }
  }

  return {
    date:        apptDate,
    therapistId,
    serviceId,
    duration,
    bufferMinutes,
    slots:       freeSlots,
  };
}

// ─── rescheduleBooking ────────────────────────────────────────────────────────
/**
 * Reschedule an existing eligible booking.
 *
 * @param {object} booking           Mongoose Booking document
 * @param {string} newAppointmentDate YYYY-MM-DD
 * @param {string} newStartTime       HH:mm
 * @param {boolean} isAdmin          Admin override flag
 */
async function rescheduleBooking(booking, newAppointmentDate, newStartTime, isAdmin = false) {
  const Availability = mongoose.model("Availability");
  const settings = await Setting.getSettings();

  if (!["pending", "confirmed"].includes(booking.status)) {
    const e = new Error(`Cannot reschedule a booking in '${booking.status}' status`);
    e.statusCode = 409; throw e;
  }

  const now = new Date();
  const currentApptStart = new Date(booking.appointmentDate);
  const [curH, curM] = booking.startTime.split(":").map(Number);
  currentApptStart.setHours(curH, curM, 0, 0);

  // Check Rescheduling Cutoff Rule unless admin
  if (!isAdmin) {
    const cutoffHours = settings.reschedulingCutoffHours || 24;
    const cutoffMs = cutoffHours * 60 * 60 * 1000;
    if (currentApptStart.getTime() - now.getTime() < cutoffMs) {
      const e = new Error(
        `Appointments cannot be rescheduled less than ${cutoffHours} hours in advance. Please call the clinic.`
      );
      e.statusCode = 409; throw e;
    }
  }

  const newApptDate = normalizeToDateOnly(newAppointmentDate);
  const newEndTime  = addMinutes(newStartTime, booking.duration);

  // Verify new date isn't past minimum notice
  const [newH, newM] = newStartTime.split(":").map(Number);
  const newFullStart = new Date(newApptDate);
  newFullStart.setHours(newH, newM, 0, 0);

  const minNoticeMs = (settings.minimumBookingNoticeHours || 0) * 60 * 60 * 1000;
  if (newFullStart.getTime() - now.getTime() < minNoticeMs) {
    const e = new Error(
      `New appointment time must be at least ${settings.minimumBookingNoticeHours} hour(s) in advance.`
    );
    e.statusCode = 400; throw e;
  }

  // Check working hours on new day
  const dayOfWeek = newApptDate.getDay();
  const slots = await Availability.find({
    therapist:   booking.therapist._id || booking.therapist,
    dayOfWeek:   dayOfWeek,
    isAvailable: true,
  }).lean();

  if (slots.length === 0) {
    const e = new Error("Therapist is not available on the selected date");
    e.statusCode = 409; throw e;
  }

  const startMin = toMinutes(newStartTime);
  const endMin   = toMinutes(newEndTime);

  const withinSlot = slots.some(slot => {
    const slotStart = toMinutes(slot.startTime);
    const slotEnd   = toMinutes(slot.endTime);
    return startMin >= slotStart && endMin <= slotEnd;
  });

  if (!withinSlot) {
    const e = new Error("Requested time is outside therapist working hours");
    e.statusCode = 409; throw e;
  }

  // Check conflicts (excluding this booking itself)
  const bufferMinutes = settings.bufferTimeMinutes || 0;
  const conflicts = await checkOverlappingBookings(
    booking.therapist._id || booking.therapist,
    newApptDate,
    newStartTime,
    newEndTime,
    booking._id,
    null,
    bufferMinutes
  );

  if (conflicts.length > 0) {
    const c = conflicts[0];
    const e = new Error(`New time slot is already booked (${c.startTime}–${c.endTime})`);
    e.statusCode = 409; throw e;
  }

  // Snapshot previous appointment details
  const previousDetails = {
    appointmentDate: booking.appointmentDate,
    startTime:       booking.startTime,
    endTime:         booking.endTime,
  };

  booking.rescheduledFrom = previousDetails;
  booking.appointmentDate = newApptDate;
  booking.startTime       = newStartTime;
  booking.endTime         = newEndTime;
  booking.rescheduledAt   = new Date();
  booking.rescheduleCount = (booking.rescheduleCount || 0) + 1;

  await booking.save();

  const populatedBooking = await mongoose.model("Booking").findById(booking._id)
    .populate("customer", "firstName lastName email phone")
    .populate("service", "name slug duration price category")
    .populate("therapist", "bio specializations isActive")
    .populate({ path: "therapist", populate: { path: "user", select: "firstName lastName email" } });

  // Notifications & Calendar Update
  if (settings.emailNotificationsEnabled !== false) {
    try {
      await notificationService.notifyBookingRescheduled(populatedBooking, previousDetails);
    } catch (err) {
      console.error("[BookingService] Reschedule notification failed:", err.message);
    }
  }

  if (settings.calendarSyncEnabled !== false) {
    try {
      await calendarService.updateCalendarEvent(populatedBooking);
    } catch (err) {
      console.error("[BookingService] Calendar update failed on reschedule:", err.message);
    }
  }

  return populatedBooking;
}

// ─── cancelBooking ────────────────────────────────────────────────────────────
/**
 * Cancel an eligible booking according to business rules.
 */
async function cancelBooking(booking, cancelledById, reason, isAdmin = false) {
  const { isValidTransition } = mongoose.model("Booking");
  const settings = await Setting.getSettings();

  const check = isValidTransition(booking.status, "cancelled", isAdmin);
  if (!check.valid) {
    const e = new Error(check.message); e.statusCode = 409; throw e;
  }

  const now        = new Date();
  const apptStart  = new Date(booking.appointmentDate);
  apptStart.setHours(0, 0, 0, 0);
  const [h, m]     = booking.startTime.split(":").map(Number);
  apptStart.setHours(h, m, 0, 0);

  if (now >= apptStart) {
    const e = new Error("Cannot cancel an appointment that has already started");
    e.statusCode = 409; throw e;
  }

  // Enforce cancellation cutoff window unless admin
  if (!isAdmin) {
    const cutoffHours = settings.cancellationCutoffHours || 24;
    const cutoffMs = cutoffHours * 60 * 60 * 1000;
    if (apptStart.getTime() - now.getTime() < cutoffMs) {
      const e = new Error(
        `Appointments cannot be cancelled online less than ${cutoffHours} hours in advance. Please call the clinic directly.`
      );
      e.statusCode = 409; throw e;
    }
  }

  booking.status             = "cancelled";
  booking.cancelledAt        = new Date();
  booking.cancelledBy        = cancelledById;
  booking.cancellationReason = reason || undefined;
  await booking.save();

  const populatedBooking = await mongoose.model("Booking").findById(booking._id)
    .populate("customer", "firstName lastName email phone")
    .populate("service", "name")
    .populate({ path: "therapist", populate: { path: "user", select: "firstName lastName email" } });

  if (settings.emailNotificationsEnabled !== false) {
    try {
      await notificationService.notifyBookingCancelled(populatedBooking);
    } catch (err) {
      console.error("[BookingService] Cancellation notification failed:", err.message);
    }
  }

  if (settings.calendarSyncEnabled !== false) {
    try {
      await calendarService.deleteCalendarEvent(populatedBooking);
    } catch (err) {
      console.error("[BookingService] Calendar deletion failed:", err.message);
    }
  }

  return populatedBooking;
}

// ─── updateStatus ─────────────────────────────────────────────────────────────
/**
 * Update booking status with transition validation.
 */
async function updateStatus(booking, newStatus, isAdmin = false) {
  const BookingModel = mongoose.model("Booking");
  const settings = await Setting.getSettings();

  const check = BookingModel.isValidTransition(booking.status, newStatus, isAdmin);
  if (!check.valid) {
    const e = new Error(check.message); e.statusCode = 409; throw e;
  }

  booking.status = newStatus;

  if (newStatus === "cancelled") {
    booking.cancelledAt = new Date();
  }
  if (newStatus === "completed") {
    booking.completedAt = new Date();
  }

  await booking.save();

  const populatedBooking = await mongoose.model("Booking").findById(booking._id)
    .populate("customer", "firstName lastName email phone")
    .populate("service", "name")
    .populate({ path: "therapist", populate: { path: "user", select: "firstName lastName email" } });

  if (newStatus === "confirmed" && !populatedBooking.emailSent && settings.emailNotificationsEnabled !== false) {
    try {
      await notificationService.sendBookingConfirmation(populatedBooking);
    } catch (err) {
      console.error("[BookingService] Confirmation notification failed:", err.message);
    }
  }

  if (newStatus === "cancelled") {
    if (settings.emailNotificationsEnabled !== false) {
      try {
        await notificationService.notifyBookingCancelled(populatedBooking);
      } catch (err) {
        console.error("[BookingService] Cancellation notification failed:", err.message);
      }
    }

    if (settings.calendarSyncEnabled !== false) {
      try {
        await calendarService.deleteCalendarEvent(populatedBooking);
      } catch (err) {
        console.error("[BookingService] Calendar deletion failed:", err.message);
      }
    }
  }

  return populatedBooking;
}

module.exports = {
  createBooking,
  getAvailableSlots,
  rescheduleBooking,
  cancelBooking,
  updateStatus,
  checkOverlappingBookings,
  addMinutes,
  timesOverlap,
  timesOverlapWithBuffer,
  normalizeToDateOnly,
  ACTIVE_STATUSES,
};
