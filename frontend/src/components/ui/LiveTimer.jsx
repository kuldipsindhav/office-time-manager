import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/**
 * Real-Time Timer Component
 * Shows live elapsed time since punch IN
 */
export const LiveTimer = ({ startTime, isActive }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsed(0);
      return;
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      const start = new Date(startTime);
      const now = new Date();
      return Math.floor((now - start) / 1000); // seconds
    };

    setElapsed(calculateElapsed());

    // Update every second
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isActive]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0')
    };
  };

  if (!isActive) return null;

  const time = formatTime(elapsed);

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600 animate-pulse" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Working since</p>
            <p className="text-xs text-gray-500">
              {new Date(startTime).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 font-mono">
          <div className="bg-white px-3 py-2 rounded shadow-sm">
            <span className="text-2xl font-bold text-gray-900">{time.hours}</span>
            <span className="text-xs text-gray-500 ml-1">h</span>
          </div>
          <span className="text-2xl font-bold text-gray-400">:</span>
          <div className="bg-white px-3 py-2 rounded shadow-sm">
            <span className="text-2xl font-bold text-gray-900">{time.minutes}</span>
            <span className="text-xs text-gray-500 ml-1">m</span>
          </div>
          <span className="text-2xl font-bold text-gray-400">:</span>
          <div className="bg-white px-3 py-2 rounded shadow-sm">
            <span className="text-2xl font-bold text-gray-900">{time.seconds}</span>
            <span className="text-xs text-gray-500 ml-1">s</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Countdown Timer Component
 * Shows countdown to predicted exit time
 */
export const CountdownTimer = ({ targetTime, label = "Time until target" }) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!targetTime) {
      setRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const target = new Date(targetTime);
      const now = new Date();
      const diff = Math.floor((target - now) / 1000); // seconds
      return Math.max(0, diff);
    };

    setRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const newRemaining = calculateRemaining();
      setRemaining(newRemaining);
      
      // Stop timer when countdown reaches 0
      if (newRemaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0')
    };
  };

  if (!targetTime) return null;

  const time = formatTime(remaining);
  const isAlmostDone = remaining < 300; // Less than 5 minutes

  return (
    <div className={`rounded-lg p-4 ${
      isAlmostDone 
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-500 mt-1">
            {remaining > 0 ? 'Time remaining' : 'Target reached!'}
          </p>
        </div>
        
        <div className="flex items-center gap-1 font-mono">
          <div className="bg-white px-2 py-1 rounded shadow-sm">
            <span className={`text-xl font-bold ${isAlmostDone ? 'text-green-600' : 'text-blue-600'}`}>
              {time.hours}
            </span>
            <span className="text-xs text-gray-500">h</span>
          </div>
          <span className="text-xl font-bold text-gray-400">:</span>
          <div className="bg-white px-2 py-1 rounded shadow-sm">
            <span className={`text-xl font-bold ${isAlmostDone ? 'text-green-600' : 'text-blue-600'}`}>
              {time.minutes}
            </span>
            <span className="text-xs text-gray-500">m</span>
          </div>
          <span className="text-xl font-bold text-gray-400">:</span>
          <div className="bg-white px-2 py-1 rounded shadow-sm">
            <span className={`text-xl font-bold ${isAlmostDone ? 'text-green-600' : 'text-blue-600'}`}>
              {time.seconds}
            </span>
            <span className="text-xs text-gray-500">s</span>
          </div>
        </div>
      </div>
      
      {isAlmostDone && remaining > 0 && (
        <div className="mt-2 text-center">
          <p className="text-xs text-green-600 font-medium animate-pulse">
            🎯 Almost there! Target completing soon.
          </p>
        </div>
      )}
      
      {remaining === 0 && (
        <div className="mt-2 text-center">
          <p className="text-xs text-green-600 font-medium">
            ✅ Daily target achieved! You can punch out now.
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveTimer;
