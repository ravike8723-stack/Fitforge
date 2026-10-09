"use strict";

const express = require("express");
const router  = express.Router();

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { getAdminAnalytics } = require("../controllers/analyticsController");

router.get("/", protect, authorizeRoles("admin"), getAdminAnalytics);

module.exports = router;
