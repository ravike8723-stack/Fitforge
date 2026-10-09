"use strict";

/**
 * Calendar Service — Phase A.2
 *
 * Integrates with Zoho Calendar API for appointment synchronization.
 * Handles OAuth token refresh, event CRUD operations, and failure recovery.
 *
 * IMPORTANT:
 *   Calendar failure must NEVER break booking operations.
 *   All functions return success/failure status but never throw errors.
 *
 * Configuration:
 *   All credentials from environment variables.
 *   If CALENDAR_ENABLED=false, all operations return success without API calls.
 */

const axios = require("axios");

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  enabled: process.env.CALENDAR_ENABLED === "true",
  clientId: process.env.ZOHO_CALENDAR_CLIENT_ID,
  clientSecret: process.env.ZOHO_CALENDAR_CLIENT_SECRET,
  refreshToken: process.env.ZOHO_CALENDAR_REFRESH_TOKEN,
  calendarId: process.env.ZOHO_CALENDAR_ID || "primary",
  zohoApiBase: "https://calendar.zoho.com/api/v1",
  zohoAuthBase: "https://accounts.zoho.com/oauth/v2/token",
};

// In-memory access token cache (refreshed as needed)
let accessToken = null;
let tokenExpiry = null;

// ─── OAuth: Refresh Access Token ──────────────────────────────────────────────

/**
 * Refresh the Zoho OAuth access token using refresh token.
 *
 * @returns {Promise<{success: boolean, accessToken?: string, error?: string}>}
 */
async function refreshAccessToken() {
  try {
    if (!CONFIG.clientId || !CONFIG.clientSecret || !CONFIG.refreshToken) {
      const error = "Missing Zoho Calendar OAuth credentials";
      console.error(`[CalendarService] ${error}`);
      return { success: false, error };
    }

    const params = new URLSearchParams({
      refresh_token: CONFIG.refreshToken,
      client_id: CONFIG.clientId,
      client_secret: CONFIG.clientSecret,
      grant_type: "refresh_token",
    });

    const response = await axios.post(CONFIG.zohoAuthBase, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    accessToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 3600; // default 1 hour
    tokenExpiry = Date.now() + expiresIn * 1000;

    console.log(`[CalendarService] Access token refreshed (expires in ${expiresIn}s)`);
    return { success: true, accessToken };
  } catch (err) {
    console.error(`[CalendarService] Failed to refresh access token:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Get Valid Access Token ───────────────────────────────────────────────────

/**
 * Get a valid access token, refreshing if necessary.
 *
 * @returns {Promise<{success: boolean, accessToken?: string, error?: string}>}
 */
async function getAccessToken() {
  // If token exists and not expired, use it
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return { success: true, accessToken };
  }

  // Otherwise refresh
  return await refreshAccessToken();
}

// ─── API Helper ───────────────────────────────────────────────────────────────

/**
 * Make authenticated API request to Zoho Calendar.
 *
 * @param {string} method   HTTP method
 * @param {string} endpoint API endpoint (relative to zohoApiBase)
 * @param {object} [data]   Request body (optional)
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function apiRequest(method, endpoint, data = null) {
  try {
    const tokenResult = await getAccessToken();
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error };
    }

    const url = `${CONFIG.zohoApiBase}${endpoint}`;
    const config = {
      method,
      url,
      headers: {
        Authorization: `Zoho-oauthtoken ${tokenResult.accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (err) {
    const error = err.response?.data?.message || err.message;
    console.error(`[CalendarService] API request failed (${method} ${endpoint}):`, error);
    return { success: false, error };
  }
}

// ─── Create Calendar Event ────────────────────────────────────────────────────

/**
 * Create a calendar event for a booking.
 * Implements idempotency by checking if event ID already exists.
 *
 * @param {object} booking  Populated booking document
 * @returns {Promise<{success: boolean, eventId?: string, error?: string}>}
 */
async function createCalendarEvent(booking) {
  try {
    // Calendar disabled
    if (!CONFIG.enabled) {
      console.log(`[CalendarService] Calendar disabled — skipping event creation`);
      return { success: true, disabled: true };
    }

    // Idempotency check
    if (booking.calendarEventId) {
      console.log(`[CalendarService] Booking ${booking._id} already has calendar event ${booking.calendarEventId}`);
      return { success: true, eventId: booking.calendarEventId, existing: true };
    }

    // Prepare event data
    const startDateTime = combineDateAndTime(booking.appointmentDate, booking.startTime);
    const endDateTime = combineDateAndTime(booking.appointmentDate, booking.endTime);

    const eventData = {
      title: `${booking.serviceName || booking.service.name} — ${booking.customer.firstName} ${booking.customer.lastName}`,
      dateandtime: {
        start: startDateTime,
        end: endDateTime,
        timezone: "America/Los_Angeles", // Adjust based on business timezone
      },
      isallday: false,
      description: buildEventDescription(booking),
      location: process.env.BUSINESS_ADDRESS || "Shanglian Therapeutic Bodywork",
    };

    // Create event via API
    const result = await apiRequest("POST", `/calendars/${CONFIG.calendarId}/events`, eventData);

    if (result.success) {
      const eventId = result.data?.events?.[0]?.uid || result.data?.event?.uid;
      if (!eventId) {
        const error = "Event created but no event ID returned";
        console.error(`[CalendarService] ${error}`);
        booking.calendarSyncStatus = "failed";
        booking.calendarSyncError = error;
        await booking.save();
        return { success: false, error };
      }

      // Update booking with event ID
      booking.calendarEventId = eventId;
      booking.calendarSyncStatus = "synced";
      booking.calendarSyncedAt = new Date();
      booking.calendarSyncError = undefined;
      await booking.save();

      console.log(`[CalendarService] Calendar event created: ${eventId} for booking ${booking._id}`);
      return { success: true, eventId };
    } else {
      // Log failure, don't break booking
      booking.calendarSyncStatus = "failed";
      booking.calendarSyncError = result.error;
      await booking.save();
      return result;
    }
  } catch (err) {
    console.error(`[CalendarService] Error in createCalendarEvent:`, err.message);
    booking.calendarSyncStatus = "failed";
    booking.calendarSyncError = err.message;
    await booking.save();
    return { success: false, error: err.message };
  }
}

// ─── Update Calendar Event ────────────────────────────────────────────────────

/**
 * Update an existing calendar event (for rescheduling).
 *
 * @param {object} booking  Populated booking document
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updateCalendarEvent(booking) {
  try {
    if (!CONFIG.enabled) {
      console.log(`[CalendarService] Calendar disabled — skipping event update`);
      return { success: true, disabled: true };
    }

    if (!booking.calendarEventId) {
      console.log(`[CalendarService] No calendar event ID — creating new event instead`);
      return await createCalendarEvent(booking);
    }

    const startDateTime = combineDateAndTime(booking.appointmentDate, booking.startTime);
    const endDateTime = combineDateAndTime(booking.appointmentDate, booking.endTime);

    const eventData = {
      title: `${booking.serviceName || booking.service.name} — ${booking.customer.firstName} ${booking.customer.lastName}`,
      dateandtime: {
        start: startDateTime,
        end: endDateTime,
        timezone: "America/Los_Angeles",
      },
      description: buildEventDescription(booking),
    };

    const result = await apiRequest(
      "PUT",
      `/calendars/${CONFIG.calendarId}/events/${booking.calendarEventId}`,
      eventData
    );

    if (result.success) {
      booking.calendarSyncStatus = "synced";
      booking.calendarSyncedAt = new Date();
      booking.calendarSyncError = undefined;
      await booking.save();
      console.log(`[CalendarService] Calendar event updated: ${booking.calendarEventId}`);
    } else {
      booking.calendarSyncStatus = "failed";
      booking.calendarSyncError = result.error;
      await booking.save();
    }

    return result;
  } catch (err) {
    console.error(`[CalendarService] Error in updateCalendarEvent:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Delete Calendar Event ────────────────────────────────────────────────────

/**
 * Delete a calendar event (for cancellation).
 *
 * @param {object} booking  Booking document
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteCalendarEvent(booking) {
  try {
    if (!CONFIG.enabled) {
      console.log(`[CalendarService] Calendar disabled — skipping event deletion`);
      return { success: true, disabled: true };
    }

    if (!booking.calendarEventId) {
      console.log(`[CalendarService] No calendar event ID — nothing to delete`);
      return { success: true, noEvent: true };
    }

    const result = await apiRequest(
      "DELETE",
      `/calendars/${CONFIG.calendarId}/events/${booking.calendarEventId}`
    );

    if (result.success) {
      console.log(`[CalendarService] Calendar event deleted: ${booking.calendarEventId}`);
    } else {
      // Log but don't fail — event may already be deleted or calendar inaccessible
      console.error(`[CalendarService] Failed to delete event ${booking.calendarEventId}:`, result.error);
    }

    return result;
  } catch (err) {
    console.error(`[CalendarService] Error in deleteCalendarEvent:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Helper: Combine Date and Time ────────────────────────────────────────────

/**
 * Combine appointment date (Date object) and time (HH:mm string) into ISO string.
 *
 * @param {Date}   date  Appointment date (midnight UTC)
 * @param {string} time  Time in HH:mm format
 * @returns {string}     ISO 8601 datetime string
 */
function combineDateAndTime(date, time) {
  const d = new Date(date);
  const [hours, minutes] = time.split(":").map(Number);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

// ─── Helper: Build Event Description ──────────────────────────────────────────

/**
 * Build event description from booking data.
 *
 * @param {object} booking  Booking document
 * @returns {string}        Event description
 */
function buildEventDescription(booking) {
  let description = `Customer: ${booking.customer.firstName} ${booking.customer.lastName}\n`;
  description += `Service: ${booking.serviceName || booking.service.name}\n`;
  description += `Duration: ${booking.duration} minutes\n`;
  description += `Price: $${booking.price.toFixed(2)}\n`;

  if (booking.customer.phone) {
    description += `Phone: ${booking.customer.phone}\n`;
  }

  if (booking.customer.email) {
    description += `Email: ${booking.customer.email}\n`;
  }

  if (booking.customerNotes) {
    description += `\nNotes: ${booking.customerNotes}`;
  }

  description += `\n\nBooking ID: ${booking._id}`;

  return description;
}

// ─── Verify Calendar Connection ───────────────────────────────────────────────

/**
 * Verify calendar API connection.
 * Useful for health checks and setup verification.
 *
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function verifyConnection() {
  if (!CONFIG.enabled) {
    return { success: true, message: "Calendar disabled" };
  }

  try {
    const result = await apiRequest("GET", `/calendars/${CONFIG.calendarId}`);
    if (result.success) {
      console.log("[CalendarService] Calendar connection verified");
    }
    return result;
  } catch (err) {
    console.error("[CalendarService] Calendar verification failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  verifyConnection,
  isEnabled: () => CONFIG.enabled,
};

