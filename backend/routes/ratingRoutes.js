const express = require('express');
const router = express.Router();
const { Rating, Project, User } = require('../models');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/ratings
 * @desc    Create a new rating
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, ratedUserId, score, review, ratingType, criteria } = req.body;

    if (!projectId || !ratedUserId || !score || !ratingType) {
      return res.status(400).json({
        error: 'Project ID, rated user ID, score, and rating type are required'
      });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({
        error: 'Score must be between 1 and 5'
      });
    }

    if (!['client-to-freelancer', 'freelancer-to-client'].includes(ratingType)) {
      return res.status(400).json({
        error: 'Invalid rating type'
      });
    }

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if project is completed
    if (project.status !== 'completed') {
      return res.status(400).json({
        error: 'You can only rate completed projects'
      });
    }

    // Check if user is authorized to rate
    const isProjectOwner = project.postedBy === req.user.id;
    const isAssignee = project.assignedTo === req.user.id;

    if (!isProjectOwner && !isAssignee) {
      return res.status(403).json({
        error: 'You can only rate users from projects you are involved in'
      });
    }

    // Validate rating type permissions
    if (ratingType === 'client-to-freelancer' && !isProjectOwner) {
      return res.status(403).json({
        error: 'Only project owners can rate freelancers'
      });
    }

    if (ratingType === 'freelancer-to-client' && !isAssignee) {
      return res.status(403).json({
        error: 'Only assigned freelancers can rate clients'
      });
    }

    // Check if rated user is involved in the project
    if (ratingType === 'client-to-freelancer' && project.assignedTo !== parseInt(ratedUserId)) {
      return res.status(400).json({
        error: 'You can only rate the assigned freelancer'
      });
    }

    if (ratingType === 'freelancer-to-client' && project.postedBy !== parseInt(ratedUserId)) {
      return res.status(400).json({
        error: 'You can only rate the project owner'
      });
    }

    // Check if rating already exists
    const existingRating = await Rating.findOne({
      where: {
        projectId,
        raterUserId: req.user.id,
        ratingType
      }
    });

    if (existingRating) {
      return res.status(400).json({
        error: 'You have already rated this user for this project'
      });
    }

    // Create rating
    const rating = await Rating.create({
      projectId: parseInt(projectId),
      ratedUserId: parseInt(ratedUserId),
      raterUserId: req.user.id,
      score: parseInt(score),
      review,
      ratingType,
      criteria
    });

    // Update user's reputation
    await updateUserReputation(ratedUserId);

    // Fetch rating with user info
    const ratingWithUsers = await Rating.findByPk(rating.id, {
      include: [
        {
          model: User,
          as: 'ratedUser',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'rater',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title']
        }
      ]
    });

    res.status(201).json({
      message: 'Rating submitted successfully',
      rating: ratingWithUsers
    });

  } catch (error) {
    console.error('Create rating error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      error: 'Failed to submit rating'
    });
  }
});

/**
 * @route   GET /api/ratings/user/:userId
 * @desc    Get ratings for a specific user
 * @access  Public
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      ratingType, 
      page = 1, 
      limit = 20,
      includeReviews = true
    } = req.query;

    const where = { 
      ratedUserId: userId,
      isPublic: true
    };
    
    if (ratingType) {
      where.ratingType = ratingType;
    }

    const offset = (page - 1) * limit;

    const ratings = await Rating.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'rater',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title', 'category']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      attributes: includeReviews === 'true' 
        ? ['id', 'score', 'review', 'ratingType', 'criteria', 'createdAt', 'helpfulVotes']
        : ['id', 'score', 'ratingType', 'createdAt', 'helpfulVotes']
    });

    // Calculate rating statistics
    const stats = await Rating.findAll({
      where: { ratedUserId: userId, isPublic: true },
      attributes: [
        'ratingType',
        [Rating.sequelize.fn('AVG', Rating.sequelize.col('score')), 'averageRating'],
        [Rating.sequelize.fn('COUNT', Rating.sequelize.col('id')), 'totalRatings'],
        [Rating.sequelize.fn('COUNT', Rating.sequelize.literal('CASE WHEN score = 5 THEN 1 END')), 'fiveStarCount'],
        [Rating.sequelize.fn('COUNT', Rating.sequelize.literal('CASE WHEN score = 4 THEN 1 END')), 'fourStarCount'],
        [Rating.sequelize.fn('COUNT', Rating.sequelize.literal('CASE WHEN score = 3 THEN 1 END')), 'threeStarCount'],
        [Rating.sequelize.fn('COUNT', Rating.sequelize.literal('CASE WHEN score = 2 THEN 1 END')), 'twoStarCount'],
        [Rating.sequelize.fn('COUNT', Rating.sequelize.literal('CASE WHEN score = 1 THEN 1 END')), 'oneStarCount']
      ],
      group: ['ratingType'],
      raw: true
    });

    res.json({
      ratings: ratings.rows,
      statistics: stats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(ratings.count / limit),
        totalRatings: ratings.count,
        hasNextPage: offset + ratings.rows.length < ratings.count,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get user ratings error:', error);
    res.status(500).json({
      error: 'Failed to get user ratings'
    });
  }
});

/**
 * @route   GET /api/ratings/project/:projectId
 * @desc    Get ratings for a specific project
 * @access  Public
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const ratings = await Rating.findAll({
      where: { 
        projectId,
        isPublic: true
      },
      include: [
        {
          model: User,
          as: 'ratedUser',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture']
        },
        {
          model: User,
          as: 'rater',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(ratings);

  } catch (error) {
    console.error('Get project ratings error:', error);
    res.status(500).json({
      error: 'Failed to get project ratings'
    });
  }
});

/**
 * @route   GET /api/ratings/my-ratings
 * @desc    Get ratings given by current user
 * @access  Private
 */
router.get('/my-ratings', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const ratings = await Rating.findAndCountAll({
      where: { raterUserId: req.user.id },
      include: [
        {
          model: User,
          as: 'ratedUser',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title', 'category']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      ratings: ratings.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(ratings.count / limit),
        totalRatings: ratings.count,
        hasNextPage: offset + ratings.rows.length < ratings.count,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get my ratings error:', error);
    res.status(500).json({
      error: 'Failed to get your ratings'
    });
  }
});

/**
 * @route   PUT /api/ratings/:id
 * @desc    Update a rating
 * @access  Private (Rater only)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { score, review, criteria } = req.body;

    const rating = await Rating.findByPk(req.params.id);

    if (!rating) {
      return res.status(404).json({
        error: 'Rating not found'
      });
    }

    if (!rating.canEdit(req.user.id)) {
      return res.status(403).json({
        error: 'You can only edit your own ratings'
      });
    }

    if (score && (score < 1 || score > 5)) {
      return res.status(400).json({
        error: 'Score must be between 1 and 5'
      });
    }

    await rating.update({
      score: score || rating.score,
      review: review !== undefined ? review : rating.review,
      criteria: criteria || rating.criteria
    });

    // Update user's reputation
    await updateUserReputation(rating.ratedUserId);

    // Fetch updated rating with includes
    const updatedRating = await Rating.findByPk(rating.id, {
      include: [
        {
          model: User,
          as: 'ratedUser',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'rater',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      message: 'Rating updated successfully',
      rating: updatedRating
    });

  } catch (error) {
    console.error('Update rating error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      error: 'Failed to update rating'
    });
  }
});

/**
 * @route   POST /api/ratings/:id/helpful
 * @desc    Mark rating as helpful
 * @access  Private
 */
router.post('/:id/helpful', authenticate, async (req, res) => {
  try {
    const rating = await Rating.findByPk(req.params.id);

    if (!rating) {
      return res.status(404).json({
        error: 'Rating not found'
      });
    }

    if (rating.raterUserId === req.user.id) {
      return res.status(400).json({
        error: 'You cannot mark your own rating as helpful'
      });
    }

    await rating.incrementHelpful();

    res.json({
      message: 'Rating marked as helpful',
      helpfulVotes: rating.helpfulVotes
    });

  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      error: 'Failed to mark rating as helpful'
    });
  }
});

/**
 * Helper function to update user reputation
 */
async function updateUserReputation(userId) {
  try {
    const ratings = await Rating.findAll({
      where: { ratedUserId: userId },
      attributes: ['score']
    });

    if (ratings.length > 0) {
      const averageScore = ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length;
      
      await User.update(
        { reputation: Math.round(averageScore * 100) / 100 },
        { where: { id: userId } }
      );
    }
  } catch (error) {
    console.error('Update reputation error:', error);
  }
}

module.exports = router;