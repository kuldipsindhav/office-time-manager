const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Action Type
  action: {
    type: String,
    enum: [
      'PUNCH_EDIT',
      'PUNCH_DELETE',
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'NFC_REGISTER',
      'NFC_DEACTIVATE',
      'LOGIN',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'PROFILE_UPDATE'
    ],
    required: [true, 'Action is required'],
    index: true
  },

  // Who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Performer ID is required'],
    index: true
  },

  // Target user (if applicable)
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Reference to affected resource
  resourceType: {
    type: String,
    enum: ['PunchLog', 'User', 'NfcTag', null],
    default: null
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  // Before and After states
  previousState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // Description/Reason
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: null
  },

  // Request metadata
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for common queries
auditLogSchema.index({ createdAt: -1 });  // Recent logs
auditLogSchema.index({ performedBy: 1, createdAt: -1 });  // User's actions
auditLogSchema.index({ targetUser: 1, createdAt: -1 });  // Actions on a user
auditLogSchema.index({ action: 1, createdAt: -1 });  // Filter by action type
auditLogSchema.index({ resourceType: 1, resourceId: 1 });  // Find logs for a resource

// Static method to log an action
auditLogSchema.statics.log = async function (data) {
  return await this.create(data);
};

// Static method to get recent logs
auditLogSchema.statics.getRecentLogs = async function (limit = 50) {
  return await this.find()
    .populate('performedBy', 'name email')
    .populate('targetUser', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
