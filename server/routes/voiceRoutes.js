"use strict";

/**
 * Voice Routes (Phase A.4)
 *
 * Public Webhooks:
 *   POST /api/voice/inbound       → Primary Twilio voice entry
 *   POST /api/voice/human-status  → Ring timeout / busy fallback to AI
 *   POST /api/voice/interact      → Speech recognition turn processor
 *   POST /api/voice/status        → Call completion callback
 *
 * Admin Protected:
 *   GET  /api/voice/admin/logs          → Call history & transcripts
 *   POST /api/voice/admin/test-simulate → Sandbox interactive tester
 */

const express = require("express");
const router = express.Router();
const expressUrlencoded = express.urlencoded({ extended: true });

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  handleInboundCall,
  handleHumanStatus,
  handleVoiceInteraction,
  handleCallStatus,
  getCallLogs,
  simulateTestCall,
} = require("../controllers/voiceController");

// ─── Twilio Webhooks (Accepts urlencoded & json) ──────────────────────────────
router.post("/inbound",      expressUrlencoded, handleInboundCall);
router.post("/human-status", expressUrlencoded, handleHumanStatus);
router.post("/interact",     expressUrlencoded, handleVoiceInteraction);
router.post("/status",       expressUrlencoded, handleCallStatus);

// ─── Admin Voice Endpoints ───────────────────────────────────────────────────
router.get( "/admin/logs",          protect, authorizeRoles("admin"), getCallLogs);
router.post("/admin/test-simulate", protect, authorizeRoles("admin"), simulateTestCall);

module.exports = router;
