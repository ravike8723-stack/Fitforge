"use strict";

/**
 * Availability Routes  —  /api/availability
 *
 * Public:  GET  /api/availability        list (supports ?therapist, ?day, ?available)
 *          GET  /api/availability/:id    single slot
 * Admin:   POST /api/availability        create slot
 *          PUT  /api/availability/:id    update slot
 *          DELETE /api/availability/:id  delete slot
 */

const express = require("express");
const router  = express.Router();

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  listAvailability, getAvailability,
  createAvailability, updateAvailability, deleteAvailability,
} = require("../controllers/availabilityController");

router.get("/",    listAvailability);
router.get("/:id", getAvailability);

router.post(  "/",    protect, authorizeRoles("admin", "therapist"), createAvailability);
router.put(   "/:id", protect, authorizeRoles("admin", "therapist"), updateAvailability);
router.delete("/:id", protect, authorizeRoles("admin", "therapist"), deleteAvailability);

module.exports = router;
