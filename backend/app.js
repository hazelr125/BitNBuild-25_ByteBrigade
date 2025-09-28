const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import database and models
const { sequelize, testConnection } = require('./config/database');
require('./models'); // This will set up all model associations

// Import middleware
const { generalLimiter } = require('./middleware/rateLimiter');
const { createUploadDirs } = require('./middleware/upload');

// Import routes
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const bidRoutes = require('./routes/bidRoutes');
const messageRoutes = require('./routes/messageRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8000',
    'http://localhost:3000',
    'http://localhost:8000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create upload directories
createUploadDirs();

// API routes
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'GigCampus Backend API',
    version: '1.0.0',
    endpoints: {
      users: {
        'POST /api/users/register': 'Register a new user',
        'POST /api/users/login': 'Login user',
        'GET /api/users/me': 'Get current user profile',
        'PUT /api/users/me': 'Update current user profile',
        'POST /api/users/me/avatar': 'Upload profile picture',
        'GET /api/users/:id': 'Get user profile by ID',
        'GET /api/users': 'Search users'
      },
      projects: {
        'POST /api/projects': 'Create a new project',
        'GET /api/projects': 'Get all projects with filters',
        'GET /api/projects/:id': 'Get single project by ID',
        'PUT /api/projects/:id': 'Update project',
        'DELETE /api/projects/:id': 'Delete project',
        'POST /api/projects/:id/accept-bid/:bidId': 'Accept a bid',
        'POST /api/projects/:id/complete': 'Mark project as completed'
      },
      bids: {
        'POST /api/bids': 'Create a new bid',
        'GET /api/bids/project/:projectId': 'Get bids for a project',
        'GET /api/bids/my-bids': 'Get current user bids',
        'GET /api/bids/:id': 'Get single bid',
        'PUT /api/bids/:id': 'Update bid',
        'DELETE /api/bids/:id': 'Delete/withdraw bid'
      },
      messages: {
        'POST /api/messages': 'Send a new message',
        'GET /api/messages/project/:projectId': 'Get messages for project',
        'GET /api/messages/conversations': 'Get all conversations',
        'PUT /api/messages/:id': 'Edit message',
        'DELETE /api/messages/:id': 'Delete message',
        'POST /api/messages/:id/read': 'Mark message as read'
      },
      ratings: {
        'POST /api/ratings': 'Create a new rating',
        'GET /api/ratings/user/:userId': 'Get ratings for user',
        'GET /api/ratings/project/:projectId': 'Get ratings for project',
        'GET /api/ratings/my-ratings': 'Get current user ratings',
        'PUT /api/ratings/:id': 'Update rating',
        'POST /api/ratings/:id/helpful': 'Mark rating as helpful'
      },
      payments: {
        'POST /api/payments/create-payment-intent': 'Create payment intent',
        'POST /api/payments/confirm-payment': 'Confirm payment completion',
        'GET /api/payments/payment-history': 'Get payment history',
        'GET /api/payments/earnings': 'Get earnings summary'
      }
    }
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      error: 'Duplicate entry',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Foreign key constraint error',
      message: 'Referenced record does not exist'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    
    sequelize.close().then(() => {
      console.log('Database connection closed.');
      process.exit(0);
    }).catch((err) => {
      console.error('Error closing database connection:', err);
      process.exit(1);
    });
  });
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Database connection and server startup
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database models
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ 
      alter: process.env.NODE_ENV === 'development',
      force: false // Set to true only if you want to drop tables (BE CAREFUL!)
    });
    console.log('✅ Database models synced successfully.');

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 GigCampus Backend Server is running on port ${PORT}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Make server available for graceful shutdown
    global.server = server;
    
    return server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;