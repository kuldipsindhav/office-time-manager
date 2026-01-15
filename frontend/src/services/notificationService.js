/**
 * Browser Push Notification Service
 * Completely FREE alternative to email notifications
 * Works offline with service workers
 */

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.isSupported = 'Notification' in window;
    this.init();
  }

  /**
   * Initialize notification service
   */
  async init() {
    if (!this.isSupported) {
      console.warn('Browser notifications not supported');
      return;
    }

    this.permission = Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!this.isSupported) {
      return { granted: false, message: 'Notifications not supported in this browser' };
    }

    if (this.permission === 'granted') {
      return { granted: true, message: 'Permission already granted' };
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        // Show a test notification
        this.show('Notifications Enabled! 🎉', {
          body: 'You will now receive punch reminders and alerts',
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png'
        });
        return { granted: true, message: 'Notifications enabled successfully' };
      } else if (permission === 'denied') {
        return { granted: false, message: 'Notifications blocked. Please enable in browser settings.' };
      } else {
        return { granted: false, message: 'Notification permission dismissed' };
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { granted: false, message: 'Failed to request permission' };
    }
  }

  /**
   * Show a browser notification
   */
  show(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.log('Cannot show notification:', title, options);
      return null;
    }

    const defaultOptions = {
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      tag: 'office-time-manager',
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);

      // Auto close after 10 seconds if not interacted
      if (!defaultOptions.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }

      // Handle click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        // Navigate to specific page if URL provided
        if (options.url) {
          window.location.href = options.url;
        }
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Predefined notification templates
   */

  // Forgot to punch out reminder
  notifyForgotPunchOut(lastPunchTime) {
    return this.show('⚠️ Forgot to Punch Out?', {
      body: `You punched in at ${lastPunchTime} but haven't punched out yet.`,
      icon: '/icons/icon-192.png',
      tag: 'forgot-punch-out',
      requireInteraction: true,
      url: '/punch',
      actions: [
        { action: 'punch-out', title: 'Punch Out Now' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }

  // Late arrival notification
  notifyLateArrival(expectedTime, actualTime) {
    return this.show('⏰ Late Arrival', {
      body: `Expected: ${expectedTime}, Arrived: ${actualTime}`,
      icon: '/icons/icon-192.png',
      tag: 'late-arrival',
      badge: '/icons/badge-72.png'
    });
  }

  // Punch recorded successfully
  notifyPunchSuccess(punchType, time) {
    return this.show(`✅ Punch ${punchType} Recorded`, {
      body: `Successfully punched ${punchType.toLowerCase()} at ${time}`,
      icon: '/icons/icon-192.png',
      tag: 'punch-success',
      silent: true
    });
  }

  // Daily reminder to punch in (if not punched by 9:30 AM)
  notifyMorningReminder() {
    return this.show('🌅 Good Morning!', {
      body: 'Don\'t forget to punch in for the day',
      icon: '/icons/icon-192.png',
      tag: 'morning-reminder',
      requireInteraction: true,
      url: '/punch'
    });
  }

  // Evening reminder to punch out (if still punched in after 7 PM)
  notifyEveningReminder() {
    return this.show('🌆 End of Day Reminder', {
      body: 'Remember to punch out before leaving',
      icon: '/icons/icon-192.png',
      tag: 'evening-reminder',
      requireInteraction: true,
      url: '/punch',
      vibrate: [300, 100, 300]
    });
  }

  // Weekly summary notification
  notifyWeeklySummary(hoursWorked, daysPresent) {
    return this.show('📊 Weekly Summary', {
      body: `This week: ${hoursWorked} hours worked, ${daysPresent} days present`,
      icon: '/icons/icon-192.png',
      tag: 'weekly-summary',
      url: '/history'
    });
  }

  // Overtime alert
  notifyOvertime(extraHours) {
    return this.show('⚡ Overtime Alert', {
      body: `You've worked ${extraHours} extra hours today. Great work!`,
      icon: '/icons/icon-192.png',
      tag: 'overtime-alert',
      badge: '/icons/badge-72.png'
    });
  }

  // Achievement unlocked
  notifyAchievement(achievement) {
    return this.show(`🏆 Achievement Unlocked!`, {
      body: achievement,
      icon: '/icons/icon-192.png',
      tag: 'achievement',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200]
    });
  }

  /**
   * Schedule notifications
   */
  scheduleDailyReminders() {
    // Check every 30 minutes if user needs reminders
    const checkInterval = 30 * 60 * 1000; // 30 minutes

    setInterval(() => {
      this.checkAndNotify();
    }, checkInterval);

    // Also check immediately
    this.checkAndNotify();
  }

  async checkAndNotify() {
    if (this.permission !== 'granted') return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Morning reminder at 9:30 AM if not punched in
    if (hours === 9 && minutes === 30) {
      const lastPunch = await this.getLastPunchFromStorage();
      if (!lastPunch || !this.isPunchedInToday(lastPunch)) {
        this.notifyMorningReminder();
      }
    }

    // Evening reminder at 7:00 PM if still punched in
    if (hours === 19 && minutes === 0) {
      const lastPunch = await this.getLastPunchFromStorage();
      if (lastPunch && this.isPunchedInToday(lastPunch)) {
        this.notifyEveningReminder();
      }
    }
  }

  /**
   * Helper methods
   */
  async getLastPunchFromStorage() {
    // This will be integrated with your API
    const lastPunchStr = localStorage.getItem('lastPunch');
    return lastPunchStr ? JSON.parse(lastPunchStr) : null;
  }

  isPunchedInToday(punch) {
    if (!punch) return false;
    
    const punchDate = new Date(punch.punchTime);
    const today = new Date();
    
    return punchDate.toDateString() === today.toDateString() 
      && punch.punchType === 'IN';
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.isSupported && this.permission === 'granted';
  }

  /**
   * Get current permission status
   */
  getPermissionStatus() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      enabled: this.isEnabled()
    };
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
