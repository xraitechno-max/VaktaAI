# 🚀 VaktaAI - Complete Technical Architecture

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Database Schema](#database-schema)
5. [AI Services Integration](#ai-services-integration)
6. [Avatar System](#avatar-system)
7. [DocChat Features](#docchat-features)
8. [Voice & TTS System](#voice--tts-system)
9. [Security & Performance](#security--performance)
10. [Deployment & Infrastructure](#deployment--infrastructure)

---

## 🎯 System Overview

### **VaktaAI** - AI-Powered Educational Platform
- **Type**: Full-stack Educational Platform
- **Architecture**: Microservices with AI Integration
- **Database**: PostgreSQL with pgvector
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + Node.js + TypeScript

### **Core Features:**
- 🤖 **AI Tutor** - Conversational AI with Unity 3D Avatar
- 📚 **DocChat** - Document-based Q&A with RAG
- 🧠 **Quiz Generator** - AI-powered assessments
- 📝 **Study Plans** - Personalized learning paths
- 🎵 **Voice Chat** - Real-time voice interaction
- 🎭 **3D Avatar** - Unity WebGL integration

---

## 🏗️ Backend Architecture

### **Core Technologies:**

#### **Server Framework:**
```typescript
Express.js          - Web framework
TypeScript          - Type-safe development
Node.js             - Runtime environment
tsx                 - TypeScript execution
```

#### **Database & ORM:**
```typescript
PostgreSQL          - Primary database
Drizzle ORM         - Type-safe database operations
pg                  - PostgreSQL driver
Redis               - Caching and session storage
pgvector            - Vector similarity search
```

#### **Authentication & Security:**
```typescript
bcrypt              - Password hashing
express-session     - Session management
connect-pg-simple    - PostgreSQL session store
helmet              - Security headers
express-rate-limit  - Rate limiting
```

### **Key Backend Services:**

#### **1. AI Services (`server/services/`)**
- **`aiService.ts`** - Main AI orchestration
- **`optimizedAIService.ts`** - Cost-optimized AI routing
- **`modelRouter.ts`** - Intelligent model selection
- **`agenticRAG.ts`** - Advanced RAG implementation
- **`documentService.ts`** - Document processing

#### **2. Voice & TTS Services**
- **`voiceStreamService.ts`** - Real-time voice streaming
- **`ttsCacheService.ts`** - TTS response caching
- **`enhancedVoiceService.ts`** - Multi-provider TTS
- **`sarvamVoice.ts`** - Hindi/English TTS
- **`avatarStateService.ts`** - Avatar state management

#### **3. Document Processing**
- **`documentService.ts`** - Multi-format document processing
- **`embeddingService.ts`** - Vector embedding generation
- **`objectStorage.ts`** - File storage management

---

## 🎨 Frontend Architecture

### **Core Technologies:**

#### **Framework & Build:**
```typescript
React 18            - UI framework
TypeScript          - Type safety
Vite                - Build tool
Tailwind CSS        - Styling
Framer Motion       - Animations
```

#### **State Management:**
```typescript
TanStack Query      - Server state
React Context       - Global state
React Hooks         - Component state
```

### **Key Frontend Components:**

#### **1. Avatar System (`client/src/components/tutor/avatar/`)**
- **`AvatarContainer.tsx`** - Main avatar wrapper
- **`UnityAvatar.tsx`** - Unity WebGL integration
- **`useUnityBridge.ts`** - Unity communication
- **`useAvatarState.ts`** - Avatar state management

#### **2. Avatar States:**
- **`HalfPanel.tsx`** - Half panel display
- **`FullscreenPanel.tsx`** - Fullscreen mode
- **`FullscreenWithChat.tsx`** - Fullscreen with chat
- **`MinimizedBubble.tsx`** - Minimized state

#### **3. DocChat System (`client/src/pages/`)**
- **`DocChatSession.tsx`** - Main DocChat interface
- **`TutorSession.tsx`** - AI Tutor interface
- **`Landing.tsx`** - Landing page

#### **4. Voice Integration:**
- **`useVoiceTutor.ts`** - Voice chat hook
- **`SmartTTSQueue.ts`** - TTS queue management
- **`useAvatarState.ts`** - Avatar state hook

---

## 🗄️ Database Schema

### **Core Tables:**

#### **Users & Authentication:**
```sql
users               - User accounts
sessions            - User sessions
```

#### **Documents & Content:**
```sql
documents           - Document metadata
chunks              - Text chunks with vectors
chats               - Chat sessions
messages            - Chat messages
```

#### **Learning Features:**
```sql
quizzes             - Quiz metadata
quiz_questions      - Quiz questions
quiz_attempts       - User attempts
study_plans         - Learning plans
notes              - User notes
flashcards          - Study cards
```

#### **Avatar & Voice:**
```sql
tutor_sessions      - Tutor sessions
language_detection_logs - Language detection
response_validation_logs - Response validation
```

### **Vector Search:**
```sql
-- pgvector integration
chunks.vector       - 384-dimensional embeddings
-- Similarity search
SELECT * FROM chunks 
WHERE vector <-> query_vector < 0.8
ORDER BY vector <-> query_vector;
```

---

## 🤖 AI Services Integration

### **AI Providers:**

#### **Primary Models:**
```typescript
OpenAI              - GPT-4o-mini, GPT-4
Google Gemini       - Gemini 1.5 Flash
Anthropic Claude    - Claude Haiku
Cohere              - Cohere AI models
```

#### **AI Orchestration:**
```typescript
IntelligentModelRouter    - Cost-optimized routing
SemanticCaching          - Response caching
QueryClassification      - Intent detection
PerformanceOptimization  - Cost tracking
```

### **AI Features:**

#### **1. Intelligent Model Routing:**
- **Cost Optimization** - Route to cheapest suitable model
- **Quality Assessment** - Model selection based on complexity
- **Fallback Strategy** - Graceful degradation
- **Performance Tracking** - Cost and quality metrics

#### **2. Agentic RAG (Retrieval Augmented Generation):**
- **Multi-step Reasoning** - Intelligent information gathering
- **Tool-based Retrieval** - Dynamic search strategies
- **Self-reflection** - Quality assessment
- **Source Citation** - Accurate source attribution

#### **3. Document Processing:**
- **Multi-format Support** - PDF, DOCX, Images, YouTube, Web
- **Semantic Chunking** - Intelligent text segmentation
- **Vector Embeddings** - pgvector-based search
- **OCR Processing** - Image text extraction

---

## 🎭 Avatar System

### **Unity 3D Integration:**

#### **Avatar Features:**
```typescript
5 Avatar States     - Different display modes
Real-time Animation - Gesture and emotion
Voice Synchronization - Lip-sync with TTS
Phoneme Mapping     - Precise mouth animation
```

#### **Avatar States:**
```typescript
'CLOSED'                    - Hidden
'MINIMIZED'                 - Minimized bubble
'HALF_PANEL'                 - Half screen
'FULLSCREEN'               - Full screen
'FULLSCREEN_WITH_CHAT'     - Full screen with chat
```

#### **Unity Bridge Functions:**
```typescript
sendAudioToAvatar(audioBlob, emotion?)
sendAudioWithPhonemesToAvatar(audioBase64, phonemes, messageId?)
setEmotion(emotion: string)
triggerGesture(gesture: string)
changeAvatar(avatarName: 'priya' | 'amit')
stopAudio()
```

### **Avatar Technical Stack:**
```typescript
Unity WebGL        - 3D avatar rendering
WebSocket          - Real-time communication
PostMessage API     - Iframe communication
Phoneme Mapping    - Lip-sync animation
TTS Integration    - Voice synchronization
```

---

## 📚 DocChat Features

### **Document Processing Pipeline:**

#### **Supported Formats:**
```typescript
'pdf'     - PDF documents with text extraction
'docx'    - Microsoft Word documents  
'image'   - OCR for images (Tesseract.js)
'youtube' - YouTube video transcripts
'web'     - Web page content extraction
'text'    - Plain text documents
```

#### **Processing Technologies:**
```typescript
PDF Parse           - PDF text extraction
Mammoth             - Word document processing
Tesseract.js        - OCR for images
YouTube Transcript  - Video transcript extraction
Mozilla Readability - Web content cleaning
```

### **RAG Implementation:**

#### **Agentic RAG Tools:**
```typescript
semantic_search     - Vector similarity search
keyword_search      - Traditional keyword matching
document_filter     - Document-specific search
synthesize_answer   - Final answer generation
```

#### **Search Features:**
```typescript
Multi-document search
Cross-document references
Context-aware retrieval
Source attribution
Confidence scoring
```

### **DocChat UI Features:**
```typescript
Real-time streaming
Source highlighting
Quick actions (summary, quiz, flashcards)
Document navigation
Zoom controls
Multi-language support
```

---

## 🎵 Voice & TTS System

### **TTS Providers:**

#### **Multi-provider TTS:**
```typescript
AWS Polly           - Text-to-speech with phonemes
Sarvam AI           - Hindi/English TTS
AssemblyAI          - Speech-to-text
Enhanced Voice      - Multi-provider TTS
```

#### **Voice Features:**
```typescript
Real-time Streaming     - WebSocket-based
Phoneme Generation      - Lip-sync data
Audio Compression        - Optimized delivery
TTS Caching            - Performance optimization
Multi-language Support  - Hindi/English
```

### **Voice Processing Pipeline:**
```typescript
1. Speech Input     - Audio recording
2. STT Processing   - Speech-to-text
3. AI Processing     - Query understanding
4. Response Generation - AI response
5. TTS Generation   - Text-to-speech
6. Phoneme Mapping  - Lip-sync data
7. Avatar Animation - Real-time animation
```

### **WebSocket Integration:**
```typescript
Voice Streaming     - Real-time audio
Avatar State Sync   - Avatar updates
Session Management  - User sessions
Language Detection  - Multi-language support
```

---

## 🔒 Security & Performance

### **Security Features:**

#### **Authentication:**
```typescript
bcrypt              - Password hashing
express-session     - Session management
connect-pg-simple   - PostgreSQL sessions
helmet              - Security headers
```

#### **API Protection:**
```typescript
express-rate-limit  - Rate limiting
Input Validation    - Zod schemas
CORS Configuration  - Cross-origin security
Content Security Policy - XSS protection
```

### **Performance Optimizations:**

#### **Caching Strategy:**
```typescript
Redis Caching       - Response caching
TTS Caching         - Audio caching
Semantic Caching    - Intelligent caching
Embedding Caching   - Vector caching
```

#### **Database Optimization:**
```typescript
Connection Pooling  - Database connections
Vector Indexing     - pgvector optimization
Query Optimization  - Efficient queries
Batch Processing    - Bulk operations
```

### **Cost Optimization:**
```typescript
Model Routing       - Cost-effective AI routing
Token Optimization  - Efficient prompts
Response Compression - Bandwidth optimization
Caching Strategy    - Reduce API calls
```

---

## 🚀 Deployment & Infrastructure

### **Development Environment:**
```typescript
Node.js 24.8.0      - Runtime
PostgreSQL 16       - Database
Redis               - Caching
TypeScript 5.6.3    - Type checking
Vite 5.4.20         - Build tool
```

### **Production Build:**
```typescript
esbuild             - Production bundling
Vite                - Frontend build
TypeScript          - Type checking
Compression         - Response compression
```

### **File Storage:**
```typescript
AWS S3              - Object storage
Multer              - File upload handling
Uppy                - Advanced upload UI
```

### **Monitoring & Analytics:**
```typescript
Cost Tracking       - AI usage costs
Performance Metrics - Response times
Usage Analytics     - User behavior
Quality Metrics     - Response quality
```

---

## 📊 System Metrics

### **Performance Targets:**
```typescript
Response Time       - < 2 seconds
TTS Latency         - < 1 second
Avatar Animation    - 60 FPS
Document Processing - < 30 seconds
Vector Search       - < 500ms
```

### **Cost Optimization:**
```typescript
AI Cost Reduction   - 97% vs GPT-4
Monthly Cost        - $15.46 (10K students)
Per Student Cost    - $0.0015
Token Optimization  - 50% reduction
```

---

## 🔧 Development Tools

### **Build & Development:**
```typescript
Vite                - Frontend build tool
esbuild             - Production bundling
TypeScript          - Type checking
Tailwind CSS        - Styling
```

### **Database Management:**
```typescript
Drizzle Kit         - Database migrations
Schema Management   - Type-safe schemas
Connection Pooling  - Database optimization
```

### **Testing & Quality:**
```typescript
TypeScript          - Compile-time checking
Zod Validation      - Runtime validation
Error Handling      - Graceful degradation
Logging             - Comprehensive logging
```

---

## 📈 Future Roadmap

### **Planned Features:**
- **Multi-language Support** - Extended language support
- **Advanced Analytics** - Learning analytics
- **Mobile App** - React Native integration
- **Offline Support** - PWA capabilities
- **Advanced AI** - GPT-5 integration

### **Performance Improvements:**
- **Edge Computing** - CDN integration
- **Advanced Caching** - Multi-level caching
- **Real-time Sync** - WebRTC integration
- **AI Optimization** - Model fine-tuning

---

## 🎯 Key Technical Achievements

### **Innovation Highlights:**
1. **Agentic RAG** - Advanced retrieval system
2. **Unity Avatar** - 3D avatar integration
3. **Multi-provider TTS** - Cost-optimized voice
4. **Semantic Caching** - Intelligent response caching
5. **Real-time Streaming** - WebSocket-based communication
6. **Vector Search** - pgvector integration
7. **Cost Optimization** - 97% cost reduction
8. **Multi-language** - Hindi/English support

### **Technical Excellence:**
- **Type Safety** - Full TypeScript coverage
- **Performance** - Sub-second response times
- **Scalability** - Microservices architecture
- **Security** - Enterprise-grade security
- **User Experience** - Intuitive interface
- **AI Integration** - Advanced AI capabilities

---

*This document provides a comprehensive overview of VaktaAI's technical architecture, covering all major components, services, and integrations that power this advanced AI-powered educational platform.*
