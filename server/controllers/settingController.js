"use strict";

/**
 * Setting Controller
 *
 * Public:
 *   GET /api/settings/public  — returns business information & booking policies
 *
 * Admin:
 *   GET /api/admin/settings   — returns full system configuration & business rules
 *   PUT /api/admin/settings   — updates settings
 */

const Setting = require("../models/Setting");

/**
 * GET /api/settings/public
 * Returns public-facing business info and rules (for booking wizard & site header/footer).
 */
async function getPublicSettings(req, res, next) {
  try {
    const settings = await Setting.getSettings();

    const publicData = {
      businessName: settings.businessName,
      tagline: settings.tagline,
      description: settings.description,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      address: settings.address,
      timezone: settings.timezone,
      hoursDescription: settings.hoursDescription,
      socialLinks: settings.socialLinks,
      bookingPolicy: settings.bookingPolicy,
      cancellationPolicy: settings.cancellationPolicy,
      minimumBookingNoticeHours: settings.minimumBookingNoticeHours,
      maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
      cancellationCutoffHours: settings.cancellationCutoffHours,
      reschedulingCutoffHours: settings.reschedulingCutoffHours,
      bufferTimeMinutes: settings.bufferTimeMinutes,
      onlineBookingEnabled: settings.onlineBookingEnabled,
    };

    return res.status(200).json({
      success: true,
      data: publicData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/settings
 * Returns complete settings for administrative management.
 */
async function getAdminSettings(req, res, next) {
  try {
    const settings = await Setting.getSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/settings
 * Updates business settings and rules.
 */
async function updateAdminSettings(req, res, next) {
  try {
    const updateData = req.body;

    // Validate numeric fields if provided
    const numericFields = [
      "minimumBookingNoticeHours",
      "maxAdvanceBookingDays",
      "cancellationCutoffHours",
      "reschedulingCutoffHours",
      "bufferTimeMinutes",
    ];

    for (const field of numericFields) {
      if (updateData[field] !== undefined) {
        const val = Number(updateData[field]);
        if (isNaN(val) || val < 0) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a non-negative number`,
          });
        }
        updateData[field] = val;
      }
    }

    const updated = await Setting.updateSettings(updateData);

    return res.status(200).json({
      success: true,
      message: "Business settings updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
};
