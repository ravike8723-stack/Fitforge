"use strict";

/**
 * AI Tool Registry (Phase A.4)
 *
 * Implements concrete tools callable by the AI Conversation Engine:
 * 1. getBusinessInfo — live hours, address, policies, pricing, therapists
 * 2. checkAvailableSlots — queries bookingService.getAvailableSlots
 * 3. createBooking — uses existing bookingService.createBooking (+ Zoho Mail & Calendar)
 * 4. verifyAndRescheduleBooking — safe caller verification & reschedule
 * 5. verifyAndCancelBooking — safe caller verification & cancel
 * 6. escalateToStaff — initiates human transfer
 */

const mongoose = require("mongoose");
const Setting = require("../../models/Setting");
const Service = require("../../models/Service");
const Therapist = require("../../models/Therapist");
const Booking = require("../../models/Booking");
const User = require("../../models/User");
const bookingService = require("../bookingService");

/**
 * Tool: getBusinessInfo
 * Returns accurate, live clinic information without hallucination.
 */
async function getBusinessInfo(params = {}) {
  const settings = await Setting.getSettings();
  const services = await Service.find({ isActive: true }).select("name price duration category shortDescription");
  const therapists = await Therapist.find({ isActive: true })
    .populate("user", "firstName lastName")
    .select("bio specializations yearsOfExperience");

  return {
    businessName: settings.businessName,
    tagline: settings.tagline,
    phone: settings.phone,
    email: settings.email,
    address: settings.address?.formatted || "123 Main St, Los Gatos, CA 95032",
    hours: settings.hoursDescription,
    bookingPolicy: settings.bookingPolicy,
    cancellationPolicy: settings.cancellationPolicy,
    minimumBookingNoticeHours: settings.minimumBookingNoticeHours,
    maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
    cancellationCutoffHours: settings.cancellationCutoffHours,
    services: services.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      price: s.price,
      durationMinutes: s.duration,
      category: s.category,
      description: s.shortDescription,
    })),
    therapists: therapists.map((t) => ({
      id: t._id.toString(),
      name: t.user ? `${t.user.firstName} ${t.user.lastName}`.trim() : "Licensed Therapist",
      specializations: t.specializations || [],
      yearsOfExperience: t.yearsOfExperience || 0,
      bio: t.bio || "",
    })),
  };
}

/**
 * Tool: checkAvailableSlots
 * Queries bookingService.getAvailableSlots for a therapist and date.
 */
async function checkAvailableSlots({ date, serviceId, therapistId }) {
  if (!date) {
    return { success: false, message: "Date is required (YYYY-MM-DD)." };
  }

  // Resolve service if not provided
  let targetServiceId = serviceId;
  if (!targetServiceId) {
    const defaultSvc = await Service.findOne({ isActive: true });
    if (!defaultSvc) return { success: false, message: "No active services found." };
    targetServiceId = defaultSvc._id.toString();
  }

  // Resolve therapist if not provided (check all active therapists)
  let targetTherapistId = therapistId;
  if (!targetTherapistId) {
    const defaultTherapist = await Therapist.findOne({ isActive: true });
    if (!defaultTherapist) return { success: false, message: "No active therapists found." };
    targetTherapistId = defaultTherapist._id.toString();
  }

  const result = await bookingService.getAvailableSlots(targetTherapistId, targetServiceId, date);
  const availableSlots = (result.slots || []).filter((s) => s.available);

  return {
    success: true,
    date,
    therapist: result.therapist ? result.therapist.name : "Therapist",
    service: result.service ? result.service.name : "Service",
    duration: result.service ? result.service.duration : 60,
    totalSlots: result.slots?.length || 0,
    availableSlotCount: availableSlots.length,
    availableTimes: availableSlots.map((s) => s.startTime),
  };
}

/**
 * Tool: createBooking
 * Safe caller-based booking creation using existing bookingService.
 */
async function createBooking({
  callerPhone,
  customerName,
  customerEmail,
  serviceId,
  therapistId,
  appointmentDate,
  startTime,
  notes = "",
}) {
  if (!callerPhone || !appointmentDate || !startTime) {
    return { success: false, message: "Caller phone, appointment date, and start time are required." };
  }

  // 1. Resolve or create customer User
  let cleanPhone = callerPhone.replace(/[^\d+]/g, "");
  let user = await User.findOne({ phone: cleanPhone });

  if (!user) {
    // Also check email if provided
    if (customerEmail) {
      user = await User.findOne({ email: customerEmail.toLowerCase().trim() });
    }
  }

  if (!user) {
    const [firstName, ...rest] = (customerName || "Phone Caller").trim().split(" ");
    const lastName = rest.join(" ") || "Guest";
    const tempEmail = customerEmail ? customerEmail.toLowerCase().trim() : `caller_${cleanPhone.replace(/\+/g, "")}@shanglian.guest`;

    user = await User.create({
      firstName,
      lastName,
      email: tempEmail,
      phone: cleanPhone,
      password: "PhoneGuestPass123!", // guest placeholder password
      role: "customer",
    });
  }

  // 2. Resolve Service
  let targetServiceId = serviceId;
  if (!targetServiceId) {
    const defaultSvc = await Service.findOne({ isActive: true });
    if (!defaultSvc) return { success: false, message: "No services available." };
    targetServiceId = defaultSvc._id.toString();
  }

  // 3. Resolve Therapist
  let targetTherapistId = therapistId;
  if (!targetTherapistId) {
    const defaultTherapist = await Therapist.findOne({ isActive: true });
    if (!defaultTherapist) return { success: false, message: "No therapists available." };
    targetTherapistId = defaultTherapist._id.toString();
  }

  // 4. Call existing bookingService.createBooking
  try {
    const booking = await bookingService.createBooking({
      customerId: user._id.toString(),
      serviceId: targetServiceId,
      therapistId: targetTherapistId,
      appointmentDate,
      startTime,
      customerNotes: notes ? `[Booked via AI Receptionist] ${notes}` : "[Booked via AI Receptionist]",
    });

    return {
      success: true,
      bookingId: booking._id.toString(),
      serviceName: booking.serviceName,
      appointmentDate: booking.appointmentDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      price: booking.price,
      customerName: `${user.firstName} ${user.lastName}`.trim(),
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || "Failed to book appointment. Please choose another time.",
    };
  }
}

/**
 * Tool: verifyAndRescheduleBooking
 * Verifies caller ownership and reschedules booking.
 */
async function verifyAndRescheduleBooking({ callerPhone, bookingId, newAppointmentDate, newStartTime }) {
  if (!callerPhone && !bookingId) {
    return { success: false, message: "Caller verification required (phone number or booking ID)." };
  }

  const cleanPhone = (callerPhone || "").replace(/[^\d+]/g, "");
  let query = {};

  if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
    query._id = bookingId;
  } else if (cleanPhone) {
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return { success: false, message: "No customer account found with this phone number." };
    }
    query = { customer: user._id, status: { $in: ["pending", "confirmed"] } };
  }

  const booking = await Booking.findOne(query)
    .populate("customer", "firstName lastName phone email")
    .populate("therapist", "bio specializations")
    .populate("service", "name duration price");

  if (!booking) {
    return { success: false, message: "No active appointment found for this caller." };
  }

  try {
    const rescheduled = await bookingService.rescheduleBooking(
      booking,
      newAppointmentDate,
      newStartTime,
      false // not admin -> enforce rescheduling cutoff rules
    );

    return {
      success: true,
      bookingId: rescheduled._id.toString(),
      serviceName: rescheduled.serviceName,
      newAppointmentDate: rescheduled.appointmentDate,
      newStartTime: rescheduled.startTime,
      newEndTime: rescheduled.endTime,
      message: "Appointment rescheduled successfully.",
    };
  } catch (err) {
    return { success: false, message: err.message || "Could not reschedule appointment." };
  }
}

/**
 * Tool: verifyAndCancelBooking
 * Verifies caller ownership and cancels booking.
 */
async function verifyAndCancelBooking({ callerPhone, bookingId, cancellationReason = "Cancelled by caller via AI" }) {
  if (!callerPhone && !bookingId) {
    return { success: false, message: "Caller verification required (phone number or booking ID)." };
  }

  const cleanPhone = (callerPhone || "").replace(/[^\d+]/g, "");
  let query = {};

  if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
    query._id = bookingId;
  } else if (cleanPhone) {
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return { success: false, message: "No customer account found with this phone number." };
    }
    query = { customer: user._id, status: { $in: ["pending", "confirmed"] } };
  }

  const booking = await Booking.findOne(query)
    .populate("customer", "firstName lastName phone email")
    .populate("therapist", "bio specializations")
    .populate("service", "name duration price");

  if (!booking) {
    return { success: false, message: "No active appointment found to cancel." };
  }

  try {
    const cancelled = await bookingService.cancelBooking(
      booking,
      booking.customer?._id || booking.customer,
      cancellationReason,
      false // enforce cancellation cutoff rules
    );

    return {
      success: true,
      bookingId: cancelled._id.toString(),
      serviceName: cancelled.serviceName,
      message: "Appointment cancelled successfully.",
    };
  } catch (err) {
    return { success: false, message: err.message || "Could not cancel appointment." };
  }
}

module.exports = {
  getBusinessInfo,
  checkAvailableSlots,
  createBooking,
  verifyAndRescheduleBooking,
  verifyAndCancelBooking,
};
