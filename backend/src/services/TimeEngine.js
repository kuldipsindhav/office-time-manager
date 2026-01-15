const moment = require('moment-timezone');
const { PunchLog } = require('../models');
const config = require('../config');

/**
 * Time Calculation Engine
 * All calculations are done in UTC, displayed in user's timezone
 */
class TimeEngine {
  
  /**
   * Get user's effective timezone
   */
  static getTimezone(user) {
    return user?.profile?.timezone || config.defaults.timezone;
  }
  
  /**
   * Get user's daily work target in minutes
   */
  static getDailyWorkTarget(user) {
    return user?.profile?.dailyWorkTarget || (config.defaults.workHours * 60);
  }
  
  /**
   * Get start and end of day in UTC for user's timezone
   */
  static getDayBoundsUTC(timezone, date = null) {
    const day = date ? moment(date).tz(timezone) : moment().tz(timezone);
    return {
      start: day.clone().startOf('day').utc().toDate(),
      end: day.clone().endOf('day').utc().toDate()
    };
  }
  
  /**
   * Get today's punches for a user
   */
  static async getTodayPunches(userId, timezone) {
    const { start, end } = this.getDayBoundsUTC(timezone);
    
    return await PunchLog.find({
      userId,
      punchTime: { $gte: start, $lte: end }
    }).sort({ punchTime: 1 });
  }
  
  /**
   * Get punches for a specific date range
   */
  static async getPunchesInRange(userId, startDate, endDate, timezone) {
    const start = moment(startDate).tz(timezone).startOf('day').utc().toDate();
    const end = moment(endDate).tz(timezone).endOf('day').utc().toDate();
    
    return await PunchLog.find({
      userId,
      punchTime: { $gte: start, $lte: end }
    }).sort({ punchTime: 1 });
  }
  
  /**
   * Calculate total worked time from punches
   * Returns time in minutes
   * Enhanced with midnight cross-over handling
   */
  static calculateWorkedTime(punches, includeOpenPunch = true) {
    let totalMinutes = 0;
    let lastInPunch = null;
    
    for (const punch of punches) {
      if (punch.punchType === 'IN') {
        lastInPunch = punch;
      } else if (punch.punchType === 'OUT' && lastInPunch) {
        // Calculate duration between IN and OUT
        const duration = moment(punch.punchTime).diff(moment(lastInPunch.punchTime), 'minutes', true);
        
        // Sanity check: if duration > 24 hours, something is wrong
        if (duration > 1440) { // 24 hours
          // Don't count this session (likely missed punch)
          lastInPunch = null;
          continue;
        }
        
        totalMinutes += duration;
        lastInPunch = null;
      }
    }
    
    // If there's an open punch (IN without OUT), calculate till now
    if (includeOpenPunch && lastInPunch) {
      const duration = moment().diff(moment(lastInPunch.punchTime), 'minutes', true);
      
      // Cap at 16 hours for open punch (reasonable maximum)
      if (duration <= 960) { // 16 hours
        totalMinutes += duration;
      } else {
        // Open punch is too old, don't include in calculation
        // This prevents showing 20+ hours worked
        totalMinutes += 480; // Add default 8 hours as estimate
      }
    }
    
    return Math.max(0, totalMinutes);
  }
  
  /**
   * Get the last punch for a user
   */
  static async getLastPunch(userId) {
    return await PunchLog.findOne({ userId })
      .sort({ punchTime: -1 })
      .limit(1);
  }
  
  /**
   * Determine the next punch type based on last punch
   */
  static async getNextPunchType(userId) {
    const lastPunch = await this.getLastPunch(userId);
    
    if (!lastPunch) {
      return 'IN'; // First punch of the day
    }
    
    return lastPunch.punchType === 'IN' ? 'OUT' : 'IN';
  }
  
  /**
   * Check if double punch (within 1 minute)
   */
  static async isDoublePunch(userId, newPunchTime) {
    const lastPunch = await this.getLastPunch(userId);
    
    if (!lastPunch) {
      return false;
    }
    
    const diffSeconds = Math.abs(moment(newPunchTime).diff(moment(lastPunch.punchTime), 'seconds'));
    return diffSeconds < 60; // Block if within 60 seconds
  }
  
  /**
   * Calculate remaining work time
   */
  static calculateRemainingTime(totalWorkedMinutes, dailyTargetMinutes) {
    const remaining = dailyTargetMinutes - totalWorkedMinutes;
    return Math.max(0, remaining);
  }
  
  /**
   * Calculate predicted exit time
   */
  static calculatePredictedExitTime(punches, dailyTargetMinutes, timezone) {
    // Find the last IN punch
    const lastInPunch = [...punches].reverse().find(p => p.punchType === 'IN');
    
    if (!lastInPunch) {
      return null; // No active punch
    }
    
    // Check if there's an OUT after this IN
    const hasOutAfterIn = punches.some(p => 
      p.punchType === 'OUT' && 
      moment(p.punchTime).isAfter(moment(lastInPunch.punchTime))
    );
    
    if (hasOutAfterIn) {
      return null; // User has already punched out
    }
    
    // Calculate total worked before this punch
    const punchesBeforeLastIn = punches.filter(p => 
      moment(p.punchTime).isBefore(moment(lastInPunch.punchTime))
    );
    const workedBefore = this.calculateWorkedTime(punchesBeforeLastIn, false);
    
    // Calculate remaining time from work target
    const remainingMinutes = dailyTargetMinutes - workedBefore;
    
    // Predicted exit = lastInPunch + remainingMinutes
    const predictedExit = moment(lastInPunch.punchTime).add(remainingMinutes, 'minutes');
    
    return {
      time: predictedExit.utc().toDate(),
      timeLocal: predictedExit.tz(timezone).format('hh:mm A'),
      remainingMinutes
    };
  }
  
  /**
   * Format minutes to human-readable string
   */
  static formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours === 0) {
      return `${mins}m`;
    }
    
    return `${hours}h ${mins}m`;
  }
  
  /**
   * Get complete dashboard data for a user
   * Enhanced with issue detection
   */
  static async getDashboardData(user) {
    const timezone = this.getTimezone(user);
    const dailyTarget = this.getDailyWorkTarget(user);
    
    // Get today's punches
    const todayPunches = await this.getTodayPunches(user._id, timezone);
    
    // Get last punch
    const lastPunch = await this.getLastPunch(user._id);
    
    // Calculate worked time
    const totalWorkedMinutes = this.calculateWorkedTime(todayPunches, true);
    
    // Calculate remaining time
    const remainingMinutes = this.calculateRemainingTime(totalWorkedMinutes, dailyTarget);
    
    // Calculate predicted exit
    const predictedExit = this.calculatePredictedExitTime(todayPunches, dailyTarget, timezone);
    
    // Determine current status
    const currentStatus = lastPunch?.punchType === 'IN' ? 'WORKING' : 'NOT_WORKING';
    
    // Next punch type
    const nextPunchType = lastPunch?.punchType === 'IN' ? 'OUT' : 'IN';
    
    // Current time in user's timezone
    const currentTime = moment().tz(timezone);
    
    // Check for issues
    const hasOpenPunch = todayPunches.length > 0 && todayPunches[todayPunches.length - 1].punchType === 'IN';
    const hasOddPunchCount = todayPunches.length > 0 && todayPunches.length % 2 !== 0;
    
    // Calculate session count
    const sessionCount = Math.floor(todayPunches.length / 2) + (hasOpenPunch ? 1 : 0);
    
    return {
      currentTime: {
        utc: new Date().toISOString(),
        local: currentTime.format('YYYY-MM-DD HH:mm:ss'),
        timezone
      },
      status: currentStatus,
      nextPunchType,
      lastPunch: lastPunch ? {
        type: lastPunch.punchType,
        time: lastPunch.punchTime.toISOString(),
        timeLocal: moment(lastPunch.punchTime).tz(timezone).format('hh:mm A'),
        source: lastPunch.source
      } : null,
      todayStats: {
        totalWorkedMinutes: Math.round(totalWorkedMinutes * 100) / 100,
        totalWorkedFormatted: this.formatMinutes(totalWorkedMinutes),
        remainingMinutes: Math.round(remainingMinutes * 100) / 100,
        remainingFormatted: this.formatMinutes(remainingMinutes),
        dailyTargetMinutes: dailyTarget,
        dailyTargetFormatted: this.formatMinutes(dailyTarget),
        progressPercent: Math.min(100, Math.round((totalWorkedMinutes / dailyTarget) * 100)),
        isTargetMet: totalWorkedMinutes >= dailyTarget,
        sessionCount,
        punchCount: todayPunches.length
      },
      predictedExit: predictedExit ? {
        time: predictedExit.time.toISOString(),
        timeLocal: predictedExit.timeLocal,
        remainingMinutes: Math.round(predictedExit.remainingMinutes * 100) / 100
      } : null,
      todayPunches: todayPunches.map(p => ({
        id: p._id,
        type: p.punchType,
        time: p.punchTime.toISOString(),
        timeLocal: moment(p.punchTime).tz(timezone).format('hh:mm A'),
        source: p.source,
        edited: p.edited,
        editReason: p.editReason
      })),
      alerts: {
        hasOpenPunch,
        hasOddPunchCount,
        isWeekend: !config.defaults.workingDays.includes(currentTime.format('dddd'))
      }
    };
  }
  
  /**
   * Get weekly summary for a user
   */
  static async getWeeklySummary(user, weekOffset = 0) {
    const timezone = this.getTimezone(user);
    const dailyTarget = this.getDailyWorkTarget(user);
    const workingDays = user?.profile?.workingDays || config.defaults.workingDays;
    
    // Calculate week bounds
    const weekStart = moment().tz(timezone).subtract(weekOffset, 'weeks').startOf('week');
    const weekEnd = weekStart.clone().endOf('week');
    
    // Get all punches for the week
    const punches = await this.getPunchesInRange(
      user._id, 
      weekStart.toDate(), 
      weekEnd.toDate(), 
      timezone
    );
    
    // Group punches by day
    const dailyData = [];
    let totalWeekMinutes = 0;
    let workingDaysCount = 0;
    
    for (let i = 0; i < 7; i++) {
      const day = weekStart.clone().add(i, 'days');
      const dayName = day.format('dddd');
      const isWorkingDay = workingDays.includes(dayName);
      
      const dayStart = day.clone().startOf('day').utc().toDate();
      const dayEnd = day.clone().endOf('day').utc().toDate();
      
      const dayPunches = punches.filter(p => 
        p.punchTime >= dayStart && p.punchTime <= dayEnd
      );
      
      const workedMinutes = this.calculateWorkedTime(dayPunches, day.isSame(moment(), 'day'));
      
      if (isWorkingDay) {
        workingDaysCount++;
        totalWeekMinutes += workedMinutes;
      }
      
      dailyData.push({
        date: day.format('YYYY-MM-DD'),
        dayName,
        isWorkingDay,
        workedMinutes: Math.round(workedMinutes * 100) / 100,
        workedFormatted: this.formatMinutes(workedMinutes),
        targetMinutes: isWorkingDay ? dailyTarget : 0,
        punchCount: dayPunches.length,
        isTargetMet: workedMinutes >= dailyTarget
      });
    }
    
    const weeklyTarget = workingDaysCount * dailyTarget;
    
    return {
      weekStart: weekStart.format('YYYY-MM-DD'),
      weekEnd: weekEnd.format('YYYY-MM-DD'),
      totalWorkedMinutes: Math.round(totalWeekMinutes * 100) / 100,
      totalWorkedFormatted: this.formatMinutes(totalWeekMinutes),
      weeklyTargetMinutes: weeklyTarget,
      weeklyTargetFormatted: this.formatMinutes(weeklyTarget),
      progressPercent: Math.min(100, Math.round((totalWeekMinutes / weeklyTarget) * 100)),
      workingDaysCount,
      dailyData
    };
  }
}

module.exports = TimeEngine;
