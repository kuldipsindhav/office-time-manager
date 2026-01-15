import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner } from '../ui';
import { PunchIssuesList, ValidationWarnings } from '../ui/WarningBanner';
import { LiveTimer } from '../ui/LiveTimer';
import { useNfc, useDashboard } from '../../hooks';
import useNotifications from '../../hooks/useNotifications';
import { punchService, nfcService } from '../../services';
import toast from 'react-hot-toast';

export const PunchPage = () => {
  const { dashboard, refresh } = useDashboard();
  const { isSupported, isReading, startReading, stopReading, error: nfcError } = useNfc();
  const { sendPunchSuccess } = useNotifications();
  const [punching, setPunching] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [punchWarnings, setPunchWarnings] = useState([]);
  const [punchIssues, setPunchIssues] = useState([]);

  useEffect(() => {
    if (isSupported) {
      startReading(handleNfcRead, handleNfcError);
    }

    return () => {
      if (isReading) {
        stopReading();
      }
    };
  }, [isSupported]);

  const handleNfcRead = async (uid) => {
    try {
      setPunching(true);
      const response = await nfcService.punchWithNfc(uid);
      
      setLastAction({
        success: true,
        message: response.message,
        punchType: response.data.punch.type,
        time: response.data.punch.timeLocal
      });
      
      toast.success(response.message);
      
      // Send notification
      sendPunchSuccess(response.data.punch.type, response.data.punch.timeLocal);
      
      refresh();
    } catch (error) {
      setLastAction({
        success: false,
        message: error.response?.data?.message || 'NFC punch failed'
      });
      toast.error(error.response?.data?.message || 'NFC punch failed');
    } finally {
      setPunching(false);
    }
  };

  const handleNfcError = (error) => {
    toast.error(error.message || 'NFC read error');
  };

  const handleManualPunch = async () => {
    try {
      setPunching(true);
      const response = await punchService.punch('Manual');
      
      setLastAction({
        success: true,
        message: response.message,
        punchType: response.data.punch.type,
        time: response.data.punch.timeLocal
      });
      
      // Set warnings and issues from response
      if (response.data.warnings && response.data.warnings.length > 0) {
        setPunchWarnings(response.data.warnings);
        toast.warning('Punch recorded with warnings');
      } else {
        setPunchWarnings([]);
        toast.success(response.message);
      }
      
      if (response.data.issues && response.data.issues.length > 0) {
        setPunchIssues(response.data.issues);
      } else {
        setPunchIssues([]);
      }
      
      // Send notification
      sendPunchSuccess(response.data.punch.type, response.data.punch.timeLocal);
      
      refresh();
    } catch (error) {
      setLastAction({
        success: false,
        message: error.response?.data?.message || 'Punch failed'
      });
      
      // Handle validation errors
      if (error.response?.data?.code === 'VALIDATION_ERROR') {
        toast.error(error.response.data.message);
      } else {
        toast.error(error.response?.data?.message || 'Punch failed');
      }
    } finally {
      setPunching(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Punch In / Out</h1>
        <p className="text-gray-500 mt-1">
          Use NFC or manual button to record your attendance
        </p>
      </div>

      {/* Current Status */}
      <Card className="p-6">
        <div className="text-center">
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
            dashboard?.status === 'WORKING' ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Clock className={`w-12 h-12 ${
              dashboard?.status === 'WORKING' ? 'text-green-600' : 'text-gray-400'
            }`} />
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-center gap-2">
              <span className={`status-indicator ${
                dashboard?.status === 'WORKING' ? 'status-working' : 'status-not-working'
              }`}></span>
              <span className="text-lg font-semibold text-gray-900">
                {dashboard?.status === 'WORKING' ? 'Currently Working' : 'Not Working'}
              </span>
            </div>
            <p className="text-gray-500 mt-2">
              Today: {dashboard?.todayStats?.totalWorkedFormatted || '0h 0m'}
            </p>
            {dashboard?.todayStats?.sessionCount > 1 && (
              <p className="text-sm text-blue-600 mt-1">
                {dashboard.todayStats.sessionCount} sessions today
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Live Timer */}
      {dashboard?.status === 'WORKING' && dashboard?.lastPunch && (
        <LiveTimer
          startTime={dashboard.lastPunch.time}
          isActive={true}
        />
      )}

      {/* Punch Warnings */}
      {punchWarnings.length > 0 && (
        <ValidationWarnings warnings={punchWarnings} />
      )}

      {/* Punch Issues */}
      {punchIssues.length > 0 && (
        <PunchIssuesList issues={punchIssues} />
      )}

      {/* NFC Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSupported ? (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isReading ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <Wifi className={`w-6 h-6 ${
                  isReading ? 'text-green-600' : 'text-yellow-600'
                }`} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100">
                <WifiOff className="w-6 h-6 text-red-600" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">
                {isSupported ? 'NFC Available' : 'NFC Not Available'}
              </p>
              <p className="text-sm text-gray-500">
                {isSupported
                  ? isReading
                    ? 'Waiting for NFC tag...'
                    : 'NFC reader is ready'
                  : 'Use manual punch instead'
                }
              </p>
            </div>
          </div>
          {isSupported && (
            <Badge variant={isReading ? 'success' : 'warning'}>
              {isReading ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>

        {isSupported && isReading && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
            <div className="animate-pulse">
              <Wifi className="w-8 h-8 text-blue-500 mx-auto" />
              <p className="text-blue-700 font-medium mt-2">
                Hold your NFC card near the device
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Punch Button */}
      <Card className="p-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Next punch: <span className="font-semibold text-gray-900">
              {dashboard?.nextPunchType || 'IN'}
            </span>
          </p>
          
          <Button
            variant={dashboard?.nextPunchType === 'IN' ? 'success' : 'danger'}
            size="lg"
            onClick={handleManualPunch}
            loading={punching}
            className="w-full sm:w-auto min-w-[200px] punch-button-pulse"
          >
            {punching ? 'Processing...' : `Punch ${dashboard?.nextPunchType || 'IN'}`}
          </Button>

          <p className="text-sm text-gray-500 mt-4">
            This will record a manual punch
          </p>
        </div>
      </Card>

      {/* Last Action */}
      {lastAction && (
        <Card className={`p-6 ${lastAction.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-4">
            {lastAction.success ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
            <div>
              <p className={`font-medium ${lastAction.success ? 'text-green-900' : 'text-red-900'}`}>
                {lastAction.message}
              </p>
              {lastAction.success && lastAction.time && (
                <p className="text-sm text-gray-600">
                  {lastAction.punchType} at {lastAction.time}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Today's Punches */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Today's Punches</h3>
        
        {!dashboard?.todayPunches?.length ? (
          <p className="text-gray-500 text-center py-4">No punches recorded today</p>
        ) : (
          <div className="space-y-2">
            {dashboard.todayPunches.map((punch) => (
              <div
                key={punch.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    punch.type === 'IN' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-xs font-bold ${
                      punch.type === 'IN' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {punch.type}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">{punch.timeLocal}</span>
                </div>
                <Badge variant="info">{punch.source}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PunchPage;
