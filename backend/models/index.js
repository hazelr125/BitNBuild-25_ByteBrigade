const { sequelize } = require('../config/database');
const User = require('./User');
const Project = require('./Project');
const Bid = require('./Bid');
const Message = require('./Message');
const Rating = require('./Rating');

// Define relationships
// User - Project relationships
User.hasMany(Project, { 
  foreignKey: 'postedBy', 
  as: 'postedProjects',
  onDelete: 'CASCADE'
});
Project.belongsTo(User, { 
  foreignKey: 'postedBy', 
  as: 'poster'
});

User.hasMany(Project, { 
  foreignKey: 'assignedTo', 
  as: 'assignedProjects',
  onDelete: 'SET NULL'
});
Project.belongsTo(User, { 
  foreignKey: 'assignedTo', 
  as: 'assignee'
});

// User - Bid relationships
User.hasMany(Bid, { 
  foreignKey: 'userId', 
  as: 'bids',
  onDelete: 'CASCADE'
});
Bid.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'bidder'
});

// Project - Bid relationships
Project.hasMany(Bid, { 
  foreignKey: 'projectId', 
  as: 'bids',
  onDelete: 'CASCADE'
});
Bid.belongsTo(Project, { 
  foreignKey: 'projectId', 
  as: 'project'
});

// User - Message relationships (sender)
User.hasMany(Message, { 
  foreignKey: 'senderId', 
  as: 'sentMessages',
  onDelete: 'CASCADE'
});
Message.belongsTo(User, { 
  foreignKey: 'senderId', 
  as: 'sender'
});

// User - Message relationships (receiver)
User.hasMany(Message, { 
  foreignKey: 'receiverId', 
  as: 'receivedMessages',
  onDelete: 'CASCADE'
});
Message.belongsTo(User, { 
  foreignKey: 'receiverId', 
  as: 'receiver'
});

// Project - Message relationships
Project.hasMany(Message, { 
  foreignKey: 'projectId', 
  as: 'messages',
  onDelete: 'CASCADE'
});
Message.belongsTo(Project, { 
  foreignKey: 'projectId', 
  as: 'project'
});

// Message - Message relationships (replies)
Message.hasMany(Message, { 
  foreignKey: 'replyToId', 
  as: 'replies',
  onDelete: 'CASCADE'
});
Message.belongsTo(Message, { 
  foreignKey: 'replyToId', 
  as: 'replyTo'
});

// User - Rating relationships (rated user)
User.hasMany(Rating, { 
  foreignKey: 'ratedUserId', 
  as: 'receivedRatings',
  onDelete: 'CASCADE'
});
Rating.belongsTo(User, { 
  foreignKey: 'ratedUserId', 
  as: 'ratedUser'
});

// User - Rating relationships (rater)
User.hasMany(Rating, { 
  foreignKey: 'raterUserId', 
  as: 'givenRatings',
  onDelete: 'CASCADE'
});
Rating.belongsTo(User, { 
  foreignKey: 'raterUserId', 
  as: 'rater'
});

// Project - Rating relationships
Project.hasMany(Rating, { 
  foreignKey: 'projectId', 
  as: 'ratings',
  onDelete: 'CASCADE'
});
Rating.belongsTo(Project, { 
  foreignKey: 'projectId', 
  as: 'project'
});

module.exports = {
  sequelize,
  User,
  Project,
  Bid,
  Message,
  Rating
};