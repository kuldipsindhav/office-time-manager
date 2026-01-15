const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const config = require('./config');
const logger = require('./utils/logger');
const { validateEnv } = require('./utils/validateEnv');
const HealthService = require('./services/HealthService');
const CronJobService = require('./services/CronJobService');
const { errorHandler, notFound } = require('./middleware');
const { requestLogger, errorLogger } = require('./middleware/logger');
const {
  securityMiddleware,
  authLimiter,
  apiLimiter,
  punchLimiter
} = require('./middleware/security');
const {
  authRoutes,
  userRoutes,
  punchRoutes,
  nfcRoutes,
  dashboardRoutes,
  adminRoutes,
  adminHealthRoutes
} = require('./routes');

// Validate environment variables
try {
  validateEnv();
} catch (error) {
  logger.error('Environment validation failed:', error);
  process.exit(1);
}

// Initialize express
const app = express();

// Log application startup
logger.info('🚀 Starting Time Manager API...');

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Apply security middleware (XSS, NoSQL injection, HPP protection)
app.use(securityMiddleware);

// Apply general API rate limiting
app.use('/api', apiLimiter);

// Health check endpoints
app.get('/health', async (req, res) => {
  const health = await HealthService.getQuickHealth();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/api/health', async (req, res) => {
  const health = await HealthService.getHealthStatus();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json({
    success: health.status === 'healthy',
    ...health
  });
});

app.get('/api/health/metrics', async (req, res) => {
  try {
    const metrics = await HealthService.getMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics'
    });
  }
});

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/api/health');
});

// API Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);  // Strict: 5 requests per 15 minutes
app.use('/api/users', userRoutes);
app.use('/api/punch', punchLimiter, punchRoutes);  // 10 punches per minute
app.use('/api/nfc', nfcRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/health', adminHealthRoutes);  // Admin health check routes

// Error Logging Middleware
app.use(errorLogger);

// Error Handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`
╔══════════════════════════════════════════════════╗
║     🕐 Time Manager API Server            ║
║══════════════════════════════════════════════════║
║  Environment: ${config.nodeEnv.padEnd(34)}║
║  Port: ${String(PORT).padEnd(42)}║
║  API: http://localhost:${PORT}/api${' '.repeat(19)}║
╚══════════════════════════════════════════════════╝
  `);
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
  
  // Initialize cron jobs
  CronJobService.initializeJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  CronJobService.stopAllJobs();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  CronJobService.stopAllJobs();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
