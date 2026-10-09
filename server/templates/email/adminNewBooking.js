"use strict";

/**
 * Admin New Booking Notification Template
 *
 * Sent to admin/business email when a new booking is created.
 */

/**
 * Generate admin new booking notification.
 *
 * @param {object} data
 * @param {string} data.customerName       Customer full name
 * @param {string} data.customerEmail      Customer email
 * @param {string} data.customerPhone      Customer phone
 * @param {string} data.serviceName        Service name
 * @param {string} data.therapistName      Therapist name
 * @param {string} data.appointmentDate    Formatted date
 * @param {string} data.appointmentTime    Start time
 * @param {number} data.duration           Duration in minutes
 * @param {number} data.price              Price in USD
 * @param {string} data.bookingId          Booking reference ID
 * @param {string} [data.customerNotes]    Customer notes (optional)
 * @param {string} data.businessName       Business name
 * @returns {{subject: string, text: string, html: string}}
 */
function generateAdminNewBooking(data) {
  const {
    customerName,
    customerEmail,
    customerPhone,
    serviceName,
    therapistName,
    appointmentDate,
    appointmentTime,
    duration,
    price,
    bookingId,
    customerNotes,
    businessName,
  } = data;

  const subject = `New Booking: ${serviceName} — ${appointmentDate} at ${appointmentTime}`;

  const notesText = customerNotes
    ? `\n\nCustomer Notes:\n"${customerNotes}"`
    : "";

  const text = `
NEW BOOKING RECEIVED

A new appointment has been booked through the website.

CUSTOMER INFORMATION
──────────────────────────────────────
Name:   ${customerName}
Email:  ${customerEmail}
Phone:  ${customerPhone}

APPOINTMENT DETAILS
──────────────────────────────────────
Service:    ${serviceName}
Therapist:  ${therapistName}
Date:       ${appointmentDate}
Time:       ${appointmentTime}
Duration:   ${duration} minutes
Price:      $${price.toFixed(2)}
Reference:  ${bookingId}${notesText}

ACTION REQUIRED
──────────────────────────────────────
Please review this booking in the admin dashboard and confirm the appointment when ready.

Log into the admin dashboard to view full details:
[Admin Dashboard URL]

──────────────────────────────────────
This is an automated notification from ${businessName}.
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
    .header { background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .alert-badge { background: #ff6f00; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 12px; font-weight: 600; margin-bottom: 15px; }
    .details-box { background: #f9f9f9; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .details-box h3 { margin: 0 0 15px 0; font-size: 16px; color: #1976d2; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; width: 140px; color: #666; }
    .detail-value { flex: 1; color: #333; }
    .notes-box { background: #fff9e6; padding: 15px; border-radius: 4px; margin: 15px 0; border: 1px solid #ffd54f; }
    .notes-box h4 { margin: 0 0 10px 0; color: #f57c00; font-size: 14px; }
    .action-box { background: #e3f2fd; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center; border: 1px solid #90caf9; }
    .action-box h3 { margin: 0 0 10px 0; color: #1976d2; }
    .button { display: inline-block; background: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: 600; margin-top: 10px; }
    .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
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
      <h1>🔔 New Booking Received</h1>
    </div>
    
    <div class="content">
      <div class="alert-badge">ACTION REQUIRED</div>
      
      <p>A new appointment has been booked through the website.</p>
      
      <div class="details-box">
        <h3>Customer Information</h3>
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${customerName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value"><a href="mailto:${customerEmail}">${customerEmail}</a></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Phone:</span>
          <span class="detail-value">${customerPhone || "Not provided"}</span>
        </div>
      </div>
      
      <div class="details-box">
        <h3>Appointment Details</h3>
        <div class="detail-row">
          <span class="detail-label">Service:</span>
          <span class="detail-value"><strong>${serviceName}</strong></span>
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
          <span class="detail-label">Price:</span>
          <span class="detail-value">$${price.toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Reference:</span>
          <span class="detail-value">${bookingId}</span>
        </div>
      </div>
      
      ${customerNotes ? `
      <div class="notes-box">
        <h4>📝 Customer Notes</h4>
        <p style="margin: 0;">${customerNotes}</p>
      </div>
      ` : ''}
      
      <div class="action-box">
        <h3>Next Steps</h3>
        <p>Please review this booking in the admin dashboard and confirm the appointment when ready.</p>
        <a href="#" class="button">Open Admin Dashboard</a>
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from ${businessName}.</p>
      <p>Booking ID: ${bookingId}</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

module.exports = { generateAdminNewBooking };

