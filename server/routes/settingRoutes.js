"use strict";

/**
 * Setting Routes
 *
 * Public:  GET /api/settings/public
 * Admin:   GET /api/admin/settings
 *          PUT /api/admin/settings
 */

const express = require("express");
const router  = express.Router();

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
} = require("../controllers/settingController");

// Public settings route
router.get("/public", getPublicSettings);

// Admin router exported for mounting at /api/admin/settings
const adminRouter = express.Router();
adminRouter.get("/", protect, authorizeRoles("admin"), getAdminSettings);
adminRouter.put("/", protect, authorizeRoles("admin"), updateAdminSettings);

module.exports = router;
module.exports.adminSettingRouter = adminRouter;
