const logger = require('../utils/logger');

// Global Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  logger.logError(err, req);
  
  // Default error
  let error = {
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
  
  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    error.message = messages.join(', ');
    return res.status(400).json(error);
  }
  
  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `${field} already exists`;
    return res.status(400).json(error);
  }
  
  // Mongoose Cast Error (Invalid ID)
  if (err.name === 'CastError') {
    error.message = 'Resource not found';
    return res.status(404).json(error);
  }
  
  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    return res.status(401).json(error);
  }
  
  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    return res.status(401).json(error);
  }
  
  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json(error);
};

// Not Found Handler
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

// Async Handler Wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};
