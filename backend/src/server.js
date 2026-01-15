const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const config = require('./config');
const { errorHandler, notFound } = require('./middleware');
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
  adminRoutes
} = require('./routes');

// Initialize express
const app = express();

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

// Apply security middleware (XSS, NoSQL injection, HPP protection)
app.use(securityMiddleware);

// Apply general API rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Office Time Manager API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
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

// Error Handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║     🕐 Office Time Manager API Server            ║
║══════════════════════════════════════════════════║
║  Environment: ${config.nodeEnv.padEnd(34)}║
║  Port: ${String(PORT).padEnd(42)}║
║  API: http://localhost:${PORT}/api${' '.repeat(19)}║
╚══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
