const express = require('express');
const router = express.Router();
const { User, AuditLog } = require('../models');
const { TimeEngine } = require('../services');
const { 
  protect, 
  authorize,
  asyncHandler,
  profileUpdateValidation,
  mongoIdValidation
} = require('../middleware');

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
router.get('/', protect, authorize('Admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, active = null } = req.query;
  
  const query = {};
  if (active !== null) {
    query.isActive = active === 'true';
  }
  
  const total = await User.countDocuments(query);
  
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));
  
  res.json({
    success: true,
    data: {
      users: users.map(u => u.toPublicJSON()),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Private (own profile or Admin)
 */
router.get('/:userId', protect, mongoIdValidation('userId'), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Check permission
  if (req.user.role !== 'Admin' && req.user._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this user'
    });
  }
  
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: {
      user: user.toPublicJSON()
    }
  });
}));

/**
 * @route   PUT /api/users/profile
 * @desc    Update own profile
 * @access  Private
 */
router.put('/profile', protect, profileUpdateValidation, asyncHandler(async (req, res) => {
  const { name, profile } = req.body;
  
  const user = req.user;
  const previousState = { name: user.name, profile: { ...user.profile } };
  
  // Update name if provided
  if (name) {
    user.name = name;
  }
  
  // Update profile settings if provided
  if (profile) {
    if (profile.timezone !== undefined) {
      user.profile.timezone = profile.timezone;
    }
    if (profile.dailyWorkTarget !== undefined) {
      user.profile.dailyWorkTarget = profile.dailyWorkTarget;
    }
    if (profile.workingDays !== undefined) {
      user.profile.workingDays = profile.workingDays;
    }
    if (profile.preferredPunchMethod !== undefined) {
      user.profile.preferredPunchMethod = profile.preferredPunchMethod;
    }
  }
  
  await user.save();
  
  // Log profile update
  await AuditLog.log({
    action: 'PROFILE_UPDATE',
    performedBy: user._id,
    targetUser: user._id,
    previousState,
    newState: { name: user.name, profile: user.profile },
    description: 'User updated profile'
  });
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.toPublicJSON()
    }
  });
}));

/**
 * @route   PUT /api/users/:userId
 * @desc    Update user (Admin only)
 * @access  Private/Admin
 */
router.put('/:userId', 
  protect, 
  authorize('Admin'), 
  mongoIdValidation('userId'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { name, role, isActive, profile } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const previousState = user.toObject();
    
    // Update fields
    if (name) user.name = name;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    
    if (profile) {
      Object.assign(user.profile, profile);
    }
    
    await user.save();
    
    // Log update
    await AuditLog.log({
      action: 'USER_UPDATE',
      performedBy: req.user._id,
      targetUser: user._id,
      resourceType: 'User',
      resourceId: user._id,
      previousState,
      newState: user.toObject(),
      description: 'Admin updated user'
    });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: user.toPublicJSON()
      }
    });
  })
);

/**
 * @route   GET /api/users/:userId/dashboard
 * @desc    Get dashboard data for a user
 * @access  Private (own data or Admin)
 */
router.get('/:userId/dashboard', protect, mongoIdValidation('userId'), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Check permission
  if (req.user.role !== 'Admin' && req.user._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this data'
    });
  }
  
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  const dashboardData = await TimeEngine.getDashboardData(user);
  
  res.json({
    success: true,
    data: dashboardData
  });
}));

/**
 * @route   GET /api/users/:userId/weekly
 * @desc    Get weekly summary for a user
 * @access  Private (own data or Admin)
 */
router.get('/:userId/weekly', protect, mongoIdValidation('userId'), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { weekOffset = 0 } = req.query;
  
  // Check permission
  if (req.user.role !== 'Admin' && req.user._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this data'
    });
  }
  
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  const weeklySummary = await TimeEngine.getWeeklySummary(user, parseInt(weekOffset));
  
  res.json({
    success: true,
    data: weeklySummary
  });
}));

/**
 * @route   DELETE /api/users/:userId
 * @desc    Deactivate user (Admin only)
 * @access  Private/Admin
 */
router.delete('/:userId', 
  protect, 
  authorize('Admin'), 
  mongoIdValidation('userId'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent self-deletion
    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }
    
    user.isActive = false;
    await user.save();
    
    // Log deletion
    await AuditLog.log({
      action: 'USER_DELETE',
      performedBy: req.user._id,
      targetUser: user._id,
      resourceType: 'User',
      resourceId: user._id,
      description: 'Admin deactivated user'
    });
    
    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  })
);

module.exports = router;
