require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/office-time-manager'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },
  
  defaults: {
    timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
    workHours: parseInt(process.env.DEFAULT_WORK_HOURS) || 8,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    businessHours: {
      start: process.env.BUSINESS_HOURS_START || '06:00',
      end: process.env.BUSINESS_HOURS_END || '23:59'
    },
    graceMinutes: parseInt(process.env.GRACE_PERIOD_MINUTES) || 15,
    shiftStartTime: process.env.SHIFT_START_TIME || '09:00',
    minimumWorkHours: parseInt(process.env.MINIMUM_WORK_HOURS) || 8,
    autoCloseEnabled: process.env.AUTO_CLOSE_ENABLED !== 'false', // true by default
    punchOutReminderTime: process.env.PUNCH_OUT_REMINDER_TIME || '20:00' // 8 PM
  }
};
