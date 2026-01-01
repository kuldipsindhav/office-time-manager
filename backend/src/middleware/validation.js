const { validationResult, body, param } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

// Auth Validations
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Profile Validations
const profileUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('profile.timezone')
    .optional()
    .isString().withMessage('Timezone must be a string'),
  body('profile.dailyWorkTarget')
    .optional()
    .isInt({ min: 60, max: 1440 }).withMessage('Daily work target must be between 60-1440 minutes'),
  body('profile.workingDays')
    .optional()
    .isArray().withMessage('Working days must be an array'),
  body('profile.preferredPunchMethod')
    .optional()
    .isIn(['NFC', 'Manual']).withMessage('Preferred punch method must be NFC or Manual'),
  handleValidationErrors
];

// Punch Validations
const punchValidation = [
  body('source')
    .optional()
    .isIn(['NFC', 'Manual', 'Admin']).withMessage('Invalid punch source'),
  body('nfcUID')
    .optional()
    .isString().withMessage('NFC UID must be a string'),
  handleValidationErrors
];

const punchEditValidation = [
  param('punchId')
    .isMongoId().withMessage('Invalid punch ID'),
  body('punchTime')
    .optional()
    .isISO8601().withMessage('Invalid punch time format'),
  body('punchType')
    .optional()
    .isIn(['IN', 'OUT']).withMessage('Punch type must be IN or OUT'),
  body('editReason')
    .notEmpty().withMessage('Edit reason is required')
    .isLength({ max: 500 }).withMessage('Edit reason cannot exceed 500 characters'),
  handleValidationErrors
];

// NFC Tag Validations
const nfcTagValidation = [
  body('uid')
    .trim()
    .notEmpty().withMessage('NFC UID is required'),
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID'),
  body('label')
    .optional()
    .isLength({ max: 100 }).withMessage('Label cannot exceed 100 characters'),
  handleValidationErrors
];

// MongoDB ID Validation
const mongoIdValidation = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  profileUpdateValidation,
  punchValidation,
  punchEditValidation,
  nfcTagValidation,
  mongoIdValidation
};
