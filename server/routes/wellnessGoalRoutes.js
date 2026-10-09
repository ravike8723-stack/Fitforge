"use strict";

/**
 * Wellness Goal Routes  —  /api/goals
 *
 * Public:   GET  /api/goals        list all goals
 *           GET  /api/goals/:id    get single goal
 * Admin:    POST /api/goals        create goal
 *           PUT  /api/goals/:id    update goal
 *           DELETE /api/goals/:id  delete goal
 */

const express = require("express");
const router  = express.Router();

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  listGoals, getGoal, createGoal, updateGoal, deleteGoal,
} = require("../controllers/wellnessGoalController");

router.get("/",    listGoals);
router.get("/:id", getGoal);

router.post(  "/",    protect, authorizeRoles("admin"), createGoal);
router.put(   "/:id", protect, authorizeRoles("admin"), updateGoal);
router.delete("/:id", protect, authorizeRoles("admin"), deleteGoal);

module.exports = router;
