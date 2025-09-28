const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rating = sequelize.define('Rating', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  review: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
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
  ratedUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  raterUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  ratingType: {
    type: DataTypes.ENUM('client-to-freelancer', 'freelancer-to-client'),
    allowNull: false
  },
  criteria: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Detailed rating criteria like communication, quality, timeliness'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  helpfulVotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  reportedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'ratings',
  indexes: [
    {
      fields: ['rated_user_id']
    },
    {
      fields: ['rater_user_id']
    },
    {
      fields: ['project_id']
    },
    {
      fields: ['score']
    },
    {
      unique: true,
      fields: ['project_id', 'rater_user_id', 'rating_type']
    }
  ]
});

// Instance methods
Rating.prototype.canEdit = function(userId) {
  return this.raterUserId === userId;
};

Rating.prototype.incrementHelpful = async function() {
  this.helpfulVotes += 1;
  return await this.save();
};

Rating.prototype.reportRating = async function() {
  this.reportedCount += 1;
  return await this.save();
};

module.exports = Rating;