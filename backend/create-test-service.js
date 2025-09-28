const { Project, User } = require('./models');
const { sequelize } = require('./config/database');

async function createTestService() {
    try {
        console.log('🔄 Connecting to database...');
        
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        
        // Get a user to create a service for
        const user = await User.findOne();
        if (!user) {
            console.log('❌ No users found. Please register a user first.');
            return;
        }
        
        console.log(`\n👤 Creating service for user: ${user.firstName} ${user.lastName} (${user.email})`);
        
        // Create a test service/project
        const testProject = await Project.create({
            title: 'Mathematics Tutoring for Engineering Students',
            description: 'I offer comprehensive mathematics tutoring covering Calculus, Linear Algebra, and Differential Equations. Perfect for engineering students who need help understanding complex mathematical concepts. I have 3+ years of experience and have helped over 50 students improve their grades.',
            category: 'academic-tutoring',
            budget: 1200.00,
            budgetType: 'hourly',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            location: 'Mumbai, Maharashtra',
            isRemote: true,
            requirements: ['Basic knowledge of algebra', 'Willingness to learn', 'Regular practice'],
            attachments: [],
            priority: 'medium',
            isUrgent: false,
            postedBy: user.id,
            status: 'open'
        });
        
        console.log('\n✅ Test service created successfully!');
        console.log(`   Service ID: ${testProject.id}`);
        console.log(`   Title: ${testProject.title}`);
        console.log(`   Budget: ₹${testProject.budget}/${testProject.budgetType}`);
        console.log(`   Category: ${testProject.category}`);
        
        // Now fetch all projects for this user
        console.log('\n📋 Fetching user services...');
        const userProjects = await Project.findAll({
            where: { postedBy: user.id },
            include: [{
                model: User,
                as: 'poster',
                attributes: ['id', 'firstName', 'lastName', 'email']
            }],
            order: [['created_at', 'DESC']]
        });
        
        console.log(`\n📊 Found ${userProjects.length} service(s) for this user:`);
        
        userProjects.forEach((project, index) => {
            console.log(`\n${index + 1}. ${project.title}`);
            console.log(`   Budget: ₹${project.budget}/${project.budgetType}`);
            console.log(`   Status: ${project.status}`);
            console.log(`   Created: ${new Date(project.created_at).toLocaleString()}`);
        });
        
        console.log('\n🎉 Service creation and retrieval test completed successfully!');

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
createTestService();