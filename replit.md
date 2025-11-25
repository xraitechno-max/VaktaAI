# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform designed to be a comprehensive study companion, offering an AI Mentor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. It supports multilingual learning (English, Hindi) across various content formats (PDFs, videos, audio, web content). The platform aims to provide grounded, citation-based AI responses to prevent hallucination, alongside a "fast, calm UI" with minimal navigation, real-time streaming, keyboard-first interactions, and strong accessibility. VaktaAI's vision is to revolutionize personalized education through adaptive AI.

## User Preferences
Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## Unity Integration Requirements

### Audio Playback Completion Tracking
The Unity WebGL avatar build **must** send completion messages when TTS audio finishes playing:

1. **AUDIO_ENDED** message: Send when audio playback completes successfully
   ```javascript
   // Unity C# example:
   SendMessageToReact("AUDIO_ENDED", JSON.stringify({ id: audioId }));
   ```

2. **AUDIO_FAILED** message: Send when audio playback fails
   ```javascript
   // Unity C# example:
   SendMessageToReact("AUDIO_FAILED", JSON.stringify({ error: errorMessage }));
   ```

**Why this is critical**: React keeps `playingAudio` state active until Unity confirms completion. Without these messages, a 30-second safety timeout will fire, but proper completion tracking ensures smooth UX and prevents stuck UI states.

**React-side implementation** (already complete):
- `useUnityBridge.ts` handles AUDIO_ENDED/AUDIO_FAILED messages
- `TutorSession.tsx` clears `playingAudio` state when messages received
- 30-second safety timeout prevents permanent stuck states if Unity crashes

## System Architecture

### Frontend
- **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
- **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, Lucide icons.
- **Design System**: Sarvam AI-Inspired Modern Design with a purple/indigo gradient palette, glassmorphism, enhanced shadows, and custom animation tokens. It is fully responsive and mobile-first.
- **UI/UX Decisions**: Material Design compliant global modal system, premium gradient-based chat UI. A 7-phase conversational mentor system with visual indicators, adaptive learning, and emotion detection. Voice mentor interactions include real-time waveform visualization. Document chat features an upload-first layout, OCR, suggested questions, and citation preview. Integration of a Unity 3D Avatar for interactive experiences with **server-side Azure viseme generation for Unity lip-sync**.
- **Mobile-First Responsive Design**: Breakpoints for mobile (<640px), tablet (640-1024px), and desktop (>1024px) to ensure optimal layout and functionality across devices, especially targeting low-end Indian smartphones. Performance and accessibility are critical considerations for mobile.

### Backend
- **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
- **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver, supporting multi-tenant design.
- **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini), Google Gemini Flash 1.5, and Anthropic Claude Haiku. Features include streaming responses, structured output, document processing, citation tracking (RAG), and local embedding generation (all-MiniLM-L6-v2). Agentic RAG for DocChat incorporates planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. Includes intelligent model routing, semantic caching, dynamic token management, and a Dynamic Language System. AI Mentor optimizes with intent classification, language-aware prompt engineering, emotion detection, dynamic response adaptation, and progressive hinting.
- **Voice Services & Unified WebSocket Protocol**: All AI Mentor interactions use a unified WebSocket protocol for real-time streaming. **Primary TTS**: **Azure Cognitive Services EXCLUSIVELY for Unity Avatar** (en-IN-NeerjaNeural with empathetic style for English, hi-IN-AartiNeural for Hindi - latest 2025 HD voices with 48kHz quality). **SSML Support**: Azure TTS supports SSML prosody controls (rate, pitch, emphasis) for expressive speech. **Fallback TTS for Avatar**: Sarvam → Google → Polly (SSML tags automatically stripped for non-Azure providers). **Text-Only TTS**: Sarvam AI Bulbul v2 (primary) with Google/Polly fallbacks. **STT**: Sarvam AI Saarika v2 (primary) with AssemblyAI (fallback). The enhanced TTS pipeline includes Indian English math pronunciation, Hinglish math terms, physics unit normalization, intent+emotion prosody, Hinglish code-switching, and technical term capitalization. Streaming TTS uses real-time sentence-by-sentence generation with parallel synthesis, optimized with phrase-level TTS caching and gzip audio compression. **Azure Viseme Generation**: Server-side viseme timing data (audioOffset + visemeId 0-21) generated by Azure TTS for Unity lip-sync. Reliability includes circuit breaker patterns and avatar-aware TTS queueing.
- **File Storage**: AWS S3 for object storage, using presigned URLs.
- **Authentication and Authorization**: Custom email/password with bcrypt, server-side sessions in PostgreSQL, HTTP-only secure cookies, and session-based middleware.
- **Security Hardening**: Global and specific API rate limiting, Helmet.js, and environment-aware Content Security Policy (CSP).

## External Dependencies

### Third-Party APIs
- OpenAI API
- AWS S3
- Google Gemini API
- Anthropic API
- **Azure Cognitive Services (Speech)** - Primary TTS with Indian voices
- Sarvam AI (STT/TTS)
- AssemblyAI (STT)
- AWS Polly (TTS - Fallback)

### Database Services
- Neon PostgreSQL
- Drizzle Kit
- Upstash Redis

### Frontend Libraries
- @tanstack/react-query
- wouter
- @radix-ui/*
- @uppy/*
- react-hook-form
- lucide-react
- Tesseract.js

### Backend Libraries
- express
- passport
- openid-client
- drizzle-orm
- multer
- connect-pg-simple
- memoizee
- @langchain/*
- ioredis
- @xenova/transformers
- microsoft-cognitiveservices-speech-sdk (Azure TTS)
- @octokit/rest (GitHub API integration)

## GitHub Integration
- **Repository**: https://github.com/xraitechno-max/VaktaAI-Unity-Docs
- **Unity Viseme Mapping Documentation**: `docs/UNITY_AVATAR_VISEME_MAPPING.md`
- **GitHub Client**: `server/services/github-client.ts` - Replit connector-based GitHub OAuth

### Unity Avatar Lip-Sync Architecture
1. **Server-side**: Azure TTS generates viseme IDs 0-21 with timing data
2. **API Response**: `{time: 50, blendshape: "viseme_0", weight: 1.0}`
3. **Unity C# Mapping Required**: Convert viseme_0-21 to ARKit blend shapes (jawOpen, mouthPucker, etc.)
4. **Full mapping table**: See `docs/UNITY_AVATAR_VISEME_MAPPING.md`