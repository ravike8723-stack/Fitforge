"use strict";

/**
 * Booking Confirmation Email Template
 *
 * Sent to customer after successfully creating a booking.
 */

/**
 * Generate booking confirmation email.
 *
 * @param {object} data
 * @param {string} data.customerName       Customer first name
 * @param {string} data.serviceName        Service name
 * @param {string} data.therapistName      Therapist name (or "our therapist")
 * @param {string} data.appointmentDate    Formatted date (e.g., "Monday, Jan 15, 2026")
 * @param {string} data.appointmentTime    Start time (e.g., "2:00 PM")
 * @param {number} data.duration           Duration in minutes
 * @param {string} data.businessName       Business name
 * @param {string} data.businessPhone      Business phone number
 * @param {string} data.businessEmail      Business email
 * @param {string} data.businessAddress    Business address (optional)
 * @param {string} data.bookingId          Booking reference ID
 * @returns {{subject: string, text: string, html: string}}
 */
function generateBookingConfirmation(data) {
  const {
    customerName,
    serviceName,
    therapistName,
    appointmentDate,
    appointmentTime,
    duration,
    businessName,
    businessPhone,
    businessEmail,
    businessAddress,
    bookingId,
  } = data;

  const subject = `Appointment Confirmed — ${serviceName}`;

  const text = `
Hi ${customerName},

Your appointment has been confirmed!

APPOINTMENT DETAILS
──────────────────────────────────────
Service:    ${serviceName}
Therapist:  ${therapistName}
Date:       ${appointmentDate}
Time:       ${appointmentTime}
Duration:   ${duration} minutes
Reference:  ${bookingId}

LOCATION
──────────────────────────────────────
${businessName}
${businessAddress || "Address available upon request"}

CONTACT
──────────────────────────────────────
Phone: ${businessPhone}
Email: ${businessEmail}

ARRIVAL INSTRUCTIONS
──────────────────────────────────────
Please arrive 5-10 minutes before your appointment time.
We look forward to welcoming you.

CANCELLATION POLICY
──────────────────────────────────────
If you need to cancel or reschedule, please contact us at least 24 hours in advance.

You can manage your booking by logging into your account at any time.

Thank you for choosing ${businessName}.

Warm regards,
The ${businessName} Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6b4f4f 0%, #8d6e63 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .details-box { background: #f9f9f9; border-left: 4px solid #8d6e63; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .details-box h3 { margin: 0 0 15px 0; font-size: 16px; color: #6b4f4f; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; width: 120px; color: #666; }
    .detail-value { flex: 1; color: #333; }
    .section { margin: 25px 0; }
    .section h3 { font-size: 16px; color: #6b4f4f; margin-bottom: 10px; border-bottom: 2px solid #8d6e63; padding-bottom: 5px; }
    .section p { margin: 8px 0; }
    .highlight { background: #fff9e6; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffd54f; }
    .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
    .footer a { color: #8d6e63; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { margin: 0; border-radius: 0; }
      .content { padding: 20px 15px; }
      .detail-row { flex-direction: column; }
      .detail-label { width: 100%; margin-bottom: 4px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Appointment Confirmed</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi <strong>${customerName}</strong>,
      </div>
      
      <p>Your appointment has been confirmed! We look forward to welcoming you.</p>
      
      <div class="details-box">
        <h3>Appointment Details</h3>
        <div class="detail-row">
          <span class="detail-label">Service:</span>
          <span class="detail-value">${serviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Therapist:</span>
          <span class="detail-value">${therapistName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${appointmentDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span class="detail-value">${appointmentTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:</span>
          <span class="detail-value">${duration} minutes</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Reference:</span>
          <span class="detail-value">${bookingId}</span>
        </div>
      </div>
      
      <div class="section">
        <h3>Location</h3>
        <p><strong>${businessName}</strong></p>
        <p>${businessAddress || "Address available upon request"}</p>
      </div>
      
      <div class="section">
        <h3>Contact</h3>
        <p>Phone: <strong>${businessPhone}</strong></p>
        <p>Email: <a href="mailto:${businessEmail}">${businessEmail}</a></p>
      </div>
      
      <div class="highlight">
        <strong>Arrival Instructions:</strong><br>
        Please arrive 5-10 minutes before your appointment time. This allows you to complete any necessary paperwork and prepare for your session.
      </div>
      
      <div class="section">
        <h3>Cancellation Policy</h3>
        <p>If you need to cancel or reschedule, please contact us at least 24 hours in advance. You can also manage your booking by logging into your account.</p>
      </div>
      
      <p style="margin-top: 30px;">Thank you for choosing <strong>${businessName}</strong>. We're committed to providing you with an exceptional therapeutic experience.</p>
    </div>
    
    <div class="footer">
      <p>This is an automated confirmation email from ${businessName}.</p>
      <p>If you have questions, please contact us at ${businessPhone} or <a href="mailto:${businessEmail}">${businessEmail}</a>.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

module.exports = { generateBookingConfirmation };

