import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import notificationService from '../../services/notificationService';

const NotificationPermissionPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [status, setStatus] = useState('default');

  useEffect(() => {
    // Check if we should show the prompt
    const checkPermission = () => {
      const permission = notificationService.getPermissionStatus();
      setStatus(permission.permission);

      // Show prompt if:
      // 1. Notifications are supported
      // 2. Permission is default (not asked yet)
      // 3. User hasn't dismissed the prompt before
      const hasSeenPrompt = localStorage.getItem('notification-prompt-seen');
      
      if (permission.supported && permission.permission === 'default' && !hasSeenPrompt) {
        // Show prompt after 5 seconds (don't annoy immediately)
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    };

    checkPermission();
  }, []);

  const handleEnable = async () => {
    const result = await notificationService.requestPermission();
    
    if (result.granted) {
      setShowPrompt(false);
      localStorage.setItem('notification-prompt-seen', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-seen', 'true');
  };

  if (!showPrompt || status !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Content */}
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Enable Notifications? 🔔
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Get reminders when you forget to punch out and receive important alerts
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Enable
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Not Now
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            You can change this anytime in settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionPrompt;
