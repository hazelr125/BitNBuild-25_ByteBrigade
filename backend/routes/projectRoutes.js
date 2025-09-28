const express = require('express');
const router = express.Router();
const { Project, User, Bid } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post('/', authenticate, upload.array('attachments', 5), handleMulterError, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      budget,
      budgetType,
      deadline,
      location,
      isRemote,
      requirements,
      priority,
      isUrgent
    } = req.body;

    // Process attachments
    const attachments = req.files ? req.files.map(file => `/uploads/projects/${file.filename}`) : [];

    // Parse requirements if it's a string
    let parsedRequirements = [];
    if (requirements) {
      parsedRequirements = typeof requirements === 'string' 
        ? requirements.split(',').map(r => r.trim()) 
        : requirements;
    }

    const project = await Project.create({
      title,
      description,
      category,
      budget: parseFloat(budget),
      budgetType: budgetType || 'fixed',
      deadline: deadline ? new Date(deadline) : null,
      location,
      isRemote: isRemote === 'true',
      requirements: parsedRequirements,
      attachments,
      priority: priority || 'medium',
      isUrgent: isUrgent === 'true',
      postedBy: req.user.id
    });

    // Fetch the project with poster info
    const projectWithPoster = await Project.findByPk(project.id, {
      include: [
        {
          model: User,
          as: 'poster',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'reputation']
        }
      ]
    });

    res.status(201).json({
      message: 'Project created successfully',
      project: projectWithPoster
    });

  } catch (error) {
    console.error('Create project error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      error: 'Failed to create project'
    });
  }
});

/**
 * @route   GET /api/projects
 * @desc    Get all projects with filters and pagination
 * @access  Public
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search,
      category,
      budgetMin,
      budgetMax,
      isRemote,
      status = 'open',
      sortBy = 'created_at',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
      userId
    } = req.query;

    const where = {};
    const offset = (page - 1) * limit;

    // Filter by user if requested
    if (userId) {
      if (userId === 'me') {
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required to view your services'
          });
        }
        where.postedBy = req.user.id;
      } else {
        where.postedBy = parseInt(userId);
      }
    }

    // Add filters
    if (search) {
      where.$or = [
        { title: { $iLike: `%${search}%` } },
        { description: { $iLike: `%${search}%` } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (budgetMin || budgetMax) {
      where.budget = {};
      if (budgetMin) where.budget.$gte = parseFloat(budgetMin);
      if (budgetMax) where.budget.$lte = parseFloat(budgetMax);
    }

    if (isRemote !== undefined) {
      where.isRemote = isRemote === 'true';
    }

    if (status) {
      where.status = status;
    }

    // Valid sort fields
    const validSortFields = ['created_at', 'budget', 'deadline', 'views'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    const projects = await Project.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'poster',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'reputation']
        },
        {
          model: Bid,
          as: 'bids',
          attributes: ['id', 'amount', 'userId'],
          include: [
            {
              model: User,
              as: 'bidder',
              attributes: ['id', 'username', 'reputation']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortField, sortOrder.toUpperCase()]],
      distinct: true
    });

    res.json({
      projects: projects.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(projects.count / limit),
        totalProjects: projects.count,
        hasNextPage: offset + projects.rows.length < projects.count,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to get projects'
    });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'poster',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'reputation', 'university']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'reputation']
        },
        {
          model: Bid,
          as: 'bids',
          include: [
            {
              model: User,
              as: 'bidder',
              attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'reputation']
            }
          ],
          order: [['amount', 'ASC']]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Increment view count (but not for the owner)
    if (!req.user || req.user.id !== project.postedBy) {
      await project.incrementViews();
    }

    res.json(project);

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: 'Failed to get project'
    });
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private (Owner only)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    if (!project.canEdit(req.user.id)) {
      return res.status(403).json({
        error: 'You can only edit your own open projects'
      });
    }

    const {
      title,
      description,
      budget,
      budgetType,
      deadline,
      location,
      isRemote,
      requirements,
      priority,
      isUrgent
    } = req.body;

    // Parse requirements if it's a string
    let parsedRequirements = requirements;
    if (requirements && typeof requirements === 'string') {
      parsedRequirements = requirements.split(',').map(r => r.trim());
    }

    await project.update({
      title: title || project.title,
      description: description || project.description,
      budget: budget ? parseFloat(budget) : project.budget,
      budgetType: budgetType || project.budgetType,
      deadline: deadline ? new Date(deadline) : project.deadline,
      location: location || project.location,
      isRemote: isRemote !== undefined ? isRemote === 'true' : project.isRemote,
      requirements: parsedRequirements || project.requirements,
      priority: priority || project.priority,
      isUrgent: isUrgent !== undefined ? isUrgent === 'true' : project.isUrgent
    });

    // Fetch updated project with includes
    const updatedProject = await Project.findByPk(project.id, {
      include: [
        {
          model: User,
          as: 'poster',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'reputation']
        }
      ]
    });

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });

  } catch (error) {
    console.error('Update project error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      error: 'Failed to update project'
    });
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private (Owner only)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    if (!project.isOwner(req.user.id)) {
      return res.status(403).json({
        error: 'You can only delete your own projects'
      });
    }

    if (project.status !== 'open') {
      return res.status(400).json({
        error: 'You can only delete open projects'
      });
    }

    await project.destroy();

    res.json({
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Failed to delete project'
    });
  }
});

/**
 * @route   POST /api/projects/:id/accept-bid/:bidId
 * @desc    Accept a bid for the project
 * @access  Private (Owner only)
 */
router.post('/:id/accept-bid/:bidId', authenticate, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    const bid = await Bid.findByPk(req.params.bidId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (!project.isOwner(req.user.id)) {
      return res.status(403).json({
        error: 'Only the project owner can accept bids'
      });
    }

    if (project.status !== 'open') {
      return res.status(400).json({
        error: 'Project is not open for bidding'
      });
    }

    if (bid.projectId !== project.id) {
      return res.status(400).json({
        error: 'Bid does not belong to this project'
      });
    }

    // Update project status and assign to bidder
    await project.update({
      status: 'in-progress',
      assignedTo: bid.userId,
      acceptedAt: new Date()
    });

    // Update bid status
    await bid.update({
      status: 'accepted',
      isSelected: true,
      acceptedAt: new Date()
    });

    // Reject all other bids for this project
    await Bid.update(
      { status: 'rejected', rejectedAt: new Date() },
      { 
        where: { 
          projectId: project.id,
          id: { $ne: bid.id },
          status: 'pending'
        }
      }
    );

    res.json({
      message: 'Bid accepted successfully',
      project,
      acceptedBid: bid
    });

  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({
      error: 'Failed to accept bid'
    });
  }
});

/**
 * @route   POST /api/projects/:id/complete
 * @desc    Mark project as completed
 * @access  Private (Owner only)
 */
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isOwner(req.user.id)) {
      return res.status(403).json({
        error: 'Only the project owner can mark project as completed'
      });
    }

    if (project.status !== 'in-progress') {
      return res.status(400).json({
        error: 'Project must be in progress to be completed'
      });
    }

    await project.update({
      status: 'completed',
      completedAt: new Date()
    });

    res.json({
      message: 'Project marked as completed',
      project
    });

  } catch (error) {
    console.error('Complete project error:', error);
    res.status(500).json({
      error: 'Failed to complete project'
    });
  }
});

module.exports = router;