const { User } = require('./models');
const { sequelize } = require('./config/database');

async function showAllUsers() {
    try {
        console.log('🔄 Connecting to database...');
        
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        
        // Get all users
        const users = await User.findAll({
            order: [['created_at', 'DESC']],
            raw: true // Get plain objects instead of Sequelize instances
        });

        console.log('\n📊 Database Statistics:');
        console.log(`Total Users: ${users.length}`);
        console.log(`Students: ${users.filter(u => u.isStudent).length}`);
        console.log(`Freelancers: ${users.filter(u => !u.isStudent).length}`);
        
        const today = new Date().toDateString();
        const newToday = users.filter(u => 
            new Date(u.created_at).toDateString() === today
        ).length;
        console.log(`New today: ${newToday}`);

        if (users.length === 0) {
            console.log('\n❌ No users found in the database');
            return;
        }

        console.log('\n👥 Registered Users:');
        console.log('==========================================');
        
        users.forEach((user, index) => {
            console.log(`\n${index + 1}. User Details:`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Name: ${user.firstName} ${user.lastName}`);
            console.log(`   Username: ${user.username}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   University: ${user.university || 'N/A'}`);
            console.log(`   Course: ${user.course || 'N/A'}`);
            console.log(`   Year: ${user.year || 'N/A'}`);
            console.log(`   Phone: ${user.phone || 'N/A'}`);
            console.log(`   Type: ${user.isStudent ? 'Student' : 'Freelancer'}`);
            console.log(`   Status: ${user.status || 'Active'}`);
            console.log(`   Reputation: ${user.reputation || 0}`);
            console.log(`   Total Earnings: ₹${user.totalEarnings || 0}`);
            console.log(`   Joined: ${new Date(user.created_at).toLocaleString()}`);
            console.log(`   Last Updated: ${new Date(user.updated_at).toLocaleString()}`);
            console.log('------------------------------------------');
        });

        console.log(`\n✅ Found ${users.length} registered users`);

    } catch (error) {
        console.error('❌ Error fetching users:', error.message);
        if (error.original) {
            console.error('Database error:', error.original.message);
        }
    } finally {
        await sequelize.close();
        console.log('🔒 Database connection closed');
    }
}

// Run the script
showAllUsers();