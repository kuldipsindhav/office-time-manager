/**
 * Security Middleware Configuration
 * Production-ready security for Office Time Manager
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

/**
 * Rate Limiting Configuration
 * Prevents brute force attacks
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests from this IP, please try again later.') => {
    return rateLimit({
        windowMs, // 15 minutes default
        max, // limit each IP to max requests per windowMs
        message: { success: false, message },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
    });
};

// Specific rate limiters for different endpoints
const authLimiter = createRateLimiter(
    15 * 60 * 1000,
    20, // 20 auth requests per 15 minutes (login, register, refresh)
    'Too many authentication attempts, please try again after 15 minutes.'
);

const apiLimiter = createRateLimiter(
    15 * 60 * 1000,
    100, // 100 API requests per 15 minutes
    'Too many API requests, please try again later.'
);

const punchLimiter = createRateLimiter(
    1 * 60 * 1000,
    10, // 10 punches per minute (generous for NFC scan issues)
    'Too many punch attempts, please wait a minute.'
);

/**
 * Helmet Configuration for Security Headers
 */
const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Disable for API compatibility
    crossOriginResourcePolicy: { policy: "cross-origin" },
});

/**
 * Security Middleware Stack
 */
const securityMiddleware = [
    // Security headers
    helmetMiddleware,

    // Data Sanitization against NoSQL Injection
    mongoSanitize({
        replaceWith: '_',
        onSanitize: ({ req, key }) => {
            console.warn(`[Security] Blocked NoSQL injection attempt on key: ${key}`);
        }
    }),

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
            'sort',
            'startDate',
            'endDate'
        ]
    })
];

module.exports = {
    securityMiddleware,
    helmetMiddleware,
    authLimiter,
    apiLimiter,
    punchLimiter,
    createRateLimiter
};
