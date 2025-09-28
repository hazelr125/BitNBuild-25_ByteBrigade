const { Project, User } = require('./models');
const { sequelize } = require('./config/database');

async function testProjects() {
    try {
        console.log('🔄 Connecting to database...');
        
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        
        // Get all projects
        console.log('\n📋 Fetching all projects...');
        const projects = await Project.findAll({
            include: [
                {
                    model: User,
                    as: 'poster',
                    attributes: ['id', 'username', 'firstName', 'lastName'],
                    required: false
                }
            ],
            order: [['created_at', 'DESC']],
            raw: false
        });

        console.log(`\n📊 Found ${projects.length} projects in database`);

        if (projects.length === 0) {
            console.log('\n❌ No projects found. The projects table might be empty.');
            
            // Let's check if the table exists
            console.log('\n🔍 Checking if projects table exists...');
            const tables = await sequelize.getQueryInterface().showAllTables();
            console.log('Available tables:', tables);
            
            if (tables.includes('projects') || tables.includes('Projects')) {
                console.log('✅ Projects table exists but is empty');
            } else {
                console.log('❌ Projects table does not exist');
            }
        } else {
            console.log('\n📋 Projects List:');
            console.log('==========================================');
            
            projects.forEach((project, index) => {
                const p = project.get ? project.get({ plain: true }) : project;
                console.log(`\n${index + 1}. Project Details:`);
                console.log(`   ID: ${p.id}`);
                console.log(`   Title: ${p.title}`);
                console.log(`   Category: ${p.category}`);
                console.log(`   Budget: ₹${p.budget} (${p.budgetType})`);
                console.log(`   Status: ${p.status || 'open'}`);
                console.log(`   Posted by: ${p.poster ? `${p.poster.firstName} ${p.poster.lastName}` : 'Unknown'}`);
                console.log(`   Remote: ${p.isRemote ? 'Yes' : 'No'}`);
                console.log(`   Created: ${new Date(p.created_at).toLocaleString()}`);
                console.log(`   Description: ${p.description.substring(0, 100)}...`);
                console.log('------------------------------------------');
            });
        }

        console.log('\n✅ Project query completed successfully');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.original) {
            console.error('Database error:', error.original.message);
        }
        if (error.sql) {
            console.error('SQL query:', error.sql);
        }
    } finally {
        await sequelize.close();
        console.log('🔒 Database connection closed');
    }
}

// Run the script
testProjects();