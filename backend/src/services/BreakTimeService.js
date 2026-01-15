const moment = require('moment-timezone');
const { PunchLog } = require('../models');

/**
 * Break Time Tracking Service
 * Tracks and analyzes break patterns
 */
class BreakTimeService {
  
  /**
   * Analyze breaks from punch data
   */
  static analyzeBreaks(punches, timezone) {
    const breaks = [];
    
    for (let i = 0; i < punches.length - 1; i++) {
      if (punches[i].punchType === 'OUT' && punches[i + 1]?.punchType === 'IN') {
        const breakStart = moment(punches[i].punchTime).tz(timezone);
        const breakEnd = moment(punches[i + 1].punchTime).tz(timezone);
        const durationMinutes = breakEnd.diff(breakStart, 'minutes');
        
        breaks.push({
          startTime: breakStart.format('hh:mm A'),
          endTime: breakEnd.format('hh:mm A'),
          durationMinutes,
          durationFormatted: this.formatBreakDuration(durationMinutes),
          type: this.categorizeBreak(durationMinutes),
          isLongBreak: durationMinutes > 60
        });
      }
    }
    
    return breaks;
  }
  
  /**
   * Categorize break by duration
   */
  static categorizeBreak(durationMinutes) {
    if (durationMinutes <= 15) return 'Short Break';
    if (durationMinutes <= 30) return 'Tea Break';
    if (durationMinutes <= 60) return 'Lunch Break';
    if (durationMinutes <= 120) return 'Extended Break';
    return 'Long Absence';
  }
  
  /**
   * Format break duration
   */
  static formatBreakDuration(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  
  /**
   * Get today's breaks for a user
   */
  static async getTodayBreaks(userId, timezone) {
    const today = moment().tz(timezone);
    const startOfDay = today.clone().startOf('day').utc().toDate();
    const endOfDay = today.clone().endOf('day').utc().toDate();
    
    const punches = await PunchLog.find({
      userId,
      punchTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ punchTime: 1 });
    
    const breaks = this.analyzeBreaks(punches, timezone);
    
    // Calculate total break time
    const totalBreakMinutes = breaks.reduce((sum, br) => sum + br.durationMinutes, 0);
    
    return {
      breaks,
      totalBreakMinutes,
      totalBreakFormatted: this.formatBreakDuration(totalBreakMinutes),
      breakCount: breaks.length
    };
  }
  
  /**
   * Get break statistics for date range
   */
  static async getBreakStatistics(userId, startDate, endDate, timezone) {
    const start = moment(startDate).tz(timezone).startOf('day').utc().toDate();
    const end = moment(endDate).tz(timezone).endOf('day').utc().toDate();
    
    const punches = await PunchLog.find({
      userId,
      punchTime: { $gte: start, $lte: end }
    }).sort({ punchTime: 1 });
    
    // Group punches by day
    const dailyBreaks = {};
    
    punches.forEach(punch => {
      const date = moment(punch.punchTime).tz(timezone).format('YYYY-MM-DD');
      if (!dailyBreaks[date]) {
        dailyBreaks[date] = [];
      }
      dailyBreaks[date].push(punch);
    });
    
    // Analyze each day
    const breakStats = [];
    let totalBreakMinutes = 0;
    let totalBreaks = 0;
    
    Object.keys(dailyBreaks).forEach(date => {
      const dayBreaks = this.analyzeBreaks(dailyBreaks[date], timezone);
      const dayBreakMinutes = dayBreaks.reduce((sum, br) => sum + br.durationMinutes, 0);
      
      breakStats.push({
        date,
        breaks: dayBreaks,
        totalBreakMinutes: dayBreakMinutes,
        breakCount: dayBreaks.length
      });
      
      totalBreakMinutes += dayBreakMinutes;
      totalBreaks += dayBreaks.length;
    });
    
    const avgBreakMinutes = breakStats.length > 0 ? totalBreakMinutes / breakStats.length : 0;
    
    return {
      dateRange: {
        start: moment(start).tz(timezone).format('YYYY-MM-DD'),
        end: moment(end).tz(timezone).format('YYYY-MM-DD')
      },
      totalBreakMinutes,
      totalBreakFormatted: this.formatBreakDuration(totalBreakMinutes),
      totalBreaks,
      averageBreakMinutes: Math.round(avgBreakMinutes),
      averageBreakFormatted: this.formatBreakDuration(Math.round(avgBreakMinutes)),
      dailyBreaks: breakStats
    };
  }
  
  /**
   * Check if current break is unusually long
   */
  static async checkLongBreak(userId, timezone) {
    const today = moment().tz(timezone);
    const startOfDay = today.clone().startOf('day').utc().toDate();
    const endOfDay = today.clone().endOf('day').utc().toDate();
    
    const punches = await PunchLog.find({
      userId,
      punchTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ punchTime: -1 });
    
    if (punches.length === 0) return null;
    
    const lastPunch = punches[0];
    
    // Check if last punch was OUT (user is on break)
    if (lastPunch.punchType === 'OUT') {
      const breakDuration = moment().diff(moment(lastPunch.punchTime), 'minutes');
      
      // Alert if break is longer than 90 minutes
      if (breakDuration > 90) {
        return {
          onLongBreak: true,
          breakStartTime: moment(lastPunch.punchTime).tz(timezone).format('hh:mm A'),
          breakDuration,
          breakDurationFormatted: this.formatBreakDuration(breakDuration),
          alert: breakDuration > 120 ? 'Break exceeds 2 hours' : 'Extended break detected'
        };
      }
    }
    
    return null;
  }
}

module.exports = BreakTimeService;
