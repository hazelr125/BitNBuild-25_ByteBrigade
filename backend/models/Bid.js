const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Bid = sequelize.define('Bid', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 1000],
      notEmpty: true
    }
  },
  deliveryTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Delivery time in days'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'withdrawn'),
    defaultValue: 'pending'
  },
  isSelected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attachments: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  portfolio: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'bids',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['project_id']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['user_id', 'project_id']
    }
  ]
});

// Instance methods
Bid.prototype.canEdit = function(userId) {
  return this.userId === userId && this.status === 'pending';
};

Bid.prototype.canWithdraw = function(userId) {
  return this.userId === userId && ['pending', 'accepted'].includes(this.status);
};

module.exports = Bid;