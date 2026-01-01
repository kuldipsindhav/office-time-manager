const express = require('express');
const router = express.Router();
const { TimeEngine } = require('../services');
const { protect, asyncHandler } = require('../middleware');

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard data for current user
 * @access  Private
 */
router.get('/', protect, asyncHandler(async (req, res) => {
  const dashboardData = await TimeEngine.getDashboardData(req.user);
  
  res.json({
    success: true,
    data: dashboardData
  });
}));

/**
 * @route   GET /api/dashboard/weekly
 * @desc    Get weekly summary for current user
 * @access  Private
 */
router.get('/weekly', protect, asyncHandler(async (req, res) => {
  const { weekOffset = 0 } = req.query;
  
  const weeklySummary = await TimeEngine.getWeeklySummary(req.user, parseInt(weekOffset));
  
  res.json({
    success: true,
    data: weeklySummary
  });
}));

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get quick stats for current user
 * @access  Private
 */
router.get('/stats', protect, asyncHandler(async (req, res) => {
  const timezone = TimeEngine.getTimezone(req.user);
  const dailyTarget = TimeEngine.getDailyWorkTarget(req.user);
  
  // Get today's punches
  const todayPunches = await TimeEngine.getTodayPunches(req.user._id, timezone);
  
  // Calculate worked time
  const totalWorkedMinutes = TimeEngine.calculateWorkedTime(todayPunches, true);
  
  // Get last punch
  const lastPunch = await TimeEngine.getLastPunch(req.user._id);
  
  res.json({
    success: true,
    data: {
      totalWorkedMinutes: Math.round(totalWorkedMinutes * 100) / 100,
      totalWorkedFormatted: TimeEngine.formatMinutes(totalWorkedMinutes),
      remainingMinutes: Math.max(0, dailyTarget - totalWorkedMinutes),
      progressPercent: Math.min(100, Math.round((totalWorkedMinutes / dailyTarget) * 100)),
      currentStatus: lastPunch?.punchType === 'IN' ? 'WORKING' : 'NOT_WORKING',
      punchCount: todayPunches.length
    }
  });
}));

module.exports = router;
