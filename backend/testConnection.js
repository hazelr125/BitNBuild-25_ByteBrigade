const { Client } = require('pg');
require('dotenv').config();

async function createDatabaseIfNotExists() {
  // First connect to postgres database to create our database
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'password',
    database: 'postgres' // Connect to default postgres database
  });

  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Check if database exists
    const dbName = process.env.DB_NAME || 'gigcampus_db';
    const checkResult = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (checkResult.rows.length === 0) {
      console.log(`🔄 Creating database '${dbName}'...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database '${dbName}' created successfully`);
    } else {
      console.log(`✅ Database '${dbName}' already exists`);
    }

    await adminClient.end();

    // Now test connection to our application database
    const appClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'password',
      database: dbName
    });

    console.log(`🔄 Testing connection to '${dbName}' database...`);
    await appClient.connect();
    console.log('✅ Successfully connected to application database');
    
    // Test basic query
    const result = await appClient.query('SELECT NOW() as current_time');
    console.log(`✅ Database query test successful: ${result.rows[0].current_time}`);
    
    await appClient.end();
    console.log('🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('');
    console.error('Troubleshooting steps:');
    console.error('1. Verify PostgreSQL is running: Get-Service postgresql*');
    console.error('2. Check credentials in .env file');
    console.error('3. Verify PostgreSQL is accepting connections on port', process.env.DB_PORT || 5432);
    process.exit(1);
  }
}

createDatabaseIfNotExists();