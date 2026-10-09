"use strict";

/**
 * Service Controller
 *
 * GET    /api/services          → listServices   (public)
 * GET    /api/services/:id      → getService     (public)
 * POST   /api/services          → createService  (admin)
 * PUT    /api/services/:id      → updateService  (admin)
 * DELETE /api/services/:id      → softDeleteService (admin — sets isActive=false)
 *
 * Query params for GET /api/services:
 *   ?category=massage
 *   ?goal=<wellnessGoalId>
 *   ?active=true|false
 *   ?search=<text>          (searches name + shortDescription)
 *   ?sort=displayOrder|price|name  (default: displayOrder)
 */

const mongoose = require("mongoose");
const { validateService, isValidObjectId } = require("../validators/catalogValidator");

// ─── listServices ─────────────────────────────────────────────────────────────
async function listServices(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    const Service = mongoose.model("Service");
    const filter  = {};

    // ?active=true|false  (default: show only active)
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === "true";
    } else {
      filter.isActive = true;   // public list defaults to active only
    }

    // ?category=<string>
    if (req.query.category) {
      filter.category = { $regex: req.query.category, $options: "i" };
    }

    // ?goal=<objectId>
    if (req.query.goal) {
      if (!isValidObjectId(req.query.goal)) {
        return res.status(400).json({ success: false, message: "Invalid goal ID" });
      }
      filter.wellnessGoals = req.query.goal;
    }

    // ?search=<text>
    if (req.query.search) {
      const rx = { $regex: req.query.search, $options: "i" };
      filter.$or = [{ name: rx }, { shortDescription: rx }, { description: rx }];
    }

    // ?sort=displayOrder|price|name
    const SORT_MAP = {
      displayOrder: { displayOrder: 1 },
      price:        { price: 1 },
      name:         { name: 1 },
    };
    const sort = SORT_MAP[req.query.sort] || { displayOrder: 1 };

    const services = await Service.find(filter)
      .populate("wellnessGoals", "name slug")
      .sort(sort);

    return res.status(200).json({
      success: true,
      count:   services.length,
      data:    services,
    });
  } catch (err) {
    next(err);
  }
}

// ─── getService ───────────────────────────────────────────────────────────────
async function getService(req, res, next) {
  try {
    const Service = mongoose.model("Service");
    const service = await Service.findById(req.params.id)
      .populate("wellnessGoals", "name slug description");

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({ success: true, data: service });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    next(err);
  }
}

// ─── createService ────────────────────────────────────────────────────────────
async function createService(req, res, next) {
  try {
    const {
      name, slug, description, shortDescription,
      duration, price, category, wellnessGoals,
      isActive, displayOrder,
    } = req.body;

    const check = validateService({ name, slug, duration, price, wellnessGoals, displayOrder });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const Service      = mongoose.model("Service");
    const WellnessGoal = mongoose.model("WellnessGoal");
    const normSlug     = slug.trim().toLowerCase();

    // Duplicate slug check
    const exists = await Service.findOne({ slug: normSlug });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "A service with this slug already exists",
      });
    }

    // Verify all referenced wellness goals exist
    if (wellnessGoals && wellnessGoals.length > 0) {
      const found = await WellnessGoal.countDocuments({
        _id: { $in: wellnessGoals },
      });
      if (found !== wellnessGoals.length) {
        return res.status(400).json({
          success: false,
          message: "One or more wellness goal IDs do not exist",
        });
      }
    }

    const service = await Service.create({
      name:             name.trim(),
      slug:             normSlug,
      description:      description      ? description.trim()      : undefined,
      shortDescription: shortDescription ? shortDescription.trim() : undefined,
      duration:         Number(duration),
      price:            Number(price),
      category:         category ? category.trim() : undefined,
      wellnessGoals:    wellnessGoals || [],
      isActive:         isActive !== undefined ? Boolean(isActive) : true,
      displayOrder:     displayOrder !== undefined ? Number(displayOrder) : 0,
    });

    const populated = await service.populate("wellnessGoals", "name slug");

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A service with this slug already exists",
      });
    }
    next(err);
  }
}

// ─── updateService ────────────────────────────────────────────────────────────
async function updateService(req, res, next) {
  try {
    const Service = mongoose.model("Service");
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const {
      name, slug, description, shortDescription,
      duration, price, category, wellnessGoals,
      isActive, displayOrder,
    } = req.body;

    // Validate only provided fields merged with existing
    const newName     = name     !== undefined ? name     : service.name;
    const newSlug     = slug     !== undefined ? slug     : service.slug;
    const newDuration = duration !== undefined ? duration : service.duration;
    const newPrice    = price    !== undefined ? price    : service.price;
    const newGoals    = wellnessGoals !== undefined ? wellnessGoals : undefined;
    const newOrder    = displayOrder  !== undefined ? displayOrder  : service.displayOrder;

    const check = validateService({
      name: newName, slug: newSlug,
      duration: newDuration, price: newPrice,
      wellnessGoals: newGoals,
      displayOrder: newOrder,
    });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    // Slug duplicate check (exclude current doc)
    if (slug !== undefined) {
      const normSlug = slug.trim().toLowerCase();
      const conflict = await Service.findOne({ _id: { $ne: service._id }, slug: normSlug });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: "Another service with this slug already exists",
        });
      }
      service.slug = normSlug;
    }

    // Verify wellness goals exist
    if (wellnessGoals !== undefined && wellnessGoals.length > 0) {
      const WellnessGoal = mongoose.model("WellnessGoal");
      const found = await WellnessGoal.countDocuments({ _id: { $in: wellnessGoals } });
      if (found !== wellnessGoals.length) {
        return res.status(400).json({
          success: false,
          message: "One or more wellness goal IDs do not exist",
        });
      }
      service.wellnessGoals = wellnessGoals;
    }

    if (name             !== undefined) service.name             = name.trim();
    if (description      !== undefined) service.description      = description.trim();
    if (shortDescription !== undefined) service.shortDescription = shortDescription.trim();
    if (duration         !== undefined) service.duration         = Number(duration);
    if (price            !== undefined) service.price            = Number(price);
    if (category         !== undefined) service.category         = category.trim();
    if (isActive         !== undefined) service.isActive         = Boolean(isActive);
    if (displayOrder     !== undefined) service.displayOrder     = Number(displayOrder);

    await service.save();
    const populated = await service.populate("wellnessGoals", "name slug");

    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another service with this slug already exists",
      });
    }
    next(err);
  }
}

// ─── softDeleteService ────────────────────────────────────────────────────────
// Soft delete: sets isActive = false to preserve booking history integrity
async function softDeleteService(req, res, next) {
  try {
    const Service = mongoose.model("Service");
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    service.isActive = false;
    await service.save();

    return res.status(200).json({
      success: true,
      message: "Service deactivated (soft delete). It will no longer appear in active listings.",
      data:    service,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    next(err);
  }
}

module.exports = { listServices, getService, createService, updateService, softDeleteService };
