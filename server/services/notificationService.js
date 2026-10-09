"use strict";

/**
 * Notification Service — Phase A.2
 *
 * Orchestrates email notifications for booking lifecycle events.
 * Implements idempotency to prevent duplicate notifications.
 *
 * IMPORTANT:
 *   Notification failure must NEVER break booking operations.
 *   All functions return success/failure status but never throw errors.
 */

const emailService = require("./emailService");
const { generateBookingConfirmation } = require("../templates/email/bookingConfirmation");
const { generateBookingCancellation } = require("../templates/email/bookingCancellation");
const { generateBookingRescheduled } = require("../templates/email/bookingRescheduled");
const { generateAdminNewBooking } = require("../templates/email/adminNewBooking");
const { generateTherapistBookingNotification } = require("../templates/email/therapistBookingNotif");

// ─── Configuration ────────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_FROM_ADDRESS;
const BUSINESS_NAME = process.env.EMAIL_FROM_NAME || "Shanglian Therapeutic Bodywork";
const BUSINESS_PHONE = process.env.BUSINESS_PHONE || "(408) 123-4567";
const BUSINESS_EMAIL = process.env.EMAIL_FROM_ADDRESS || "info@shanglianbodywork.com";
const BUSINESS_ADDRESS = process.env.BUSINESS_ADDRESS || "Los Gatos, CA";

// ─── Helper: Format Date/Time ─────────────────────────────────────────────────

function formatAppointmentDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAppointmentTime(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

// ─── Send Booking Confirmation (Customer) ─────────────────────────────────────

/**
 * Send booking confirmation email to customer.
 * Implements idempotency via booking.emailSent flag.
 *
 * @param {object} booking  Populated booking document
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendBookingConfirmation(booking) {
  try {
    // Idempotency check
    if (booking.emailSent) {
      console.log(`[NotificationService] Booking ${booking._id} already has confirmation email sent — skipping`);
      return { success: true, skipped: true };
    }

    // Prepare data
    const data = {
      customerName: booking.customer.firstName,
      serviceName: booking.serviceName || booking.service.name,
      therapistName: booking.therapist?.bio ? "your therapist" : "our therapist",
      appointmentDate: formatAppointmentDate(booking.appointmentDate),
      appointmentTime: formatAppointmentTime(booking.startTime),
      duration: booking.duration,
      businessName: BUSINESS_NAME,
      businessPhone: BUSINESS_PHONE,
      businessEmail: BUSINESS_EMAIL,
      businessAddress: BUSINESS_ADDRESS,
      bookingId: booking._id.toString(),
    };

    const { subject, text, html } = generateBookingConfirmation(data);

    // Send email
    const result = await emailService.sendEmail({
      to: booking.customer.email,
      subject,
      text,
      html,
    });

    // Update booking if successful
    if (result.success) {
      booking.emailSent = true;
      booking.emailSentAt = new Date();
      booking.emailError = undefined;
      await booking.save();
      console.log(`[NotificationService] Booking confirmation sent to ${booking.customer.email}`);
    } else {
      // Log failure but don't break booking
      booking.emailError = result.error;
      await booking.save();
      console.error(`[NotificationService] Failed to send confirmation:`, result.error);
    }

    return result;
  } catch (err) {
    console.error(`[NotificationService] Error in sendBookingConfirmation:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Send Admin Notification (New Booking) ────────────────────────────────────

/**
 * Send new booking notification to admin.
 *
 * @param {object} booking  Populated booking document
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendAdminNewBookingNotification(booking) {
  try {
    if (!ADMIN_EMAIL) {
      console.log(`[NotificationService] No admin email configured — skipping admin notification`);
      return { success: true, skipped: true };
    }

    const data = {
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      customerEmail: booking.customer.email,
      customerPhone: booking.customer.phone || "Not provided",
      serviceName: booking.serviceName || booking.service.name,
      therapistName: booking.therapist?.bio ? "Assigned therapist" : "Therapist",
      appointmentDate: formatAppointmentDate(booking.appointmentDate),
      appointmentTime: formatAppointmentTime(booking.startTime),
      duration: booking.duration,
      price: booking.price,
      bookingId: booking._id.toString(),
      customerNotes: booking.customerNotes,
      businessName: BUSINESS_NAME,
    };

    const { subject, text, html } = generateAdminNewBooking(data);

    const result = await emailService.sendEmail({
      to: ADMIN_EMAIL,
      subject,
      text,
      html,
    });

    if (result.success) {
      console.log(`[NotificationService] Admin notification sent for booking ${booking._id}`);
    } else {
      console.error(`[NotificationService] Failed to send admin notification:`, result.error);
    }

    return result;
  } catch (err) {
    console.error(`[NotificationService] Error in sendAdminNewBookingNotification:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Send Therapist Notification ──────────────────────────────────────────────

/**
 * Send booking notification to therapist (if email exists).
 *
 * @param {object} booking  Populated booking document
 * @param {string} action   "new" | "cancelled"
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendTherapistNotification(booking, action = "new") {
  try {
    // Check if therapist has user email
    const therapistEmail = booking.therapist?.user?.email;
    if (!therapistEmail) {
      console.log(`[NotificationService] Therapist has no email — skipping therapist notification`);
      return { success: true, skipped: true };
    }

    const data = {
      therapistName: booking.therapist.user.firstName,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      serviceName: booking.serviceName || booking.service.name,
      appointmentDate: formatAppointmentDate(booking.appointmentDate),
      appointmentTime: formatAppointmentTime(booking.startTime),
      duration: booking.duration,
      bookingId: booking._id.toString(),
      customerNotes: booking.customerNotes,
      businessName: BUSINESS_NAME,
      action,
    };

    const { subject, text, html } = generateTherapistBookingNotification(data);

    const result = await emailService.sendEmail({
      to: therapistEmail,
      subject,
      text,
      html,
    });

    if (result.success) {
      console.log(`[NotificationService] Therapist notification sent for booking ${booking._id}`);
    } else {
      console.error(`[NotificationService] Failed to send therapist notification:`, result.error);
    }

    return result;
  } catch (err) {
    console.error(`[NotificationService] Error in sendTherapistNotification:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Send Cancellation Email (Customer) ───────────────────────────────────────

/**
 * Send cancellation confirmation email to customer.
 *
 * @param {object} booking  Populated booking document
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendCancellationEmail(booking) {
  try {
    const data = {
      customerName: booking.customer.firstName,
      serviceName: booking.serviceName || booking.service.name,
      appointmentDate: formatAppointmentDate(booking.appointmentDate),
      appointmentTime: formatAppointmentTime(booking.startTime),
      businessName: BUSINESS_NAME,
      businessPhone: BUSINESS_PHONE,
      businessEmail: BUSINESS_EMAIL,
      bookingId: booking._id.toString(),
      cancellationReason: booking.cancellationReason,
    };

    const { subject, text, html } = generateBookingCancellation(data);

    const result = await emailService.sendEmail({
      to: booking.customer.email,
      subject,
      text,
      html,
    });

    if (result.success) {
      console.log(`[NotificationService] Cancellation email sent to ${booking.customer.email}`);
    } else {
      console.error(`[NotificationService] Failed to send cancellation email:`, result.error);
    }

    return result;
  } catch (err) {
    console.error(`[NotificationService] Error in sendCancellationEmail:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Send Rescheduled Email (Customer) ───────────────────────────────────────

/**
 * Send rescheduling confirmation email to customer.
 *
 * @param {object} booking         Populated booking document
 * @param {object} previousDetails { appointmentDate, startTime, endTime }
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendRescheduledEmail(booking, previousDetails = {}) {
  try {
    const data = {
      customerName: booking.customer.firstName,
      serviceName: booking.serviceName || booking.service.name,
      therapistName: booking.therapist?.bio ? "your therapist" : "our therapist",
      oldAppointmentDate: previousDetails.appointmentDate
        ? formatAppointmentDate(previousDetails.appointmentDate)
        : "",
      oldAppointmentTime: previousDetails.startTime
        ? formatAppointmentTime(previousDetails.startTime)
        : "",
      newAppointmentDate: formatAppointmentDate(booking.appointmentDate),
      newAppointmentTime: formatAppointmentTime(booking.startTime),
      duration: booking.duration,
      businessName: BUSINESS_NAME,
      businessPhone: BUSINESS_PHONE,
      businessEmail: BUSINESS_EMAIL,
      businessAddress: BUSINESS_ADDRESS,
      bookingId: booking._id.toString(),
    };

    const { subject, text, html } = generateBookingRescheduled(data);

    const result = await emailService.sendEmail({
      to: booking.customer.email,
      subject,
      text,
      html,
    });

    if (result.success) {
      console.log(`[NotificationService] Rescheduled email sent to ${booking.customer.email}`);
    } else {
      console.error(`[NotificationService] Failed to send rescheduled email:`, result.error);
    }

    return result;
  } catch (err) {
    console.error(`[NotificationService] Error in sendRescheduledEmail:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Orchestration: New Booking Notifications ─────────────────────────────────

/**
 * Send all notifications for a new booking.
 * Called after successful booking creation.
 *
 * @param {object} booking  Populated booking document
 * @returns {Promise<void>}
 */
async function notifyBookingCreated(booking) {
  console.log(`[NotificationService] Sending notifications for new booking ${booking._id}`);

  // Run all notifications in parallel (failures are independent)
  await Promise.all([
    sendBookingConfirmation(booking),
    sendAdminNewBookingNotification(booking),
    sendTherapistNotification(booking, "new"),
  ]);
}

// ─── Orchestration: Booking Cancellation Notifications ────────────────────────

/**
 * Send all notifications for a cancelled booking.
 * Called after successful booking cancellation.
 *
 * @param {object} booking  Populated booking document
 * @returns {Promise<void>}
 */
async function notifyBookingCancelled(booking) {
  console.log(`[NotificationService] Sending cancellation notifications for booking ${booking._id}`);

  // Run all notifications in parallel
  await Promise.all([
    sendCancellationEmail(booking),
    sendTherapistNotification(booking, "cancelled"),
  ]);
}

// ─── Orchestration: Booking Rescheduled Notifications ─────────────────────────

/**
 * Send all notifications for a rescheduled booking.
 * Called after successful booking rescheduling.
 *
 * @param {object} booking         Populated booking document
 * @param {object} previousDetails { appointmentDate, startTime, endTime }
 * @returns {Promise<void>}
 */
async function notifyBookingRescheduled(booking, previousDetails = {}) {
  console.log(`[NotificationService] Sending rescheduling notifications for booking ${booking._id}`);

  await Promise.all([
    sendRescheduledEmail(booking, previousDetails),
    sendTherapistNotification(booking, "new"),
  ]);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  notifyBookingCreated,
  notifyBookingCancelled,
  notifyBookingRescheduled,
  sendBookingConfirmation,
  sendCancellationEmail,
  sendRescheduledEmail,
  sendAdminNewBookingNotification,
  sendTherapistNotification,
};

