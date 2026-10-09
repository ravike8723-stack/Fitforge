"use strict";

/**
 * Therapist Booking Notification Template
 *
 * Sent to therapist when they are assigned to a new booking.
 */

/**
 * Generate therapist booking notification.
 *
 * @param {object} data
 * @param {string} data.therapistName      Therapist first name
 * @param {string} data.customerName       Customer full name
 * @param {string} data.serviceName        Service name
 * @param {string} data.appointmentDate    Formatted date
 * @param {string} data.appointmentTime    Start time
 * @param {number} data.duration           Duration in minutes
 * @param {string} data.bookingId          Booking reference ID
 * @param {string} [data.customerNotes]    Customer notes (optional)
 * @param {string} data.businessName       Business name
 * @param {string} data.action             "new" | "cancelled"
 * @returns {{subject: string, text: string, html: string}}
 */
function generateTherapistBookingNotification(data) {
  const {
    therapistName,
    customerName,
    serviceName,
    appointmentDate,
    appointmentTime,
    duration,
    bookingId,
    customerNotes,
    businessName,
    action = "new",
  } = data;

  const isCancellation = action === "cancelled";
  const subjectPrefix = isCancellation ? "Appointment Cancelled" : "New Appointment";
  const subject = `${subjectPrefix}: ${serviceName} — ${appointmentDate} at ${appointmentTime}`;

  const notesText = customerNotes
    ? `\n\nCustomer Notes:\n"${customerNotes}"`
    : "";

  const text = `
Hi ${therapistName},

${isCancellation ? 
  `An appointment has been cancelled.` : 
  `You have a new appointment scheduled.`}

APPOINTMENT DETAILS
──────────────────────────────────────
Customer:   ${customerName}
Service:    ${serviceName}
Date:       ${appointmentDate}
Time:       ${appointmentTime}
Duration:   ${duration} minutes
Reference:  ${bookingId}${notesText}

${isCancellation ?
  `This appointment has been removed from your schedule.` :
  `Please review your schedule and prepare for this session.`}

You can view full details in your therapist dashboard.

Thank you,
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
    .header { background: linear-gradient(135deg, ${isCancellation ? '#757575' : '#43a047'} 0%, ${isCancellation ? '#9e9e9e' : '#66bb6a'} 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .details-box { background: #f9f9f9; border-left: 4px solid ${isCancellation ? '#9e9e9e' : '#66bb6a'}; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .details-box h3 { margin: 0 0 15px 0; font-size: 16px; color: ${isCancellation ? '#757575' : '#43a047'}; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; width: 120px; color: #666; }
    .detail-value { flex: 1; color: #333; }
    .notes-box { background: #fff9e6; padding: 15px; border-radius: 4px; margin: 15px 0; border: 1px solid #ffd54f; }
    .notes-box h4 { margin: 0 0 10px 0; color: #f57c00; font-size: 14px; }
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
      <h1>${isCancellation ? '❌' : '📅'} ${subjectPrefix}</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi <strong>${therapistName}</strong>,
      </div>
      
      <p>${isCancellation ? 
        `An appointment has been cancelled and removed from your schedule.` : 
        `You have a new appointment scheduled. Please review the details below.`}</p>
      
      <div class="details-box">
        <h3>Appointment Details</h3>
        <div class="detail-row">
          <span class="detail-label">Customer:</span>
          <span class="detail-value"><strong>${customerName}</strong></span>
        </div>
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
          <span class="detail-label">Duration:</span>
          <span class="detail-value">${duration} minutes</span>
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
      
      <p>${isCancellation ?
        `This time slot is now available in your schedule.` :
        `Please prepare for this session and review any customer notes if provided.`}</p>
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

module.exports = { generateTherapistBookingNotification };

