import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * In-App Notification Store
 * Stores notifications that appear in the app (notification center)
 */
const useNotificationStore = create(
  persist(
    (set, get) => ({
      // Notifications array
      notifications: [],
      
      // Unread count
      unreadCount: 0,

      // Notification center open state
      isOpen: false,

      /**
       * Add a new notification
       */
      addNotification: (notification) => {
        const newNotification = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          read: false,
          ...notification
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
          unreadCount: state.unreadCount + 1
        }));

        return newNotification;
      },

      /**
       * Mark notification as read
       */
      markAsRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((notif) =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }));
      },

      /**
       * Mark all as read
       */
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((notif) => ({ ...notif, read: true })),
          unreadCount: 0
        }));
      },

      /**
       * Delete a notification
       */
      deleteNotification: (notificationId) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === notificationId);
          const wasUnread = notification && !notification.read;

          return {
            notifications: state.notifications.filter((n) => n.id !== notificationId),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
          };
        });
      },

      /**
       * Clear all notifications
       */
      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      /**
       * Toggle notification center
       */
      toggleNotificationCenter: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      /**
       * Open notification center
       */
      openNotificationCenter: () => {
        set({ isOpen: true });
      },

      /**
       * Close notification center
       */
      closeNotificationCenter: () => {
        set({ isOpen: false });
      },

      /**
       * Predefined notification types
       */
      notifyPunchSuccess: (punchType, time) => {
        return get().addNotification({
          type: 'success',
          title: `Punch ${punchType} Recorded`,
          message: `Successfully punched ${punchType.toLowerCase()} at ${time}`,
          icon: '✅',
          category: 'punch'
        });
      },

      notifyForgotPunchOut: (lastPunchTime) => {
        return get().addNotification({
          type: 'warning',
          title: 'Forgot to Punch Out?',
          message: `You punched in at ${lastPunchTime} but haven't punched out yet.`,
          icon: '⚠️',
          category: 'reminder',
          priority: 'high',
          actionLabel: 'Punch Out',
          actionUrl: '/punch'
        });
      },

      notifyLateArrival: (expectedTime, actualTime) => {
        return get().addNotification({
          type: 'info',
          title: 'Late Arrival',
          message: `Expected: ${expectedTime}, Arrived: ${actualTime}`,
          icon: '⏰',
          category: 'attendance'
        });
      },

      notifyWeeklySummary: (stats) => {
        return get().addNotification({
          type: 'info',
          title: 'Weekly Summary',
          message: `${stats.hoursWorked} hours worked, ${stats.daysPresent} days present`,
          icon: '📊',
          category: 'report',
          actionLabel: 'View Details',
          actionUrl: '/history'
        });
      },

      notifyOvertime: (extraHours) => {
        return get().addNotification({
          type: 'success',
          title: 'Overtime Alert',
          message: `You've worked ${extraHours} extra hours today. Great work!`,
          icon: '⚡',
          category: 'achievement'
        });
      },

      notifyAchievement: (achievement) => {
        return get().addNotification({
          type: 'success',
          title: 'Achievement Unlocked!',
          message: achievement,
          icon: '🏆',
          category: 'achievement',
          priority: 'high'
        });
      },

      notifyError: (message) => {
        return get().addNotification({
          type: 'error',
          title: 'Error',
          message,
          icon: '❌',
          category: 'system'
        });
      },

      notifyInfo: (title, message) => {
        return get().addNotification({
          type: 'info',
          title,
          message,
          icon: 'ℹ️',
          category: 'info'
        });
      },

      /**
       * Get unread notifications
       */
      getUnreadNotifications: () => {
        return get().notifications.filter((n) => !n.read);
      },

      /**
       * Get notifications by category
       */
      getNotificationsByCategory: (category) => {
        return get().notifications.filter((n) => n.category === category);
      }
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount
      })
    }
  )
);

export default useNotificationStore;
