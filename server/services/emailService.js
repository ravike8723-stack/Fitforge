"use strict";

/**
 * Email Service — Phase A.2
 *
 * Handles email delivery via Zoho Mail SMTP.
 * Provides a thin abstraction over nodemailer for sending transactional emails.
 *
 * IMPORTANT:
 *   Email failure must NEVER break booking operations.
 *   This service returns success/failure status but never throws errors.
 *
 * Configuration:
 *   All credentials from environment variables.
 *   If EMAIL_ENABLED=false, all sends return success without actual delivery (dev mode).
 */

const nodemailer = require("nodemailer");

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  enabled:  process.env.EMAIL_ENABLED === "true",
  host:     process.env.ZOHO_SMTP_HOST || "smtp.zoho.com",
  port:     parseInt(process.env.ZOHO_SMTP_PORT || "465", 10),
  secure:   process.env.ZOHO_SMTP_SECURE !== "false", // default true
  user:     process.env.ZOHO_SMTP_USER,
  password: process.env.ZOHO_SMTP_PASSWORD,
  fromName: process.env.EMAIL_FROM_NAME || "Shanglian Therapeutic Bodywork",
  fromAddress: process.env.EMAIL_FROM_ADDRESS || process.env.ZOHO_SMTP_USER,
};

// ─── Transporter ──────────────────────────────────────────────────────────────

let transporter = null;

function initializeTransporter() {
  if (!CONFIG.enabled) {
    console.log("[EmailService] Email disabled (EMAIL_ENABLED=false)");
    return null;
  }

  if (!CONFIG.user || !CONFIG.password || !CONFIG.fromAddress) {
    console.warn("[EmailService] Missing SMTP credentials — email disabled");
    return null;
  }

  try {
    transporter = nodemailer.createTransporter({
      host:   CONFIG.host,
      port:   CONFIG.port,
      secure: CONFIG.secure,
      auth: {
        user: CONFIG.user,
        pass: CONFIG.password,
      },
    });
    console.log(`[EmailService] SMTP configured: ${CONFIG.host}:${CONFIG.port}`);
    return transporter;
  } catch (err) {
    console.error("[EmailService] Failed to initialize SMTP:", err.message);
    return null;
  }
}

// Initialize on module load
transporter = initializeTransporter();

// ─── Send Email ───────────────────────────────────────────────────────────────

/**
 * Send an email via Zoho Mail SMTP.
 *
 * @param {object}   options
 * @param {string}   options.to          Recipient email address
 * @param {string}   options.subject     Email subject line
 * @param {string}   options.text        Plain text body (required)
 * @param {string}   [options.html]      HTML body (optional)
 * @param {string}   [options.replyTo]   Reply-to address (optional)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendEmail({ to, subject, text, html, replyTo }) {
  // If email disabled, return success without sending
  if (!CONFIG.enabled) {
    console.log(`[EmailService] Email disabled — skipping: ${subject} to ${to}`);
    return { success: true, messageId: "disabled" };
  }

  // If transporter failed to initialize, return failure
  if (!transporter) {
    const error = "SMTP transporter not initialized (missing credentials)";
    console.error(`[EmailService] ${error}`);
    return { success: false, error };
  }

  // Validate required fields
  if (!to || !subject || !text) {
    const error = "Missing required email fields (to, subject, text)";
    console.error(`[EmailService] ${error}`);
    return { success: false, error };
  }

  // Prepare mail options
  const mailOptions = {
    from: `"${CONFIG.fromName}" <${CONFIG.fromAddress}>`,
    to,
    subject,
    text,
    html: html || undefined,
    replyTo: replyTo || CONFIG.fromAddress,
  };

  // Attempt delivery
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Email sent: ${subject} → ${to} (${info.messageId})`);
    return {
      success:   true,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
    return {
      success: false,
      error:   err.message,
    };
  }
}

// ─── Test Connection ──────────────────────────────────────────────────────────

/**
 * Verify SMTP connection.
 * Useful for health checks and setup verification.
 *
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function verifyConnection() {
  if (!CONFIG.enabled) {
    return { success: true, message: "Email disabled" };
  }

  if (!transporter) {
    return { success: false, error: "SMTP transporter not initialized" };
  }

  try {
    await transporter.verify();
    console.log("[EmailService] SMTP connection verified");
    return { success: true };
  } catch (err) {
    console.error("[EmailService] SMTP verification failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  sendEmail,
  verifyConnection,
  isEnabled: () => CONFIG.enabled && transporter !== null,
};

