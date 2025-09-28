const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 2000],
      notEmpty: true
    }
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  receiverId: {
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
  messageType: {
    type: DataTypes.ENUM('text', 'file', 'image', 'system'),
    defaultValue: 'text'
  },
  attachments: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  replyToId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'messages',
      key: 'id'
    }
  }
}, {
  tableName: 'messages',
  indexes: [
    {
      fields: ['sender_id']
    },
    {
      fields: ['receiver_id']
    },
    {
      fields: ['project_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['is_read']
    }
  ]
});

// Instance methods
Message.prototype.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

Message.prototype.canEdit = function(userId) {
  return this.senderId === userId && !this.isDeleted;
};

Message.prototype.canDelete = function(userId) {
  return this.senderId === userId && !this.isDeleted;
};

Message.prototype.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

module.exports = Message;