/**
 * Main Express Server - Certificate Protection System
 * RBAC Access Control
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const connectDB = require('./config/database');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/authRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const userRoutes = require('./routes/userRoutes');
const auditRoutes = require('./routes/auditRoutes');
const verifyRoutes = require('./routes/verifyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Security Middleware
// ============================================================

// Helmet - HTTP security headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
  })
);

// CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  })
);

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Stricter limit for auth endpoints
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
    code: 'AUTH_RATE_LIMIT',
  },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============================================================
// Body Parsing
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// HTTP Request Logging
// ============================================================
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.http(message.trim()) },
    })
  );
}

// ============================================================
// Health Check
// ============================================================
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'Certificate Protection System - RBAC',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbStatusMap[dbStatus] || 'unknown',
    uptime: Math.floor(process.uptime()) + 's',
  });
});

// ============================================================
// API Routes
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/verify', verifyRoutes);

// RBAC info endpoint (public)
app.get('/api/rbac/info', (req, res) => {
  const { ROLES, ROLE_PERMISSIONS } = require('./config/rbac');
  res.status(200).json({
    success: true,
    data: {
      roles: ROLES,
      permissions: Object.fromEntries(
        Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => [role, perms.length])
      ),
      description: {
        super_admin: 'Full system access - all permissions',
        admin: 'Manage users, certificates, view audit logs',
        issuer: 'Issue, sign and revoke certificates',
        verifier: 'Verify certificate authenticity',
        holder: 'View own certificates only',
      },
    },
  });
});

// ============================================================
// 404 Handler
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
});

// ============================================================
// Global Error Handler
// ============================================================
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  const isDev = process.env.NODE_ENV === 'development';
  
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      code: 'MONGOOSE_VALIDATION_ERROR',
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      success: false,
      error: `Duplicate value for field: ${field}`,
      code: 'DUPLICATE_KEY',
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(isDev && { stack: err.stack }),
  });
});

// ============================================================
// Start Server
// ============================================================
const startServer = async () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('='.repeat(60));
      logger.info('🔐 Certificate Protection System - RBAC');
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📡 Health check: http://localhost:${PORT}/health`);
      logger.info(`📋 API Base: http://localhost:${PORT}/api`);
      logger.info('='.repeat(60));
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await mongoose.connection.close();
        logger.info('Server and database connections closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
