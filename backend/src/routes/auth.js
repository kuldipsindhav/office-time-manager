const express = require('express');
const router = express.Router();
const { User, AuditLog } = require('../models');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  protect 
} = require('../middleware/auth');
const { 
  registerValidation, 
  loginValidation,
  asyncHandler 
} = require('../middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  
  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }
  
  // Create user
  const user = await User.create({
    name,
    email,
    password
  });
  
  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: user.toPublicJSON(),
      accessToken,
      refreshToken
    }
  });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Find user with password
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }
  
  // Check if account is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Account is deactivated. Please contact admin.'
    });
  }
  
  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }
  
  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();
  
  // Log login
  await AuditLog.log({
    action: 'LOGIN',
    performedBy: user._id,
    targetUser: user._id,
    description: 'User logged in'
  });
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toPublicJSON(),
      accessToken,
      refreshToken
    }
  });
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }
  
  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
  
  // Find user
  const user = await User.findById(decoded.id).select('+refreshToken');
  
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
  
  // Generate new tokens
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  
  // Save new refresh token
  user.refreshToken = newRefreshToken;
  await user.save();
  
  res.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }
  });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', protect, asyncHandler(async (req, res) => {
  // Clear refresh token
  req.user.refreshToken = null;
  await req.user.save();
  
  // Log logout
  await AuditLog.log({
    action: 'LOGOUT',
    performedBy: req.user._id,
    targetUser: req.user._id,
    description: 'User logged out'
  });
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', protect, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.toPublicJSON()
    }
  });
}));

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters'
    });
  }
  
  // Get user with password
  const user = await User.findById(req.user._id).select('+password');
  
  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }
  
  // Update password
  user.password = newPassword;
  await user.save();
  
  // Log password change
  await AuditLog.log({
    action: 'PASSWORD_CHANGE',
    performedBy: req.user._id,
    targetUser: req.user._id,
    description: 'User changed password'
  });
  
  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

module.exports = router;
