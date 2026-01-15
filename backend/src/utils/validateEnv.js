const logger = require('./logger');

/**
 * Validate Environment Variables
 * Ensures all required environment variables are set
 */
const validateEnv = () => {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secrets are not default values
  if (process.env.JWT_SECRET?.includes('fallback') || 
      process.env.JWT_SECRET?.includes('change') ||
      process.env.JWT_SECRET?.length < 32) {
    logger.warn('JWT_SECRET appears to be weak or default. Please use a strong secret in production.');
  }

  if (process.env.JWT_REFRESH_SECRET?.includes('fallback') || 
      process.env.JWT_REFRESH_SECRET?.includes('change') ||
      process.env.JWT_REFRESH_SECRET?.length < 32) {
    logger.warn('JWT_REFRESH_SECRET appears to be weak or default. Please use a strong secret in production.');
  }

  // Log environment info (safely)
  logger.info('Environment validated', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    mongodbUri: process.env.MONGODB_URI ? '***configured***' : 'missing',
    jwtSecret: process.env.JWT_SECRET ? '***configured***' : 'missing',
    timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata'
  });

  return true;
};

module.exports = { validateEnv };
