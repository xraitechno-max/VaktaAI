# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform designed to be a comprehensive study companion, offering an AI Mentor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. It supports multilingual learning (English, Hindi) across various content formats. The platform aims to provide grounded, citation-based AI responses to prevent hallucination, alongside a "fast, calm UI" with minimal navigation, real-time streaming, keyboard-first interactions, and strong accessibility. VaktaAI's vision is to revolutionize personalized education through adaptive AI, providing curriculum-aligned tutoring for Indian students (Classes 6-12 and Droppers) with personalized greetings and teaching strategies.

## User Preferences
Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## System Architecture

### Frontend
- **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
- **UI Component System**: Radix UI, shadcn/ui, Tailwind CSS, Lucide icons.
- **Design System**: Sarvam AI-Inspired Modern Design with a purple/indigo gradient palette, glassmorphism, enhanced shadows, and custom animation tokens.
- **UI/UX Decisions**: Fully responsive and mobile-first design, Material Design compliant global modal system, premium gradient-based chat UI, 7-phase conversational mentor system, adaptive learning, and emotion detection. Voice mentor interactions include real-time waveform visualization. Document chat features an upload-first layout, OCR, suggested questions, and citation preview. Integration of a Unity 3D Avatar with server-side Azure viseme generation for Unity lip-sync.

### Backend
- **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
- **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver, supporting multi-tenant design.
- **AI Integration**: Multi-provider model routing (Groq, OpenAI, Google Gemini, Anthropic Claude) with Groq for fast services and automatic OpenAI fallback. Features include streaming responses, structured output, document processing, citation tracking (RAG), and local embedding generation. Agentic RAG for DocChat incorporates planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. AI Mentor optimizes with intent classification, language-aware prompt engineering, emotion detection, dynamic response adaptation, and progressive hinting.
- **AI Mentor Curriculum-Aligned Tutoring**: Implements a pedagogically-sound system with 10 teaching modes, an 8-level hint ladder system, and a demotivation monitor. Integrates NCERT RAG, class-level adaptations, and subject-specific strategies. Uses an EnhancedPromptEngine for dynamic prompts. Critical policies include no emojis and strict use of "AI Mentor" terminology.
- **Knowledge Intelligence Layer**: Centralized knowledge retrieval orchestrator combining semantic RAG, formula lookup, prerequisite mastery, and misconception detection with memoized caching. Includes a FormulaBankService and integrates with the DynamicPromptEngine.
- **Pedagogical & Cognitive Foundations**: StudentCognitiveModelService with a hybrid BKT+DKT implementation, including deep knowledge tracing, temporal attention, Ebbinghaus forgetting curve, and knowledge transfer. TeachingModeEngine with weighted preference, HintLadderSystem with adaptive class-level detection, and MisconceptionDetectorService with multi-factor scoring.
- **Accuracy Assurance & Adaptive Difficulty**: AccuracyAssuranceService for real-time numerical validation using math.js with expression parsing and severity levels. Features comprehensive JEE/NEET validation including:
  - **Compound Unit Conversions (113 patterns)**: velocity (m/s↔km/h), acceleration (m/s²↔g), density (kg/m³↔g/cm³), concentration (mol/L, mM, ppm, ppb), molar/specific heat (J/(mol·K)↔cal/(mol·K)), viscosity (Pa·s↔P, cP, St), thermal conductivity (W/(m·K)), electric/magnetic fields (V/m, T, G), pressure variants, energy/power, electrical units
  - **JEE/NEET Math Patterns (28 patterns)**: quadratic (discriminant, roots), logarithms (log, ln, custom base), trigonometry (sin, cos, tan in degrees/radians), exponentials, factorials, combinations (nCr), permutations (nPr), percentages, ratios, AP/GP formulas, geometry (Pythagorean, area, volume), calculus (derivative/integral power rules)
  - **Physics Formulas (14 patterns)**: kinematics (v=u+at, s=ut+½at², v²=u²+2as), Newton's laws (F=ma, p=mv), energy (KE=½mv², PE=mgh, W=Fd), oscillations (T=2π√(l/g)), electricity (V=IR, P=I²R), fields (E=kq/r², F=Gm₁m₂/r²)
  - **Chemistry Formulas (9 patterns)**: ideal gas (PV=nRT), concentration (M=n/V, m=n/W), thermodynamics (ΔG=ΔH-TΔS), electrochemistry (pH=-log[H⁺], pOH=14-pH, E°cell), equilibrium (K), kinetics (t½=0.693/k)
  AdaptiveDifficultyEngine for Zone of Proximal Development (ZPD) targeting, Bloom's Taxonomy integration, and real-time adjustment based on performance.
- **Language Adaptation & Diagnostic Assessment**: LanguageAdaptationService for dynamic multilingual content adaptation with multi-layer detection, script awareness, code-switching detection, and TTS voice selection. AssessmentService for comprehensive diagnostic assessment, balanced question generation, difficulty calibration, mastery persistence, misconception recording, cognitive profiling, time analysis, confidence analysis, and learning path generation.
- **Voice Services & Unified WebSocket Protocol**: All AI Mentor interactions use a unified WebSocket protocol. Primary TTS is Azure Cognitive Services with SSML support for Unity Avatar. Fallback TTS includes Sarvam, Google, Polly. STT uses Sarvam AI Saarika v2 with AssemblyAI fallback. Enhanced TTS pipeline includes Indian English/Hinglish math pronunciation, intent+emotion prosody. Streaming TTS uses real-time sentence-by-sentence generation with phrase-level caching and gzip audio compression. Azure Viseme Generation provides server-side timing data for Unity lip-sync.
- **File Storage**: AWS S3 for object storage, using presigned URLs.
- **Authentication and Authorization**: Custom email/password with bcrypt, server-side sessions in PostgreSQL, HTTP-only secure cookies, and session-based middleware.
- **Security Hardening**: Global and specific API rate limiting, Helmet.js, and environment-aware Content Security Policy (CSP).

### Unity Integration
- **Audio Playback Completion Tracking**: Unity WebGL avatar build sends `AUDIO_ENDED` and `AUDIO_FAILED` messages to React.
- **Unity Avatar Lip-Sync**: Server-side Azure TTS generates viseme IDs with timing data, mapped by Unity C# code to ARKit blend shapes.
- **TTS Audio Queue System**: Implemented in Unity HTML to handle multiple audio chunks without skipping, ensuring proper sequencing and error handling.

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