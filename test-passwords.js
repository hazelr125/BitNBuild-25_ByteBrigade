// Check user passwords (hashed) to understand login issue
const bcrypt = require('bcrypt');
const { User } = require('./backend/models');

async function testUserPasswords() {
    try {
        console.log('🔍 Checking user passwords...\n');
        
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'firstName', 'password'],
            limit: 3,
            order: [['id', 'DESC']]
        });
        
        console.log('Recent users:');
        for (const user of users) {
            console.log(`\n👤 ${user.firstName} (${user.email})`);
            console.log(`   Username: ${user.username}`);
            
            // Test common passwords
            const commonPasswords = ['password123', 'test123', 'password', '123456'];
            let foundPassword = false;
            
            for (const testPassword of commonPasswords) {
                try {
                    const isMatch = await bcrypt.compare(testPassword, user.password);
                    if (isMatch) {
                        console.log(`   ✅ Password: ${testPassword}`);
                        foundPassword = true;
                        break;
                    }
                } catch (err) {
                    // Skip
                }
            }
            
            if (!foundPassword) {
                console.log(`   ❓ Password: Not in common list (${user.password.substring(0, 10)}...)`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

testUserPasswords();