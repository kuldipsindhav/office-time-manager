const TimeEngine = require('../src/services/TimeEngine');
const moment = require('moment-timezone');

describe('TimeEngine', () => {
  describe('getTimezone', () => {
    it('should return user timezone if set', () => {
      const user = { profile: { timezone: 'America/New_York' } };
      expect(TimeEngine.getTimezone(user)).toBe('America/New_York');
    });

    it('should return default timezone if not set', () => {
      const user = { profile: {} };
      expect(TimeEngine.getTimezone(user)).toBe('Asia/Kolkata');
    });

    it('should handle null user', () => {
      expect(TimeEngine.getTimezone(null)).toBe('Asia/Kolkata');
    });
  });

  describe('getDailyWorkTarget', () => {
    it('should return user work target if set', () => {
      const user = { profile: { dailyWorkTarget: 540 } };
      expect(TimeEngine.getDailyWorkTarget(user)).toBe(540);
    });

    it('should return default work target if not set', () => {
      const user = { profile: {} };
      expect(TimeEngine.getDailyWorkTarget(user)).toBe(480);
    });
  });

  describe('calculateWorkedTime', () => {
    it('should calculate time between IN and OUT punches', () => {
      const punches = [
        { punchType: 'IN', punchTime: new Date('2024-01-01T09:00:00Z') },
        { punchType: 'OUT', punchTime: new Date('2024-01-01T17:00:00Z') }
      ];
      
      const result = TimeEngine.calculateWorkedTime(punches, false);
      expect(result).toBe(480); // 8 hours = 480 minutes
    });

    it('should handle multiple IN/OUT pairs', () => {
      const punches = [
        { punchType: 'IN', punchTime: new Date('2024-01-01T09:00:00Z') },
        { punchType: 'OUT', punchTime: new Date('2024-01-01T12:00:00Z') },
        { punchType: 'IN', punchTime: new Date('2024-01-01T13:00:00Z') },
        { punchType: 'OUT', punchTime: new Date('2024-01-01T18:00:00Z') }
      ];
      
      const result = TimeEngine.calculateWorkedTime(punches, false);
      expect(result).toBe(480); // 3 + 5 = 8 hours
    });

    it('should return 0 for empty punches', () => {
      expect(TimeEngine.calculateWorkedTime([], false)).toBe(0);
    });

    it('should ignore OUT without IN', () => {
      const punches = [
        { punchType: 'OUT', punchTime: new Date('2024-01-01T17:00:00Z') }
      ];
      
      expect(TimeEngine.calculateWorkedTime(punches, false)).toBe(0);
    });
  });

  describe('calculateRemainingTime', () => {
    it('should calculate remaining time correctly', () => {
      const result = TimeEngine.calculateRemainingTime(300, 480);
      expect(result).toBe(180); // 3 hours remaining
    });

    it('should return 0 if target is met', () => {
      const result = TimeEngine.calculateRemainingTime(500, 480);
      expect(result).toBe(0);
    });
  });

  describe('formatMinutes', () => {
    it('should format hours and minutes', () => {
      expect(TimeEngine.formatMinutes(90)).toBe('1h 30m');
    });

    it('should format only minutes if less than an hour', () => {
      expect(TimeEngine.formatMinutes(45)).toBe('45m');
    });

    it('should format full hours', () => {
      expect(TimeEngine.formatMinutes(480)).toBe('8h 0m');
    });
  });

  describe('getDayBoundsUTC', () => {
    it('should return start and end of day in UTC', () => {
      const timezone = 'Asia/Kolkata';
      const { start, end } = TimeEngine.getDayBoundsUTC(timezone);
      
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
      expect(end > start).toBe(true);
    });

    it('should handle different timezones', () => {
      const kolkata = TimeEngine.getDayBoundsUTC('Asia/Kolkata');
      const newYork = TimeEngine.getDayBoundsUTC('America/New_York');
      
      // Different timezones should have different UTC bounds for "today"
      expect(kolkata.start.getTime()).not.toBe(newYork.start.getTime());
    });
  });
});
