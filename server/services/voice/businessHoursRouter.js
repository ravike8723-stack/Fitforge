"use strict";

/**
 * Business Hours Routing Engine (Phase A.4)
 *
 * Determines whether an incoming call occurs during clinic operating hours
 * based on the dynamic Setting model and calculates the appropriate routing
 * action (Human-first ringing vs. immediate AI answering).
 */

const Setting = require("../../models/Setting");

/**
 * Helper to get day of week (0=Sun..6=Sat) and HH:mm in a target timezone.
 * Defaults to America/Los_Angeles.
 */
function getLocalTimeComponents(date = new Date(), timeZone = "America/Los_Angeles") {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const dayName = parts.find((p) => p.type === "weekday")?.value;
    let hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);

    // 24-hour normalization (Intl can report 24 as 0 depending on locale)
    if (hour === 24) hour = 0;

    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[dayName] !== undefined ? dayMap[dayName] : date.getDay();
    const timeMinutes = hour * 60 + minute;
    const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    return { dayOfWeek, timeMinutes, timeString };
  } catch (err) {
    // Fallback to local server time if timezone string is invalid
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const minute = date.getMinutes();
    return {
      dayOfWeek,
      timeMinutes: hour * 60 + minute,
      timeString: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  }
}

/**
 * Check whether a given HH:mm time falls within [openTime, closeTime].
 */
function isTimeWithinRange(currentTimeMinutes, openTimeHHmm, closeTimeHHmm) {
  const [oh, om] = openTimeHHmm.split(":").map(Number);
  const [ch, cm] = closeTimeHHmm.split(":").map(Number);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;

  return currentTimeMinutes >= openMinutes && currentTimeMinutes < closeMinutes;
}

/**
 * Evaluate routing for an incoming call.
 *
 * @param {Date} [callDate=new Date()]
 * @returns {Promise<{
 *   mode: "human_first" | "ai_direct" | "disabled",
 *   isAfterHours: boolean,
 *   settings: object,
 *   ringTimeout: number,
 *   humanPhone: string,
 *   greeting: string,
 *   voiceName: string
 * }>}
 */
async function evaluateCallRouting(callDate = new Date()) {
  const settings = await Setting.getSettings();
  const voiceConfig = settings.aiVoiceSettings || {};
  const tz = settings.timezone || "America/Los_Angeles";

  // Check if AI voice feature is disabled
  if (voiceConfig.enabled === false) {
    return {
      mode: "disabled",
      isAfterHours: false,
      settings,
      ringTimeout: voiceConfig.ringTimeoutSeconds || 20,
      humanPhone: voiceConfig.humanEscalationPhone || settings.phone,
      greeting: "Thank you for calling Shanglian Therapeutic Bodywork.",
      voiceName: voiceConfig.voiceName || "Polly.Joanna-Neural",
    };
  }

  const { dayOfWeek, timeMinutes } = getLocalTimeComponents(callDate, tz);
  const schedule = voiceConfig.businessHoursSchedule || [];
  const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);

  let isWithinHours = false;
  if (daySchedule && daySchedule.isOpen) {
    isWithinHours = isTimeWithinRange(timeMinutes, daySchedule.openTime || "10:00", daySchedule.closeTime || "21:00");
  }

  const ringTimeout = voiceConfig.ringTimeoutSeconds || 20;
  const humanPhone = voiceConfig.humanEscalationPhone || settings.phone;
  const voiceName = voiceConfig.voiceName || "Polly.Joanna-Neural";

  if (isWithinHours) {
    if (voiceConfig.humanFirstMode) {
      return {
        mode: "human_first",
        isAfterHours: false,
        settings,
        ringTimeout,
        humanPhone,
        greeting: voiceConfig.greetingMessage,
        voiceName,
      };
    } else {
      return {
        mode: "ai_direct",
        isAfterHours: false,
        settings,
        ringTimeout,
        humanPhone,
        greeting: voiceConfig.greetingMessage,
        voiceName,
      };
    }
  }

  // After hours
  return {
    mode: "ai_direct",
    isAfterHours: true,
    settings,
    ringTimeout,
    humanPhone,
    greeting: voiceConfig.afterHoursGreeting || voiceConfig.greetingMessage,
    voiceName,
  };
}

module.exports = {
  getLocalTimeComponents,
  isTimeWithinRange,
  evaluateCallRouting,
};
