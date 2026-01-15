const logger = require('../utils/logger');

/**
 * Request Logger Middleware
 * Logs all HTTP requests with response time
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to capture response time
  res.end = function (...args) {
    const responseTime = Date.now() - start;

    // Log the request
    logger.logRequest(req, res, responseTime);

    // Warn for slow requests (> 1 second)
    if (responseTime > 1000) {
      logger.warn('Slow Request Detected', {
        method: req.method,
        url: req.originalUrl,
        responseTime: `${responseTime}ms`,
        userId: req.user?.id
      });
    }

    // Call the original end function
    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Error Logger Middleware
 * Enhanced error logging with request context
 */
const errorLogger = (err, req, res, next) => {
  logger.logError(err, req);
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};
