#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 GigCampus Backend Setup');
console.log('========================');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found!');
  console.log('📝 Please create a .env file with the following variables:');
  console.log('');
  console.log('DB_HOST=localhost');
  console.log('DB_USER=your_postgres_username');
  console.log('DB_PASS=your_postgres_password');
  console.log('DB_NAME=gigcampus_db');
  console.log('JWT_SECRET=your_super_secret_jwt_key_here');
  console.log('STRIPE_SECRET_KEY=sk_test_your_stripe_key_here');
  console.log('');
  console.log('See README.md for complete setup instructions.');
  process.exit(1);
} else {
  console.log('✅ .env file found');
}

// Check if upload directories exist
const uploadDirs = [
  'uploads',
  'uploads/profiles',
  'uploads/projects',
  'uploads/messages'
];

console.log('📁 Creating upload directories...');
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   Created: ${dir}`);
  } else {
    console.log(`   Exists: ${dir}`);
  }
});

console.log('');
console.log('✅ Setup complete!');
console.log('');
console.log('Next steps:');
console.log('1. Make sure PostgreSQL is running');
console.log('2. Update .env with your database credentials');
console.log('3. Run: npm start (or npm run dev for development)');
console.log('');
console.log('🔗 Server will be available at: http://localhost:5000');
console.log('📚 API docs will be at: http://localhost:5000/api');