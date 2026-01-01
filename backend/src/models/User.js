const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

const userSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  
  // Role
  role: {
    type: String,
    enum: ['Admin', 'User'],
    default: 'User'
  },
  
  // Profile Settings (User can configure)
  profile: {
    timezone: {
      type: String,
      default: config.defaults.timezone
    },
    dailyWorkTarget: {
      type: Number, // in minutes
      default: config.defaults.workHours * 60,
      min: [60, 'Work target must be at least 1 hour'],
      max: [1440, 'Work target cannot exceed 24 hours']
    },
    workingDays: {
      type: [String],
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      default: config.defaults.workingDays
    },
    preferredPunchMethod: {
      type: String,
      enum: ['NFC', 'Manual'],
      default: 'NFC'
    }
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Refresh Token for JWT
  refreshToken: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

// Index for faster queries (email index already created by unique: true)
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (without sensitive data)
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    profile: this.profile,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('User', userSchema);
