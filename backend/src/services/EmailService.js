const logger = require('../utils/logger');

/**
 * Email Service Configuration
 * 
 * Install: npm install nodemailer
 * 
 * Setup environment variables:
 * EMAIL_HOST=smtp.gmail.com
 * EMAIL_PORT=587
 * EMAIL_USER=your-email@gmail.com
 * EMAIL_PASSWORD=your-app-password
 * EMAIL_FROM=Time Manager <noreply@yourdomain.com>
 */

class EmailService {
  constructor() {
    this.enabled = false;
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'Time Manager <noreply@localhost>';

    // Initialize only if email is configured
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      this.initializeTransporter();
    } else {
      logger.warn('Email service not configured. Email notifications will be logged only.');
    }
  }

  initializeTransporter() {
    try {
      const nodemailer = require('nodemailer');

      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      this.enabled = true;
      logger.info('Email service initialized successfully');

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email service verification failed:', error);
          this.enabled = false;
        } else {
          logger.info('Email service ready to send messages');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.enabled) {
      logger.info('Email would be sent (email service disabled):', { to, subject });
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: this.from,
        to,
        subject,
        text,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully:', { to, subject, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email:', { to, subject, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Template: Welcome Email
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Time Manager';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Time Manager! 🎉</h2>
        <p>Hello ${user.name},</p>
        <p>Your account has been successfully created. You can now start tracking your hours.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Account Details:</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role}</p>
          <p><strong>Daily Work Target:</strong> ${user.profile.dailyWorkTarget / 60} hours</p>
        </div>
        <p>Best regards,<br>Time Manager Team</p>
      </div>
    `;
    const text = `Welcome to Time Manager! Hello ${user.name}, your account has been successfully created.`;

    return await this.sendEmail({ to: user.email, subject, html, text });
  }

  // Template: Forgot Punch Out Reminder
  async sendForgotPunchOutReminder(user, lastPunchTime) {
    const subject = 'Reminder: You Forgot to Punch Out';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Forgot to Punch Out?</h2>
        <p>Hello ${user.name},</p>
        <p>It looks like you forgot to punch out today. Your last punch-in was at ${lastPunchTime}.</p>
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0;"><strong>⏰ Last Punch In:</strong> ${lastPunchTime}</p>
          <p style="margin: 10px 0 0 0;"><strong>Status:</strong> Still clocked in</p>
        </div>
        <p>Please punch out to ensure accurate time tracking.</p>
        <p><a href="${process.env.FRONTEND_URL}/punch" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Punch Out Now</a></p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated reminder. If you've already punched out, please ignore this email.</p>
      </div>
    `;
    const text = `Reminder: You forgot to punch out. Your last punch-in was at ${lastPunchTime}. Please punch out to ensure accurate time tracking.`;

    return await this.sendEmail({ to: user.email, subject, html, text });
  }

  // Template: Weekly Summary
  async sendWeeklySummary(user, stats) {
    const subject = 'Your Weekly Attendance Summary';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📊 Weekly Attendance Summary</h2>
        <p>Hello ${user.name},</p>
        <p>Here's your attendance summary for the past week:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Week at a Glance:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Total Hours Worked:</strong></td>
              <td style="text-align: right;">${(stats.totalMinutes / 60).toFixed(2)} hours</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Days Present:</strong></td>
              <td style="text-align: right;">${stats.daysPresent} days</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Average Per Day:</strong></td>
              <td style="text-align: right;">${(stats.totalMinutes / 60 / stats.daysPresent).toFixed(2)} hours</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Total Punches:</strong></td>
              <td style="text-align: right;">${stats.totalPunches}</td>
            </tr>
          </table>
        </div>
        <p>Keep up the great work! 💪</p>
        <p><a href="${process.env.FRONTEND_URL}/history" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Detailed History</a></p>
      </div>
    `;
    const text = `Weekly Summary: Total Hours: ${(stats.totalMinutes / 60).toFixed(2)}, Days Present: ${stats.daysPresent}, Total Punches: ${stats.totalPunches}`;

    return await this.sendEmail({ to: user.email, subject, html, text });
  }

  // Template: Late Arrival Notification
  async sendLateArrivalNotification(user, punchTime, expectedTime) {
    const subject = 'Late Arrival Recorded';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⏰ Late Arrival Notice</h2>
        <p>Hello ${user.name},</p>
        <p>You arrived late today. Please ensure timely arrival in the future.</p>
        <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0;"><strong>Expected Time:</strong> ${expectedTime}</p>
          <p style="margin: 10px 0 0 0;"><strong>Actual Arrival:</strong> ${punchTime}</p>
        </div>
      </div>
    `;
    const text = `Late Arrival Notice: Expected ${expectedTime}, Arrived at ${punchTime}`;

    return await this.sendEmail({ to: user.email, subject, html, text });
  }

  // Template: Admin Alert
  async sendAdminAlert(subject, message, details = {}) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.warn('Admin email not configured');
      return { success: false, message: 'Admin email not configured' };
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 Admin Alert</h2>
        <p><strong>Subject:</strong> ${subject}</p>
        <p>${message}</p>
        ${Object.keys(details).length > 0 ? `
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Details:</h3>
            <pre style="background-color: white; padding: 15px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(details, null, 2)}</pre>
          </div>
        ` : ''}
        <p style="color: #6b7280; font-size: 12px;">Time: ${new Date().toISOString()}</p>
      </div>
    `;
    const text = `Admin Alert: ${subject} - ${message}`;

    return await this.sendEmail({ to: adminEmail, subject: `[Admin Alert] ${subject}`, html, text });
  }

  // Template: Monthly Report
  async sendMonthlyReport(user, stats) {
    const subject = 'Your Monthly Attendance Report';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📈 Monthly Attendance Report</h2>
        <p>Hello ${user.name},</p>
        <p>Here's your complete attendance report for the month:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Monthly Statistics:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Total Hours:</strong></td>
              <td style="text-align: right;">${(stats.totalMinutes / 60).toFixed(2)} hours</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Working Days:</strong></td>
              <td style="text-align: right;">${stats.workingDays} days</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Days Present:</strong></td>
              <td style="text-align: right;">${stats.daysPresent} days</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Days Absent:</strong></td>
              <td style="text-align: right;">${stats.daysAbsent} days</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Attendance Rate:</strong></td>
              <td style="text-align: right; color: ${stats.attendanceRate >= 90 ? '#10b981' : '#f59e0b'};">${stats.attendanceRate.toFixed(1)}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Overtime Hours:</strong></td>
              <td style="text-align: right;">${(stats.overtimeMinutes / 60).toFixed(2)} hours</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Late Arrivals:</strong></td>
              <td style="text-align: right;">${stats.lateArrivals} times</td>
            </tr>
          </table>
        </div>
        <p><a href="${process.env.FRONTEND_URL}/history" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Full Report</a></p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This report is automatically generated on the 1st of every month.</p>
      </div>
    `;
    const text = `Monthly Report: ${(stats.totalMinutes / 60).toFixed(2)} hours worked, ${stats.daysPresent}/${stats.workingDays} days present, ${stats.attendanceRate.toFixed(1)}% attendance rate`;

    return await this.sendEmail({ to: user.email, subject, html, text });
  }
  
  /**
   * Send missed punch out alert
   */
  async sendMissedPunchOutAlert(user, inPunchTime, autoPunchOutTime) {
    const moment = require('moment-timezone');
    const timezone = user.profile?.timezone || 'UTC';
    const inTime = moment(inPunchTime).tz(timezone).format('hh:mm A');
    const outTime = moment(autoPunchOutTime).tz(timezone).format('hh:mm A');
    const date = moment(inPunchTime).tz(timezone).format('MMMM DD, YYYY');
    
    const subject = '⚠️ Missed Punch Out - Auto Closed';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
          <h2 style="color: #92400e; margin: 0;">⚠️ Missed Punch Out Alert</h2>
        </div>
        <p>Hi ${user.name},</p>
        <p>You forgot to punch out yesterday (${date}). Our system has automatically closed your punch at midnight.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;"><strong>Punch IN:</strong></td>
              <td style="text-align: right;">${inTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Auto Punch OUT:</strong></td>
              <td style="text-align: right;">${outTime}</td>
            </tr>
          </table>
        </div>
        <p style="color: #dc2626; font-weight: 500;">⚠️ Please remember to punch out before leaving in the future.</p>
        <p>If the auto-close time is incorrect, please contact your manager or edit the punch in the system.</p>
        <p><a href="${process.env.FRONTEND_URL}/history" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Punch History</a></p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated alert from the Time Manager system.</p>
      </div>
    `;
    const text = `Missed Punch Out Alert: You punched IN at ${inTime} on ${date} but forgot to punch OUT. System auto-closed at ${outTime}.`;

    return await this.sendEmail({ to: user.email, subject, html, text });
  }
  
  /**
   * Send punch out reminder (before midnight)
   */
  async sendPunchOutReminder(user, inPunchTime) {
    const moment = require('moment-timezone');
    const timezone = user.profile?.timezone || 'UTC';
    const inTime = moment(inPunchTime).tz(timezone).format('hh:mm A');
    const hoursSince = moment().diff(moment(inPunchTime), 'hours');
    
    const subject = '🔔 Reminder: Don\'t Forget to Punch Out';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dbeafe; padding: 20px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
          <h2 style="color: #1e40af; margin: 0;">🔔 Punch Out Reminder</h2>
        </div>
        <p>Hi ${user.name},</p>
        <p>You punched IN at <strong>${inTime}</strong> (${hoursSince} hours ago) but haven't punched OUT yet.</p>
        <p style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 3px solid #f59e0b;">
          <strong>📌 Reminder:</strong> Please don't forget to punch out before leaving for the day!
        </p>
        <p>If you've already left, you can manually punch out through the app or request your manager to add the punch.</p>
        <p><a href="${process.env.FRONTEND_URL}/punch" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Punch Out Now</a></p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">💡 Tip: Set a daily reminder on your phone to punch out!</p>
      </div>
    `;
    const text = `Reminder: You punched IN at ${inTime} but haven't punched OUT yet. Don't forget!`;

    return await this.sendEmail({ to: user.email, subject, html, text });
  }
  
  /**
   * Send open punch alert to user
   */
  async sendOpenPunchAlert(user, openPunchDetails) {
    const moment = require('moment-timezone');
    const timezone = user.profile?.timezone || 'UTC';
    const inTime = moment(openPunchDetails.punchInTime).tz(timezone).format('hh:mm A, MMMM DD');
    
    const subject = '⚠️ Open Punch Detected';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fee2e2; padding: 20px; border-left: 4px solid #dc2626; margin-bottom: 20px;">
          <h2 style="color: #991b1b; margin: 0;">⚠️ Open Punch Alert</h2>
        </div>
        <p>Hi ${user.name},</p>
        <p>We detected that you have an open punch (Punch IN without Punch OUT):</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Punch IN:</strong> ${inTime}</p>
          <p style="margin: 10px 0 0 0; color: #dc2626;"><strong>Status:</strong> Still open (${openPunchDetails.hoursSinceIn} hours ago)</p>
        </div>
        <p><strong>Action Required:</strong> Please punch out or contact your manager to resolve this issue.</p>
        <p><a href="${process.env.FRONTEND_URL}/punch" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Resolve Now</a></p>
      </div>
    `;
    const text = `Open Punch Alert: You have an open punch from ${inTime}. Please punch out.`;

    return await this.sendEmail({ to: user.email, subject, html, text });
  }
  
  /**
   * Send weekend punch warning
   */
  async sendWeekendPunchWarning(user, punchDetails) {
    const moment = require('moment-timezone');
    const timezone = user.profile?.timezone || 'UTC';
    const punchTime = moment(punchDetails.punchTime).tz(timezone).format('hh:mm A');
    const dayName = moment(punchDetails.punchTime).tz(timezone).format('dddd, MMMM DD');
    
    const subject = '📅 Weekend/Holiday Punch Recorded';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #e0e7ff; padding: 20px; border-left: 4px solid #6366f1; margin-bottom: 20px;">
          <h2 style="color: #4338ca; margin: 0;">📅 Weekend Punch Notification</h2>
        </div>
        <p>Hi ${user.name},</p>
        <p>We noticed you punched ${punchDetails.punchType} on a non-working day:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Day:</strong> ${dayName}</p>
          <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${punchTime}</p>
          <p style="margin: 10px 0 0 0; color: #6366f1;"><strong>Note:</strong> This will be recorded as overtime/extra work.</p>
        </div>
        <p>If this was unintentional, please contact your manager to remove the punch.</p>
        <p><a href="${process.env.FRONTEND_URL}/history" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Punch History</a></p>
      </div>
    `;
    const text = `Weekend Punch: You punched ${punchDetails.punchType} on ${dayName} at ${punchTime}.`;

    return await this.sendEmail({ to: user.email, subject, html, text });
  }
}

// Export singleton instance
module.exports = new EmailService();
