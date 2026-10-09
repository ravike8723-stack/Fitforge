"use strict";

/**
 * Availability Controller
 *
 * GET    /api/availability            → listAvailability  (public)
 * GET    /api/availability/:id        → getAvailability   (public)
 * POST   /api/availability            → createAvailability (admin)
 * PUT    /api/availability/:id        → updateAvailability (admin)
 * DELETE /api/availability/:id        → deleteAvailability (admin — hard delete; slots have no history)
 *
 * Query params for GET /api/availability:
 *   ?therapist=<id>
 *   ?day=0-6
 *   ?available=true|false
 */

const mongoose = require("mongoose");
const { validateAvailability, isValidObjectId } = require("../validators/catalogValidator");

// ─── Time helpers ─────────────────────────────────────────────────────────────
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// ─── listAvailability ─────────────────────────────────────────────────────────
async function listAvailability(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    const Availability = mongoose.model("Availability");
    const filter       = {};

    // ?therapist=<id>
    if (req.query.therapist) {
      if (!isValidObjectId(req.query.therapist)) {
        return res.status(400).json({ success: false, message: "Invalid therapist ID" });
      }
      filter.therapist = req.query.therapist;
    }

    // ?day=0-6
    if (req.query.day !== undefined) {
      const day = Number(req.query.day);
      if (isNaN(day) || day < 0 || day > 6) {
        return res.status(400).json({
          success: false,
          message: "Day must be 0 (Sun) to 6 (Sat)",
        });
      }
      filter.dayOfWeek = day;
    }

    // ?available=true|false
    if (req.query.available !== undefined) {
      filter.isAvailable = req.query.available === "true";
    }

    const slots = await Availability.find(filter)
      .populate("therapist", "bio specializations isActive")
      .sort({ dayOfWeek: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count:   slots.length,
      data:    slots,
    });
  } catch (err) {
    next(err);
  }
}

// ─── getAvailability ──────────────────────────────────────────────────────────
async function getAvailability(req, res, next) {
  try {
    const Availability = mongoose.model("Availability");
    const slot = await Availability.findById(req.params.id)
      .populate("therapist", "bio specializations isActive");

    if (!slot) {
      return res.status(404).json({ success: false, message: "Availability slot not found" });
    }

    return res.status(200).json({ success: true, data: slot });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Availability slot not found" });
    }
    next(err);
  }
}

// ─── createAvailability ───────────────────────────────────────────────────────
async function createAvailability(req, res, next) {
  try {
    const { therapist, dayOfWeek, startTime, endTime, isAvailable, effectiveFrom, effectiveUntil } = req.body;

    // 1. Validate input
    const check = validateAvailability({ therapist, dayOfWeek, startTime, endTime });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const Therapist    = mongoose.model("Therapist");
    const Availability = mongoose.model("Availability");

    let therapistId = therapist;
    if (req.user && req.user.role === "therapist") {
      const profile = await Therapist.findOne({ user: req.user.id });
      if (!profile) {
        return res.status(403).json({ success: false, message: "Therapist profile not found" });
      }
      therapistId = profile._id.toString();
    }

    // 2. Verify therapist exists
    const therapistDoc = await Therapist.findById(therapistId);
    if (!therapistDoc) {
      return res.status(404).json({ success: false, message: "Therapist not found" });
    }

    // 3. Overlap detection for same therapist + dayOfWeek
    const day         = Number(dayOfWeek);
    const newStart    = toMinutes(startTime.trim());
    const newEnd      = toMinutes(endTime.trim());

    const existingSlots = await Availability.find({
      therapist,
      dayOfWeek: day,
      isAvailable: { $ne: false },
    });

    for (const s of existingSlots) {
      const exStart = toMinutes(s.startTime);
      const exEnd   = toMinutes(s.endTime);
      // Overlap condition: new start < existing end AND new end > existing start
      if (newStart < exEnd && newEnd > exStart) {
        return res.status(409).json({
          success: false,
          message: `Overlaps with existing slot ${s.startTime}–${s.endTime} on day ${day}`,
        });
      }
    }

    // 4. Create
    const slot = await Availability.create({
      therapist,
      dayOfWeek:     day,
      startTime:     startTime.trim(),
      endTime:       endTime.trim(),
      isAvailable:   isAvailable !== undefined ? Boolean(isAvailable) : true,
      effectiveFrom: effectiveFrom  || undefined,
      effectiveUntil:effectiveUntil || undefined,
    });

    const populated = await slot.populate("therapist", "bio specializations isActive");

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
}

// ─── updateAvailability ───────────────────────────────────────────────────────
async function updateAvailability(req, res, next) {
  try {
    const Availability = mongoose.model("Availability");
    const slot = await Availability.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({ success: false, message: "Availability slot not found" });
    }

    if (req.user && req.user.role === "therapist") {
      const Therapist = mongoose.model("Therapist");
      const profile = await Therapist.findOne({ user: req.user.id });
      if (!profile || slot.therapist.toString() !== profile._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    const { dayOfWeek, startTime, endTime, isAvailable, effectiveFrom, effectiveUntil } = req.body;

    // Validate merged values
    const newDay   = dayOfWeek  !== undefined ? dayOfWeek  : slot.dayOfWeek;
    const newStart = startTime  !== undefined ? startTime  : slot.startTime;
    const newEnd   = endTime    !== undefined ? endTime    : slot.endTime;

    const check = validateAvailability({
      therapist: slot.therapist.toString(),
      dayOfWeek: newDay,
      startTime: newStart,
      endTime:   newEnd,
    });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    // Overlap check — exclude current doc
    const startMin = toMinutes(newStart);
    const endMin   = toMinutes(newEnd);
    const others   = await Availability.find({
      _id:         { $ne: slot._id },
      therapist:   slot.therapist,
      dayOfWeek:   Number(newDay),
      isAvailable: { $ne: false },
    });

    for (const s of others) {
      if (startMin < toMinutes(s.endTime) && endMin > toMinutes(s.startTime)) {
        return res.status(409).json({
          success: false,
          message: `Overlaps with existing slot ${s.startTime}–${s.endTime} on day ${newDay}`,
        });
      }
    }

    if (dayOfWeek    !== undefined) slot.dayOfWeek    = Number(dayOfWeek);
    if (startTime    !== undefined) slot.startTime    = startTime.trim();
    if (endTime      !== undefined) slot.endTime      = endTime.trim();
    if (isAvailable  !== undefined) slot.isAvailable  = Boolean(isAvailable);
    if (effectiveFrom   !== undefined) slot.effectiveFrom   = effectiveFrom;
    if (effectiveUntil  !== undefined) slot.effectiveUntil  = effectiveUntil;

    await slot.save();
    const populated = await slot.populate("therapist", "bio specializations isActive");

    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Availability slot not found" });
    }
    next(err);
  }
}

// ─── deleteAvailability ───────────────────────────────────────────────────────
// Hard delete — availability slots have no booking history yet
async function deleteAvailability(req, res, next) {
  try {
    const Availability = mongoose.model("Availability");
    const slot = await Availability.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({ success: false, message: "Availability slot not found" });
    }

    if (req.user && req.user.role === "therapist") {
      const Therapist = mongoose.model("Therapist");
      const profile = await Therapist.findOne({ user: req.user.id });
      if (!profile || slot.therapist.toString() !== profile._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    await slot.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Availability slot deleted",
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Availability slot not found" });
    }
    next(err);
  }
}

module.exports = {
  listAvailability, getAvailability,
  createAvailability, updateAvailability, deleteAvailability,
};
