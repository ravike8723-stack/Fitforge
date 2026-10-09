"use strict";

/**
 * Therapist Controller
 *
 * GET    /api/therapists         → listTherapists   (public)
 * GET    /api/therapists/:id     → getTherapist     (public)
 * POST   /api/therapists         → createTherapist  (admin)
 * PUT    /api/therapists/:id     → updateTherapist  (admin)
 * DELETE /api/therapists/:id     → softDeleteTherapist (admin)
 *
 * Query params for GET /api/therapists:
 *   ?active=true|false
 *   ?specialization=Deep%20Tissue
 */

const mongoose = require("mongoose");
const { validateTherapist } = require("../validators/catalogValidator");

// ─── listTherapists ───────────────────────────────────────────────────────────
async function listTherapists(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    const Therapist = mongoose.model("Therapist");
    const filter    = {};

    // ?active=true|false (default: active only)
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === "true";
    } else {
      filter.isActive = true;
    }

    // ?specialization=<string>
    if (req.query.specialization) {
      filter.specializations = {
        $regex: req.query.specialization,
        $options: "i",
      };
    }

    const therapists = await Therapist.find(filter)
      .populate("user", "firstName lastName email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count:   therapists.length,
      data:    therapists,
    });
  } catch (err) {
    next(err);
  }
}

// ─── getTherapist ─────────────────────────────────────────────────────────────
async function getTherapist(req, res, next) {
  try {
    const Therapist  = mongoose.model("Therapist");
    const therapist  = await Therapist.findById(req.params.id)
      .populate("user", "firstName lastName email phone");

    if (!therapist) {
      return res.status(404).json({ success: false, message: "Therapist not found" });
    }

    return res.status(200).json({ success: true, data: therapist });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Therapist not found" });
    }
    next(err);
  }
}

// ─── createTherapist ──────────────────────────────────────────────────────────
async function createTherapist(req, res, next) {
  try {
    const { user, bio, specializations, yearsOfExperience, profileImage, isActive } = req.body;

    const check = validateTherapist({ user, yearsOfExperience });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const User      = mongoose.model("User");
    const Therapist = mongoose.model("Therapist");

    // Verify User exists
    const userDoc = await User.findById(user);
    if (!userDoc) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Verify User has role "therapist"
    if (userDoc.role !== "therapist") {
      return res.status(400).json({
        success: false,
        message: "User must have role 'therapist' to create a therapist profile",
      });
    }

    // Prevent duplicate profile for the same user
    const existing = await Therapist.findOne({ user });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A therapist profile already exists for this user",
      });
    }

    const therapist = await Therapist.create({
      user,
      bio:               bio                ? bio.trim()         : undefined,
      specializations:   Array.isArray(specializations) ? specializations : [],
      yearsOfExperience: yearsOfExperience !== undefined ? Number(yearsOfExperience) : undefined,
      profileImage:      profileImage       ? profileImage.trim() : undefined,
      isActive:          isActive !== undefined ? Boolean(isActive) : true,
    });

    const populated = await therapist.populate("user", "firstName lastName email phone");

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A therapist profile already exists for this user",
      });
    }
    next(err);
  }
}

// ─── updateTherapist ──────────────────────────────────────────────────────────
async function updateTherapist(req, res, next) {
  try {
    const Therapist = mongoose.model("Therapist");
    const therapist = await Therapist.findById(req.params.id);

    if (!therapist) {
      return res.status(404).json({ success: false, message: "Therapist not found" });
    }

    const { bio, specializations, yearsOfExperience, profileImage, isActive } = req.body;
    // Note: 'user' reference is NOT updatable — you'd need to delete and recreate

    if (yearsOfExperience !== undefined) {
      const y = Number(yearsOfExperience);
      if (isNaN(y) || y < 0) {
        return res.status(400).json({
          success: false,
          message: "Years of experience cannot be negative",
        });
      }
      therapist.yearsOfExperience = y;
    }

    if (bio             !== undefined) therapist.bio             = bio.trim();
    if (specializations !== undefined) therapist.specializations = Array.isArray(specializations) ? specializations : [];
    if (profileImage    !== undefined) therapist.profileImage    = profileImage.trim();
    if (isActive        !== undefined) therapist.isActive        = Boolean(isActive);

    await therapist.save();
    const populated = await therapist.populate("user", "firstName lastName email phone");

    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Therapist not found" });
    }
    next(err);
  }
}

// ─── softDeleteTherapist ──────────────────────────────────────────────────────
async function softDeleteTherapist(req, res, next) {
  try {
    const Therapist = mongoose.model("Therapist");
    const therapist = await Therapist.findById(req.params.id);

    if (!therapist) {
      return res.status(404).json({ success: false, message: "Therapist not found" });
    }

    therapist.isActive = false;
    await therapist.save();

    return res.status(200).json({
      success: true,
      message: "Therapist deactivated. They will no longer be available for bookings.",
      data:    therapist,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Therapist not found" });
    }
    next(err);
  }
}

module.exports = {
  listTherapists, getTherapist, createTherapist, updateTherapist, softDeleteTherapist,
};
