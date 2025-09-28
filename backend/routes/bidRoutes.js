const express = require('express');
const router = express.Router();
const { Bid, Project, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

/**
 * @route   POST /api/bids
 * @desc    Create a new bid
 * @access  Private
 */
router.post('/', authenticate, upload.array('portfolio', 3), handleMulterError, async (req, res) => {
  try {
    const { projectId, amount, message, deliveryTime } = req.body;

    if (!projectId || !amount || !message || !deliveryTime) {
      return res.status(400).json({
        error: 'Project ID, amount, message, and delivery time are required'
      });
    }

    // Check if project exists and is open
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    if (project.status !== 'open') {
      return res.status(400).json({
        error: 'Project is not open for bidding'
      });
    }

    // Check if user is the project owner
    if (project.postedBy === req.user.id) {
      return res.status(400).json({
        error: 'You cannot bid on your own project'
      });
    }

    // Check if user already has a bid on this project
    const existingBid = await Bid.findOne({
      where: {
        userId: req.user.id,
        projectId: projectId
      }
    });

    if (existingBid) {
      return res.status(400).json({
        error: 'You have already placed a bid on this project'
      });
    }

    // Process portfolio attachments
    const portfolio = req.files ? req.files.map(file => `/uploads/projects/${file.filename}`) : [];

    const bid = await Bid.create({
      amount: parseFloat(amount),
      message,
      deliveryTime: parseInt(deliveryTime),
      userId: req.user.id,
      projectId: parseInt(projectId),
      portfolio
    });

    // Fetch bid with user info
    const bidWithUser = await Bid.findByPk(bid.id, {
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'reputation']
        }
      ]
    });

    res.status(201).json({
      message: 'Bid placed successfully',
      bid: bidWithUser
    });

  } catch (error) {
    console.error('Create bid error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      error: 'Failed to place bid'
    });
  }
});

/**
 * @route   GET /api/bids/project/:projectId
 * @desc    Get all bids for a specific project
 * @access  Private (Project owner or bidders can see)
 */
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if project exists
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user is project owner or has bid on the project
    const isProjectOwner = project.postedBy === req.user.id;
    const userBid = await Bid.findOne({
      where: { userId: req.user.id, projectId }
    });

    if (!isProjectOwner && !userBid) {
      return res.status(403).json({
        error: 'Access denied. You can only view bids for your own projects or projects you have bid on.'
      });
    }

    const where = { projectId };

    // If user is not the project owner, only show their own bid
    if (!isProjectOwner) {
      where.userId = req.user.id;
    }

    const bids = await Bid.findAll({
      where,
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'reputation', 'skills']
        }
      ],
      order: [['amount', 'ASC']]
    });

    res.json({
      bids,
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        postedBy: project.postedBy
      }
    });

  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({
      error: 'Failed to get bids'
    });
  }
});

/**
 * @route   GET /api/bids/my-bids
 * @desc    Get all bids by the current user
 * @access  Private
 */
router.get('/my-bids', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const where = { userId: req.user.id };
    const offset = (page - 1) * limit;

    if (status) {
      where.status = status;
    }

    const bids = await Bid.findAndCountAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title', 'status', 'budget', 'category', 'deadline'],
          include: [
            {
              model: User,
              as: 'poster',
              attributes: ['id', 'username', 'firstName', 'lastName']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      bids: bids.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(bids.count / limit),
        totalBids: bids.count,
        hasNextPage: offset + bids.rows.length < bids.count,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({
      error: 'Failed to get your bids'
    });
  }
});

/**
 * @route   GET /api/bids/:id
 * @desc    Get single bid by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bid = await Bid.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'reputation']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title', 'postedBy', 'status']
        }
      ]
    });

    if (!bid) {
      return res.status(404).json({
        error: 'Bid not found'
      });
    }

    // Check if user can view this bid
    const canView = bid.userId === req.user.id || bid.project.postedBy === req.user.id;
    
    if (!canView) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json(bid);

  } catch (error) {
    console.error('Get bid error:', error);
    res.status(500).json({
      error: 'Failed to get bid'
    });
  }
});

/**
 * @route   PUT /api/bids/:id
 * @desc    Update bid
 * @access  Private (Bidder only)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const bid = await Bid.findByPk(req.params.id, {
      include: [{ model: Project, as: 'project' }]
    });

    if (!bid) {
      return res.status(404).json({
        error: 'Bid not found'
      });
    }

    if (!bid.canEdit(req.user.id)) {
      return res.status(403).json({
        error: 'You can only edit your own pending bids'
      });
    }

    if (bid.project.status !== 'open') {
      return res.status(400).json({
        error: 'Cannot edit bid on a closed project'
      });
    }

    const { amount, message, deliveryTime } = req.body;

    await bid.update({
      amount: amount ? parseFloat(amount) : bid.amount,
      message: message || bid.message,
      deliveryTime: deliveryTime ? parseInt(deliveryTime) : bid.deliveryTime
    });

    // Fetch updated bid with includes
    const updatedBid = await Bid.findByPk(bid.id, {
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'reputation']
        }
      ]
    });

    res.json({
      message: 'Bid updated successfully',
      bid: updatedBid
    });

  } catch (error) {
    console.error('Update bid error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      error: 'Failed to update bid'
    });
  }
});

/**
 * @route   DELETE /api/bids/:id
 * @desc    Withdraw/Delete bid
 * @access  Private (Bidder only)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const bid = await Bid.findByPk(req.params.id, {
      include: [{ model: Project, as: 'project' }]
    });

    if (!bid) {
      return res.status(404).json({
        error: 'Bid not found'
      });
    }

    if (!bid.canWithdraw(req.user.id)) {
      return res.status(403).json({
        error: 'You cannot withdraw this bid'
      });
    }

    if (bid.status === 'accepted') {
      // If bid was accepted, update status to withdrawn instead of deleting
      await bid.update({ status: 'withdrawn' });
      
      // Also update the project status back to open if it was the accepted bid
      if (bid.project.assignedTo === req.user.id) {
        await bid.project.update({
          status: 'open',
          assignedTo: null,
          acceptedAt: null
        });
      }

      res.json({
        message: 'Bid withdrawn successfully'
      });
    } else {
      // Delete pending bids
      await bid.destroy();

      res.json({
        message: 'Bid deleted successfully'
      });
    }

  } catch (error) {
    console.error('Delete bid error:', error);
    res.status(500).json({
      error: 'Failed to delete bid'
    });
  }
});

module.exports = router;