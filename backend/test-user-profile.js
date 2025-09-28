const { User } = require('./models');
const { sequelize } = require('./config/database');

async function testUserProfile() {
    try {
        console.log('🔄 Connecting to database...');
        
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        
        // Get a user to test
        const user = await User.findOne({
            where: { email: 'crce.hazel@gmail.com' } // The user from the screenshot
        });
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('\n📋 Raw User Data from Database:');
        console.log('Raw user object:', JSON.stringify(user.dataValues, null, 2));
        
        console.log('\n🔍 Public Profile Method Result:');
        const publicProfile = user.getPublicProfile();
        console.log('Public profile:', JSON.stringify(publicProfile, null, 2));
        
        console.log('\n🎯 Field Analysis:');
        console.log('firstName:', publicProfile.firstName);
        console.log('lastName:', publicProfile.lastName);
        console.log('username:', publicProfile.username);
        console.log('email:', publicProfile.email);
        
        console.log('\n✨ Dashboard Name Logic Test:');
        let userName;
        if (publicProfile.firstName && publicProfile.firstName !== 'undefined') {
            userName = `${publicProfile.firstName} ${publicProfile.lastName || ''}`.trim();
            console.log('✅ Using firstName + lastName:', userName);
        } else if (publicProfile.username) {
            userName = publicProfile.username;
            console.log('✅ Using username:', userName);
        } else {
            userName = 'User';
            console.log('✅ Using fallback:', userName);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.original) {
            console.error('Database error:', error.original.message);
        }
    } finally {
        await sequelize.close();
        console.log('🔒 Database connection closed');
    }
}

// Run the script
testUserProfile();