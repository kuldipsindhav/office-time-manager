const express = require('express');
const router = express.Router();
const { PunchCleanupService, PunchValidator, BreakTimeService } = require('../services');
const { protect, authorize, asyncHandler } = require('../middleware');

/**
 * @route   GET /api/admin/punch-health
 * @desc    Get punch system health report
 * @access  Admin
 */
router.get('/punch-health', protect, authorize('Admin'), asyncHandler(async (req, res) => {
  const healthReport = await PunchCleanupService.getPunchHealthReport();
  
  res.json({
    success: true,
    data: healthReport
  });
}));

/**
 * @route   GET /api/admin/open-punches
 * @desc    Get all users with open punches
 * @access  Admin
 */
router.get('/open-punches', protect, authorize('Admin'), asyncHandler(async (req, res) => {
  const usersWithOpenPunches = await PunchCleanupService.findUsersWithOpenPunches();
  
  res.json({
    success: true,
    count: usersWithOpenPunches.length,
    data: usersWithOpenPunches
  });
}));

/**
 * @route   POST /api/admin/auto-close
 * @desc    Manually trigger auto-close of open punches
 * @access  Admin
 */
router.post('/auto-close', protect, authorize('Admin'), asyncHandler(async (req, res) => {
  const result = await PunchCleanupService.autoCloseOpenPunches();
  
  res.json({
    success: true,
    message: `Auto-closed ${result.closedCount} open punches`,
    data: result
  });
}));

/**
 * @route   POST /api/admin/send-reminders
 * @desc    Manually send punch-out reminders
 * @access  Admin
 */
router.post('/send-reminders', protect, authorize('Admin'), asyncHandler(async (req, res) => {
  const result = await PunchCleanupService.sendPunchOutReminders();
  
  res.json({
    success: true,
    message: `Sent ${result.remindersSent} reminders`,
    data: result
  });
}));

/**
 * @route   GET /api/admin/orphaned-punches
 * @desc    Find orphaned punches (OUT without IN)
 * @access  Admin
 */
router.get('/orphaned-punches', protect, authorize('Admin'), asyncHandler(async (req, res) => {
  const { fix = 'false' } = req.query;
  const dryRun = fix !== 'true';
  
  const result = await PunchCleanupService.cleanupOrphanedPunches(dryRun);
  
  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/admin/punch-issues/:userId
 * @desc    Get punch issues for specific user
 * @access  Admin
 */
router.get('/punch-issues/:userId', protect, authorize('Admin'), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const timezone = req.query.timezone || 'UTC';
  
  const issues = await PunchValidator.detectPunchIssues(userId, timezone);
  
  res.json({
    success: true,
    count: issues.length,
    data: issues
  });
}));

module.exports = router;
