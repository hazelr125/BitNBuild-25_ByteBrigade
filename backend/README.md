# GigCampus Backend API

A comprehensive Node.js backend for the GigCampus university marketplace platform.

## 🚀 Features

- **User Authentication** - JWT-based authentication with registration and login
- **Project Management** - Create, browse, update, and manage projects
- **Bidding System** - Students can bid on projects with portfolio uploads
- **Real-time Messaging** - Project-based messaging system between clients and freelancers
- **Rating & Reviews** - Comprehensive rating system for both clients and freelancers
- **Payment Processing** - Stripe integration for secure payments
- **File Uploads** - Support for profile pictures, project attachments, and portfolios
- **Advanced Search** - Filter projects by category, budget, location, etc.
- **Security** - Rate limiting, input validation, and secure file handling

## 🛠️ Tech Stack

- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Payment Processing**: Stripe
- **Security**: Helmet, CORS, Rate Limiting
- **Environment**: Node.js 16+

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js 16+ installed
- PostgreSQL installed and running
- Stripe account (for payment processing)
- Git (for version control)

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd gig/backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the backend directory and update the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_postgres_username
DB_PASS=your_postgres_password
DB_NAME=gigcampus_db
DB_PORT=5432

# JWT Secret (Generate a strong secret)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex_123456789

# Server Configuration
PORT=5000
NODE_ENV=development

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads/

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Database Setup

#### Create PostgreSQL Database
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE gigcampus_db;
CREATE USER gigcampus_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE gigcampus_db TO gigcampus_user;
```

#### Update your .env file with the correct database credentials

### 5. Get Stripe Keys
1. Sign up at [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to Developers → API keys
3. Copy your publishable and secret keys
4. Update your `.env` file

### 6. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
Include JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Main Endpoints

#### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `POST /api/users/me/avatar` - Upload profile picture

#### Projects
- `POST /api/projects` - Create new project
- `GET /api/projects` - Get all projects (with filters)
- `GET /api/projects/:id` - Get single project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Bids
- `POST /api/bids` - Place a bid
- `GET /api/bids/project/:projectId` - Get bids for project
- `GET /api/bids/my-bids` - Get user's bids
- `PUT /api/bids/:id` - Update bid
- `DELETE /api/bids/:id` - Withdraw bid

#### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/project/:projectId` - Get project messages
- `GET /api/messages/conversations` - Get all conversations

#### Ratings
- `POST /api/ratings` - Submit rating
- `GET /api/ratings/user/:userId` - Get user ratings

#### Payments
- `POST /api/payments/create-payment-intent` - Create payment intent
- `POST /api/payments/confirm-payment` - Confirm payment
- `GET /api/payments/earnings` - Get earnings summary

### Sample API Calls

#### Register User
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "isStudent": true,
    "university": "IIT Bombay"
  }'
```

#### Create Project
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Build a React Website",
    "description": "Need a responsive website built with React",
    "category": "tech-services",
    "budget": 5000,
    "budgetType": "fixed",
    "deadline": "2024-12-31",
    "isRemote": true
  }'
```

## 🗂️ Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   ├── auth.js              # Authentication middleware
│   ├── rateLimiter.js       # Rate limiting middleware
│   └── upload.js            # File upload middleware
├── models/
│   ├── User.js              # User model
│   ├── Project.js           # Project model
│   ├── Bid.js               # Bid model
│   ├── Message.js           # Message model
│   ├── Rating.js            # Rating model
│   └── index.js             # Model associations
├── routes/
│   ├── userRoutes.js        # User-related routes
│   ├── projectRoutes.js     # Project-related routes
│   ├── bidRoutes.js         # Bid-related routes
│   ├── messageRoutes.js     # Message-related routes
│   ├── ratingRoutes.js      # Rating-related routes
│   └── paymentRoutes.js     # Payment-related routes
├── uploads/                 # File upload directory
├── .env                     # Environment variables
├── app.js                   # Main application file
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## 🔒 Security Features

- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **Input Validation**: All inputs are validated using Sequelize validators
- **File Upload Security**: File type and size restrictions
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Passwords are hashed using bcryptjs
- **CORS Protection**: Configured for secure cross-origin requests
- **Helmet**: Security headers for Express applications

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:5000/api/health
```

### API Documentation
```bash
curl http://localhost:5000/api
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Error
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists

#### File Upload Issues
- Check upload directory permissions
- Verify `MAX_FILE_SIZE` setting
- Ensure upload directories exist

#### Stripe Payment Issues
- Verify Stripe keys are correct
- Check webhook endpoint configuration
- Ensure amounts are in correct format (paise for INR)

## 🔄 Development Scripts

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Check for security vulnerabilities
npm audit

# Fix security vulnerabilities
npm audit fix
```

## 📝 Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database host | localhost | Yes |
| `DB_USER` | Database username | postgres | Yes |
| `DB_PASS` | Database password | - | Yes |
| `DB_NAME` | Database name | gigcampus_db | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `PORT` | Server port | 5000 | No |
| `NODE_ENV` | Environment | development | No |
| `STRIPE_SECRET_KEY` | Stripe secret key | - | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 | No |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, please contact the development team or create an issue in the repository.