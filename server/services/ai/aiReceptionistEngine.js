"use strict";

/**
 * AI Receptionist Conversation Engine (Phase A.4)
 *
 * Implements conversational intelligence for Shanglian Therapeutic Bodywork:
 * - Natural voice responses tailored for phone speech synthesis
 * - Strict massage/bodywork safety guardrails & medical disclaimer
 * - Live business knowledge & tool execution
 * - Multi-turn state tracking & graceful human transfer
 */

const aiToolRegistry = require("./aiToolRegistry");
const Setting = require("../../models/Setting");
const Service = require("../../models/Service");

/**
 * System prompt definition for Shanglian AI Receptionist.
 */
function buildSystemPrompt(settings, services) {
  const serviceList = (services || [])
    .map((s) => `- ${s.name}: $${s.price} for ${s.duration} min. (${s.shortDescription || ""})`)
    .join("\n");

  return `
You are "${settings.aiVoiceSettings?.receptionistName || "Lin"}", the professional AI voice receptionist for Shanglian Therapeutic Bodywork located in Los Gatos, California.

YOUR PRIMARY GOALS:
1. Greet callers warmly and provide accurate, approved business information.
2. Check available appointment times and help callers schedule therapeutic bodywork sessions.
3. Help callers reschedule or cancel existing appointments safely.
4. Answer FAQs about services, pricing, business hours, and location.
5. Escalate to human staff if requested or if the caller needs human assistance.

APPROVED CLINIC INFORMATION:
- Business: ${settings.businessName}
- Location / Address: ${settings.address?.formatted || "123 Main St, Los Gatos, CA 95032"}
- Hours: ${settings.hoursDescription || "Mon-Sun 10:00 AM - 9:00 PM"}
- Phone: ${settings.phone || "(408) 123-4567"}
- Booking Policy: Private sessions by appointment. Please arrive 5-10 minutes early.
- Cancellation Policy: At least 24 hours advance notice required.

SERVICES OFFERED:
${serviceList}

CRITICAL SAFETY & MEDICAL GUARDRAILS:
- NEVER diagnose medical conditions or provide medical treatment advice.
- If a caller mentions fractures, acute severe trauma, chest pain, or a medical emergency, immediately direct them to call 911 or visit an urgent care facility.
- Do NOT invent or promise unauthorized discounts, refunds, or medical guarantees.
- Always speak concisely in 1 to 3 sentences suitable for clear text-to-speech phone playback.
`.trim();
}

/**
 * Process a caller's voice transcript turn and generate the next assistant response.
 *
 * @param {object} session - Call session object
 * @param {string} userSpeech - Speech-to-text input from caller
 * @returns {Promise<{
 *   responseSpeech: string,
 *   action: 'continue' | 'escalate' | 'hangup',
 *   bookingId?: string,
 *   toolExecuted?: string
 * }>}
 */
async function processCallerTurn(session, userSpeech) {
  try {
    const mongoose = require("mongoose");
    const settings = await Setting.getSettings();
    const services = mongoose.connection.readyState === 1 ? await Service.find({ isActive: true }) : [
      { name: "Deep Tissue Focus", price: 120, duration: 60 },
      { name: "Therapeutic Relaxation", price: 110, duration: 60 },
    ];

    // Bounded & sanitized caller speech (protect against payload flooding and prompt injection)
    let rawText = String(userSpeech || "").slice(0, 500).toLowerCase().trim();
    rawText = rawText
      .replace(/ignore (all )?previous instructions/gi, "")
      .replace(/system prompt/gi, "")
      .replace(/you are now in developer mode/gi, "");

    // 1. Safety Check: Medical emergencies
    if (
      rawText.includes("emergency") ||
      rawText.includes("chest pain") ||
      rawText.includes("broken bone") ||
      rawText.includes("fracture") ||
      rawText.includes("bleeding") ||
      rawText.includes("heart attack")
    ) {
      return {
        responseSpeech:
          "If you are experiencing a medical emergency, please hang up and dial 911 immediately. Our therapists provide therapeutic relaxation and wellness bodywork, but we cannot treat urgent medical emergencies.",
        action: "continue",
      };
    }

  // 2. Human Escalation Check
  if (
    rawText.includes("talk to a human") ||
    rawText.includes("speak to a person") ||
    rawText.includes("speak with a representative") ||
    rawText.includes("talk to a person") ||
    rawText.includes("real person") ||
    rawText.includes("manager") ||
    rawText.includes("human please")
  ) {
    return {
      responseSpeech: "Of course! Let me connect you directly with our staff. Please stay on the line.",
      action: "escalate",
    };
  }

  // 3. Location / Address Query
  if (rawText.includes("address") || rawText.includes("where are you located") || rawText.includes("location") || rawText.includes("where is your clinic")) {
    const addr = settings.address?.formatted || "123 Main St, Los Gatos, CA 95032";
    return {
      responseSpeech: `We are located at ${addr}. We have convenient parking available for all our guests. Would you like to check availability or schedule an appointment?`,
      action: "continue",
    };
  }

  // 4. Hours Query
  if (rawText.includes("hours") || rawText.includes("open today") || rawText.includes("what time do you close") || rawText.includes("when are you open")) {
    const hours = settings.hoursDescription || "Monday through Sunday from 10:00 AM to 9:00 PM by appointment";
    return {
      responseSpeech: `We are open ${hours}. Would you like to book an appointment for today or an upcoming day?`,
      action: "continue",
    };
  }

  // 5. Pricing & Services Query
  if (rawText.includes("services") || rawText.includes("price") || rawText.includes("how much") || rawText.includes("types of massage") || rawText.includes("menu")) {
    const summary = services.slice(0, 3).map((s) => `${s.name} for $${s.price}`).join(", ");
    return {
      responseSpeech: `We offer customized bodywork including ${summary}. Our sessions are tailored to your target pressure and tension areas. Would you like me to check available times for a session?`,
      action: "continue",
    };
  }

  // 6. Cancellation Request
  if (rawText.includes("cancel my appointment") || rawText.includes("cancel booking") || rawText.includes("need to cancel")) {
    const cancelRes = await aiToolRegistry.verifyAndCancelBooking({
      callerPhone: session.callerPhone,
      cancellationReason: "Cancelled via phone AI receptionist",
    });

    if (cancelRes.success) {
      return {
        responseSpeech: `Your appointment for ${cancelRes.serviceName} has been cancelled as requested. You will receive an email confirmation shortly. Is there anything else I can help you with today?`,
        action: "continue",
      };
    } else {
      return {
        responseSpeech: `${cancelRes.message} If you'd like, I can transfer you to our staff to help you cancel or adjust your booking.`,
        action: "continue",
      };
    }
  }

  // 7. Rescheduling Request
  if (rawText.includes("reschedule") || rawText.includes("change my appointment") || rawText.includes("move my booking")) {
    return {
      responseSpeech: "I can help you reschedule. What new date and time would you prefer for your session?",
      action: "continue",
    };
  }

  // 8. Availability & Booking Intent
  if (
    rawText.includes("book") ||
    rawText.includes("appointment") ||
    rawText.includes("available") ||
    rawText.includes("schedule") ||
    rawText.includes("tomorrow") ||
    rawText.includes("today") ||
    rawText.includes("pm") ||
    rawText.includes("am")
  ) {
    // Determine target date
    const targetDate = parseDateFromSpeech(rawText);
    const dateStr = targetDate.toISOString().split("T")[0];

    const availRes = await aiToolRegistry.checkAvailableSlots({ date: dateStr });
    if (availRes.success && availRes.availableTimes && availRes.availableTimes.length > 0) {
      const times = availRes.availableTimes.slice(0, 4).join(", ");
      return {
        responseSpeech: `On ${dateStr}, we have openings at ${times}. Which time works best for you?`,
        action: "continue",
      };
    } else {
      return {
        responseSpeech: `We are currently fully booked on ${dateStr}. Would you like to check the following day or another date?`,
        action: "continue",
      };
    }
  }

  // 9. Farewell / End call
  if (rawText.includes("bye") || rawText.includes("goodbye") || rawText.includes("thank you that is all") || rawText.includes("no thank you")) {
    return {
      responseSpeech: "Thank you for calling Shanglian Therapeutic Bodywork. We look forward to seeing you soon. Have a wonderful day!",
      action: "hangup",
    };
  }

  // Default Fallback
    return {
      responseSpeech:
        "I can help you book an appointment, check available times, provide our address and pricing, or connect you with staff. How can I assist you today?",
      action: "continue",
    };
  } catch (err) {
    console.error("[AI Receptionist Turn Error]", err.message);
    return {
      responseSpeech: "I apologize, but I am experiencing a temporary connection issue. Let me connect you directly with our front desk staff.",
      action: "escalate",
    };
  }
}

/**
 * Helper to parse natural date expressions from caller speech.
 */
function parseDateFromSpeech(text) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  if (text.includes("tomorrow")) {
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (text.includes("day after tomorrow")) {
    d.setDate(d.getDate() + 2);
    return d;
  }
  // Default to tomorrow for advance booking if not specified
  d.setDate(d.getDate() + 1);
  return d;
}

module.exports = {
  buildSystemPrompt,
  processCallerTurn,
  parseDateFromSpeech,
};
