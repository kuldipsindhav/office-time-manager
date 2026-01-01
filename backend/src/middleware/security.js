/**
 * Security Middleware Configuration
 * Add these to your backend for production-ready security
 */

const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

/**
 * Rate Limiting Configuration
 * Prevents brute force attacks
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
    return rateLimit({
        windowMs, // 15 minutes default
        max, // limit each IP to max requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// Specific rate limiters for different endpoints
const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes
const apiLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const punchLimiter = createRateLimiter(1 * 60 * 1000, 10); // 10 punches per minute

/**
 * Security Middleware Stack
 */
const securityMiddleware = [
    // Data Sanitization against NoSQL Injection
    mongoSanitize(),

    // Data Sanitization against XSS
    xss(),

    // Prevent HTTP Parameter Pollution
    hpp({
        whitelist: [
            'role',
            'status',
            'type',
            'timezone',
            'page',
            'limit',
            'sort'
        ]
    })
];

/**
 * Apply to Express App
 * 
 * Usage in server.js:
 * 
 * const { securityMiddleware, authLimiter, apiLimiter, punchLimiter } = require('./middleware/security');
 * 
 * // Apply security middleware
 * app.use(securityMiddleware);
 * 
 * // Apply rate limiting
 * app.use('/api/auth', authLimiter);
 * app.use('/api/punch', punchLimiter);
 * app.use('/api', apiLimiter);
 */

module.exports = {
    securityMiddleware,
    authLimiter,
    apiLimiter,
    punchLimiter,
    createRateLimiter
};
