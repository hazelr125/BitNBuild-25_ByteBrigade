const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { upload, handleMulterError } = require('../middleware/upload');

/**
 * @route   POST /api/users/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      isStudent,
      university,
      course,
      year,
      phone
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      isStudent: isStudent || true,
      university,
      course,
      year,
      phone
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      error: 'Registration failed'
    });
  }
});

/**
 * @route   POST /api/users/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        error: 'Account is inactive'
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed'
    });
  }
});

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json(req.user.getPublicProfile());
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile'
    });
  }
});

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticate, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      bio,
      phone,
      university,
      course,
      year,
      skills
    } = req.body;

    // Update user
    await req.user.update({
      firstName,
      lastName,
      bio,
      phone,
      university,
      course,
      year,
      skills
    });

    res.json({
      message: 'Profile updated successfully',
      user: req.user.getPublicProfile()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      error: 'Failed to update profile'
    });
  }
});

/**
 * @route   POST /api/users/me/avatar
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/me/avatar', 
  authenticate, 
  upload.single('avatar'), 
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded'
        });
      }

      // Update user profile picture
      req.user.profilePicture = `/uploads/profiles/${req.file.filename}`;
      await req.user.save();

      res.json({
        message: 'Profile picture updated successfully',
        profilePicture: req.user.profilePicture
      });

    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({
        error: 'Failed to upload profile picture'
      });
    }
  }
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user profile by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        {
          association: 'receivedRatings',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json(user.getPublicProfile());

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user profile'
    });
  }
});

/**
 * @route   GET /api/users
 * @desc    Search users
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { search, skills, university, isStudent, page = 1, limit = 20 } = req.query;
    
    const where = { status: 'active' };
    const offset = (page - 1) * limit;

    // Add search filters
    if (search) {
      where.$or = [
        { username: { $iLike: `%${search}%` } },
        { firstName: { $iLike: `%${search}%` } },
        { lastName: { $iLike: `%${search}%` } }
      ];
    }

    if (skills) {
      where.skills = { $overlap: skills.split(',') };
    }

    if (university) {
      where.university = { $iLike: `%${university}%` };
    }

    if (isStudent !== undefined) {
      where.isStudent = isStudent === 'true';
    }

    const users = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['reputation', 'DESC'], ['createdAt', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    res.json({
      users: users.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(users.count / limit),
        totalUsers: users.count,
        hasNextPage: offset + users.rows.length < users.count,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      error: 'Failed to search users'
    });
  }
});

/**
 * @route   GET /api/users/me/stats
 * @desc    Get current user's statistics for dashboard
 * @access  Private
 */
router.get('/me/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get basic user data
    const userStats = {
      totalEarnings: req.user.totalEarnings || 0,
      reputation: req.user.reputation || 0,
      isVerified: req.user.isVerified || false,
      activeProjects: 0,
      completedProjects: 0,
      totalBids: 0,
      successRate: 0
    };

    // Since we don't have projects/bids implemented yet, 
    // we'll return basic stats for now
    // TODO: Implement when Project and Bid models are active
    
    res.json(userStats);

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to get user statistics'
    });
  }
});

/**
 * @route   GET /api/users/admin/all
 * @desc    Get all users for admin purposes (simplified for demo)
 * @access  Public (should be protected in production)
 */
router.get('/admin/all', async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']],
      attributes: [
        'id', 'username', 'email', 'firstName', 'lastName', 
        'university', 'course', 'year', 'phone', 'isStudent', 
        'reputation', 'totalEarnings', 'status', 'createdAt'
      ]
    });

    res.json({
      users: users,
      total: users.length
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      error: 'Failed to get users'
    });
  }
});

module.exports = router;