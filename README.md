# Tenant Template - Backend

A robust Node.js/Express.js backend application with TypeScript, MongoDB, and comprehensive authentication system.

## 🚀 Features

- **Authentication**: JWT-based auth with Google OAuth integration
- **Database**: MongoDB with Mongoose ODM
- **Email Services**: SMTP with Gmail integration, templated emails
- **File Uploads**: Multer integration for file handling
- **Payment**: Stripe integration for payments
- **Security**: Password hashing with bcrypt, CORS protection
- **Email Templates**: EJS templating for email notifications
- **Task Scheduling**: Node-cron for scheduled tasks
- **API Documentation**: RESTful API endpoints
- **TypeScript**: Full TypeScript support with strict type checking

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git**

## 🛠️ Installation & Setup

### 1. Clone the repository

```bash
git clone <your-backend-repo-url>
cd Backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your actual values:

```env
# Database
DB_URL=mongodb+srv://username:password@cluster0.mongodb.net/database?retryWrites=true&w=majority

# JWT Secrets (generate strong secrets)
JWT_ACCESS_SECRET=your-strong-jwt-access-secret
JWT_REFRESH_SECRET=your-strong-jwt-refresh-secret
JWT_RESET_SECRET=your-strong-jwt-reset-secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# SMTP Configuration
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com

# Stripe (optional)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLIC_KEY=your_stripe_public_key

# Security
ALGORITHM=aes-256-cbc
ENC_KEY=your-32-character-encryption-key
```

### 4. Database Setup

Make sure your MongoDB database is running and accessible with the connection string provided in `DB_URL`.

For local MongoDB:
```bash
# Start MongoDB service (varies by OS)
# Windows: MongoDB should start automatically if installed as service
# macOS: brew services start mongodb/brew/mongodb-community
# Linux: sudo systemctl start mongod
```

### 5. Super Admin Setup

The application will create a super admin user with the credentials specified in your `.env` file:
- Email: `SUPER_ADMIN_EMAIL`
- Password: `SUPER_ADMIN_PASSWORD`

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

### Production Build

```bash
# Build the project
npm run build

# Run the built application
npm start
```

### Other Scripts

```bash
# Lint the code
npm run lint

# Reset database (development only)
npm run test:reset

# Full test with database reset
npm run test:full

# Seed super admin features
npm run seed:superadmin-features
```

## 📁 Project Structure

```
src/
├── app/
│   ├── config/          # Application configuration
│   ├── constants/       # Application constants
│   ├── errorHelpers/    # Error handling utilities
│   ├── helpers/         # General helper functions
│   ├── interfaces/      # TypeScript interfaces
│   ├── lib/            # Third-party library configurations
│   ├── middlewares/    # Express middlewares
│   ├── modules/        # Feature modules
│   ├── routes/         # API route definitions
│   └── utils/          # Utility functions
├── templates/          # Email templates (EJS)
├── app.ts             # Express app configuration
└── server.ts          # Server entry point
```

## 🔧 API Endpoints

The API follows RESTful conventions. Main endpoint categories:

- `/api/v1/auth` - Authentication (login, register, OAuth)
- `/api/v1/users` - User management
- `/api/v1/admin` - Admin operations
- Additional modules as defined in your `modules/` directory

## 🔒 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port for development | No | 5000 |
| `PORT_PROD` | Server port for production | No | 5005 |
| `DB_URL` | MongoDB connection string | Yes | - |
| `NODE_ENV` | Environment mode | No | development |
| `JWT_ACCESS_SECRET` | JWT access token secret | Yes | - |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Yes | - |
| `JWT_RESET_SECRET` | JWT reset token secret | Yes | - |
| `BCRYPT_SALT_ROUND` | Bcrypt salt rounds | No | 10 |
| `SUPER_ADMIN_EMAIL` | Initial super admin email | Yes | - |
| `SUPER_ADMIN_PASSWORD` | Initial super admin password | Yes | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No | - |
| `FRONTEND_URL` | Frontend application URL | Yes | - |
| `SMTP_HOST` | SMTP server host | No | smtp.gmail.com |
| `SMTP_PORT` | SMTP server port | No | 465 |
| `SMTP_USER` | SMTP username | Yes | - |
| `SMTP_PASS` | SMTP password/app password | Yes | - |
| `STRIPE_SECRET_KEY` | Stripe secret key | No | - |
| `ALGORITHM` | Encryption algorithm | No | - |
| `ENC_KEY` | Encryption key | No | - |

## 🔍 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Verify your `DB_URL` is correct
   - Check if MongoDB service is running
   - Ensure network access for MongoDB Atlas

2. **SMTP Email Issues**
   - Verify SMTP credentials
   - For Gmail, use App Passwords instead of regular password
   - Check firewall settings

3. **Google OAuth Issues**
   - Verify redirect URIs in Google Console
   - Check client ID and secret
   - Ensure proper callback URL configuration

### Development Tips

- Use `npm run dev` for development with auto-reload
- Check logs for detailed error messages
- Use MongoDB Compass or similar tools for database inspection
- Test API endpoints using Postman or similar tools

## 📝 Contributing

1. Create a feature branch
2. Make your changes
3. Run linting: `npm run lint`
4. Test your changes
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🤝 Support

For issues and questions, please create an issue in the repository or contact the development team.