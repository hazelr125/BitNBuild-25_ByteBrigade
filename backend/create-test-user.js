// Simple test to create a user and test login
const bcrypt = require('bcryptjs');
const { User } = require('./models');

async function createTestUserAndLogin() {
    try {
        console.log('🔍 Creating a fresh test user...\n');
        
        // Create a test user with known password
        const testUser = await User.create({
            username: 'dashboard_test',
            email: 'dashboard@test.com',
            password: await bcrypt.hash('test123', 10),
            firstName: 'Dashboard',
            lastName: 'Test',
            isStudent: true,
            university: 'Test University',
            course: 'Computer Science',
            year: 3,
            phone: '9999999999'
        });
        
        console.log('✅ Created test user:', {
            id: testUser.id,
            username: testUser.username,
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName
        });
        
        console.log('\n📋 Login credentials:');
        console.log('   Email: dashboard@test.com');
        console.log('   Password: test123');
        
        console.log('\n📋 Expected dashboard display:');
        console.log(`   "Welcome back, ${testUser.firstName}!"`);
        
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            console.log('ℹ️  Test user already exists, checking existing user...');
            
            const existingUser = await User.findOne({
                where: { email: 'dashboard@test.com' },
                attributes: ['id', 'username', 'firstName', 'lastName', 'email']
            });
            
            if (existingUser) {
                console.log('✅ Found existing test user:', {
                    id: existingUser.id,
                    username: existingUser.username,
                    email: existingUser.email,
                    firstName: existingUser.firstName,
                    lastName: existingUser.lastName
                });
                
                console.log('\n📋 Login credentials:');
                console.log('   Email: dashboard@test.com');
                console.log('   Password: test123');
            }
        } else {
            console.error('❌ Error:', error);
        }
    } finally {
        process.exit(0);
    }
}

createTestUserAndLogin();