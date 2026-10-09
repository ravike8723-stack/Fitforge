"use strict";

/**
 * Therapist Routes  —  /api/therapists
 *
 * Public:  GET  /api/therapists        list (supports ?active, ?specialization)
 *          GET  /api/therapists/:id    single therapist
 * Admin:   POST /api/therapists        create therapist profile
 *          PUT  /api/therapists/:id    update therapist profile
 *          DELETE /api/therapists/:id  soft delete (isActive=false)
 */

const express = require("express");
const router  = express.Router();

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  listTherapists, getTherapist, createTherapist, updateTherapist, softDeleteTherapist,
} = require("../controllers/therapistController");

router.get("/",    listTherapists);
router.get("/:id", getTherapist);

router.post(  "/",    protect, authorizeRoles("admin"), createTherapist);
router.put(   "/:id", protect, authorizeRoles("admin"), updateTherapist);
router.delete("/:id", protect, authorizeRoles("admin"), softDeleteTherapist);

module.exports = router;
