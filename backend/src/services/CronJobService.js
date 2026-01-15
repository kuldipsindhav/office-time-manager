const cron = require('node-cron');
const { PunchCleanupService } = require('../services');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Cron Job Scheduler
 * Manages automated tasks
 */
class CronJobService {
  
  constructor() {
    this.jobs = [];
  }
  
  /**
   * Initialize all cron jobs
   */
  initializeJobs() {
    if (!config.defaults.autoCloseEnabled) {
      logger.info('Auto-close is disabled in config. Cron jobs will not start.');
      return;
    }
    
    logger.info('Initializing cron jobs...');
    
    // Job 1: Auto-close open punches at 11:59 PM daily
    const autoCloseJob = cron.schedule('59 23 * * *', async () => {
      logger.info('Running auto-close cron job...');
      try {
        const result = await PunchCleanupService.autoCloseOpenPunches();
        logger.info(`Auto-close job completed: ${result.closedCount} punches closed`);
      } catch (error) {
        logger.error('Auto-close job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: config.defaults.timezone
    });
    
    this.jobs.push({ name: 'autoClose', job: autoCloseJob });
    logger.info('✓ Auto-close job scheduled (11:59 PM daily)');
    
    // Job 2: Send punch-out reminders at 8 PM daily
    const reminderJob = cron.schedule('0 20 * * *', async () => {
      logger.info('Running punch-out reminder job...');
      try {
        const result = await PunchCleanupService.sendPunchOutReminders();
        logger.info(`Reminder job completed: ${result.remindersSent} reminders sent`);
      } catch (error) {
        logger.error('Reminder job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: config.defaults.timezone
    });
    
    this.jobs.push({ name: 'punchOutReminder', job: reminderJob });
    logger.info('✓ Punch-out reminder job scheduled (8:00 PM daily)');
    
    // Job 3: Health check every hour
    const healthCheckJob = cron.schedule('0 * * * *', async () => {
      logger.info('Running punch health check...');
      try {
        const report = await PunchCleanupService.getPunchHealthReport();
        
        // Log warnings if issues found
        if (report.openPunches.count > 10) {
          logger.warn(`⚠️ High number of open punches: ${report.openPunches.count}`);
        }
        if (report.orphanedPunches.count > 5) {
          logger.warn(`⚠️ Orphaned punches detected: ${report.orphanedPunches.count}`);
        }
        
      } catch (error) {
        logger.error('Health check job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: config.defaults.timezone
    });
    
    this.jobs.push({ name: 'healthCheck', job: healthCheckJob });
    logger.info('✓ Health check job scheduled (every hour)');
    
    // Job 4: Cleanup orphaned punches (weekly, Sunday at 1 AM)
    const cleanupJob = cron.schedule('0 1 * * 0', async () => {
      logger.info('Running orphaned punch cleanup...');
      try {
        const result = await PunchCleanupService.cleanupOrphanedPunches(false);
        logger.info(`Cleanup completed: ${result.orphanedPunches.length} punches marked`);
      } catch (error) {
        logger.error('Cleanup job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: config.defaults.timezone
    });
    
    this.jobs.push({ name: 'weeklyCleanup', job: cleanupJob });
    logger.info('✓ Weekly cleanup job scheduled (Sunday 1:00 AM)');
    
    logger.info(`📅 ${this.jobs.length} cron jobs initialized successfully`);
  }
  
  /**
   * Stop all cron jobs
   */
  stopAllJobs() {
    logger.info('Stopping all cron jobs...');
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info(`✓ Stopped: ${name}`);
    });
  }
  
  /**
   * Get job status
   */
  getJobStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.running || false
    }));
  }
}

// Export singleton instance
module.exports = new CronJobService();
