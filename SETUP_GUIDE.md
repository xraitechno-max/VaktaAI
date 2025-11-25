# VaktaAI Project Setup Guide

## Prerequisites

1. **Node.js 20+** ✅ (Current: v24.8.0)
2. **npm** ✅ (Current: v11.6.0)
3. **PostgreSQL Database** (with pgvector extension)
4. **API Keys** (OpenAI, Cohere, or other AI providers)

## Environment Variables Setup

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration (REQUIRED)
DATABASE_URL=postgresql://username:password@host:port/database
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=vaktaai

# Session Management (REQUIRED)
SESSION_SECRET=vaktaai-session-secret-key-2025

# AI APIs (At least one required)
OPENAI_API_KEY=sk-your-openai-api-key-here
COHERE_API_KEY=your-cohere-api-key-here

# Optional AI Providers
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key

# Voice Services (Optional)
SARVAM_API_KEY=your-sarvam-api-key-here
ASSEMBLYAI_API_KEY=your-assemblyai-api-key

# Storage (Choose one)
# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name

# OR Google Cloud Storage
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-gcs-bucket-id
PUBLIC_OBJECT_SEARCH_PATHS=public
PRIVATE_OBJECT_DIR=.private

# Redis (Optional - for caching)
REDIS_URL=redis://localhost:6379
REDIS_DISABLED=true

# Node Environment
NODE_ENV=development
```

## Database Setup

### Option 1: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database named `vaktaai`
3. Install pgvector extension:
   ```sql
   CREATE EXTENSION vector;
   ```
4. Update DATABASE_URL in .env file

### Option 2: Neon PostgreSQL (Recommended)
1. Sign up at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string to DATABASE_URL
4. pgvector is pre-installed on Neon

### Option 3: Supabase
1. Sign up at [Supabase](https://supabase.com)
2. Create a new project
3. Enable pgvector extension in SQL editor
4. Copy connection string to DATABASE_URL

## Setup Steps

1. **Install Dependencies** ✅
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in your actual values

3. **Initialize Database**
   ```bash
   npm run db:push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Application**
   - Open http://localhost:5000 in your browser

## Project Structure

```
StudySageAI/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
├── server/                # Express backend
│   ├── services/          # Business logic
│   ├── routes/            # API endpoints
│   └── middleware/        # Express middleware
├── shared/                # Shared types
│   └── schema.ts          # Database schema
└── attached_assets/       # Static assets
```

## Core Features

### 1. AI Tutor
- Interactive conversational learning
- Real-time streaming responses
- Support for English and Hindi
- Unity 3D Avatar with lip-sync

### 2. DocChat
- RAG-based document Q&A
- Support for PDF, DOCX, YouTube, web content
- Citation-backed responses
- Semantic search with pgvector

### 3. Quiz Generator
- Auto-generated practice quizzes
- Multiple question types
- Partial submission support
- Instant grading with explanations

### 4. Study Plan Manager
- AI-powered study schedules
- Task tracking and progress
- Exam countdown timers

### 5. Smart Notes
- Multi-source note ingestion
- AI-powered summarization
- Auto-generated flashcards

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Get user info

### Documents
- `POST /api/documents` - Upload document
- `GET /api/documents` - List documents
- `DELETE /api/documents/:id` - Delete document

### AI Features
- `POST /api/tutor/session` - Start AI tutor
- `POST /api/docchat/session` - Start DocChat
- `POST /api/quizzes` - Generate quiz
- `POST /api/study-plans` - Create study plan

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check DATABASE_URL format
   - Ensure PostgreSQL is running
   - Verify pgvector extension is installed

2. **API Key Errors**
   - Verify API keys are valid
   - Check rate limits
   - Ensure proper permissions

3. **Build Errors**
   - Run `npm install` again
   - Check Node.js version (20+)
   - Clear node_modules and reinstall

4. **Port Already in Use**
   - Change port in package.json
   - Kill existing processes on port 5000

### Development Tips

1. **Hot Reload**: Frontend changes auto-reload
2. **TypeScript**: Full type safety with strict mode
3. **Database**: Use Drizzle ORM for type-safe queries
4. **AI**: Multiple provider support with fallbacks

## Production Deployment

### Using Replit
1. Fork the repository
2. Set environment variables in Secrets
3. Run `npm install` and `npm run db:push`
4. Click "Run" to start

### Manual Deployment
1. Build: `npm run build`
2. Start: `npm start`
3. Set production environment variables

## Support

- **Documentation**: See DEVELOPER_DOCUMENTATION.md
- **Issues**: Check GitHub issues
- **API Keys**: Get from respective providers
- **Database**: Use Neon or Supabase for easy setup

