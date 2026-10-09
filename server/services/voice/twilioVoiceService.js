"use strict";

/**
 * Twilio Voice Integration Service (Phase A.4)
 *
 * Generates standards-compliant TwiML XML payloads for interactive voice responses,
 * speech recognition gathers, human-first call forwarding, and human escalation transfers.
 * Validates incoming Twilio webhook signatures.
 */

const crypto = require("crypto");

/**
 * Generate TwiML XML for forwarding a call to a human staff number with a timeout.
 *
 * @param {string} phoneNumber - Destination phone number (e.g. +14081234567)
 * @param {number} timeoutSeconds - Ring duration before fallback (default: 20s)
 * @param {string} statusCallbackUrl - URL to trigger if call is unanswered/busy
 */
function generateHumanDialTwiML(phoneNumber, timeoutSeconds = 20, statusCallbackUrl = "/api/voice/human-status") {
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="${timeoutSeconds}" action="${statusCallbackUrl}" method="POST">
    <Number>${cleanPhone}</Number>
  </Dial>
</Response>`.trim();
}

/**
 * Generate TwiML XML to speak a message and gather speech input from the caller.
 *
 * @param {string} promptText - Text to speak to the caller
 * @param {object} options
 * @param {string} [options.voice='Polly.Joanna-Neural'] - Twilio Polly/Neural Voice
 * @param {string} [options.actionUrl='/api/voice/interact'] - Next interaction endpoint
 * @param {number} [options.speechTimeout=3] - Silence timeout in seconds
 */
function generateGatherSpeechTwiML(promptText, options = {}) {
  const voice = options.voice || "Polly.Joanna-Neural";
  const actionUrl = options.actionUrl || "/api/voice/interact";
  const speechTimeout = options.speechTimeout || "auto";

  // Escape XML entities
  const safeText = escapeXml(promptText);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${actionUrl}" method="POST" speechTimeout="${speechTimeout}" language="en-US" timeout="5">
    <Say voice="${voice}">${safeText}</Say>
  </Gather>
  <Say voice="${voice}">We didn't hear anything. If you need assistance, please let us know or press any key.</Say>
  <Gather input="speech dtmf" action="${actionUrl}" method="POST" timeout="6">
    <Say voice="${voice}">Are you still on the line?</Say>
  </Gather>
  <Say voice="${voice}">Thank you for calling Shanglian Therapeutic Bodywork. Have a wonderful day. Goodbye.</Say>
  <Hangup/>
</Response>`.trim();
}

/**
 * Generate TwiML XML to transfer caller to human escalation number.
 */
function generateEscalationTwiML(escalationPhone, transferMessage = "Transferring you to our staff now. Please stay on the line.", voice = "Polly.Joanna-Neural") {
  const cleanPhone = (escalationPhone || "").replace(/[^\d+]/g, "");
  const twilioNumber = (process.env.TWILIO_PHONE_NUMBER || "").replace(/[^\d+]/g, "");
  const customerCareNumber = (process.env.SHANGLIAN_CUSTOMER_CARE_NUMBER || "").replace(/[^\d+]/g, "");

  // Prevent infinite forwarding loop if escalation phone matches Twilio inbound number or forwarded customer care number
  if (!cleanPhone || (twilioNumber && cleanPhone === twilioNumber) || (customerCareNumber && cleanPhone === customerCareNumber)) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">Our staff is currently unavailable. Please visit shanglianbodywork.com to book online, or leave us a message. Thank you.</Say>
  <Hangup/>
</Response>`.trim();
  }

  const safeMsg = escapeXml(transferMessage);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${safeMsg}</Say>
  <Dial>
    <Number>${cleanPhone}</Number>
  </Dial>
</Response>`.trim();
}

/**
 * Generate TwiML XML to speak a final farewell and hang up.
 */
function generateHangupTwiML(farewellMessage = "Thank you for calling Shanglian Therapeutic Bodywork. We look forward to seeing you soon. Goodbye.", voice = "Polly.Joanna-Neural") {
  const safeMsg = escapeXml(farewellMessage);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${safeMsg}</Say>
  <Hangup/>
</Response>`.trim();
}

/**
 * Helper to escape special XML characters.
 */
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Validate incoming Twilio webhook signature.
 * Returns true if valid or if in local/test mode with TWILIO_VALIDATE_SIGNATURE=false.
 */
function validateTwilioSignature(authToken, signature, url, params = {}) {
  if (process.env.NODE_ENV === "test" || process.env.TWILIO_VALIDATE_SIGNATURE === "false" || !authToken || !signature) {
    return true;
  }

  // Sort parameter keys alphabetically
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

module.exports = {
  generateHumanDialTwiML,
  generateGatherSpeechTwiML,
  generateEscalationTwiML,
  generateHangupTwiML,
  validateTwilioSignature,
  escapeXml,
};
