"use strict";

/**
 * Voice Controller (Phase A.4)
 *
 * Handles incoming Twilio voice webhooks, speech interaction turns,
 * human ring timeouts, call status callbacks, admin call logging,
 * and sandbox voice simulation for Shanglian Therapeutic Bodywork.
 */

const mongoose = require("mongoose");
const CallLog = require("../models/CallLog");
const Setting = require("../models/Setting");
const businessHoursRouter = require("../services/voice/businessHoursRouter");
const callSessionService = require("../services/voice/callSessionService");
const twilioVoiceService = require("../services/voice/twilioVoiceService");
const aiReceptionistEngine = require("../services/ai/aiReceptionistEngine");

/**
 * POST /api/voice/inbound
 * Primary Twilio voice webhook.
 */
async function handleInboundCall(req, res, next) {
  try {
    const callSid = req.body.CallSid || `sim_${Date.now()}`;
    const callerPhone = req.body.From || "Unknown";
    const recipientPhone = req.body.To || "";

    const routing = await businessHoursRouter.evaluateCallRouting();
    const session = callSessionService.getOrCreateSession(callSid, {
      callerPhone,
      recipientPhone,
      isAfterHours: routing.isAfterHours,
    });

    // Create or update CallLog record in database
    await CallLog.findOneAndUpdate(
      { callSid },
      {
        callSid,
        callerPhone,
        recipientPhone,
        startTime: new Date(),
        handledBy: routing.mode === "human_first" ? "human" : "ai",
        isAfterHours: routing.isAfterHours,
      },
      { upsert: true, new: true }
    );

    // Return TwiML XML
    res.type("text/xml");

    if (routing.mode === "human_first") {
      const dialTwiML = twilioVoiceService.generateHumanDialTwiML(
        routing.humanPhone,
        routing.ringTimeout,
        "/api/voice/human-status"
      );
      return res.send(dialTwiML);
    }

    // Direct AI Answering
    callSessionService.addTurn(callSid, "assistant", routing.greeting);
    const twiml = twilioVoiceService.generateGatherSpeechTwiML(routing.greeting, {
      voice: routing.voiceName,
    });
    return res.send(twiml);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/voice/human-status
 * Webhook triggered if human staff fails to answer during business hours.
 */
async function handleHumanStatus(req, res, next) {
  try {
    const callSid = req.body.CallSid;
    const dialStatus = req.body.DialCallStatus; // 'no-answer' | 'busy' | 'failed' | 'completed'

    res.type("text/xml");

    // If human completed the call, hang up
    if (dialStatus === "completed") {
      await CallLog.findOneAndUpdate(
        { callSid },
        { handledBy: "human", outcome: "human_answered", endTime: new Date() }
      );
      return res.send(twilioVoiceService.generateHangupTwiML("Thank you for calling. Goodbye."));
    }

    // Otherwise, human didn't answer -> Transition to AI Receptionist
    const settings = await Setting.getSettings();
    const voiceConfig = settings.aiVoiceSettings || {};
    const greeting = `Our front desk is currently assisting another client. My name is ${voiceConfig.receptionistName || "Lin"}, your AI assistant. How may I help you today?`;

    callSessionService.addTurn(callSid, "assistant", greeting);
    await CallLog.findOneAndUpdate({ callSid }, { handledBy: "ai" });

    const twiml = twilioVoiceService.generateGatherSpeechTwiML(greeting, {
      voice: voiceConfig.voiceName || "Polly.Joanna-Neural",
    });
    return res.send(twiml);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/voice/interact
 * Speech recognition gather callback processing caller turns.
 */
async function handleVoiceInteraction(req, res, next) {
  try {
    const callSid = req.body.CallSid || "unknown";
    const userSpeech = req.body.SpeechResult || req.body.Digits || "";
    const session = callSessionService.getOrCreateSession(callSid, {
      callerPhone: req.body.From,
    });

    res.type("text/xml");

    if (!userSpeech) {
      const prompt = "I didn't quite hear that. Could you please repeat how I can help you?";
      callSessionService.addTurn(callSid, "assistant", prompt);
      const twiml = twilioVoiceService.generateGatherSpeechTwiML(prompt);
      return res.send(twiml);
    }

    // Record caller turn
    callSessionService.addTurn(callSid, "user", userSpeech);

    // Process through AI conversation engine
    const aiResult = await aiReceptionistEngine.processCallerTurn(session, userSpeech);
    callSessionService.addTurn(callSid, "assistant", aiResult.responseSpeech);

    const settings = await Setting.getSettings();
    const voiceConfig = settings.aiVoiceSettings || {};
    const voiceName = voiceConfig.voiceName || "Polly.Joanna-Neural";

    // Handle Actions
    if (aiResult.action === "escalate") {
      const escalationPhone = voiceConfig.humanEscalationPhone || settings.phone;
      await CallLog.findOneAndUpdate(
        { callSid },
        {
          handledBy: "escalated",
          outcome: "escalated_to_human",
          escalatedTo: escalationPhone,
          transcript: session.turns,
        }
      );
      const twiml = twilioVoiceService.generateEscalationTwiML(escalationPhone, aiResult.responseSpeech, voiceName);
      return res.send(twiml);
    }

    if (aiResult.action === "hangup") {
      await CallLog.findOneAndUpdate(
        { callSid },
        {
          outcome: "inquiry_answered",
          transcript: session.turns,
          endTime: new Date(),
        }
      );
      callSessionService.endSession(callSid);
      const twiml = twilioVoiceService.generateHangupTwiML(aiResult.responseSpeech, voiceName);
      return res.send(twiml);
    }

    // Default: Continue gathering caller input
    await CallLog.findOneAndUpdate({ callSid }, { transcript: session.turns });
    const twiml = twilioVoiceService.generateGatherSpeechTwiML(aiResult.responseSpeech, { voice: voiceName });
    return res.send(twiml);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/voice/status
 * Call status webhook on termination.
 */
async function handleCallStatus(req, res, next) {
  try {
    const callSid = req.body.CallSid;
    const duration = Number(req.body.CallDuration || 0);

    const session = callSessionService.getSession(callSid);
    const updateData = {
      durationSeconds: duration,
      endTime: new Date(),
    };

    if (session) {
      updateData.transcript = session.turns;
      callSessionService.endSession(callSid);
    }

    await CallLog.findOneAndUpdate({ callSid }, updateData);
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/voice/logs
 * Admin endpoint to list call history and view transcripts.
 */
async function getCallLogs(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.handledBy) filter.handledBy = req.query.handledBy;
    if (req.query.outcome) filter.outcome = req.query.outcome;

    const [logs, total] = await Promise.all([
      CallLog.find(filter)
        .populate("booking", "serviceName appointmentDate startTime status price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CallLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/voice/test-simulate
 * Admin endpoint for interactive sandbox test calls.
 */
async function simulateTestCall(req, res, next) {
  try {
    const { userSpeech, sessionId, callerPhone } = req.body;
    const testSid = sessionId || `sandbox_${Date.now()}`;
    const phone = callerPhone || "+14085551234";

    const session = callSessionService.getOrCreateSession(testSid, {
      callerPhone: phone,
      isSandbox: true,
    });

    if (!userSpeech) {
      const routing = await businessHoursRouter.evaluateCallRouting();
      callSessionService.addTurn(testSid, "assistant", routing.greeting);
      return res.status(200).json({
        success: true,
        sessionId: testSid,
        routing,
        assistantResponse: routing.greeting,
        action: "continue",
        turns: session.turns,
      });
    }

    callSessionService.addTurn(testSid, "user", userSpeech);
    const aiResult = await aiReceptionistEngine.processCallerTurn(session, userSpeech);
    callSessionService.addTurn(testSid, "assistant", aiResult.responseSpeech);

    return res.status(200).json({
      success: true,
      sessionId: testSid,
      assistantResponse: aiResult.responseSpeech,
      action: aiResult.action,
      bookingId: aiResult.bookingId || null,
      turns: session.turns,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleInboundCall,
  handleHumanStatus,
  handleVoiceInteraction,
  handleCallStatus,
  getCallLogs,
  simulateTestCall,
};
