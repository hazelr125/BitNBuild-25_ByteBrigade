const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [5, 200],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [20, 5000],
      notEmpty: true
    }
  },
  category: {
    type: DataTypes.ENUM(
      'academic-tutoring',
      'creative-design', 
      'tech-services',
      'photography',
      'fitness-training',
      'language-learning',
      'event-management',
      'content-writing',
      'other'
    ),
    allowNull: false
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  budgetType: {
    type: DataTypes.ENUM('fixed', 'hourly'),
    defaultValue: 'fixed'
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  isRemote: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  requirements: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  attachments: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  postedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM(
      'open',
      'in-progress', 
      'completed',
      'cancelled',
      'disputed'
    ),
    defaultValue: 'open'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isUrgent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'projects',
  indexes: [
    {
      fields: ['posted_by']
    },
    {
      fields: ['assigned_to']
    },
    {
      fields: ['status']
    },
    {
      fields: ['category']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
Project.prototype.incrementViews = async function() {22
  this.views += 1;
  return await this.save();
};

Project.prototype.isOwner = function(userId) {
  return this.postedBy === userId;
};

Project.prototype.canEdit = function(userId) {
  return this.postedBy === userId && this.status === 'open';
};

module.exports = Project;