# CrewLink Backend API

NestJS backend for the CrewLink Worker Marketplace platform. Handles authentication, user management, and API services.

## Features

- **Authentication**: JWT-based auth with access/refresh tokens
- **User Management**: Profile management, password reset, email/phone verification
- **Supabase Integration**: Uses Supabase as the database backend
- **Swagger Documentation**: Auto-generated API docs

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **Passport.js** - Authentication middleware
- **JWT** - Token-based authentication
- **Supabase** - PostgreSQL database with real-time capabilities
- **class-validator** - Request validation
- **Swagger** - API documentation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment file and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secure-secret-key
```

4. Set up Supabase database tables (run migrations)

5. Start the development server:
```bash
npm run start:dev
```

### Available Scripts

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Testing
npm run test
npm run test:e2e

# Linting
npm run lint
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/send-phone-otp` | Send OTP to phone |
| POST | `/api/auth/verify-phone` | Verify phone with OTP |
| GET | `/api/auth/profile` | Get current user profile |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user |
| PUT | `/api/users/me` | Update profile |
| PUT | `/api/users/me/password` | Change password |
| DELETE | `/api/users/me` | Delete account (soft) |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/` | Health check |
| GET | `/api/health` | Health check |

## API Documentation

Swagger documentation is available at:
```
http://localhost:3001/api/docs
```

## Database Schema

The backend expects these Supabase tables:

```sql
-- Profiles table
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    user_type TEXT CHECK (user_type IN ('worker', 'org_member', 'care_client')),
    country_code TEXT,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Phone OTPs
CREATE TABLE phone_otps (
    phone TEXT PRIMARY KEY,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0
);
```

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── decorators/          # Custom decorators
│   ├── dto/                 # Data transfer objects
│   ├── guards/              # Auth guards
│   ├── strategies/          # Passport strategies
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── users/                   # Users module
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
├── config/                  # Configuration
│   ├── configuration.ts
│   └── supabase.config.ts
├── app.module.ts
└── main.ts
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3001) | No |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `JWT_EXPIRATION` | Access token expiry (default: 7d) | No |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiry (default: 30d) | No |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | No |

## License

Private - CrewLink
