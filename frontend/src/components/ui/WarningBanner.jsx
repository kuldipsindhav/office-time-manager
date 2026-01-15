import React from 'react';
import { AlertTriangle, AlertCircle, Info, Clock, Calendar } from 'lucide-react';
import { Badge } from '../ui';

/**
 * Warning Banner Component
 * Displays various punch-related warnings and alerts
 */
export const WarningBanner = ({ type, message, details, onDismiss }) => {
  const getConfig = () => {
    switch (type) {
      case 'OPEN_PUNCH':
        return {
          icon: Clock,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-400',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600'
        };
      case 'ODD_PUNCH_COUNT':
        return {
          icon: AlertCircle,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-400',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600'
        };
      case 'WEEKEND_WORK':
        return {
          icon: Calendar,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-400',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
      case 'LATE_ARRIVAL':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-400',
          textColor: 'text-red-800',
          iconColor: 'text-red-600'
        };
      case 'EARLY_DEPARTURE':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-400',
          textColor: 'text-amber-800',
          iconColor: 'text-amber-600'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-400',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border-l-4 ${config.borderColor} p-4 rounded-r-lg mb-4`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.textColor}`}>
            {message}
          </h3>
          {details && (
            <div className={`mt-2 text-sm ${config.textColor} opacity-90`}>
              {details}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`ml-3 ${config.textColor} hover:opacity-75`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Punch Issues List Component
 */
export const PunchIssuesList = ({ issues }) => {
  if (!issues || issues.length === 0) return null;

  return (
    <div className="space-y-2">
      {issues.map((issue, index) => (
        <WarningBanner
          key={index}
          type={issue.type}
          message={issue.message}
          details={issue.description}
        />
      ))}
    </div>
  );
};

/**
 * Validation Warnings Component
 */
export const ValidationWarnings = ({ warnings }) => {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">
            Please Note:
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

/**
 * Dashboard Alerts Component
 */
export const DashboardAlerts = ({ alerts }) => {
  if (!alerts) return null;

  const { hasOpenPunch, hasOddPunchCount, isWeekend } = alerts;
  const hasAlerts = hasOpenPunch || hasOddPunchCount || isWeekend;

  if (!hasAlerts) return null;

  return (
    <div className="space-y-3">
      {hasOpenPunch && (
        <WarningBanner
          type="OPEN_PUNCH"
          message="You have an open punch"
          details="Don't forget to punch OUT before leaving!"
        />
      )}

      {hasOddPunchCount && (
        <WarningBanner
          type="ODD_PUNCH_COUNT"
          message="Incomplete punch cycle"
          details="You have an odd number of punches today. Make sure to complete your IN/OUT pairs."
        />
      )}

      {isWeekend && (
        <WarningBanner
          type="WEEKEND_WORK"
          message="Weekend/Holiday Work"
          details="Today is not a working day. This will be counted as overtime."
        />
      )}
    </div>
  );
};

/**
 * Punch Confirmation Modal Component
 */
export const PunchConfirmationModal = ({ isOpen, onClose, onConfirm, warnings, punchType }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Confirm Punch {punchType}
        </h3>
        
        <ValidationWarnings warnings={warnings} />
        
        <p className="text-gray-600 mb-6">
          There are some warnings about this punch. Do you want to proceed anyway?
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarningBanner;
