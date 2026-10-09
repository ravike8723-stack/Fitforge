"use strict";

/**
 * Call Session Service (Phase A.4)
 *
 * Maintains in-memory / persistent active call session context
 * to enable stateful multi-turn voice conversations, pending booking intents,
 * retry/idempotency tracking, and automatic TTL cleanup.
 */

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL

const sessions = new Map();

/**
 * Clean expired sessions periodically.
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [callSid, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      sessions.delete(callSid);
    }
  }
}

// Interval cleanup every 10 minutes
setInterval(cleanupExpiredSessions, 10 * 60 * 1000).unref();

/**
 * Get or create an active session for a call SID.
 */
function getOrCreateSession(callSid, initialData = {}) {
  cleanupExpiredSessions();

  if (!sessions.has(callSid)) {
    sessions.set(callSid, {
      callSid,
      callerPhone: initialData.callerPhone || "Unknown",
      recipientPhone: initialData.recipientPhone || "",
      isAfterHours: Boolean(initialData.isAfterHours),
      turns: [], // Array of { role: 'assistant'|'user'|'system', text: string, timestamp: Date }
      pendingBooking: null, // { serviceId, therapistId, appointmentDate, startTime, duration, price, customerName, customerPhone }
      unrecognizedCount: 0,
      isEscalated: false,
      isCompleted: false,
      bookingId: null,
      createdAt: Date.now(),
      lastActive: Date.now(),
      isSandbox: Boolean(initialData.isSandbox),
    });
  }

  const session = sessions.get(callSid);
  session.lastActive = Date.now();
  return session;
}

/**
 * Get an existing session.
 */
function getSession(callSid) {
  return sessions.get(callSid) || null;
}

/**
 * Add a dialogue turn to the session transcript.
 */
function addTurn(callSid, role, text) {
  const session = getSession(callSid);
  if (!session) return;
  session.turns.push({
    role,
    text,
    timestamp: new Date(),
  });
  session.lastActive = Date.now();
}

/**
 * Update session state properties.
 */
function updateSession(callSid, updates) {
  const session = getSession(callSid);
  if (!session) return null;
  Object.assign(session, updates, { lastActive: Date.now() });
  return session;
}

/**
 * End and delete a session.
 */
function endSession(callSid) {
  const session = sessions.get(callSid);
  if (session) {
    session.isCompleted = true;
    session.lastActive = Date.now();
    // Keep briefly for final status hook, then delete
    setTimeout(() => {
      sessions.delete(callSid);
    }, 60 * 1000).unref();
  }
  return session;
}

module.exports = {
  getOrCreateSession,
  getSession,
  addTurn,
  updateSession,
  endSession,
};
