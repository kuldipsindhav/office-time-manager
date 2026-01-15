const moment = require('moment-timezone');
const { PunchLog } = require('../models');
const config = require('../config');

/**
 * Punch Validator Service
 * Validates punch operations and detects issues
 */
class PunchValidator {
  
  /**
   * Validate punch sequence (IN -> OUT -> IN pattern)
   */
  static async validatePunchSequence(userId, newPunchType, timezone) {
    const today = moment().tz(timezone);
    const startOfDay = today.clone().startOf('day').utc().toDate();
    const endOfDay = today.clone().endOf('day').utc().toDate();
    
    const todayPunches = await PunchLog.find({
      userId,
      punchTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ punchTime: 1 });
    
    if (todayPunches.length === 0) {
      // First punch of the day - should be IN
      if (newPunchType !== 'IN') {
        return {
          valid: false,
          error: 'First punch of the day must be IN',
          suggestion: 'Please punch IN first',
          severity: 'error'
        };
      }
      return { valid: true };
    }
    
    const lastPunch = todayPunches[todayPunches.length - 1];
    
    // Check sequence
    if (lastPunch.punchType === newPunchType) {
      return {
        valid: false,
        error: `Cannot punch ${newPunchType} twice in a row`,
        suggestion: `You need to punch ${newPunchType === 'IN' ? 'OUT' : 'IN'} first`,
        severity: 'error',
        lastPunch: {
          type: lastPunch.punchType,
          time: lastPunch.punchTime
        }
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if punch is within business hours
   */
  static validateBusinessHours(punchTime, timezone, businessHours = null) {
    if (!businessHours) {
      businessHours = config.defaults.businessHours || {
        start: '06:00',
        end: '23:59'
      };
    }
    
    const punchMoment = moment(punchTime).tz(timezone);
    const hour = punchMoment.hour();
    const minute = punchMoment.minute();
    const punchMinutes = hour * 60 + minute;
    
    const [startHour, startMin] = businessHours.start.split(':').map(Number);
    const [endHour, endMin] = businessHours.end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (punchMinutes < startMinutes || punchMinutes > endMinutes) {
      return {
        valid: false,
        warning: `Punch time (${punchMoment.format('hh:mm A')}) is outside business hours (${businessHours.start} - ${businessHours.end})`,
        severity: 'warning',
        requiresApproval: true
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if punch is on weekend/holiday
   */
  static validateWorkingDay(punchTime, timezone, workingDays = null) {
    if (!workingDays) {
      workingDays = config.defaults.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }
    
    const punchMoment = moment(punchTime).tz(timezone);
    const dayName = punchMoment.format('dddd');
    
    if (!workingDays.includes(dayName)) {
      return {
        valid: false,
        warning: `${dayName} is not a working day`,
        severity: 'warning',
        isWeekend: true,
        dayName
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Check for grace period (late arrival)
   */
  static checkGracePeriod(punchInTime, timezone, graceMinutes = 15, shiftStartTime = '09:00') {
    const punchMoment = moment(punchInTime).tz(timezone);
    const [startHour, startMin] = shiftStartTime.split(':').map(Number);
    
    const shiftStart = punchMoment.clone().hour(startHour).minute(startMin).second(0);
    const gracePeriodEnd = shiftStart.clone().add(graceMinutes, 'minutes');
    
    if (punchMoment.isAfter(gracePeriodEnd)) {
      const minutesLate = punchMoment.diff(shiftStart, 'minutes');
      return {
        isLate: true,
        minutesLate,
        shiftStartTime: shiftStart.format('hh:mm A'),
        actualPunchTime: punchMoment.format('hh:mm A'),
        severity: minutesLate > 30 ? 'high' : 'medium'
      };
    }
    
    return { isLate: false };
  }
  
  /**
   * Check for early departure
   */
  static checkEarlyDeparture(punchOutTime, punchInTime, timezone, minimumWorkHours = 8) {
    const punchIn = moment(punchInTime).tz(timezone);
    const punchOut = moment(punchOutTime).tz(timezone);
    
    const hoursWorked = punchOut.diff(punchIn, 'hours', true);
    
    if (hoursWorked < minimumWorkHours) {
      return {
        isEarly: true,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        minimumRequired: minimumWorkHours,
        shortBy: Math.round((minimumWorkHours - hoursWorked) * 100) / 100,
        severity: 'warning'
      };
    }
    
    return { isEarly: false, hoursWorked };
  }
  
  /**
   * Detect potential punch issues
   */
  static async detectPunchIssues(userId, timezone) {
    const today = moment().tz(timezone);
    const startOfDay = today.clone().startOf('day').utc().toDate();
    const endOfDay = today.clone().endOf('day').utc().toDate();
    
    const todayPunches = await PunchLog.find({
      userId,
      punchTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ punchTime: 1 });
    
    const issues = [];
    
    // Check for odd number of punches
    if (todayPunches.length > 0 && todayPunches.length % 2 !== 0) {
      issues.push({
        type: 'ODD_PUNCH_COUNT',
        severity: 'warning',
        message: `You have ${todayPunches.length} punches today (odd number)`,
        description: 'You may have forgotten to punch IN or OUT'
      });
    }
    
    // Check for open punch
    if (todayPunches.length > 0) {
      const lastPunch = todayPunches[todayPunches.length - 1];
      if (lastPunch.punchType === 'IN') {
        const hoursSinceIn = moment().diff(moment(lastPunch.punchTime), 'hours', true);
        
        if (hoursSinceIn > 12) {
          issues.push({
            type: 'LONG_OPEN_PUNCH',
            severity: 'error',
            message: `Punch has been open for ${Math.round(hoursSinceIn)} hours`,
            description: 'Please punch OUT or contact your manager',
            punchInTime: lastPunch.punchTime
          });
        }
      }
    }
    
    // Check for very short work sessions (< 30 minutes)
    for (let i = 0; i < todayPunches.length - 1; i += 2) {
      if (todayPunches[i].punchType === 'IN' && todayPunches[i + 1]?.punchType === 'OUT') {
        const duration = moment(todayPunches[i + 1].punchTime).diff(
          moment(todayPunches[i].punchTime),
          'minutes'
        );
        
        if (duration < 30) {
          issues.push({
            type: 'SHORT_SESSION',
            severity: 'info',
            message: `Very short work session detected (${duration} minutes)`,
            description: 'Session from ' + 
              moment(todayPunches[i].punchTime).tz(timezone).format('hh:mm A') + 
              ' to ' + 
              moment(todayPunches[i + 1].punchTime).tz(timezone).format('hh:mm A')
          });
        }
      }
    }
    
    // Check for multiple sessions
    const sessionCount = Math.floor(todayPunches.length / 2);
    if (sessionCount > 3) {
      issues.push({
        type: 'MULTIPLE_SESSIONS',
        severity: 'info',
        message: `You have ${sessionCount} work sessions today`,
        description: 'Multiple punch in/out cycles detected'
      });
    }
    
    return issues;
  }
  
  /**
   * Comprehensive punch validation (all checks)
   */
  static async validatePunch(userId, punchType, punchTime, timezone, userConfig = {}) {
    const validations = {
      sequence: await this.validatePunchSequence(userId, punchType, timezone),
      businessHours: this.validateBusinessHours(punchTime, timezone, userConfig.businessHours),
      workingDay: this.validateWorkingDay(punchTime, timezone, userConfig.workingDays),
      gracePeriod: null,
      earlyDeparture: null
    };
    
    // Check grace period only for IN punches
    if (punchType === 'IN') {
      validations.gracePeriod = this.checkGracePeriod(
        punchTime,
        timezone,
        userConfig.graceMinutes,
        userConfig.shiftStartTime
      );
    }
    
    // Check early departure only for OUT punches
    if (punchType === 'OUT') {
      const lastInPunch = await PunchLog.findOne({
        userId,
        punchType: 'IN',
        punchTime: { $lt: punchTime }
      }).sort({ punchTime: -1 });
      
      if (lastInPunch) {
        validations.earlyDeparture = this.checkEarlyDeparture(
          punchTime,
          lastInPunch.punchTime,
          timezone,
          userConfig.minimumWorkHours
        );
      }
    }
    
    // Determine overall validity
    const hasErrors = !validations.sequence.valid;
    const hasWarnings = !validations.businessHours.valid || 
                        !validations.workingDay.valid ||
                        validations.gracePeriod?.isLate ||
                        validations.earlyDeparture?.isEarly;
    
    return {
      valid: !hasErrors,
      hasWarnings,
      validations,
      summary: {
        canProceed: !hasErrors,
        requiresConfirmation: hasWarnings,
        errors: hasErrors ? [validations.sequence.error] : [],
        warnings: this.collectWarnings(validations)
      }
    };
  }
  
  /**
   * Helper: Collect all warnings from validations
   */
  static collectWarnings(validations) {
    const warnings = [];
    
    if (!validations.businessHours.valid) {
      warnings.push(validations.businessHours.warning);
    }
    
    if (!validations.workingDay.valid) {
      warnings.push(validations.workingDay.warning);
    }
    
    if (validations.gracePeriod?.isLate) {
      warnings.push(`You are ${validations.gracePeriod.minutesLate} minutes late`);
    }
    
    if (validations.earlyDeparture?.isEarly) {
      warnings.push(`Early departure: Only ${validations.earlyDeparture.hoursWorked}h worked (${validations.earlyDeparture.minimumRequired}h required)`);
    }
    
    return warnings;
  }
}

module.exports = PunchValidator;
