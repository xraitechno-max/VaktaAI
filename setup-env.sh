#!/bin/bash

# VaktaAI Environment Setup Script
# This script helps set up the required environment variables

echo "🚀 VaktaAI Environment Setup"
echo "=============================="

# Check if .env file exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file with template
echo "📝 Creating .env file with template..."

cat > .env << 'EOF'
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
EOF

echo "✅ .env file created successfully!"
echo ""
echo "🔧 Next Steps:"
echo "1. Edit .env file and add your actual values:"
echo "   - DATABASE_URL: Get from Neon, Supabase, or local PostgreSQL"
echo "   - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys"
echo "   - SESSION_SECRET: Use the default or generate a new one"
echo ""
echo "2. Set up your database:"
echo "   - Neon (Recommended): https://neon.tech"
echo "   - Supabase: https://supabase.com"
echo "   - Local PostgreSQL with pgvector extension"
echo ""
echo "3. Initialize database:"
echo "   npm run db:push"
echo ""
echo "4. Start development server:"
echo "   npm run dev"
echo ""
echo "📚 For detailed setup instructions, see:"
echo "   - SETUP_GUIDE.md"
echo "   - DEVELOPER_DOCUMENTATION.md"
echo "   - PROJECT_SETUP_SUMMARY.md"

