const mongoose = require('mongoose');

const punchLogSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Punch Type
  punchType: {
    type: String,
    enum: ['IN', 'OUT'],
    required: [true, 'Punch type is required']
  },

  // Punch Time (Always stored in UTC)
  punchTime: {
    type: Date,
    required: [true, 'Punch time is required'],
    index: true
  },

  // Source of Punch
  source: {
    type: String,
    enum: ['NFC', 'Manual', 'Admin'],
    required: [true, 'Punch source is required']
  },

  // NFC Tag Reference (if punched via NFC)
  nfcTagId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NfcTag',
    default: null
  },

  // Edit Tracking
  edited: {
    type: Boolean,
    default: false
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  editedAt: {
    type: Date,
    default: null
  },
  editReason: {
    type: String,
    default: null,
    maxlength: [500, 'Edit reason cannot exceed 500 characters']
  },

  // Original values (before edit)
  originalPunchTime: {
    type: Date,
    default: null
  },
  originalPunchType: {
    type: String,
    enum: ['IN', 'OUT', null],
    default: null
  },

  // Location (optional, for future use)
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },

  // Notes
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
punchLogSchema.index({ userId: 1, punchTime: -1 });  // User's punch history
punchLogSchema.index({ userId: 1, punchType: 1, punchTime: -1 });  // Filter by type
punchLogSchema.index({ punchTime: -1 });  // Global time-based queries
punchLogSchema.index({ source: 1, punchTime: -1 });  // Filter by source
punchLogSchema.index({ userId: 1, createdAt: -1 });  // User's recent punches

// Get punch for display (formatted)
punchLogSchema.methods.toDisplayJSON = function (timezone = 'UTC') {
  const moment = require('moment-timezone');

  return {
    id: this._id,
    userId: this.userId,
    punchType: this.punchType,
    punchTime: this.punchTime.toISOString(),
    punchTimeLocal: moment(this.punchTime).tz(timezone).format('YYYY-MM-DD HH:mm:ss'),
    source: this.source,
    edited: this.edited,
    editedBy: this.editedBy,
    editReason: this.editReason,
    notes: this.notes,
    createdAt: this.createdAt
  };
};

// Static method to get last punch for a user
punchLogSchema.statics.getLastPunch = async function (userId) {
  return await this.findOne({ userId })
    .sort({ punchTime: -1 })
    .limit(1);
};

// Static method to get today's punches for a user
punchLogSchema.statics.getTodayPunches = async function (userId, timezone = 'UTC') {
  const moment = require('moment-timezone');

  const startOfDay = moment().tz(timezone).startOf('day').utc().toDate();
  const endOfDay = moment().tz(timezone).endOf('day').utc().toDate();

  return await this.find({
    userId,
    punchTime: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ punchTime: 1 });
};

module.exports = mongoose.model('PunchLog', punchLogSchema);
