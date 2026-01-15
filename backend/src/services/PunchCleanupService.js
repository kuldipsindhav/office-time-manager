const moment = require('moment-timezone');
const { PunchLog, User } = require('../models');
const EmailService = require('./EmailService');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Punch Cleanup Service
 * Handles midnight auto-close and cleanup operations
 */
class PunchCleanupService {
  
  /**
   * Auto-close all open punches at midnight
   * This should run via cron job at 11:59 PM daily
   */
  static async autoCloseOpenPunches() {
    try {
      logger.info('Starting auto-close of open punches...');
      
      // Get all users
      const users = await User.find({ status: 'Active' });
      let closedCount = 0;
      const notifications = [];
      
      for (const user of users) {
        const timezone = user.profile?.timezone || config.defaults.timezone;
        
        // Get today's date bounds
        const today = moment().tz(timezone);
        const startOfDay = today.clone().startOf('day').utc().toDate();
        const endOfDay = today.clone().endOf('day').utc().toDate();
        
        // Find user's punches today
        const todayPunches = await PunchLog.find({
          userId: user._id,
          punchTime: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ punchTime: 1 });
        
        // Check if last punch is IN (open punch)
        if (todayPunches.length > 0) {
          const lastPunch = todayPunches[todayPunches.length - 1];
          
          if (lastPunch.punchType === 'IN') {
            // Auto-close at end of day (11:59 PM)
            const autoCloseTime = today.clone().endOf('day').subtract(1, 'minute').toDate();
            
            const autoPunch = await PunchLog.create({
              userId: user._id,
              punchType: 'OUT',
              punchTime: autoCloseTime,
              source: 'Admin',
              notes: 'Auto-closed by system at midnight (missed punch out)'
            });
            
            closedCount++;
            logger.info(`Auto-closed punch for user ${user.email}`);
            
            // Add to notification queue
            notifications.push({
              user,
              inPunchTime: lastPunch.punchTime,
              outPunchTime: autoPunch.punchTime
            });
          }
        }
      }
      
      // Send email notifications
      for (const notification of notifications) {
        try {
          await EmailService.sendMissedPunchOutAlert(
            notification.user,
            notification.inPunchTime,
            notification.outPunchTime
          );
        } catch (error) {
          logger.error(`Failed to send notification to ${notification.user.email}:`, error);
        }
      }
      
      logger.info(`Auto-close completed: ${closedCount} punches closed`);
      return { success: true, closedCount, notificationsSent: notifications.length };
      
    } catch (error) {
      logger.error('Error in auto-close open punches:', error);
      throw error;
    }
  }
  
  /**
   * Find users with open punches (for alerts)
   */
  static async findUsersWithOpenPunches() {
    try {
      const users = await User.find({ status: 'Active' });
      const usersWithOpenPunches = [];
      
      for (const user of users) {
        const timezone = user.profile?.timezone || config.defaults.timezone;
        const today = moment().tz(timezone);
        const startOfDay = today.clone().startOf('day').utc().toDate();
        const endOfDay = today.clone().endOf('day').utc().toDate();
        
        const todayPunches = await PunchLog.find({
          userId: user._id,
          punchTime: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ punchTime: 1 });
        
        if (todayPunches.length > 0) {
          const lastPunch = todayPunches[todayPunches.length - 1];
          
          if (lastPunch.punchType === 'IN') {
            const hoursSinceIn = moment().diff(moment(lastPunch.punchTime), 'hours', true);
            
            usersWithOpenPunches.push({
              userId: user._id,
              userName: user.name,
              email: user.email,
              punchInTime: lastPunch.punchTime,
              hoursSinceIn: Math.round(hoursSinceIn * 10) / 10,
              timezone
            });
          }
        }
      }
      
      return usersWithOpenPunches;
      
    } catch (error) {
      logger.error('Error finding users with open punches:', error);
      throw error;
    }
  }
  
  /**
   * Send reminder to users who forgot to punch out (run at 8 PM)
   */
  static async sendPunchOutReminders() {
    try {
      logger.info('Sending punch-out reminders...');
      
      const usersWithOpenPunches = await this.findUsersWithOpenPunches();
      let remindersSent = 0;
      
      for (const userData of usersWithOpenPunches) {
        // Only send if more than 8 hours since punch in
        if (userData.hoursSinceIn >= 8) {
          try {
            const user = await User.findById(userData.userId);
            await EmailService.sendPunchOutReminder(user, userData.punchInTime);
            remindersSent++;
            logger.info(`Sent reminder to ${userData.email}`);
          } catch (error) {
            logger.error(`Failed to send reminder to ${userData.email}:`, error);
          }
        }
      }
      
      logger.info(`Reminders sent: ${remindersSent}`);
      return { success: true, remindersSent };
      
    } catch (error) {
      logger.error('Error sending punch-out reminders:', error);
      throw error;
    }
  }
  
  /**
   * Clean up orphaned OUT punches (OUT without matching IN)
   */
  static async cleanupOrphanedPunches(dryRun = true) {
    try {
      logger.info(`Cleanup orphaned punches (dryRun: ${dryRun})...`);
      
      const users = await User.find({ status: 'Active' });
      const orphanedPunches = [];
      
      for (const user of users) {
        const timezone = user.profile?.timezone || config.defaults.timezone;
        
        // Get last 30 days punches
        const startDate = moment().tz(timezone).subtract(30, 'days').startOf('day').utc().toDate();
        const endDate = moment().tz(timezone).endOf('day').utc().toDate();
        
        const punches = await PunchLog.find({
          userId: user._id,
          punchTime: { $gte: startDate, $lte: endDate }
        }).sort({ punchTime: 1 });
        
        // Find orphaned OUT punches
        let expectedNext = 'IN';
        for (const punch of punches) {
          if (punch.punchType !== expectedNext) {
            orphanedPunches.push({
              punchId: punch._id,
              userId: user._id,
              userName: user.name,
              punchType: punch.punchType,
              punchTime: punch.punchTime,
              reason: `Expected ${expectedNext} but got ${punch.punchType}`
            });
          }
          expectedNext = punch.punchType === 'IN' ? 'OUT' : 'IN';
        }
      }
      
      if (!dryRun && orphanedPunches.length > 0) {
        // Mark orphaned punches with notes
        for (const orphan of orphanedPunches) {
          await PunchLog.findByIdAndUpdate(orphan.punchId, {
            notes: `[SYSTEM] Orphaned ${orphan.punchType} punch - ${orphan.reason}`
          });
        }
      }
      
      logger.info(`Found ${orphanedPunches.length} orphaned punches`);
      return { success: true, orphanedPunches, dryRun };
      
    } catch (error) {
      logger.error('Error cleaning up orphaned punches:', error);
      throw error;
    }
  }
  
  /**
   * Get punch health report for admin
   */
  static async getPunchHealthReport() {
    try {
      const usersWithOpenPunches = await this.findUsersWithOpenPunches();
      const orphanedCheck = await this.cleanupOrphanedPunches(true);
      
      // Get users with odd number of punches today
      const users = await User.find({ status: 'Active' });
      const usersWithOddPunches = [];
      
      for (const user of users) {
        const timezone = user.profile?.timezone || config.defaults.timezone;
        const today = moment().tz(timezone);
        const startOfDay = today.clone().startOf('day').utc().toDate();
        const endOfDay = today.clone().endOf('day').utc().toDate();
        
        const todayPunches = await PunchLog.find({
          userId: user._id,
          punchTime: { $gte: startOfDay, $lte: endOfDay }
        });
        
        if (todayPunches.length > 0 && todayPunches.length % 2 !== 0) {
          usersWithOddPunches.push({
            userId: user._id,
            userName: user.name,
            email: user.email,
            punchCount: todayPunches.length
          });
        }
      }
      
      return {
        timestamp: new Date().toISOString(),
        openPunches: {
          count: usersWithOpenPunches.length,
          users: usersWithOpenPunches
        },
        orphanedPunches: {
          count: orphanedCheck.orphanedPunches.length,
          punches: orphanedCheck.orphanedPunches
        },
        oddPunchCount: {
          count: usersWithOddPunches.length,
          users: usersWithOddPunches
        }
      };
      
    } catch (error) {
      logger.error('Error generating punch health report:', error);
      throw error;
    }
  }
}

module.exports = PunchCleanupService;
