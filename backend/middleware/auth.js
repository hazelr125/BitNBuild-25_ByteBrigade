const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

/**
 * Authentication middleware to verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    // Check if token starts with 'Bearer '
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. Invalid token format.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ 
        error: 'Account is inactive.' 
      });
    }

    // Attach user to request object
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token has expired.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.' 
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed.' 
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    req.user = user && user.status === 'active' ? user : null;
    next();
    
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Authorization middleware to check if user is project owner
 */
const authorizeProjectOwner = (req, res, next) => {
  if (!req.project) {
    return res.status(404).json({ 
      error: 'Project not found.' 
    });
  }

  if (req.project.postedBy !== req.user.id) {
    return res.status(403).json({ 
      error: 'Access denied. You are not the owner of this project.' 
    });
  }

  next();
};

/**
 * Authorization middleware to check if user is student
 */
const requireStudent = (req, res, next) => {
  if (!req.user.isStudent) {
    return res.status(403).json({ 
      error: 'Access denied. This action is only available to students.' 
    });
  }
  next();
};

/**
 * Authorization middleware to check if user is verified
 */
const requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({ 
      error: 'Access denied. Please verify your account first.' 
    });
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  authorizeProjectOwner,
  requireStudent,
  requireVerified
};