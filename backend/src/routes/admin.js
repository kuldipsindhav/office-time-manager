const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { protect, authorize, asyncHandler } = require('../middleware');

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs
 * @access  Private/Admin
 */
router.get('/audit-logs', 
  protect, 
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      userId,
      startDate,
      endDate 
    } = req.query;
    
    const query = {};
    
    if (action) {
      query.action = action;
    }
    
    if (userId) {
      query.$or = [
        { performedBy: userId },
        { targetUser: userId }
      ];
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const total = await AuditLog.countDocuments(query);
    
    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email')
      .populate('targetUser', 'name email')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  })
);

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard stats
 * @access  Private/Admin
 */
router.get('/stats', 
  protect, 
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const { User, PunchLog, NfcTag } = require('../models');
    const moment = require('moment-timezone');
    
    // Get counts
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalNfcTags = await NfcTag.countDocuments();
    const activeNfcTags = await NfcTag.countDocuments({ isActive: true });
    
    // Today's punches
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    
    const todayPunches = await PunchLog.countDocuments({
      punchTime: { $gte: todayStart, $lte: todayEnd }
    });
    
    // Users currently working (last punch is IN)
    const lastPunches = await PunchLog.aggregate([
      { $sort: { punchTime: -1 } },
      { $group: { _id: '$userId', lastPunch: { $first: '$$ROOT' } } },
      { $match: { 'lastPunch.punchType': 'IN' } }
    ]);
    
    const usersWorking = lastPunches.length;
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        nfcTags: {
          total: totalNfcTags,
          active: activeNfcTags,
          inactive: totalNfcTags - activeNfcTags
        },
        today: {
          punches: todayPunches,
          usersWorking
        }
      }
    });
  })
);

module.exports = router;
