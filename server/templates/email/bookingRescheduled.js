"use strict";

/**
 * Booking Rescheduled Email Template
 *
 * Sent to customer, therapist, and admin when an appointment is rescheduled.
 */

/**
 * Generate booking rescheduled email.
 *
 * @param {object} data
 * @param {string} data.customerName       Customer first name
 * @param {string} data.serviceName        Service name
 * @param {string} data.therapistName      Therapist name
 * @param {string} data.oldAppointmentDate Previous formatted date
 * @param {string} data.oldAppointmentTime Previous formatted time
 * @param {string} data.newAppointmentDate New formatted date
 * @param {string} data.newAppointmentTime New formatted time
 * @param {number} data.duration           Duration in minutes
 * @param {string} data.businessName       Business name
 * @param {string} data.businessPhone      Business phone number
 * @param {string} data.businessEmail      Business email
 * @param {string} data.businessAddress    Business address (optional)
 * @param {string} data.bookingId          Booking reference ID
 * @returns {{subject: string, text: string, html: string}}
 */
function generateBookingRescheduled(data) {
  const {
    customerName,
    serviceName,
    therapistName,
    oldAppointmentDate,
    oldAppointmentTime,
    newAppointmentDate,
    newAppointmentTime,
    duration,
    businessName,
    businessPhone,
    businessEmail,
    businessAddress,
    bookingId,
  } = data;

  const subject = `Appointment Rescheduled — ${serviceName}`;

  const text = `
Hi ${customerName},

Your appointment has been successfully rescheduled.

UPDATED APPOINTMENT DETAILS
──────────────────────────────────────
Service:        ${serviceName}
Therapist:      ${therapistName}
New Date:       ${newAppointmentDate}
New Time:       ${newAppointmentTime}
Duration:       ${duration} minutes
Reference:      ${bookingId}

PREVIOUS APPOINTMENT
──────────────────────────────────────
Previous Date:  ${oldAppointmentDate || "N/A"}
Previous Time:  ${oldAppointmentTime || "N/A"}

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
We look forward to seeing you then!

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
    .header { background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .details-box { background: #f0f7ff; border-left: 4px solid #2b5876; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .details-box h3 { margin: 0 0 15px 0; font-size: 16px; color: #2b5876; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; width: 140px; color: #666; }
    .detail-value { flex: 1; color: #333; }
    .old-box { background: #fff8e1; border-left: 4px solid #ffb300; padding: 15px 20px; margin: 15px 0; border-radius: 4px; font-size: 14px; }
    .section { margin: 25px 0; }
    .section h3 { font-size: 16px; color: #2b5876; margin-bottom: 10px; border-bottom: 2px solid #4e4376; padding-bottom: 5px; }
    .section p { margin: 8px 0; }
    .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
    .footer a { color: #2b5876; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗓️ Appointment Rescheduled</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi <strong>${customerName}</strong>,
      </div>
      
      <p>Your appointment has been successfully updated with new date and time details.</p>
      
      <div class="details-box">
        <h3>New Appointment Details</h3>
        <div class="detail-row">
          <span class="detail-label">Service:</span>
          <span class="detail-value">${serviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Therapist:</span>
          <span class="detail-value">${therapistName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">New Date:</span>
          <span class="detail-value"><strong>${newAppointmentDate}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">New Time:</span>
          <span class="detail-value"><strong>${newAppointmentTime}</strong></span>
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

      ${
        oldAppointmentDate
          ? `
      <div class="old-box">
        <strong>Previous Schedule:</strong> ${oldAppointmentDate} at ${oldAppointmentTime}
      </div>`
          : ""
      }
      
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
      
      <p style="margin-top: 30px;">Thank you for choosing <strong>${businessName}</strong>.</p>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from ${businessName}.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

module.exports = { generateBookingRescheduled };
