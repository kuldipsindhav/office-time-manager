/**
 * Production Server - Serves both Frontend and Backend
 * This file combines the Express API with the built React frontend
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ path: './backend/.env' });

// Import backend server configuration
const connectDB = require('./backend/src/config/database');
const config = require('./backend/src/config');
const { errorHandler, notFound } = require('./backend/src/middleware');
const {
  authRoutes,
  userRoutes,
  punchRoutes,
  nfcRoutes,
  dashboardRoutes,
  adminRoutes
} = require('./backend/src/routes');

// Initialize Express
const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy (required for Render, Railway, etc.)
app.set('trust proxy', 1);

// Security Middleware
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      // In production, allow same-origin requests
      callback(null, true);
    }
  },
  credentials: true
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging (only in development)
if (process.env.NODE_ENV === 'development') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// Compression
const compression = require('compression');
app.use(compression());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Office Time Manager API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/punch', punchRoutes);
app.use('/api/nfc', nfcRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Serve Static Files (Frontend)
const frontendPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendPath));

// Catch-all route - serve index.html for all non-API routes
// This is required for React Router to work properly
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error Handlers
app.use(notFound);
app.use(errorHandler);

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   🕐 Office Time Manager - Production Server     ║
║══════════════════════════════════════════════════║
║  Environment: ${config.nodeEnv.padEnd(34)}║
║  Port: ${String(PORT).padEnd(42)}║
║  API: http://localhost:${PORT}/api${' '.repeat(19)}║
║  Frontend: http://localhost:${PORT}${' '.repeat(23)}║
╚══════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = app;
