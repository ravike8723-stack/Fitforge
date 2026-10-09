"use strict";

/**
 * Booking Cancellation Email Template
 *
 * Sent to customer after successfully cancelling a booking.
 */

/**
 * Generate booking cancellation email.
 *
 * @param {object} data
 * @param {string} data.customerName       Customer first name
 * @param {string} data.serviceName        Service name
 * @param {string} data.appointmentDate    Formatted date
 * @param {string} data.appointmentTime    Start time
 * @param {string} data.businessName       Business name
 * @param {string} data.businessPhone      Business phone
 * @param {string} data.businessEmail      Business email
 * @param {string} data.bookingId          Booking reference ID
 * @param {string} [data.cancellationReason] Reason for cancellation (optional)
 * @returns {{subject: string, text: string, html: string}}
 */
function generateBookingCancellation(data) {
  const {
    customerName,
    serviceName,
    appointmentDate,
    appointmentTime,
    businessName,
    businessPhone,
    businessEmail,
    bookingId,
    cancellationReason,
  } = data;

  const subject = `Appointment Cancelled — ${serviceName}`;

  const reasonText = cancellationReason
    ? `\nReason: ${cancellationReason}`
    : "";

  const text = `
Hi ${customerName},

Your appointment has been cancelled.

CANCELLED APPOINTMENT
──────────────────────────────────────
Service:    ${serviceName}
Date:       ${appointmentDate}
Time:       ${appointmentTime}
Reference:  ${bookingId}${reasonText}

We're sorry to see you won't be able to make it. If you'd like to reschedule, we'd be happy to help you find a new time that works for you.

TO BOOK A NEW APPOINTMENT
──────────────────────────────────────
You can book online through your account or contact us directly:

Phone: ${businessPhone}
Email: ${businessEmail}

Thank you for notifying us, and we hope to see you again soon.

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
    .header { background: linear-gradient(135deg, #757575 0%, #9e9e9e 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .details-box { background: #f9f9f9; border-left: 4px solid #9e9e9e; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .details-box h3 { margin: 0 0 15px 0; font-size: 16px; color: #757575; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; width: 120px; color: #666; }
    .detail-value { flex: 1; color: #333; }
    .section { margin: 25px 0; }
    .section h3 { font-size: 16px; color: #757575; margin-bottom: 10px; border-bottom: 2px solid #9e9e9e; padding-bottom: 5px; }
    .section p { margin: 8px 0; }
    .cta-box { background: #e3f2fd; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center; border: 1px solid #90caf9; }
    .cta-box h3 { margin: 0 0 10px 0; color: #1976d2; }
    .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
    .footer a { color: #9e9e9e; text-decoration: none; }
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
      <h1>Appointment Cancelled</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi <strong>${customerName}</strong>,
      </div>
      
      <p>Your appointment has been cancelled. We've updated our records accordingly.</p>
      
      <div class="details-box">
        <h3>Cancelled Appointment</h3>
        <div class="detail-row">
          <span class="detail-label">Service:</span>
          <span class="detail-value">${serviceName}</span>
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
          <span class="detail-label">Reference:</span>
          <span class="detail-value">${bookingId}</span>
        </div>
        ${cancellationReason ? `
        <div class="detail-row">
          <span class="detail-label">Reason:</span>
          <span class="detail-value">${cancellationReason}</span>
        </div>
        ` : ''}
      </div>
      
      <p>We're sorry to see you won't be able to make it. If you'd like to reschedule, we'd be happy to help you find a new time that works for you.</p>
      
      <div class="cta-box">
        <h3>Need to Rebook?</h3>
        <p>Log into your account to schedule a new appointment, or contact us directly.</p>
      </div>
      
      <div class="section">
        <h3>Contact Us</h3>
        <p>Phone: <strong>${businessPhone}</strong></p>
        <p>Email: <a href="mailto:${businessEmail}">${businessEmail}</a></p>
      </div>
      
      <p style="margin-top: 30px;">Thank you for notifying us. We hope to see you again soon!</p>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from ${businessName}.</p>
      <p>Questions? Contact us at ${businessPhone} or <a href="mailto:${businessEmail}">${businessEmail}</a>.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

module.exports = { generateBookingCancellation };

