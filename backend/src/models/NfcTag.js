const mongoose = require('mongoose');

const nfcTagSchema = new mongoose.Schema({
  // NFC Tag Unique Identifier
  uid: {
    type: String,
    required: [true, 'NFC UID is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  
  // Assigned User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Tag Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Tag Label/Name
  label: {
    type: String,
    trim: true,
    maxlength: [100, 'Label cannot exceed 100 characters'],
    default: null
  },
  
  // Registration Info
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  
  // Last Used
  lastUsedAt: {
    type: Date,
    default: null
  },
  
  // Deactivation Info
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deactivatedAt: {
    type: Date,
    default: null
  },
  deactivationReason: {
    type: String,
    maxlength: [500, 'Deactivation reason cannot exceed 500 characters'],
    default: null
  }
}, {
  timestamps: true
});

// Compound index
nfcTagSchema.index({ uid: 1, isActive: 1 });

// Static method to find active tag by UID
nfcTagSchema.statics.findActiveByUID = async function(uid) {
  return await this.findOne({ 
    uid: uid.toUpperCase(), 
    isActive: true 
  }).populate('userId', 'name email role isActive');
};

// Instance method to deactivate tag
nfcTagSchema.methods.deactivate = async function(userId, reason) {
  this.isActive = false;
  this.deactivatedBy = userId;
  this.deactivatedAt = new Date();
  this.deactivationReason = reason;
  return await this.save();
};

// Instance method to record usage
nfcTagSchema.methods.recordUsage = async function() {
  this.lastUsedAt = new Date();
  return await this.save();
};

module.exports = mongoose.model('NfcTag', nfcTagSchema);
