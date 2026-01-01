const { NfcTag, AuditLog } = require('../models');

/**
 * NFC Service
 * Handles NFC tag operations
 */
class NfcService {
  
  /**
   * Register a new NFC tag
   */
  static async registerTag(data, registeredBy) {
    const { uid, userId, label } = data;
    
    // Check if tag already exists
    const existingTag = await NfcTag.findOne({ uid: uid.toUpperCase() });
    if (existingTag) {
      throw new Error('NFC tag with this UID already exists.');
    }
    
    // Create tag
    const tag = await NfcTag.create({
      uid: uid.toUpperCase(),
      userId,
      label,
      registeredBy: registeredBy._id
    });
    
    // Log audit
    await AuditLog.log({
      action: 'NFC_REGISTER',
      performedBy: registeredBy._id,
      targetUser: userId,
      resourceType: 'NfcTag',
      resourceId: tag._id,
      newState: tag.toObject(),
      description: `NFC tag registered: ${uid}`
    });
    
    return tag;
  }
  
  /**
   * Get all tags for a user
   */
  static async getUserTags(userId) {
    return await NfcTag.find({ userId })
      .populate('registeredBy', 'name')
      .sort({ createdAt: -1 });
  }
  
  /**
   * Validate NFC tag for punching
   */
  static async validateForPunch(uid) {
    const tag = await NfcTag.findActiveByUID(uid);
    
    if (!tag) {
      return {
        valid: false,
        error: 'NFC tag not found or inactive'
      };
    }
    
    if (!tag.userId.isActive) {
      return {
        valid: false,
        error: 'User account is deactivated'
      };
    }
    
    return {
      valid: true,
      tag,
      user: tag.userId
    };
  }
  
  /**
   * Deactivate an NFC tag
   */
  static async deactivateTag(tagId, deactivatedBy, reason) {
    const tag = await NfcTag.findById(tagId);
    
    if (!tag) {
      throw new Error('NFC tag not found.');
    }
    
    if (!tag.isActive) {
      throw new Error('NFC tag is already deactivated.');
    }
    
    await tag.deactivate(deactivatedBy._id, reason);
    
    // Log audit
    await AuditLog.log({
      action: 'NFC_DEACTIVATE',
      performedBy: deactivatedBy._id,
      targetUser: tag.userId,
      resourceType: 'NfcTag',
      resourceId: tag._id,
      description: reason
    });
    
    return tag;
  }
  
  /**
   * Reactivate an NFC tag
   */
  static async reactivateTag(tagId, reactivatedBy) {
    const tag = await NfcTag.findById(tagId);
    
    if (!tag) {
      throw new Error('NFC tag not found.');
    }
    
    if (tag.isActive) {
      throw new Error('NFC tag is already active.');
    }
    
    tag.isActive = true;
    tag.deactivatedBy = null;
    tag.deactivatedAt = null;
    tag.deactivationReason = null;
    
    await tag.save();
    
    return tag;
  }
  
  /**
   * Get all NFC tags (Admin)
   */
  static async getAllTags(options = {}) {
    const { page = 1, limit = 50, active = null } = options;
    
    const query = {};
    if (active !== null) {
      query.isActive = active;
    }
    
    const total = await NfcTag.countDocuments(query);
    
    const tags = await NfcTag.find(query)
      .populate('userId', 'name email')
      .populate('registeredBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    return {
      tags,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = NfcService;
