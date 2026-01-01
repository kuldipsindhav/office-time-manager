const express = require('express');
const router = express.Router();
const { PunchService, TimeEngine } = require('../services');
const { 
  protect, 
  authorize,
  canAccessUser,
  asyncHandler,
  punchValidation,
  punchEditValidation,
  mongoIdValidation
} = require('../middleware');

/**
 * @route   POST /api/punch
 * @desc    Create a new punch (IN or OUT)
 * @access  Private
 */
router.post('/', protect, punchValidation, asyncHandler(async (req, res) => {
  const { source = 'Manual', nfcUID, notes } = req.body;
  
  const result = await PunchService.createPunch(req.user, {
    source,
    nfcUID,
    notes
  });
  
  res.status(201).json({
    success: true,
    message: `Punch ${result.punch.type} recorded successfully`,
    data: result
  });
}));

/**
 * @route   POST /api/punch/nfc
 * @desc    Create punch via NFC scan
 * @access  Private
 */
router.post('/nfc', protect, asyncHandler(async (req, res) => {
  const { nfcUID } = req.body;
  
  if (!nfcUID) {
    return res.status(400).json({
      success: false,
      message: 'NFC UID is required'
    });
  }
  
  const result = await PunchService.createPunch(req.user, {
    source: 'NFC',
    nfcUID
  });
  
  res.status(201).json({
    success: true,
    message: `Punch ${result.punch.type} recorded via NFC`,
    data: result
  });
}));

/**
 * @route   POST /api/punch/manual
 * @desc    Create manual punch with specific time
 * @access  Private
 */
router.post('/manual', protect, asyncHandler(async (req, res) => {
  const { userId, punchType, punchTime, notes, reason } = req.body;
  
  // If userId is provided and different from current user, need admin permission
  const targetUserId = userId || req.user._id;
  
  if (targetUserId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to create punch for other users'
    });
  }
  
  if (!punchType || !punchTime) {
    return res.status(400).json({
      success: false,
      message: 'Punch type and time are required'
    });
  }
  
  const punch = await PunchService.createManualPunch(
    targetUserId,
    { punchType, punchTime, notes, reason },
    req.user
  );
  
  res.status(201).json({
    success: true,
    message: 'Manual punch created successfully',
    data: { punch }
  });
}));

/**
 * @route   PUT /api/punch/:punchId
 * @desc    Edit a punch
 * @access  Private (own punch or Admin)
 */
router.put('/:punchId', protect, punchEditValidation, asyncHandler(async (req, res) => {
  const { punchId } = req.params;
  const { punchTime, punchType, editReason } = req.body;
  
  const punch = await PunchService.editPunch(
    punchId,
    { punchTime, punchType, editReason },
    req.user
  );
  
  res.json({
    success: true,
    message: 'Punch updated successfully',
    data: { punch }
  });
}));

/**
 * @route   DELETE /api/punch/:punchId
 * @desc    Delete a punch (Admin only)
 * @access  Private/Admin
 */
router.delete('/:punchId', 
  protect, 
  authorize('Admin'),
  mongoIdValidation('punchId'),
  asyncHandler(async (req, res) => {
    const { punchId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Deletion reason is required'
      });
    }
    
    await PunchService.deletePunch(punchId, req.user, reason);
    
    res.json({
      success: true,
      message: 'Punch deleted successfully'
    });
  })
);

/**
 * @route   GET /api/punch/history
 * @desc    Get punch history for current user
 * @access  Private
 */
router.get('/history', protect, asyncHandler(async (req, res) => {
  const { startDate, endDate, page = 1, limit = 50 } = req.query;
  
  const history = await PunchService.getPunchHistory(req.user._id, {
    startDate,
    endDate,
    timezone: TimeEngine.getTimezone(req.user),
    page: parseInt(page),
    limit: parseInt(limit)
  });
  
  res.json({
    success: true,
    data: history
  });
}));

/**
 * @route   GET /api/punch/history/:userId
 * @desc    Get punch history for a specific user (Admin)
 * @access  Private/Admin
 */
router.get('/history/:userId', 
  protect, 
  authorize('Admin'),
  mongoIdValidation('userId'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const { User } = require('../models');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const history = await PunchService.getPunchHistory(userId, {
      startDate,
      endDate,
      timezone: TimeEngine.getTimezone(user),
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: history
    });
  })
);

/**
 * @route   GET /api/punch/status
 * @desc    Get current punch status
 * @access  Private
 */
router.get('/status', protect, asyncHandler(async (req, res) => {
  const nextPunchType = await TimeEngine.getNextPunchType(req.user._id);
  const lastPunch = await TimeEngine.getLastPunch(req.user._id);
  
  res.json({
    success: true,
    data: {
      nextPunchType,
      lastPunch: lastPunch ? {
        type: lastPunch.punchType,
        time: lastPunch.punchTime.toISOString(),
        source: lastPunch.source
      } : null
    }
  });
}));

module.exports = router;
