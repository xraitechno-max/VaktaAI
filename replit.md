# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform designed to be a comprehensive study companion, offering an AI Mentor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. It supports multilingual learning (English, Hindi) across various content formats (PDFs, videos, audio, web content). The platform aims to provide grounded, citation-based AI responses to prevent hallucination, alongside a "fast, calm UI" with minimal navigation, real-time streaming, keyboard-first interactions, and strong accessibility. VaktaAI's vision is to revolutionize personalized education through adaptive AI, providing curriculum-aligned tutoring for Indian students (Classes 6-12 and Droppers) with personalized greetings and teaching strategies.

## User Preferences
Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## System Architecture

### Frontend
- **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
- **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, Lucide icons.
- **Design System**: Sarvam AI-Inspired Modern Design with a purple/indigo gradient palette, glassmorphism, enhanced shadows, and custom animation tokens.
- **UI/UX Decisions**: Fully responsive and mobile-first design targeting low-end Indian smartphones. Material Design compliant global modal system, premium gradient-based chat UI, 7-phase conversational mentor system with visual indicators, adaptive learning, and emotion detection. Voice mentor interactions include real-time waveform visualization. Document chat features an upload-first layout, OCR, suggested questions, and citation preview. Integration of a Unity 3D Avatar for interactive experiences with server-side Azure viseme generation for Unity lip-sync.

### Backend
- **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
- **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver, supporting multi-tenant design.
- **AI Integration**: Multi-provider model routing (Groq, OpenAI, Google Gemini, Anthropic Claude). Groq powers fast services (Intent Classification, Emotion Detection, Tone Validation, Educational Quality Check, AI Dual Output - SSML+Markdown) with automatic OpenAI fallback. Features include streaming responses, structured output, document processing, citation tracking (RAG), and local embedding generation. Agentic RAG for DocChat incorporates planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. AI Mentor optimizes with intent classification, language-aware prompt engineering, emotion detection, dynamic response adaptation, and progressive hinting.
- **AI Mentor Curriculum-Aligned Tutoring**: Implements a pedagogically-sound system with 5 teaching modes (socratic, direct, scaffolded_direct, revision_mode, worked_example), a 6-level hint ladder system, and a demotivation monitor. Integrates NCERT RAG, class-level adaptations (foundation, bridge, board, competitive, dropper), and subject-specific strategies. Uses an EnhancedPromptEngine to build dynamic prompts based on user profile and session context. Critical policies include no emojis and strict use of "AI Mentor" terminology.
- **Voice Services & Unified WebSocket Protocol**: All AI Mentor interactions use a unified WebSocket protocol. Primary TTS is Azure Cognitive Services (en-IN-NeerjaNeural, hi-IN-AartiNeural) with SSML support for Unity Avatar. Fallback TTS includes Sarvam, Google, Polly. STT uses Sarvam AI Saarika v2 with AssemblyAI fallback. Enhanced TTS pipeline includes Indian English/Hinglish math pronunciation, physics unit normalization, intent+emotion prosody, and technical term capitalization. Streaming TTS uses real-time sentence-by-sentence generation with phrase-level caching and gzip audio compression. Azure Viseme Generation provides server-side timing data for Unity lip-sync.
- **File Storage**: AWS S3 for object storage, using presigned URLs.
- **Authentication and Authorization**: Custom email/password with bcrypt, server-side sessions in PostgreSQL, HTTP-only secure cookies, and session-based middleware.
- **Security Hardening**: Global and specific API rate limiting, Helmet.js, and environment-aware Content Security Policy (CSP).

### Unity Integration
- **Audio Playback Completion Tracking**: Unity WebGL avatar build **must** send `AUDIO_ENDED` and `AUDIO_FAILED` messages to React when TTS audio finishes or fails. This is crucial for maintaining `playingAudio` state and smooth UX.
- **Unity Avatar Lip-Sync**: Server-side Azure TTS generates viseme IDs (0-21) with timing data. Unity C# code maps these visemes to ARKit blend shapes for lip-sync.

### TTS Auto-Play Race Condition Fix (Nov 2025)
- **Problem**: TTS was playing old greeting audio because auto-play useEffect fired before messages were refetched with SSML metadata after WebSocket streaming completed.
- **Solution**: Added guard in TutorSession.tsx TTS auto-play useEffect that checks `if (!ssml) return` - ensures TTS only plays when fresh speakSSML metadata is available from refetched messages.
- **Flow**: AI_RESPONSE_COMPLETE → queryClient.refetchQueries() → TTS auto-play checks for speakSSML → plays only when SSML exists in message metadata.

### AI Mentor Subject Filtering (Dec 2025)
- **Feature**: AI Mentor subjects are now filtered based on user's profile preferences.
- **Logic**: Only shows core AI mentor subjects (Physics, Chemistry, Maths, Biology) that are also in the user's profile subjects array.
- **Fallback**: If user has no subjects set or no matching AI mentor subjects, all 4 core subjects are shown.
- **UI Adaptation**: Grid layout adapts responsively based on number of filtered subjects (2, 3, or 4 subjects).

### TTS Audio Queue Fix (Dec 2025)
- **Problem**: TTS chunks were being skipped during large AI responses because Unity's single global Audio element was being replaced instead of queued.
- **Solution**: Implemented proper audio queue system in Unity HTML:
  - `audioQueue` array stores pending audio items
  - `pendingAudioQueue` array preserves pre-unlock chunks in FIFO order
  - Fresh Audio element created per chunk to avoid handler bleed-through
  - `isAnalyserConnected` flag ensures analyser→destination connected only once (prevents Safari/Firefox errors)
  - Retry logic keeps `isPlayingAudio=true` during retry (blocks queue)
  - AUDIO_STARTED only fires on actual playback (audioElement.onplay)
  - AUDIO_ENDED fires on audioElement.onended
  - AUDIO_FAILED fires after max retries with correct chunk id
- **React Bridge Fix**: useUnityBridge.ts now forwards chunk id in AUDIO_FAILED events
- **Flow**: PLAY_TTS_WITH_PHONEMES → enqueueAudio → processAudioQueue → playAudioWithPhonemes → onplay/AUDIO_STARTED → onended/AUDIO_ENDED → next chunk

### TTS Chunk Index Gap Fix (Dec 2025)
- **Problem**: SmartTTSQueue was stuck waiting for missing chunk indices (2, 5, 10) because the server skipped short sentences (list numbers like "1", "2") but still used the original sentence index for chunkIndex.
- **Solution**: Added `ws.ttsSentCount` sequential counter that only increments when TTS is actually sent:
  - Counter resets to 0 when TTS_START is sent
  - Counter increments in `executeTTSGeneration` right before sending chunk
  - PHONEME_TTS_CHUNK and TTS_CHUNK now use this sequential counter for chunkIndex
  - TTS_END uses `ws.ttsSentCount` for accurate totalChunks count
- **Key Change**: chunkIndex now goes 0, 1, 2, 3... with no gaps, regardless of skipped sentences
- **Files Modified**: server/services/voiceStreamService.ts, server/types/voiceWebSocket.ts

### Phase 1: Knowledge Intelligence Layer (Dec 2025) - COMPLETED
Ultra Pro AI Tutor Phase 1 implemented with 4 core components:
- **Database Schema**: New tables for curriculum_topics, curriculum_edges (prerequisite graph), formula_bank, and misconception_database in shared/schema.ts
- **KnowledgeIntelligenceService**: Centralized knowledge retrieval orchestrator combining semantic RAG, formula lookup, prerequisite mastery, and misconception detection with memoized caching
- **FormulaBankService**: STEM formula retrieval with TTS-optimized SSML formatting, topic-based search with chapter/subject fallbacks, exam-target aware sorting (JEE/NEET/Boards)
- **DynamicPromptEngine Integration**: Enhanced with knowledge enrichment sections including NCERT citations, formula injection, prerequisite checks, and misconception warnings
- **Key Files**: server/services/curriculum/KnowledgeIntelligenceService.ts, server/services/curriculum/FormulaBankService.ts, server/services/DynamicPromptEngine.ts

### Phase 2: Pedagogical & Cognitive Foundations (Dec 2025) - COMPLETED
Enhanced pedagogical components for adaptive tutoring:
- **StudentCognitiveModelService with Deep Knowledge Tracing (DKT)**: Hybrid BKT+DKT implementation combining:
  - **Bayesian Knowledge Tracing (BKT)**: P(L_0) prior, P(T) transition, P(G) guess, P(S) slip parameters with subject-specific tuning
  - **Deep Knowledge Tracing (DKT)**: 128-dim hidden state vectors, temporal attention mechanisms, Ebbinghaus forgetting curve (0.95 decay), knowledge transfer across related topics via curriculum graph
  - **DKT Features**: `runDeepKnowledgeTracing()` computes hidden states, temporal factors (recency, spacing, consistency), knowledge transfer bonuses capped at 0.3; `updateMasteryWithDKT()` fuses BKT and DKT predictions (60/40 weighted); `getKnowledgeGaps()` and `getOptimalReviewSchedule()` for personalized spaced repetition; `buildEnhancedCognitiveProfile()` with learning momentum and transfer opportunities
  - **Subject Similarity Matrix**: Dynamic symmetric 26-subject matrix built at module load from BASE_SIMILARITY with 0.15 floor for unrelated subjects, self-similarity 1.0
  - **Guaranteed Subject Resolution**: 5-level fallback chain (topicPrerequisites → curriculumEdges → ncertCurriculumChunks → studentMastery/interactions → inferSubjectFromTopicId) ensures every topic gets a canonical subject
  - **Subject Normalization**: `normalizeSubject()` with 35+ alias mappings (physics/phy/p → physics, mathematics/maths/m → math, etc.) covering all Indian curriculum subjects
  - **inferSubjectFromTopicId**: 15 comprehensive regex patterns covering physics, chemistry, biology, math, history, geography, economics, accountancy, computer, english, hindi, social, business_studies, statistics, physical_education; defaults to 'science' for unmatched
- **TeachingModeEngine with Weighted Preference Layer**: Expanded from 5 to 10 teaching strategies with hard rule protection and score-based comparison for ties
- **HintLadderSystem with Adaptive Class-Level Detection**: Extended to 8 hint levels with comprehensive board exam token detection (board, boards, cbse, icse, state_board, hsc, ssc, regional boards) for accurate Class 11-12 categorization
- **MisconceptionDetectorService with Multi-Factor Scoring**: Pattern-based detection with linguistic analysis (1.2x boost), history-aware recurrence (1.3x boost), exam-target weighting (JEE Advanced formula 1.4x), and class-level adaptive thresholds
- **Key Files**: server/services/curriculum/StudentCognitiveModelService.ts, server/services/curriculum/TeachingModeEngine.ts, server/services/curriculum/HintLadderSystem.ts, server/services/curriculum/MisconceptionDetectorService.ts

## External Dependencies

### Third-Party APIs
- Groq API
- OpenAI API
- AWS S3
- Google Gemini API
- Anthropic API
- Azure Cognitive Services (Speech)
- Sarvam AI (STT/TTS)
- AssemblyAI (STT)
- AWS Polly (TTS)
- GitHub API

### Database Services
- Neon PostgreSQL
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
- microsoft-cognitiveservices-speech-sdk