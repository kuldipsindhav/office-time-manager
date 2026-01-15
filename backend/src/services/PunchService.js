const { PunchLog, NfcTag, AuditLog } = require('../models');
const TimeEngine = require('./TimeEngine');
const PunchValidator = require('./PunchValidator');
const EmailService = require('./EmailService');
const moment = require('moment-timezone');
const config = require('../config');

/**
 * Punch Service
 * Handles all punch-related operations
 */
class PunchService {
  
  /**
   * Create a new punch with comprehensive validation
   */
  static async createPunch(user, options = {}) {
    const { source = 'Manual', nfcUID = null, notes = null, skipValidation = false } = options;
    
    const timezone = TimeEngine.getTimezone(user);
    const punchTime = new Date();
    
    // Check for double punch
    const isDouble = await TimeEngine.isDoublePunch(user._id, punchTime);
    if (isDouble) {
      throw new Error('Double punch detected. Please wait at least 1 minute between punches.');
    }
    
    // Determine punch type
    const punchType = await TimeEngine.getNextPunchType(user._id);
    
    // Perform comprehensive validation (unless skipped)
    if (!skipValidation) {
      const validation = await PunchValidator.validatePunch(
        user._id,
        punchType,
        punchTime,
        timezone,
        {
          businessHours: user.profile?.businessHours,
          workingDays: user.profile?.workingDays,
          graceMinutes: user.profile?.graceMinutes,
          shiftStartTime: user.profile?.shiftStartTime,
          minimumWorkHours: user.profile?.minimumWorkHours
        }
      );
      
      // If validation has errors, throw
      if (!validation.valid) {
        const error = new Error(validation.summary.errors[0]);
        error.validationErrors = validation.summary.errors;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
      
      // If validation has warnings, include them in response
      if (validation.hasWarnings) {
        options.validationWarnings = validation.summary.warnings;
        
        // Send notifications for specific warnings
        if (validation.validations.workingDay?.isWeekend) {
          // Send weekend punch notification
          try {
            await EmailService.sendWeekendPunchWarning(user, {
              punchType,
              punchTime
            });
          } catch (emailError) {
            // Don't fail punch if email fails
            console.error('Failed to send weekend warning email:', emailError);
          }
        }
        
        if (validation.validations.gracePeriod?.isLate) {
          // Mark as late in notes
          options.isLate = true;
          options.minutesLate = validation.validations.gracePeriod.minutesLate;
        }
      }
    }
    
    // Handle NFC validation if source is NFC
    let nfcTag = null;
    if (source === 'NFC') {
      if (!nfcUID) {
        throw new Error('NFC UID is required for NFC punch.');
      }
      
      nfcTag = await NfcTag.findActiveByUID(nfcUID);
      
      if (!nfcTag) {
        throw new Error('NFC tag not found or inactive.');
      }
      
      if (nfcTag.userId._id.toString() !== user._id.toString()) {
        throw new Error('NFC tag is not registered to this user.');
      }
      
      // Record usage
      await nfcTag.recordUsage();
    }
    
    // Build notes with validation info
    let finalNotes = notes || '';
    if (options.isLate) {
      finalNotes = finalNotes ? `${finalNotes} | Late by ${options.minutesLate} minutes` : `Late by ${options.minutesLate} minutes`;
    }
    
    // Create punch
    const punch = await PunchLog.create({
      userId: user._id,
      punchType,
      punchTime,
      source,
      nfcTagId: nfcTag?._id || null,
      notes: finalNotes || null
    });
    
    // Get updated dashboard data
    const dashboardData = await TimeEngine.getDashboardData(user);
    
    // Detect and return any punch issues
    const punchIssues = await PunchValidator.detectPunchIssues(user._id, timezone);
    
    return {
      punch: {
        id: punch._id,
        type: punch.punchType,
        time: punch.punchTime.toISOString(),
        timeLocal: moment(punch.punchTime).tz(timezone).format('hh:mm A'),
        source: punch.source
      },
      dashboard: dashboardData,
      warnings: options.validationWarnings || [],
      issues: punchIssues
    };
  }
  
  /**
   * Create manual punch for a specific time (Admin or self)
   */
  static async createManualPunch(userId, punchData, performedBy) {
    const { punchType, punchTime, notes, reason } = punchData;
    
    // Validate punch time is not in the future
    if (moment(punchTime).isAfter(moment())) {
      throw new Error('Cannot create punch for future time.');
    }
    
    // Determine source
    const source = performedBy._id.toString() === userId.toString() ? 'Manual' : 'Admin';
    
    // Create punch
    const punch = await PunchLog.create({
      userId,
      punchType,
      punchTime: new Date(punchTime),
      source,
      notes
    });
    
    // Log audit if admin created
    if (source === 'Admin') {
      await AuditLog.log({
        action: 'PUNCH_EDIT',
        performedBy: performedBy._id,
        targetUser: userId,
        resourceType: 'PunchLog',
        resourceId: punch._id,
        newState: punch.toObject(),
        description: reason || 'Manual punch created by admin'
      });
    }
    
    return punch;
  }
  
  /**
   * Edit an existing punch
   */
  static async editPunch(punchId, editData, performedBy) {
    const { punchTime, punchType, editReason } = editData;
    
    const punch = await PunchLog.findById(punchId);
    
    if (!punch) {
      throw new Error('Punch not found.');
    }
    
    // Check permission - user can edit own punch, admin can edit any
    if (performedBy.role !== 'Admin' && punch.userId.toString() !== performedBy._id.toString()) {
      throw new Error('Not authorized to edit this punch.');
    }
    
    // Store original values
    const previousState = {
      punchTime: punch.punchTime,
      punchType: punch.punchType
    };
    
    // Update punch
    punch.originalPunchTime = punch.originalPunchTime || punch.punchTime;
    punch.originalPunchType = punch.originalPunchType || punch.punchType;
    
    if (punchTime) {
      punch.punchTime = new Date(punchTime);
    }
    if (punchType) {
      punch.punchType = punchType;
    }
    
    punch.edited = true;
    punch.editedBy = performedBy._id;
    punch.editedAt = new Date();
    punch.editReason = editReason;
    
    await punch.save();
    
    // Log audit
    await AuditLog.log({
      action: 'PUNCH_EDIT',
      performedBy: performedBy._id,
      targetUser: punch.userId,
      resourceType: 'PunchLog',
      resourceId: punch._id,
      previousState,
      newState: {
        punchTime: punch.punchTime,
        punchType: punch.punchType
      },
      description: editReason
    });
    
    return punch;
  }
  
  /**
   * Delete a punch (Admin only)
   */
  static async deletePunch(punchId, performedBy, reason) {
    const punch = await PunchLog.findById(punchId);
    
    if (!punch) {
      throw new Error('Punch not found.');
    }
    
    // Log audit before deletion
    await AuditLog.log({
      action: 'PUNCH_DELETE',
      performedBy: performedBy._id,
      targetUser: punch.userId,
      resourceType: 'PunchLog',
      resourceId: punch._id,
      previousState: punch.toObject(),
      description: reason
    });
    
    await punch.deleteOne();
    
    return { success: true, message: 'Punch deleted successfully' };
  }
  
  /**
   * Get punch history for a user
   */
  static async getPunchHistory(userId, options = {}) {
    const { 
      startDate, 
      endDate, 
      timezone = 'UTC',
      page = 1, 
      limit = 50 
    } = options;
    
    const query = { userId };
    
    if (startDate || endDate) {
      query.punchTime = {};
      if (startDate) {
        query.punchTime.$gte = moment(startDate).tz(timezone).startOf('day').utc().toDate();
      }
      if (endDate) {
        query.punchTime.$lte = moment(endDate).tz(timezone).endOf('day').utc().toDate();
      }
    }
    
    const total = await PunchLog.countDocuments(query);
    
    const punches = await PunchLog.find(query)
      .sort({ punchTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('editedBy', 'name');
    
    return {
      punches: punches.map(p => ({
        id: p._id,
        type: p.punchType,
        time: p.punchTime.toISOString(),
        timeLocal: moment(p.punchTime).tz(timezone).format('YYYY-MM-DD hh:mm A'),
        source: p.source,
        edited: p.edited,
        editedBy: p.editedBy?.name || null,
        editReason: p.editReason,
        notes: p.notes
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = PunchService;
