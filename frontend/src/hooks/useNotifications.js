import { useEffect, useCallback } from 'react';
import notificationService from '../services/notificationService';
import useNotificationStore from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

/**
 * Hook to manage both browser and in-app notifications
 */
const useNotifications = () => {
  const { user } = useAuthStore();
  const {
    addNotification,
    notifyPunchSuccess,
    notifyForgotPunchOut,
    notifyLateArrival,
    notifyOvertime,
    notifyAchievement
  } = useNotificationStore();

  // Initialize notification service
  useEffect(() => {
    if (user) {
      // Start daily reminder checks
      notificationService.scheduleDailyReminders();
    }
  }, [user]);

  /**
   * Show both browser and in-app notification
   */
  const notify = useCallback((title, options = {}) => {
    // Show browser notification if enabled
    if (notificationService.isEnabled()) {
      notificationService.show(title, options);
    }

    // Always show in-app notification
    addNotification({
      title,
      message: options.body || '',
      type: options.type || 'info',
      icon: options.icon || 'ℹ️',
      category: options.category || 'general',
      actionUrl: options.url,
      actionLabel: options.actionLabel
    });
  }, [addNotification]);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async () => {
    return await notificationService.requestPermission();
  }, []);

  /**
   * Check if notifications are enabled
   */
  const isEnabled = useCallback(() => {
    return notificationService.isEnabled();
  }, []);

  /**
   * Get permission status
   */
  const getPermissionStatus = useCallback(() => {
    return notificationService.getPermissionStatus();
  }, []);

  /**
   * Predefined notification helpers
   */
  const sendPunchSuccess = useCallback((punchType, time) => {
    // In-app notification
    notifyPunchSuccess(punchType, time);
    
    // Browser notification
    if (notificationService.isEnabled()) {
      notificationService.notifyPunchSuccess(punchType, time);
    }
  }, [notifyPunchSuccess]);

  const sendForgotPunchOut = useCallback((lastPunchTime) => {
    // In-app notification
    notifyForgotPunchOut(lastPunchTime);
    
    // Browser notification
    if (notificationService.isEnabled()) {
      notificationService.notifyForgotPunchOut(lastPunchTime);
    }
  }, [notifyForgotPunchOut]);

  const sendLateArrival = useCallback((expectedTime, actualTime) => {
    // In-app notification
    notifyLateArrival(expectedTime, actualTime);
    
    // Browser notification
    if (notificationService.isEnabled()) {
      notificationService.notifyLateArrival(expectedTime, actualTime);
    }
  }, [notifyLateArrival]);

  const sendOvertime = useCallback((extraHours) => {
    // In-app notification
    notifyOvertime(extraHours);
    
    // Browser notification
    if (notificationService.isEnabled()) {
      notificationService.notifyOvertime(extraHours);
    }
  }, [notifyOvertime]);

  const sendAchievement = useCallback((achievement) => {
    // In-app notification
    notifyAchievement(achievement);
    
    // Browser notification
    if (notificationService.isEnabled()) {
      notificationService.notifyAchievement(achievement);
    }
  }, [notifyAchievement]);

  return {
    notify,
    requestPermission,
    isEnabled,
    getPermissionStatus,
    sendPunchSuccess,
    sendForgotPunchOut,
    sendLateArrival,
    sendOvertime,
    sendAchievement
  };
};

export default useNotifications;
