// Simple test to check current login and user data
const { User } = require('./backend/models');

async function testCurrentUser() {
  try {
    console.log('🔍 Checking current users...\n');
    
    // Get all users with their actual data
    const users = await User.findAll({
      attributes: ['id', 'username', 'firstName', 'lastName', 'email'],
      order: [['id', 'DESC']]
    });
    
    console.log('📊 All users in database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Username: "${user.username}"`);
      console.log(`   First Name: "${user.firstName}"`);
      console.log(`   Last Name: "${user.lastName}"`);
      console.log(`   Email: "${user.email}"`);
      console.log('');
    });
    
    // Check most recent user (likely the test user)
    if (users.length > 0) {
      const latestUser = users[0];
      console.log('🎯 Most recent user (probably current):');
      console.log(`   Full Name: "${latestUser.firstName} ${latestUser.lastName}"`);
      console.log(`   Display Name: "${latestUser.firstName || latestUser.username}"`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testCurrentUser();