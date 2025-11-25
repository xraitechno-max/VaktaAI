# VaktaAI - Environment Variables & Secrets Guide

> This guide helps you set up VaktaAI in a new Replit project. Copy these secrets to your new project's **Secrets** tab.

---

## Quick Setup Checklist

| Priority | Secret | Required? | Where to Get |
|----------|--------|-----------|--------------|
| 1 | DATABASE_URL | Auto | Replit PostgreSQL (auto-created) |
| 2 | SESSION_SECRET | Yes | Generate random string |
| 3 | OPENAI_API_KEY | Yes | platform.openai.com |
| 4 | AZURE_SPEECH_KEY | Yes* | portal.azure.com |
| 5 | AZURE_SPEECH_REGION | Yes* | portal.azure.com |
| 6 | AWS_S3_BUCKET_NAME | Optional | AWS Console |
| 7 | SARVAM_API_KEY | Optional | sarvam.ai |

*Required for Unity Avatar voice/lip-sync

---

## 1. Database Secrets (Auto-Created by Replit)

When you create a PostgreSQL database in Replit, these are automatically set:

```
DATABASE_URL=postgresql://user:pass@host:port/database
PGHOST=<auto>
PGPORT=<auto>
PGUSER=<auto>
PGPASSWORD=<auto>
PGDATABASE=<auto>
```

**Action:** Just click "Create Database" in Replit's Database tab - no manual setup needed!

---

## 2. Session Secret (REQUIRED)

```
SESSION_SECRET=your-random-32-character-string-here
```

**Purpose:** Encrypts user sessions for security.

**How to Generate:**
```bash
# Run this in terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example Value:** `a8f3b2c1d4e5f6789012345678901234567890abcdef1234`

---

## 3. AI Provider API Keys

### OpenAI (REQUIRED - Primary AI)
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
```

**Get it from:** https://platform.openai.com/api-keys
**Used for:** GPT-4o responses, embeddings, AI Mentor

### Google Gemini (Optional)
```
GOOGLE_API_KEY=AIzaSy-xxxxxxxxxxxxxxxxxxxxxxxx
```

**Get it from:** https://makersuite.google.com/app/apikey
**Used for:** Alternative AI model, document processing

### Anthropic Claude (Optional)
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

**Get it from:** https://console.anthropic.com/
**Used for:** Claude Haiku responses

### Cohere (Optional)
```
COHERE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

**Get it from:** https://dashboard.cohere.ai/api-keys
**Used for:** Reranking, embeddings

---

## 4. Azure Speech Services (REQUIRED for Unity Avatar)

```
AZURE_SPEECH_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_SPEECH_REGION=eastus
```

**Purpose:** Text-to-Speech with Indian voices + Viseme generation for lip-sync

**How to Get:**
1. Go to https://portal.azure.com
2. Create "Speech Services" resource
3. Copy Key1 and Region

**Recommended Regions:** `centralindia`, `eastus`, `southeastasia`

**Indian Voices Used:**
- English: `en-IN-NeerjaNeural` (empathetic style)
- Hindi: `hi-IN-AartiNeural`

---

## 5. Voice Services (Optional)

### Sarvam AI (Indian TTS/STT)
```
SARVAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

**Get it from:** https://sarvam.ai (Contact for API access)
**Used for:** Bulbul v2 TTS, Saarika v2 STT

### AssemblyAI (Speech-to-Text Fallback)
```
ASSEMBLYAI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

**Get it from:** https://www.assemblyai.com/dashboard/
**Used for:** Fallback STT when Sarvam is unavailable

---

## 6. AWS S3 Storage (Optional)

```
AWS_ACCESS_KEY_ID=AKIA-xxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=vaktaai-uploads
```

**Purpose:** Store uploaded documents, audio files

**How to Get:**
1. Go to AWS Console > IAM > Users
2. Create new user with S3 permissions
3. Generate Access Keys

**Alternative:** Use Replit's Object Storage (no setup needed)

---

## 7. Environment Variables

```
REDIS_DISABLED=true
NODE_ENV=development
```

**REDIS_DISABLED:** Set to `true` if not using Redis caching
**NODE_ENV:** Set to `production` when deploying

---

## Step-by-Step: Setting Up New Replit Project

### Step 1: Fork/Import Project
```
Import from: https://github.com/xraitechno-max/VaktaAI
```

### Step 2: Create Database
1. Click "Database" in left panel
2. Click "Create Database" (PostgreSQL)
3. Wait for auto-setup (creates all PG* secrets automatically)

### Step 3: Add Required Secrets
Go to **Secrets** tab and add:

| Key | Value |
|-----|-------|
| SESSION_SECRET | (generate random string) |
| OPENAI_API_KEY | sk-proj-... |
| AZURE_SPEECH_KEY | (from Azure portal) |
| AZURE_SPEECH_REGION | eastus |

### Step 4: Add Optional Secrets (if needed)
| Key | Value |
|-----|-------|
| GOOGLE_API_KEY | AIzaSy-... |
| ANTHROPIC_API_KEY | sk-ant-... |
| SARVAM_API_KEY | (from Sarvam) |
| AWS_ACCESS_KEY_ID | AKIA-... |
| AWS_SECRET_ACCESS_KEY | (from AWS) |
| AWS_REGION | ap-south-1 |
| AWS_S3_BUCKET_NAME | your-bucket |

### Step 5: Run Database Migration
```bash
npm run db:push
```

### Step 6: Start the App
```bash
npm run dev
```

---

## Troubleshooting

### "Azure TTS not configured"
- Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are set
- Verify region matches your Azure resource

### "Database connection failed"
- Ensure PostgreSQL database is created in Replit
- Check DATABASE_URL is auto-populated

### "OpenAI rate limit"
- Add billing to your OpenAI account
- Consider using GOOGLE_API_KEY as fallback

### "S3 upload failed"
- Verify all 4 AWS secrets are set correctly
- Check bucket permissions (public-read for assets)

---

## API Key Links Summary

| Service | Dashboard URL |
|---------|---------------|
| OpenAI | https://platform.openai.com/api-keys |
| Azure Speech | https://portal.azure.com |
| Google AI | https://makersuite.google.com/app/apikey |
| Anthropic | https://console.anthropic.com |
| Cohere | https://dashboard.cohere.ai/api-keys |
| AssemblyAI | https://www.assemblyai.com/dashboard |
| AWS | https://console.aws.amazon.com/iam |
| Sarvam AI | https://sarvam.ai |

---

## Minimum Required Secrets (Basic Setup)

For a basic working VaktaAI instance, you need only these:

```
SESSION_SECRET=<generate-random>
OPENAI_API_KEY=<your-openai-key>
```

Database secrets are auto-created by Replit PostgreSQL.

Azure secrets are needed only for Unity Avatar lip-sync feature.

---

*Last Updated: November 2025*
*VaktaAI v1.0*
