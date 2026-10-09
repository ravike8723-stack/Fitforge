"use strict";

/**
 * Inquiry Controller
 *
 * Handles public contact form inquiries.
 */

const emailService = require("../services/emailService");
const Setting = require("../models/Setting");

/**
 * POST /api/inquiries
 * Submit a customer inquiry / contact form message.
 */
async function submitInquiry(req, res, next) {
  try {
    const { name, email, phone, message, subject } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (!email || !email.trim() || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "A valid email is required" });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const settings = await Setting.getSettings();
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || settings.email;
    const inquirySubject = subject || `New Inquiry from ${name.trim()}`;

    const textContent = `
NEW INQUIRY RECEIVED
──────────────────────────────────────
From:    ${name.trim()}
Email:   ${email.trim()}
Phone:   ${phone ? phone.trim() : "Not provided"}
Subject: ${inquirySubject}
Date:    ${new Date().toLocaleString("en-US", { timeZone: settings.timezone || "America/Los_Angeles" })}

MESSAGE
──────────────────────────────────────
${message.trim()}
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;line-height:1.6;color:#333;background:#f9f9f9;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:8px;border:1px solid #e0e0e0;">
    <h2 style="color:#6b4f4f;margin-top:0;">New Website Inquiry</h2>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;font-weight:bold;width:100px;">From:</td><td>${name.trim()}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold;">Email:</td><td><a href="mailto:${email.trim()}">${email.trim()}</a></td></tr>
      <tr><td style="padding:6px 0;font-weight:bold;">Phone:</td><td>${phone ? phone.trim() : "Not provided"}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold;">Subject:</td><td>${inquirySubject}</td></tr>
    </table>
    <div style="background:#f5f5f5;padding:16px;border-radius:4px;border-left:4px solid #8d6e63;margin-top:16px;">
      <h4 style="margin:0 0 8px 0;color:#6b4f4f;">Message:</h4>
      <p style="margin:0;white-space:pre-wrap;">${message.trim()}</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send email to admin in background if email is configured
    try {
      if (adminEmail) {
        await emailService.sendEmail({
          to: adminEmail,
          subject: `[Inquiry] ${inquirySubject}`,
          text: textContent,
          html: htmlContent,
        });
      }
    } catch (err) {
      console.error("[InquiryController] Email notification error:", err.message);
    }

    return res.status(200).json({
      success: true,
      message: "Thank you for reaching out. We will get back to you shortly.",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitInquiry,
};
