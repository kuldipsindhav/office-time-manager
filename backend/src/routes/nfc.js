const express = require('express');
const router = express.Router();
const { NfcService, PunchService } = require('../services');
const { 
  protect, 
  authorize,
  asyncHandler,
  nfcTagValidation,
  mongoIdValidation
} = require('../middleware');

/**
 * @route   POST /api/nfc/register
 * @desc    Register a new NFC tag
 * @access  Private/Admin
 */
router.post('/register', 
  protect, 
  authorize('Admin'),
  nfcTagValidation,
  asyncHandler(async (req, res) => {
    const { uid, userId, label } = req.body;
    
    const tag = await NfcService.registerTag(
      { uid, userId, label },
      req.user
    );
    
    res.status(201).json({
      success: true,
      message: 'NFC tag registered successfully',
      data: { tag }
    });
  })
);

/**
 * @route   POST /api/nfc/validate
 * @desc    Validate NFC tag and get user info
 * @access  Public (for NFC reader devices)
 */
router.post('/validate', asyncHandler(async (req, res) => {
  const { uid } = req.body;
  
  if (!uid) {
    return res.status(400).json({
      success: false,
      message: 'NFC UID is required'
    });
  }
  
  const result = await NfcService.validateForPunch(uid);
  
  if (!result.valid) {
    return res.status(400).json({
      success: false,
      message: result.error
    });
  }
  
  res.json({
    success: true,
    data: {
      user: {
        id: result.user._id,
        name: result.user.name,
        email: result.user.email
      },
      tag: {
        uid: result.tag.uid,
        label: result.tag.label
      }
    }
  });
}));

/**
 * @route   POST /api/nfc/punch
 * @desc    Quick punch using NFC (validate + punch in one call)
 * @access  Public (for NFC reader devices)
 */
router.post('/punch', asyncHandler(async (req, res) => {
  const { uid } = req.body;
  
  if (!uid) {
    return res.status(400).json({
      success: false,
      message: 'NFC UID is required'
    });
  }
  
  // Validate NFC tag
  const validation = await NfcService.validateForPunch(uid);
  
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.error
    });
  }
  
  // Create punch
  const result = await PunchService.createPunch(validation.user, {
    source: 'NFC',
    nfcUID: uid
  });
  
  res.status(201).json({
    success: true,
    message: `${validation.user.name}: Punch ${result.punch.type} recorded`,
    data: {
      user: {
        id: validation.user._id,
        name: validation.user.name
      },
      punch: result.punch,
      dashboard: result.dashboard
    }
  });
}));

/**
 * @route   GET /api/nfc/my-tags
 * @desc    Get NFC tags for current user
 * @access  Private
 */
router.get('/my-tags', protect, asyncHandler(async (req, res) => {
  const tags = await NfcService.getUserTags(req.user._id);
  
  res.json({
    success: true,
    data: { tags }
  });
}));

/**
 * @route   GET /api/nfc/tags
 * @desc    Get all NFC tags (Admin)
 * @access  Private/Admin
 */
router.get('/tags', 
  protect, 
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, active } = req.query;
    
    const result = await NfcService.getAllTags({
      page: parseInt(page),
      limit: parseInt(limit),
      active: active !== undefined ? active === 'true' : null
    });
    
    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @route   GET /api/nfc/user/:userId
 * @desc    Get NFC tags for a specific user
 * @access  Private/Admin
 */
router.get('/user/:userId', 
  protect, 
  authorize('Admin'),
  mongoIdValidation('userId'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const tags = await NfcService.getUserTags(userId);
    
    res.json({
      success: true,
      data: { tags }
    });
  })
);

/**
 * @route   PUT /api/nfc/:tagId/deactivate
 * @desc    Deactivate an NFC tag
 * @access  Private/Admin
 */
router.put('/:tagId/deactivate', 
  protect, 
  authorize('Admin'),
  mongoIdValidation('tagId'),
  asyncHandler(async (req, res) => {
    const { tagId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Deactivation reason is required'
      });
    }
    
    const tag = await NfcService.deactivateTag(tagId, req.user, reason);
    
    res.json({
      success: true,
      message: 'NFC tag deactivated successfully',
      data: { tag }
    });
  })
);

/**
 * @route   PUT /api/nfc/:tagId/reactivate
 * @desc    Reactivate an NFC tag
 * @access  Private/Admin
 */
router.put('/:tagId/reactivate', 
  protect, 
  authorize('Admin'),
  mongoIdValidation('tagId'),
  asyncHandler(async (req, res) => {
    const { tagId } = req.params;
    
    const tag = await NfcService.reactivateTag(tagId, req.user);
    
    res.json({
      success: true,
      message: 'NFC tag reactivated successfully',
      data: { tag }
    });
  })
);

module.exports = router;
