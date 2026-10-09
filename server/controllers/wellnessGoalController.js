"use strict";

/**
 * Wellness Goal Controller
 *
 * GET    /api/goals         → listGoals       (public)
 * GET    /api/goals/:id     → getGoal         (public)
 * POST   /api/goals         → createGoal      (admin)
 * PUT    /api/goals/:id     → updateGoal      (admin)
 * DELETE /api/goals/:id     → deleteGoal      (admin — hard delete; goals have no booking history)
 */

const mongoose = require("mongoose");
const { validateWellnessGoal } = require("../validators/catalogValidator");

// ─── listGoals ────────────────────────────────────────────────────────────────
async function listGoals(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    const WellnessGoal = mongoose.model("WellnessGoal");

    // Optional ?active=true|false filter
    const filter = {};
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === "true";
    }

    const goals = await WellnessGoal.find(filter).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count:   goals.length,
      data:    goals,
    });
  } catch (err) {
    next(err);
  }
}

// ─── getGoal ──────────────────────────────────────────────────────────────────
async function getGoal(req, res, next) {
  try {
    const WellnessGoal = mongoose.model("WellnessGoal");
    const goal = await WellnessGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: "Wellness goal not found" });
    }

    return res.status(200).json({ success: true, data: goal });
  } catch (err) {
    // Invalid ObjectId format → treat as 404
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Wellness goal not found" });
    }
    next(err);
  }
}

// ─── createGoal ───────────────────────────────────────────────────────────────
async function createGoal(req, res, next) {
  try {
    const { name, slug, description, isActive } = req.body;

    const check = validateWellnessGoal({ name, slug });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const WellnessGoal = mongoose.model("WellnessGoal");

    // Duplicate check
    const normSlug = slug.trim().toLowerCase();
    const existing = await WellnessGoal.findOne({
      $or: [
        { name: { $regex: `^${name.trim()}$`, $options: "i" } },
        { slug: normSlug },
      ],
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A wellness goal with this name or slug already exists",
      });
    }

    const goal = await WellnessGoal.create({
      name:        name.trim(),
      slug:        normSlug,
      description: description ? description.trim() : undefined,
      isActive:    isActive !== undefined ? Boolean(isActive) : true,
    });

    return res.status(201).json({ success: true, data: goal });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A wellness goal with this name or slug already exists",
      });
    }
    next(err);
  }
}

// ─── updateGoal ───────────────────────────────────────────────────────────────
async function updateGoal(req, res, next) {
  try {
    const WellnessGoal = mongoose.model("WellnessGoal");
    const goal = await WellnessGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: "Wellness goal not found" });
    }

    const { name, slug, description, isActive } = req.body;

    // Only validate fields being changed
    const newName = name !== undefined ? name : goal.name;
    const newSlug = slug !== undefined ? slug : goal.slug;

    const check = validateWellnessGoal({ name: newName, slug: newSlug });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    // Duplicate check — exclude current doc
    const normSlug = newSlug.trim().toLowerCase();
    const conflict = await WellnessGoal.findOne({
      _id: { $ne: goal._id },
      $or: [
        { name: { $regex: `^${newName.trim()}$`, $options: "i" } },
        { slug: normSlug },
      ],
    });
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: "Another wellness goal with this name or slug already exists",
      });
    }

    if (name        !== undefined) goal.name        = name.trim();
    if (slug        !== undefined) goal.slug        = normSlug;
    if (description !== undefined) goal.description = description.trim();
    if (isActive    !== undefined) goal.isActive    = Boolean(isActive);

    await goal.save();

    return res.status(200).json({ success: true, data: goal });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Wellness goal not found" });
    }
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another wellness goal with this name or slug already exists",
      });
    }
    next(err);
  }
}

// ─── deleteGoal ───────────────────────────────────────────────────────────────
async function deleteGoal(req, res, next) {
  try {
    const WellnessGoal = mongoose.model("WellnessGoal");
    const goal = await WellnessGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: "Wellness goal not found" });
    }

    await goal.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Wellness goal deleted",
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Wellness goal not found" });
    }
    next(err);
  }
}

module.exports = { listGoals, getGoal, createGoal, updateGoal, deleteGoal };
