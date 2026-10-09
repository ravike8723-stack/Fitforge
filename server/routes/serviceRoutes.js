"use strict";

/**
 * Service Routes  —  /api/services
 *
 * Public:  GET  /api/services        list (supports ?category, ?goal, ?active, ?search, ?sort)
 *          GET  /api/services/:id    single service
 * Admin:   POST /api/services        create
 *          PUT  /api/services/:id    update
 *          DELETE /api/services/:id  soft delete (isActive=false)
 */

const express = require("express");
const router  = express.Router();

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  listServices, getService, createService, updateService, softDeleteService,
} = require("../controllers/serviceController");

router.get("/",    listServices);
router.get("/:id", getService);

router.post(  "/",    protect, authorizeRoles("admin"), createService);
router.put(   "/:id", protect, authorizeRoles("admin"), updateService);
router.delete("/:id", protect, authorizeRoles("admin"), softDeleteService);

module.exports = router;
