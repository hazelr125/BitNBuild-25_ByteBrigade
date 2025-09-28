const express = require('express');
const router = express.Router();
const { Message, Project, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimiter');
const { upload, handleMulterError } = require('../middleware/upload');

/**
 * @route   POST /api/messages
 * @desc    Send a new message
 * @access  Private
 */
router.post('/', authenticate, messageLimiter, upload.array('attachments', 3), handleMulterError, async (req, res) => {
  try {
    const { content, receiverId, projectId, replyToId } = req.body;

    if (!content || !receiverId || !projectId) {
      return res.status(400).json({
        error: 'Content, receiver ID, and project ID are required'
      });
    }

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if receiver exists
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({
        error: 'Receiver not found'
      });
    }

    // Check if user has permission to send message for this project
    const isProjectOwner = project.postedBy === req.user.id;
    const isAssignee = project.assignedTo === req.user.id;
    
    if (!isProjectOwner && !isAssignee) {
      // Check if user has a bid on this project
      const { Bid } = require('../models');
      const userBid = await Bid.findOne({
        where: { userId: req.user.id, projectId }
      });
      
      if (!userBid) {
        return res.status(403).json({
          error: 'You can only send messages for projects you own, are assigned to, or have bid on'
        });
      }
    }

    // Check if receiver is involved in the project
    const receiverInvolved = receiver.id === project.postedBy || receiver.id === project.assignedTo;
    if (!receiverInvolved) {
      // Check if receiver has a bid on this project
      const { Bid } = require('../models');
      const receiverBid = await Bid.findOne({
        where: { userId: receiver.id, projectId }
      });
      
      if (!receiverBid) {
        return res.status(403).json({
          error: 'You can only send messages to users involved in this project'
        });
      }
    }

    // Process attachments
    const attachments = req.files ? req.files.map(file => `/uploads/messages/${file.filename}`) : [];

    const message = await Message.create({
      content,
      senderId: req.user.id,
      receiverId: parseInt(receiverId),
      projectId: parseInt(projectId),
      replyToId: replyToId ? parseInt(replyToId) : null,
      messageType: attachments.length > 0 ? 'file' : 'text',
      attachments
    });

    // Fetch message with sender info
    const messageWithSender = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Message,
          as: 'replyTo',
          attributes: ['id', 'content', 'senderId'],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: messageWithSender
    });

  } catch (error) {
    console.error('Send message error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      error: 'Failed to send message'
    });
  }
});

/**
 * @route   GET /api/messages/project/:projectId
 * @desc    Get messages for a specific project
 * @access  Private
 */
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user has access to this conversation
    const isProjectOwner = project.postedBy === req.user.id;
    const isAssignee = project.assignedTo === req.user.id;
    
    if (!isProjectOwner && !isAssignee) {
      // Check if user has a bid on this project
      const { Bid } = require('../models');
      const userBid = await Bid.findOne({
        where: { userId: req.user.id, projectId }
      });
      
      if (!userBid) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
    }

    const offset = (page - 1) * limit;

    const messages = await Message.findAndCountAll({
      where: { 
        projectId,
        isDeleted: false
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Message,
          as: 'replyTo',
          attributes: ['id', 'content', 'senderId'],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'ASC']]
    });

    // Mark messages as read where current user is the receiver
    await Message.update(
      { isRead: true, readAt: new Date() },
      { 
        where: { 
          projectId, 
          receiverId: req.user.id, 
          isRead: false,
          isDeleted: false
        } 
      }
    );

    res.json({
      messages: messages.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(messages.count / limit),
        totalMessages: messages.count,
        hasNextPage: offset + messages.rows.length < messages.count,
        hasPrevPage: page > 1
      },
      project: {
        id: project.id,
        title: project.title,
        status: project.status
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to get messages'
    });
  }
});

/**
 * @route   GET /api/messages/conversations
 * @desc    Get all conversations for current user
 * @access  Private
 */
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get all projects where user is involved
    const { Bid } = require('../models');
    const userProjects = await Project.findAll({
      where: {
        $or: [
          { postedBy: req.user.id },
          { assignedTo: req.user.id }
        ]
      },
      attributes: ['id']
    });

    const userBids = await Bid.findAll({
      where: { userId: req.user.id },
      attributes: ['projectId']
    });

    const projectIds = [
      ...userProjects.map(p => p.id),
      ...userBids.map(b => b.projectId)
    ];

    if (projectIds.length === 0) {
      return res.json({
        conversations: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalConversations: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Get latest message for each project
    const conversations = await Message.findAll({
      attributes: [
        'projectId',
        [Message.sequelize.fn('MAX', Message.sequelize.col('created_at')), 'lastMessageAt']
      ],
      where: {
        projectId: { $in: projectIds },
        isDeleted: false
      },
      group: ['projectId'],
      order: [[Message.sequelize.literal('lastMessageAt'), 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get full conversation details
    const conversationDetails = await Promise.all(
      conversations.map(async (conv) => {
        const project = await Project.findByPk(conv.projectId, {
          include: [
            {
              model: User,
              as: 'poster',
              attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture']
            },
            {
              model: User,
              as: 'assignee',
              attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture']
            }
          ]
        });

        const lastMessage = await Message.findOne({
          where: { 
            projectId: conv.projectId,
            isDeleted: false
          },
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username']
            }
          ],
          order: [['createdAt', 'DESC']]
        });

        const unreadCount = await Message.count({
          where: {
            projectId: conv.projectId,
            receiverId: req.user.id,
            isRead: false,
            isDeleted: false
          }
        });

        return {
          project,
          lastMessage,
          unreadCount
        };
      })
    );

    res.json({
      conversations: conversationDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(projectIds.length / limit),
        totalConversations: projectIds.length,
        hasNextPage: offset + conversations.length < projectIds.length,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      error: 'Failed to get conversations'
    });
  }
});

/**
 * @route   PUT /api/messages/:id
 * @desc    Edit a message
 * @access  Private (Sender only)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Content is required'
      });
    }

    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found'
      });
    }

    if (!message.canEdit(req.user.id)) {
      return res.status(403).json({
        error: 'You can only edit your own messages'
      });
    }

    await message.update({
      content,
      editedAt: new Date()
    });

    // Fetch updated message with includes
    const updatedMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture']
        }
      ]
    });

    res.json({
      message: 'Message updated successfully',
      data: updatedMessage
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      error: 'Failed to edit message'
    });
  }
});

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message
 * @access  Private (Sender only)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found'
      });
    }

    if (!message.canDelete(req.user.id)) {
      return res.status(403).json({
        error: 'You can only delete your own messages'
      });
    }

    await message.softDelete();

    res.json({
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      error: 'Failed to delete message'
    });
  }
});

/**
 * @route   POST /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private (Receiver only)
 */
router.post('/:id/read', authenticate, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found'
      });
    }

    if (message.receiverId !== req.user.id) {
      return res.status(403).json({
        error: 'You can only mark your own messages as read'
      });
    }

    await message.markAsRead();

    res.json({
      message: 'Message marked as read'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: 'Failed to mark message as read'
    });
  }
});

module.exports = router;