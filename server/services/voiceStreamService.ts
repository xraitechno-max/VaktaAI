import type { VoiceWebSocketClient, VoiceMessage, TTSChunkMessage, PhonemeTTSChunkMessage, TranscriptionMessage, TTSStartMessage, TTSEndMessage } from '../types/voiceWebSocket';
import { sarvamVoiceService } from './sarvamVoice';
import { AssemblyAI } from 'assemblyai';
import { ObjectStorageService } from '../objectStorage';
import { storage } from '../storage';
import { tutorSessionService } from './tutorSessionService';
import { intentClassifier } from './intentClassifier';
import { emotionDetector } from './emotionDetector';
import { LanguageDetectionEngine, type DetectedLanguage } from './LanguageDetectionEngine';
import { SessionContextManager } from './SessionContextManager';
import { DynamicPromptEngine } from './DynamicPromptEngine';
import { ResponseValidator } from './ResponseValidator';
import { optimizedAI } from './optimizedAIService';
import { enhancedVoiceService } from './enhancedVoiceService';
import { performanceOptimizer, metricsTracker } from './PerformanceOptimizer';
import { hintService } from './hintService';
import { enhancedPromptEngine } from './DynamicPromptEngine';
import { ttsCacheService } from './ttsCacheService';
import { audioCompression } from './audioCompression';
import { ttsMetrics } from './ttsMetrics';
import { voiceService } from './voiceService';
import { mapPollyVisemesToUnityPhonemes, mapAzureVisemesToUnityPhonemes } from '../utils/visemeMapping';
import { avatarStateService } from './avatarStateService';
import { TTSTextProcessor } from '../utils/tts-text-processor';
import { ttsRouter } from './tts';
import { accuracyAssuranceService, type AccuracyAuditResult } from './curriculum/AccuracyAssuranceService';
import { adaptiveDifficultyEngine } from './curriculum/AdaptiveDifficultyEngine';

// Initialize AI Tutor services
const languageDetector = new LanguageDetectionEngine();
const sessionContextManager = new SessionContextManager();
const dynamicPromptEngine = new DynamicPromptEngine();
const responseValidator = new ResponseValidator();

const assemblyAI = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

export class VoiceStreamService {
  private objectStorage: ObjectStorageService;

  constructor() {
    this.objectStorage = new ObjectStorageService();
  }

  /**
   * Process audio chunks from client and transcribe in real-time
   * Supports streaming STT with Sarvam (primary) and AssemblyAI (fallback)
   */
  async processAudioChunk(
    ws: VoiceWebSocketClient,
    audioData: string, // Base64 encoded audio
    format: 'webm' | 'opus' | 'wav',
    isLast: boolean,
    language: 'hi' | 'en' = 'en'
  ): Promise<void> {
    try {
      // Decode base64 audio
      const audioBuffer = Buffer.from(audioData, 'base64');

      // Add to buffer
      if (!ws.audioBuffer) {
        ws.audioBuffer = [];
      }
      ws.audioBuffer.push(audioBuffer);

      console.log(`[VOICE STREAM] Received audio chunk: ${audioBuffer.length} bytes (isLast: ${isLast})`);

      // If this is the last chunk, process the complete audio
      if (isLast && ws.audioBuffer.length > 0) {
        const completeAudio = Buffer.concat(ws.audioBuffer);
        ws.audioBuffer = []; // Clear buffer

        console.log(`[VOICE STREAM] Processing complete audio: ${completeAudio.length} bytes`);

        // Send interim "processing" message to show STT is in progress
        const interimMsg: TranscriptionMessage = {
          type: 'TRANSCRIPTION',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          text: '...',  // Indicate processing
          confidence: 0,
          language: language,
          isFinal: false
        };
        ws.send(JSON.stringify(interimMsg));

        // Transcribe using Sarvam (primary) or AssemblyAI (fallback)
        const transcription = await this.transcribeAudio(completeAudio, language);

        // Send final transcription result to client
        const transcriptionMsg: TranscriptionMessage = {
          type: 'TRANSCRIPTION',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          text: transcription.text,
          confidence: transcription.confidence,
          language: transcription.language as 'hi' | 'en',
          isFinal: true
        };

        ws.send(JSON.stringify(transcriptionMsg));

        console.log(`[VOICE STREAM] ✅ Transcription sent: "${transcription.text}"`);

        // 🔥 AUTO-TRIGGER AI TUTOR PIPELINE after successful transcription
        if (transcription.text && transcription.text.trim().length > 0 && ws.chatId && ws.userId) {
          console.log(`[VOICE STREAM] → Triggering AI Tutor pipeline for transcription`);
          await this.processTutorResponse(
            ws,
            transcription.text,
            ws.chatId,
            ws.userId,
            transcription.language as 'hi' | 'en'
          );
        }
      }
    } catch (error) {
      console.error('[VOICE STREAM] Audio processing error:', error);

      const errorMsg: VoiceMessage = {
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        code: 'AUDIO_PROCESSING_ERROR',
        message: 'Failed to process audio',
        recoverable: true
      };
      ws.send(JSON.stringify(errorMsg));
    }
  }

  /**
   * Transcribe audio using Sarvam AI (primary) or AssemblyAI (fallback)
   */
  private async transcribeAudio(
    audioBuffer: Buffer,
    language: 'hi' | 'en'
  ): Promise<{ text: string; confidence: number; language: string }> {
    // Try Sarvam AI first (Indian accent optimized)
    if (sarvamVoiceService.isAvailable()) {
      try {
        console.log('[VOICE STREAM] Using Sarvam AI for STT...');
        return await sarvamVoiceService.transcribeAudio(audioBuffer, language);
      } catch (error) {
        console.warn('[VOICE STREAM] Sarvam STT failed, falling back to AssemblyAI:', error);
      }
    }

    // Fallback to AssemblyAI
    try {
      console.log('[VOICE STREAM] Using AssemblyAI for STT...');

      // AssemblyAI supports direct file upload via their upload API
      // Upload the audio buffer directly (works with any format: WAV, WebM, Opus, etc.)
      const uploadUrl = await assemblyAI.files.upload(audioBuffer);

      const transcript = await assemblyAI.transcripts.transcribe({
        audio: uploadUrl,
        language_code: language === 'hi' ? 'hi' : 'en',
      });

      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      return {
        text: transcript.text || '',
        confidence: transcript.confidence || 0,
        language
      };
    } catch (error) {
      console.error('[VOICE STREAM] AssemblyAI STT error:', error);
      throw new Error('All STT providers failed');
    }
  }

  /**
   * 🚀 PHASE 1: Stream TTS chunks with REAL-TIME sentence-by-sentence generation
   * Detects sentence boundaries and generates TTS in parallel for <1.5s latency
   */
  async streamTTSChunksRealtime(
    ws: VoiceWebSocketClient,
    text: string,
    language: 'hi' | 'en',
    emotion?: string,
    intent?: string,
    personaId?: string
  ): Promise<void> {
    try {
      console.log(`[STREAMING TTS] 🚀 Real-time sentence-by-sentence TTS starting...`);

      // Sentence boundary regex (Hindi + English)
      const sentenceBoundary = /[।.!?]\s+|[।.!?]$/;

      // Split text into sentences
      const parts = text.split(sentenceBoundary);
      const sentences: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part) {
          sentences.push(part);
        }
      }

      console.log(`[STREAMING TTS] Split into ${sentences.length} sentences`);

      // 🔥 FIX #2: Send TTS_START to reset client queue state
      const startMsg: TTSStartMessage = {
        type: 'TTS_START',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        text: text.substring(0, 100)
      };
      ws.send(JSON.stringify(startMsg));
      ws.isTTSActive = true;
      ws.ttsSentCount = 0; // 🔢 Reset sequential TTS counter for new message

      // Voice options for all chunks
      const voiceOptions = {
        emotion,
        intent,
        personaId,
        language,
        enableMathSpeech: true,
        enablePauses: true,
        enableEmphasis: true
      };

      // 🔥 Generate TTS for all sentences IN PARALLEL (don't await!)
      const ttsPromises = sentences.map(async (sentence, index) => {
        // 🔥 FIX #3: Assign deterministic sequence numbers BEFORE synthesis
        const sequenceNumber = index;

        try {
          const startTime = Date.now();

          // 🚀 PHASE 2.1: Check cache first
          const cachedAudio = await ttsCacheService.get(sentence, language, emotion, personaId);

          let audioBuffer: Buffer;
          let cached = false;

          if (cachedAudio) {
            audioBuffer = cachedAudio;
            cached = true;
          } else {
            // Generate TTS audio
            audioBuffer = await enhancedVoiceService.synthesize(sentence, voiceOptions);

            // 🚀 PHASE 2.1: Store in cache for future use
            await ttsCacheService.set(sentence, language, audioBuffer, emotion, personaId);
          }

          const genTime = Date.now() - startTime;

          const cacheStatus = cached ? '💾 CACHED' : '🔨 GENERATED';
          console.log(`[STREAMING TTS] ✅ Chunk ${index + 1}/${sentences.length} ${cacheStatus} (${genTime}ms): "${sentence.substring(0, 40)}..."`);

          // 🚀 PHASE 2.2: Compress audio before sending (if beneficial)
          let finalAudioData: string;
          let compressed = false;
          let compressedSize = 0;

          if (audioCompression.shouldCompress(audioBuffer.length)) {
            const compressionResult = await audioCompression.compress(audioBuffer);
            finalAudioData = compressionResult.compressed.toString('base64');
            compressed = true;
            compressedSize = compressionResult.compressedSize;
          } else {
            finalAudioData = audioBuffer.toString('base64');
          }

          // 🚀 PHASE 2.4: Record metrics
          ttsMetrics.record({
            sentence,
            language,
            generationTime: genTime,
            cached,
            compressed,
            audioSize: audioBuffer.length,
            compressedSize: compressed ? compressedSize : undefined,
            sequence: sequenceNumber,
            sessionId: ws.sessionId,
          });

          // ✅ CORRECT: Send TTS chunk with flat payload (matches TTSChunkMessage)
          const ttsMsg: TTSChunkMessage = {
            type: 'TTS_CHUNK',
            timestamp: new Date().toISOString(),
            sessionId: ws.sessionId,
            data: finalAudioData,  // ✅ Direct base64 string (NOT nested!)
            chunkIndex: sequenceNumber,
            totalChunks: index === sentences.length - 1 ? sentences.length : undefined
          };

          ws.send(JSON.stringify(ttsMsg));

        } catch (error) {
          console.error(`[STREAMING TTS] ❌ Failed chunk ${index + 1}: ${error}`);

          // Send error message for failed chunk
          const errorMsg: VoiceMessage = {
            type: 'ERROR',
            timestamp: new Date().toISOString(),
            code: 'TTS_GENERATION_FAILED',
            message: `Failed to generate TTS for chunk ${sequenceNumber}`,
            recoverable: true
          };
          ws.send(JSON.stringify(errorMsg));
        }
      });

      // Don't await all - let them stream as they complete!
      // But track completion
      Promise.all(ttsPromises).then(() => {
        // Send TTS end notification (matches TTSEndMessage)
        const endMsg: TTSEndMessage = {
          type: 'TTS_END',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          totalChunks: ws.ttsSentCount || sentences.length  // 🔢 Use actual sent count
        };
        ws.send(JSON.stringify(endMsg));

        ws.isTTSActive = false;
        console.log(`[STREAMING TTS] ✅ All ${sentences.length} chunks sent`);
      }).catch(error => {
        console.error('[STREAMING TTS] Error in parallel generation:', error);
      });

    } catch (error) {
      console.error('[STREAMING TTS] Setup error:', error);
      // Fallback to old method
      await this.streamTTSChunks(ws, text, language, emotion, intent, personaId);
    }
  }

  /**
   * Stream TTS chunks with emotion, intent, and persona support (AI Tutor pipeline)
   * Uses EnhancedVoiceService for emotion-based prosody and math-to-speech
   */
  async streamTTSChunks(
    ws: VoiceWebSocketClient,
    text: string,
    language: 'hi' | 'en',
    emotion?: string,
    intent?: string,
    personaId?: string
  ): Promise<void> {
    try {
      console.log(`[VOICE TTS] Converting with emotion: ${emotion}, intent: ${intent}, persona: ${personaId}`);

      // Use EnhancedVoiceService to apply emotion, intent, and persona
      const voiceOptions = {
        emotion,
        intent,
        personaId,
        language,
        enableMathSpeech: true,
        enablePauses: true,
        enableEmphasis: true
      };

      // Convert to speech with enhanced prosody
      const audioBuffer = await enhancedVoiceService.synthesize(text, voiceOptions);

      // Stream the enhanced audio chunks
      await this.streamTTSAudioDirect(ws, audioBuffer, language);

    } catch (error) {
      console.error('[VOICE TTS] Enhanced TTS error:', error);

      // Fallback to basic TTS without emotion/prosody
      await this.streamTTSAudio(ws, text, language);
    }
  }

  /**
   * Stream pre-generated audio buffer directly to client
   */
  private async streamTTSAudioDirect(
    ws: VoiceWebSocketClient,
    audioBuffer: Buffer,
    language: 'hi' | 'en'
  ): Promise<void> {
    try {
      console.log(`[VOICE STREAM] Starting direct audio streaming: ${audioBuffer.length} bytes`);

      // Mark TTS as active
      ws.isTTSActive = true;

      // Send TTS start notification
      const startMsg: TTSStartMessage = {
        type: 'TTS_START',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        text: '' // Already processed
      };
      ws.send(JSON.stringify(startMsg));

      // Split audio into chunks for streaming (10KB chunks)
      const CHUNK_SIZE = 10 * 1024; // 10KB
      const totalChunks = Math.ceil(audioBuffer.length / CHUNK_SIZE);

      console.log(`[VOICE STREAM] Streaming ${totalChunks} audio chunks`);

      for (let i = 0; i < totalChunks; i++) {
        // Check if interrupted
        if (!ws.isTTSActive) {
          console.log('[VOICE STREAM] TTS interrupted at chunk', i);
          break;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, audioBuffer.length);
        const chunk = audioBuffer.slice(start, end);

        const chunkMsg: TTSChunkMessage = {
          type: 'TTS_CHUNK',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          data: chunk.toString('base64'),
          chunkIndex: i,
          totalChunks: i === totalChunks - 1 ? totalChunks : undefined
        };

        ws.send(JSON.stringify(chunkMsg));

        // 🚀 OPTIMIZATION: Reduced delay for faster streaming (10ms instead of 50ms)
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Send TTS end notification
      if (ws.isTTSActive) {
        const endMsg: TTSEndMessage = {
          type: 'TTS_END',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          totalChunks
        };
        ws.send(JSON.stringify(endMsg));

        console.log(`[VOICE STREAM] ✅ Direct streaming complete: ${totalChunks} chunks sent`);
      }

      ws.isTTSActive = false;
    } catch (error) {
      console.error('[VOICE STREAM] Direct streaming error:', error);
      ws.isTTSActive = false;
      throw error;
    }
  }

  /**
   * Stream TTS audio chunks to client in real-time
   * Supports Sarvam Bulbul (primary) and AWS Polly (fallback)
   */
  async streamTTSAudio(
    ws: VoiceWebSocketClient,
    text: string,
    language: 'hi' | 'en',
    speaker?: string,
    pitch?: number,
    pace?: number,
    loudness?: number
  ): Promise<void> {
    try {
      console.log(`[VOICE STREAM] Starting TTS streaming for: "${text.substring(0, 50)}..."`);

      // Mark TTS as active
      ws.isTTSActive = true;

      // Send TTS start notification
      const startMsg: TTSStartMessage = {
        type: 'TTS_START',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        text: text.substring(0, 100)
      };
      ws.send(JSON.stringify(startMsg));

      // Generate TTS audio (Sarvam primary, Polly fallback)
      const audioBuffer = await this.synthesizeSpeech(text, language, speaker, pitch, pace, loudness);

      // Check if TTS was interrupted
      if (!ws.isTTSActive) {
        console.log('[VOICE STREAM] TTS was interrupted, aborting stream');
        return;
      }

      // Split audio into chunks for streaming (10KB chunks)
      const CHUNK_SIZE = 10 * 1024; // 10KB
      const totalChunks = Math.ceil(audioBuffer.length / CHUNK_SIZE);

      console.log(`[VOICE STREAM] Streaming ${totalChunks} audio chunks (${audioBuffer.length} bytes total)`);

      for (let i = 0; i < totalChunks; i++) {
        // Check if interrupted
        if (!ws.isTTSActive) {
          console.log('[VOICE STREAM] TTS interrupted at chunk', i);
          break;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, audioBuffer.length);
        const chunk = audioBuffer.slice(start, end);

        const chunkMsg: TTSChunkMessage = {
          type: 'TTS_CHUNK',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          data: chunk.toString('base64'),
          chunkIndex: i,
          totalChunks: i === totalChunks - 1 ? totalChunks : undefined
        };

        ws.send(JSON.stringify(chunkMsg));

        // Small delay between chunks for smoother streaming (adjust based on network)
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Send TTS end notification
      if (ws.isTTSActive) {
        const endMsg: TTSEndMessage = {
          type: 'TTS_END',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          totalChunks
        };
        ws.send(JSON.stringify(endMsg));

        console.log(`[VOICE STREAM] ✅ TTS streaming complete: ${totalChunks} chunks sent`);
      }

      ws.isTTSActive = false;
    } catch (error) {
      console.error('[VOICE STREAM] TTS streaming error:', error);
      ws.isTTSActive = false;

      const errorMsg: VoiceMessage = {
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        code: 'TTS_STREAMING_ERROR',
        message: 'Failed to stream TTS audio',
        recoverable: true
      };
      ws.send(JSON.stringify(errorMsg));
    }
  }

  /**
   * Synthesize speech using TTS Router (Azure → Sarvam → Google → Polly with circuit breaker)
   */
  private async synthesizeSpeech(
    text: string,
    language: 'hi' | 'en',
    speaker?: string,
    pitch?: number,
    pace?: number,
    loudness?: number
  ): Promise<Buffer> {
    // Use TTS Router which handles Azure as primary provider with circuit breaker protection
    try {
      console.log('[VOICE STREAM] Using TTS Router for synthesis...');

      const result = await ttsRouter.synthesize(
        text,
        {
          languageCode: language,
          speed: pace,
          pitch,
        },
        'avatar' // Use 'avatar' context for best quality (Azure primary)
      );

      console.log(`[VOICE STREAM] ✅ TTS Router generated: ${result.audioBuffer.length} bytes (provider: ${result.provider})`);
      return result.audioBuffer;
    } catch (error) {
      console.error('[VOICE STREAM] TTS Router failed:', error);
      throw error;
    }
  }

  /**
   * Stop TTS streaming immediately
   */
  stopTTSStream(ws: VoiceWebSocketClient): void {
    if (ws.isTTSActive) {
      console.log(`[VOICE STREAM] Stopping TTS stream for session ${ws.sessionId}`);
      ws.isTTSActive = false;
    }
  }

  /**
   * Clear audio buffer
   */
  clearAudioBuffer(ws: VoiceWebSocketClient): void {
    if (ws.audioBuffer) {
      console.log(`[VOICE STREAM] Clearing audio buffer: ${ws.audioBuffer.length} chunks`);
      ws.audioBuffer = [];
    }
  }

  /**
   * 🚀 HELPER: Generate and stream TTS for a single sentence IMMEDIATELY
   * Used for TRUE real-time streaming during AI response generation
   * Now supports PHONEME_TTS_CHUNK for Unity lip-sync!
   */
  private async generateAndStreamSentenceTTS(
    ws: VoiceWebSocketClient,
    sentence: string,
    sequenceNumber: number,
    isLast: boolean,
    voiceOptions: {
      emotion?: string;
      intent?: string;
      personaId?: string;
      language: 'hi' | 'en';
      enableMathSpeech?: boolean;
      enablePauses?: boolean;
      enableEmphasis?: boolean;
      enablePhonemes?: boolean;  // 🎤 NEW: Enable phoneme generation for lip-sync
    },
    ttsInFlightMap?: Map<string, Promise<void>>  // 🔥 ATOMIC: Track in-flight TTS promises
  ): Promise<void> {
    // 🔥 CRITICAL: Clean and normalize sentence for deduplication
    // Remove emojis, trailing punctuation, extra whitespace
    const cleanedSentence = sentence.trim()
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[।.!?]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    // Skip empty sentences
    if (!cleanedSentence || cleanedSentence.length < 2) {
      console.log(`[TTS DEDUP] ⚠️ Skipping empty/too short sentence: "${sentence}"`);
      return;
    }

    // 🔥 ATOMIC DEDUP: Check if sentence is already being processed or was processed
    if (ttsInFlightMap) {
      if (ttsInFlightMap.has(cleanedSentence)) {
        console.log(`[TTS DEDUP] ⚠️ Skipping duplicate TTS (already in-flight or done): "${cleanedSentence.substring(0, 40)}..."`);
        return; // Exit immediately - sentence already processing/done!
      }

      // 🔥 CRITICAL FIX: Create promise AND add to map ATOMICALLY (single synchronous operation)
      // This prevents race conditions where two simultaneous calls both pass the has() check
      const ttsPromise = (async () => {
        try {
          await this.executeTTSGeneration(
            ws,
            sentence,
            sequenceNumber,
            isLast,
            voiceOptions
          );
        } catch (error) {
          console.error(`[TTS ERROR] Failed for sentence: "${cleanedSentence.substring(0, 40)}..."`, error);
          // Don't remove from map on error - prevents retry spam
          throw error;
        } finally {
          // 🎯 CLEANUP: Remove from map after a delay to prevent memory leak
          // But keep it long enough to catch rapid duplicates (30 seconds)
          setTimeout(() => {
            ttsInFlightMap.delete(cleanedSentence);
          }, 30000);
        }
      })();

      // 🎯 ATOMIC: Set in map IMMEDIATELY after creating promise (no await between check and set!)
      ttsInFlightMap.set(cleanedSentence, ttsPromise);

      // Don't await - fire and forget (dedup is already handled)
      return;
    }

    // Fallback: No map provided, execute directly (shouldn't happen)
    await this.executeTTSGeneration(ws, sentence, sequenceNumber, isLast, voiceOptions);
  }

  /**
   * 🔥 EXTRACTED: Actual TTS generation logic (separated from dedup logic)
   */
  private async executeTTSGeneration(
    ws: VoiceWebSocketClient,
    sentence: string,
    sequenceNumber: number,
    isLast: boolean,
    voiceOptions: {
      emotion?: string;
      intent?: string;
      personaId?: string;
      language: 'hi' | 'en';
      enableMathSpeech?: boolean;
      enablePauses?: boolean;
      enableEmphasis?: boolean;
      enablePhonemes?: boolean;
    }
  ): Promise<void> {
    // 🔥 CRITICAL: Check if avatar can still accept TTS
    if (ws.sessionId && !avatarStateService.canGenerateTTS(ws.sessionId)) {
      console.log(`[TTS GENERATION] ⏭️ Skipping - Avatar closed/not ready for session ${ws.sessionId}`);
      return;
    }

    try {

      const startTime = Date.now();

      // 🧹 CLEAN TEXT: Remove emojis, special chars, normalize for natural TTS
      const cleanedSentence = TTSTextProcessor.processForTTSLite(sentence);

      if (sentence !== cleanedSentence) {
        console.log(`[TTS CLEAN] Original: "${sentence.substring(0, 50)}..."`);
        console.log(`[TTS CLEAN] Cleaned:  "${cleanedSentence.substring(0, 50)}..."`);
      }

      let audioBuffer: Buffer;
      let phonemes: Array<{ time: number; blendshape: string; weight: number }> | undefined;
      let cached = false;

      // 🎤 PHASE 1: Generate audio with or without phonemes
      if (voiceOptions.enablePhonemes) {
        // 🎤 Generate audio + phonemes using multi-provider TTS router
        console.log(`[PHONEME STREAM] 🎤 Generating audio + phonemes for sentence ${sequenceNumber}...`);

        const result = await ttsRouter.synthesizeWithPhonemes(
          cleanedSentence,
          { languageCode: voiceOptions.language === 'hi' ? 'hi-IN' : 'en-IN' },
          'avatar' // Use avatar context for best quality
        );

        audioBuffer = result.audioBuffer;

        // Map visemes/phonemes to Unity phonemes (if available)
        if (result.provider === 'azure' && result.visemes) {
          phonemes = mapAzureVisemesToUnityPhonemes(result.visemes);
        } else if (result.phonemes && result.phonemes.length > 0) {
          phonemes = mapPollyVisemesToUnityPhonemes(result.phonemes);
        }

        console.log(`[PHONEME STREAM] ✅ Generated ${phonemes?.length || 0} phonemes for sentence ${sequenceNumber} (provider: ${result.provider})`);
      } else {
        // 🚀 Regular TTS without phonemes (check cache first)
        const cachedAudio = await ttsCacheService.get(
          cleanedSentence,
          voiceOptions.language,
          voiceOptions.emotion,
          voiceOptions.personaId
        );

        if (cachedAudio) {
          audioBuffer = cachedAudio;
          cached = true;
        } else {
          // Generate TTS audio using multi-provider router
          const result = await ttsRouter.synthesize(
            cleanedSentence,
            { languageCode: voiceOptions.language === 'hi' ? 'hi-IN' : 'en-IN' },
            'quick' // Use quick context for faster responses without phonemes
          );

          audioBuffer = result.audioBuffer;

          // Store in cache for future use
          await ttsCacheService.set(
            cleanedSentence,
            voiceOptions.language,
            audioBuffer,
            voiceOptions.emotion,
            voiceOptions.personaId
          );

          console.log(`[TRUE STREAM] TTS generated by provider: ${result.provider}, cached: ${result.cached}`);
        }
      }

      const genTime = Date.now() - startTime;
      const cacheStatus = voiceOptions.enablePhonemes ? '🎤 WITH PHONEMES' : (cached ? '💾 CACHED' : '🔨 GENERATED');
      console.log(`[TRUE STREAM] ✅ Sentence ${sequenceNumber} ${cacheStatus} (${genTime}ms): "${sentence.substring(0, 40)}..."`);

      // 🚀 PHASE 2: Send appropriate TTS chunk message
      const finalAudioData = audioBuffer.toString('base64');

      // 🔢 CRITICAL FIX: Use sentence sequence number as chunk index
      // This ensures chunks are played in correct order even if TTS completes out of order
      // Client buffers and plays chunks by chunkIndex, not by arrival order
      const ttsChunkIndex = sequenceNumber;
      
      // Track actual count of chunks sent (increment after each successful send)
      if (ws.ttsSentCount === undefined) {
        ws.ttsSentCount = 0;
      }

      console.log(`[TTS INDEX] Sentence ${sequenceNumber} → TTS chunk ${ttsChunkIndex} (will be chunk #${ws.ttsSentCount + 1})`);

      if (voiceOptions.enablePhonemes && phonemes) {
        // 🎤 Send PHONEME_TTS_CHUNK with audio + phoneme data
        const phonemeMsg: PhonemeTTSChunkMessage = {
          type: 'PHONEME_TTS_CHUNK',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          audio: finalAudioData,
          phonemes: phonemes,
          chunkIndex: ttsChunkIndex,  // 🔢 Use sentence index for correct order
          totalChunks: undefined,  // Will be sent in TTS_END
          text: sentence
        };

        ws.send(JSON.stringify(phonemeMsg));
        ws.ttsSentCount++; // 🔢 Increment after successful send
      } else {
        // 🔊 Send regular TTS_CHUNK without phonemes
        const ttsMsg: TTSChunkMessage = {
          type: 'TTS_CHUNK',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          data: finalAudioData,  // ✅ Direct base64 string (NOT nested!)
          chunkIndex: ttsChunkIndex,  // 🔢 Use sentence index for correct order
          totalChunks: undefined  // Will be sent in TTS_END
        };

        ws.send(JSON.stringify(ttsMsg));
        ws.ttsSentCount++; // 🔢 Increment after successful send
      }

      // 🚀 PHASE 3: Record metrics
      ttsMetrics.record({
        sentence,
        language: voiceOptions.language,
        generationTime: genTime,
        cached,
        compressed: false,
        audioSize: audioBuffer.length,
        sequence: sequenceNumber,
        sessionId: ws.sessionId,
      });

    } catch (error) {
      console.error(`[TRUE STREAM] ❌ Failed sentence ${sequenceNumber}: ${error}`);

      // Send error message (skip this chunk)
      const errorMsg: VoiceMessage = {
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        code: 'TTS_GENERATION_FAILED',
        message: `Failed to generate TTS for chunk ${sequenceNumber}`,
        recoverable: true
      };
      ws.send(JSON.stringify(errorMsg));
    }
  }

  /**
   * Process transcribed text through complete AI Tutor pipeline and stream TTS response
   * Integrates 7-phase system, emotion detection, intent classification, dynamic prompts, and voice synthesis
   */
  async processTutorResponse(
    ws: VoiceWebSocketClient,
    transcribedText: string,
    chatId: string,
    userId: string,
    language: 'hi' | 'en'
  ): Promise<void> {
    try {
      console.log(`[VOICE TUTOR] Processing: "${transcribedText}" for chat ${chatId}`);

      // Get or create tutor session
      const chat = await storage.getChat(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const session = await tutorSessionService.getOrCreateSession(
        chatId,
        userId,
        chat.subject || 'General',
        chat.topic || 'General',
        user
      );

      // 🔥 STEP 1: LANGUAGE DETECTION with caching
      const startLangDetection = Date.now();
      const cachedLangResult = await performanceOptimizer.getCachedLanguageDetection(transcribedText);
      let langDetection = cachedLangResult;

      if (!cachedLangResult) {
        langDetection = await languageDetector.detectLanguage(transcribedText, {
          conversationHistory: [],
          userPreference: session.profileSnapshot?.preferredLanguage as DetectedLanguage,
          topic: session.topic
        });
        await performanceOptimizer.cacheLanguageDetection(transcribedText, langDetection);
      }

      const langDetectionTime = Date.now() - startLangDetection;
      const detectedLang = langDetection?.language || 'english';
      console.log(`[VOICE TUTOR] Language: ${detectedLang} (${langDetection?.confidence.toFixed(2)}) - ${langDetectionTime}ms`);

      // 🔥 STEP 2: SESSION CONTEXT - Add language detection
      await sessionContextManager.addLanguageDetection(
        userId,
        chatId,
        detectedLang,
        langDetection?.confidence || 0.5
      );

      // 🔥 STEP 3: INTENT CLASSIFICATION + EMOTION DETECTION (parallel)
      const [intentResult, emotionResult] = await Promise.all([
        intentClassifier.classify(transcribedText, {
          currentPhase: session.currentPhase,
          currentTopic: session.topic,
          isInPracticeMode: session.currentPhase === 'practice'
        }),
        emotionDetector.detectEmotion(transcribedText, [], language)
      ]);

      console.log(`[VOICE TUTOR] Intent: ${intentResult.intent} (${(intentResult.confidence * 100).toFixed(0)}%) | Emotion: ${emotionResult.emotion}`);

      // Add emotion to session context
      await sessionContextManager.addEmotionDetection(
        userId,
        chatId,
        emotionResult.emotion,
        emotionResult.confidence
      );

      const sessionCtx = await sessionContextManager.getContext(userId, chatId);

      // 🔥 STEP 4: HANDLE SPECIAL INTENTS (hints, phase advancement)
      if (intentResult.intent === 'request_hint') {
        const hintState = hintService.getHintState(await storage.getChatMessages(chatId, 50)) ||
          hintService.initializeHintState();
        const advanceResult = hintService.advanceHintLevel(hintState);

        if (!advanceResult.canAdvance) {
          // Send hint limit message as TTS
          await this.streamTTSChunks(ws, advanceResult.message || 'No more hints available', language, emotionResult.emotion, intentResult.intent);
          return;
        }

        // Generate hint with AI (simplified for voice - no streaming)
        const hintPrompt = hintService.buildHintPrompt(
          advanceResult.nextLevel,
          language,
          session.topic || 'General',
          transcribedText,
          hintState.previousHints
        );

        // Generate hint response
        const hintResponse = await optimizedAI.generateResponse(transcribedText, hintPrompt, {
          language: detectedLang === 'hinglish' ? 'hindi' : 'english',
          useCache: true
        });

        // Save hint message with metadata
        await storage.addMessage({
          chatId,
          role: 'assistant',
          content: hintResponse.response,
          tool: null,
          metadata: {
            hintState: hintService.updateHintStateWithResponse(advanceResult.newState, hintResponse.response),
            hintLevel: advanceResult.nextLevel,
            model: hintResponse.model,
            cost: hintResponse.cost
          } as any
        });

        // Stream hint as TTS
        await this.streamTTSChunks(ws, hintResponse.response, language, emotionResult.emotion, intentResult.intent);
        return;
      }

      // 🔥 STEP 5: ASSESSMENT PHASE - Analyze response
      if (session.currentPhase === 'assessment') {
        const assessmentResult = tutorSessionService.analyzeResponse(transcribedText);
        await tutorSessionService.recordAssessment(chatId, assessmentResult);
        console.log(`[VOICE TUTOR] Assessment: Level ${assessmentResult.level}, Score ${assessmentResult.score}`);
      }

      // 🔥 STEP 6: GENERATE DYNAMIC PROMPT with all context
      const promptResult = dynamicPromptEngine.generateSystemPrompt({
        detectedLanguage: detectedLang,
        preferredLanguage: session.profileSnapshot?.preferredLanguage as DetectedLanguage,
        languageConfidence: langDetection?.confidence || 0.5,
        currentEmotion: emotionResult.emotion,
        emotionConfidence: emotionResult.confidence,
        emotionalStability: sessionCtx?.emotionalHistory && sessionCtx.emotionalHistory.length > 0 ?
          (sessionCtx.emotionalHistory.filter(e => e.emotion === emotionResult.emotion).length / sessionCtx.emotionalHistory.length) : 0.5,
        subject: session.subject,
        topic: session.topic,
        level: session.level || 'beginner',
        currentPhase: session.currentPhase,
        intent: intentResult.intent,
        misconceptions: session.adaptiveMetrics?.misconceptions || [],
        strongConcepts: session.adaptiveMetrics?.strongConcepts || []
      });

      const systemPrompt = promptResult.systemPrompt;
      console.log(`[VOICE TUTOR] Dynamic prompt: ${systemPrompt.length} chars | Phase: ${session.currentPhase}`);

      // 🔥 STEP 7: SAVE USER MESSAGE with full metadata
      await storage.addMessage({
        chatId,
        role: 'user',
        content: transcribedText,
        tool: null,
        metadata: {
          intent: intentResult.intent,
          intentConfidence: intentResult.confidence,
          emotion: emotionResult.emotion,
          emotionConfidence: emotionResult.confidence,
          detectedLanguage: detectedLang,
          languageConfidence: langDetection?.confidence || 0,
          voiceInput: true
        } as any
      });

      // 🔥 STEP 8: TRUE STREAMING - Generate AI response AND TTS in parallel sentence-by-sentence!
      const startAIGeneration = Date.now();

      // Send TTS_START to reset client queue state
      const startMsg: TTSStartMessage = {
        type: 'TTS_START',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        text: 'Generating response...'
      };
      ws.send(JSON.stringify(startMsg));
      ws.isTTSActive = true;
      ws.ttsSentCount = 0; // 🔢 Reset sequential TTS counter for new message

      // Sentence accumulator and sequence tracking
      let currentSentence = '';
      let fullResponse = '';
      let sentenceIndex = 0;
      const sentenceBoundary = /[।.!?]\s+|[।.!?]$/;

      // 🔥 CRITICAL: Clear TTS in-flight map for new session to prevent stale duplicates
      if (!ws.ttsInFlightMap) {
        ws.ttsInFlightMap = new Map<string, Promise<void>>();
      } else {
        console.log(`[VOICE TUTOR] 🧹 Clearing ${ws.ttsInFlightMap.size} stale TTS promises from previous session`);
        ws.ttsInFlightMap.clear();
      }

      // 🎯 Use PROFILE language preference for TTS (not detected language!)
      // This ensures consistent voice language throughout the session
      const profileLang = session.profileSnapshot?.preferredLanguage;
      const ttsLanguage: 'hi' | 'en' = (profileLang === 'hindi' || profileLang === 'hinglish') ? 'hi' : 'en';
      console.log(`[VOICE TUTOR] 🗣️ TTS Language: ${ttsLanguage} (from profile: ${profileLang || 'default english'})`);

      // Voice options for TTS
      const voiceOptions = {
        emotion: emotionResult.emotion,
        intent: intentResult.intent,
        personaId: session.personaId,
        language: ttsLanguage,  // 🎯 Use profile preference, NOT detected language!
        enableMathSpeech: true,
        enablePauses: true,
        enableEmphasis: true,
        enablePhonemes: true  // 🎤 Enable phoneme generation for Unity lip-sync via WebSocket!
      };

      // 🚀 Stream AI response with REAL-TIME sentence-by-sentence TTS generation!
      const aiResult = await optimizedAI.generateStreamingResponse(
        transcribedText,
        systemPrompt,
        '', // context (empty for voice queries)
        async (chunk: string, meta?: any) => {
          // Handle completion event (save metadata)
          if (meta?.type === 'complete') {
            console.log(`[VOICE TUTOR] ✅ AI streaming complete - Model: ${meta.model}, Cost: $${meta.cost?.toFixed(6) || 0}`);

            // Process final partial sentence if exists
            if (currentSentence.trim().length > 0) {
              // 🎭 Check avatar state before TTS generation
              const canGenerateTTS = avatarStateService.canGenerateTTS(ws.sessionId || '');

              if (canGenerateTTS) {
                // 🚀 OPTIMIZATION: Fire-and-forget for parallel TTS generation (dedup handled by ttsInFlightMap)
                this.generateAndStreamSentenceTTS(
                  ws,
                  currentSentence.trim(),
                  sentenceIndex,
                  true, // isLast
                  voiceOptions,
                  ws.ttsInFlightMap  // 🔥 Pass SHARED in-flight Map (atomic dedup)
                ).catch(err => console.error('[VOICE TUTOR] TTS final sentence error:', err));
              } else {
                // 📝 Avatar not ready - Send text-only response
                const textMsg: VoiceMessage = {
                  type: 'AI_RESPONSE_TEXT',
                  timestamp: new Date().toISOString(),
                  sessionId: ws.sessionId,
                  text: currentSentence.trim(),
                  messageId: `${ws.sessionId}-${sentenceIndex}-final`
                };
                ws.send(JSON.stringify(textMsg));
                console.log(`[VOICE TUTOR] 📝 Avatar not ready - Sent final text-only: "${currentSentence.trim().substring(0, 40)}..."`);
              }
            }

            // Send TTS_END
            const endMsg: TTSEndMessage = {
              type: 'TTS_END',
              timestamp: new Date().toISOString(),
              sessionId: ws.sessionId,
              totalChunks: ws.ttsSentCount || (sentenceIndex + 1)  // 🔢 Use actual sent count
            };
            ws.send(JSON.stringify(endMsg));
            ws.isTTSActive = false;

            return;
          }

          // Accumulate text chunks
          currentSentence += chunk;
          fullResponse += chunk;

          // Check for sentence boundary
          const match = currentSentence.match(sentenceBoundary);
          if (match) {
            // Extract complete sentence(s)
            const parts = currentSentence.split(sentenceBoundary);

            // Process all complete sentences (all except last part which may be incomplete)
            for (let i = 0; i < parts.length - 1; i++) {
              const sentence = parts[i].trim();
              if (sentence) {
                // 🎭 Check avatar state before TTS generation
                const canGenerateTTS = avatarStateService.canGenerateTTS(ws.sessionId || '');

                if (canGenerateTTS) {
                  // 🚀 OPTIMIZATION: Fire-and-forget for parallel TTS generation (dedup handled by ttsInFlightMap)
                  this.generateAndStreamSentenceTTS(
                    ws,
                    sentence,
                    sentenceIndex,
                    false, // not last
                    voiceOptions,
                    ws.ttsInFlightMap  // 🔥 Pass SHARED in-flight Map (atomic dedup)
                  ).catch(err => console.error(`[VOICE TUTOR] TTS sentence ${sentenceIndex} error:`, err));
                } else {
                  // 📝 Avatar not ready - Send text-only response
                  const textMsg: VoiceMessage = {
                    type: 'AI_RESPONSE_TEXT',
                    timestamp: new Date().toISOString(),
                    sessionId: ws.sessionId,
                    text: sentence,
                    messageId: `${ws.sessionId}-${sentenceIndex}`
                  };
                  ws.send(JSON.stringify(textMsg));
                  console.log(`[VOICE TUTOR] 📝 Avatar not ready - Sent text-only: "${sentence.substring(0, 40)}..."`);
                }

                sentenceIndex++;
              }
            }

            // Keep the incomplete part for next iteration
            currentSentence = parts[parts.length - 1] || '';
          }
        }
      );

      const aiGenerationTime = Date.now() - startAIGeneration;
      console.log(`[VOICE TUTOR] ✅ TRUE STREAMING complete: ${fullResponse.length} chars - ${aiGenerationTime}ms total`);

      // 🔥 STEP 9: VALIDATE RESPONSE QUALITY (after streaming)
      const startValidation = Date.now();
      const validation = await responseValidator.validate(fullResponse, {
        expectedLanguage: detectedLang,
        userEmotion: emotionResult.emotion,
        currentPhase: session.currentPhase,
        subject: session.subject || 'General',
        topic: session.topic || 'General',
        userMessage: transcribedText
      });
      const validationTime = Date.now() - startValidation;
      console.log(`[VOICE TUTOR] Validation: ${(validation.overallScore * 100).toFixed(1)}% - Valid: ${validation.isValid} (${validationTime}ms)`);

      // 🔬 STEP 9.1: ACCURACY ASSURANCE - Verify math/science accuracy (Phase 3)
      let accuracyAudit: AccuracyAuditResult | null = null;
      if (session.subject && ['physics', 'chemistry', 'math', 'maths', 'biology'].includes(session.subject.toLowerCase())) {
        const startAccuracy = Date.now();
        try {
          accuracyAudit = await accuracyAssuranceService.validateFinalResponse(
            fullResponse,
            session.subject,
            session.topic || undefined,
            session.profileSnapshot?.examTarget || undefined
          );
          const accuracyTime = Date.now() - startAccuracy;
          console.log(`[VOICE TUTOR] 🔬 Accuracy Audit: ${accuracyAudit.passed ? 'PASSED' : 'ISSUES FOUND'} - Calcs: ${accuracyAudit.calculationsVerified}, Units: ${accuracyAudit.unitsValidated}, Formulas: ${accuracyAudit.formulasChecked} (${accuracyTime}ms)`);
          
          if (!accuracyAudit.passed && accuracyAudit.issues.length > 0) {
            const criticalIssues = accuracyAudit.issues.filter(i => i.severity === 'critical' || i.severity === 'error');
            if (criticalIssues.length > 0) {
              console.warn(`[VOICE TUTOR] ⚠️ ${criticalIssues.length} accuracy issues detected:`, criticalIssues.map(i => i.issue).join('; '));
            }
          }
        } catch (accuracyError) {
          console.error('[VOICE TUTOR] Accuracy audit error (non-blocking):', accuracyError);
        }
      }

      // 🎯 STEP 9.5: Generate proper SSML using dual output (for speaker button replay)
      console.log(`[VOICE TUTOR] 🔄 Generating proper SSML for voice response using dual output...`);

      const { generateDualOutput } = await import('./aiDualOutput');

      let chatMarkdown = fullResponse; // Default to streaming response
      let speakSSML = '';
      let speakMeta: any = {};
      let dualOutputSource = 'fallback';

      try {
        // Get recent context for dual output
        const contextMessages = await storage.getChatMessages(chatId, 5);

        // Map personaId to dual output persona (Garima → Priya for female voice)
        const dualOutputPersona = session.personaId === 'garima' ? 'Priya' :
          session.personaId === 'amit' ? 'Amit' : 'Priya';

        const dualOutput = await generateDualOutput({
          userQuery: transcribedText,
          contextMessages: contextMessages
            .filter(m => m.role !== 'assistant' || m.content !== fullResponse) // Exclude current response
            .map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            })),
          persona: dualOutputPersona,
          language: language as 'en' | 'hi' | 'hinglish',
          emotion: emotionResult.emotion,
          subject: session.subject || 'General'
        });

        chatMarkdown = dualOutput.chat_md || fullResponse; // 📝 Use rich markdown for display
        speakSSML = dualOutput.speak_ssml;
        speakMeta = dualOutput.speak_meta;
        dualOutputSource = dualOutput.metadata?.source || 'ai';

        console.log(`[VOICE TUTOR] ✅ Dual output generated - chat_md: ${chatMarkdown.substring(0, 50)}... | speak_ssml: ${speakSSML.substring(0, 50)}...`);
      } catch (error) {
        console.error('[VOICE TUTOR] ⚠️ Dual output failed, using fallback SSML:', error);

        // Fallback: Basic SSML wrapping
        const { sanitizeSSML } = await import('../utils/ssmlUtils');
        const plainText = fullResponse
          .replace(/[*_#`]/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .trim();
        speakSSML = sanitizeSSML(`<speak>${plainText}</speak>`);
        speakMeta = {
          persona: session.personaId as 'Priya' | 'Amit',
          language: language as 'hi' | 'en' | 'hinglish',
          emotion: emotionResult.emotion
        };
      }

      // 🔥 STEP 10: SAVE AI RESPONSE with comprehensive metadata + SSML
      await storage.addMessage({
        chatId,
        role: 'assistant',
        content: chatMarkdown, // 📝 Save rich markdown (chat_md) for display
        tool: null,
        metadata: {
          speakSSML,
          speakMeta,
          model: aiResult.model,
          cost: aiResult.cost,
          cached: aiResult.cached,
          personaId: session.personaId,
          emotion: emotionResult.emotion,
          phase: session.currentPhase,
          voiceOutput: true,
          streamingTTS: true,
          dualOutputSource,
          validation: {
            isValid: validation.isValid,
            overallScore: validation.overallScore,
            languageMatchScore: validation.layers.languageMatch.score,
            toneScore: validation.layers.toneAppropriate.score,
            qualityScore: validation.layers.educationalQuality.score,
            safetyScore: validation.layers.safety.score
          },
          accuracyAudit: accuracyAudit ? {
            passed: accuracyAudit.passed,
            severity: accuracyAudit.overallSeverity,
            calculationsVerified: accuracyAudit.calculationsVerified,
            unitsValidated: accuracyAudit.unitsValidated,
            formulasChecked: accuracyAudit.formulasChecked,
            issueCount: accuracyAudit.issues.length,
            issues: accuracyAudit.issues.slice(0, 5).map(i => ({
              type: i.type,
              severity: i.severity,
              issue: i.issue,
              autoFix: i.autoFix
            }))
          } : null,
          timings: {
            languageDetection: langDetectionTime,
            aiGeneration: aiGenerationTime,
            validation: validationTime,
            total: langDetectionTime + aiGenerationTime + validationTime
          }
        } as any
      });

      console.log(`[VOICE TUTOR] ✅ Complete pipeline finished for session ${ws.sessionId}`);

    } catch (error) {
      console.error('[VOICE TUTOR] Pipeline error:', error);

      const errorMsg = {
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        code: 'TUTOR_PIPELINE_ERROR',
        message: error instanceof Error ? error.message : 'AI Tutor pipeline failed',
        recoverable: true
      };

      ws.send(JSON.stringify(errorMsg));
    }
  }

  /**
   * Process text query through AI Tutor pipeline and stream response via WebSocket
   * PHASE 2: Unified WebSocket streaming for text chat
   */
  async processTextQuery(
    ws: VoiceWebSocketClient,
    queryText: string,
    chatId: string,
    language: 'hi' | 'en'
  ): Promise<void> {
    try {
      console.log(`[TEXT QUERY] Processing: "${queryText.substring(0, 50)}..." for chat ${chatId}`);

      if (!ws.userId) {
        throw new Error('User ID not found on WebSocket connection');
      }

      const userId = ws.userId;

      // Get chat and user
      const chat = await storage.getChat(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get or create tutor session
      const session = await tutorSessionService.getOrCreateSession(
        chatId,
        userId,
        chat.subject || 'General',
        chat.topic || 'General',
        user
      );

      // Language detection
      const langDetection = await languageDetector.detectLanguage(queryText, {
        conversationHistory: [],
        userPreference: session.profileSnapshot?.preferredLanguage as DetectedLanguage,
        topic: session.topic
      });
      const detectedLang = langDetection?.language || 'english';

      // Intent classification + Emotion detection (parallel)
      const [intentResult, emotionResult] = await Promise.all([
        intentClassifier.classify(queryText, {
          currentPhase: session.currentPhase,
          currentTopic: session.topic,
          isInPracticeMode: session.currentPhase === 'practice'
        }),
        emotionDetector.detectEmotion(queryText, [], language)
      ]);

      console.log(`[TEXT QUERY] Intent: ${intentResult.intent} | Emotion: ${emotionResult.emotion}`);

      // 🆕 CURRICULUM-ALIGNED TUTORING INTEGRATION (VOICE)
      // Map emotion to curriculum emotional state
      const voiceEmotionMap: Record<string, 'confident' | 'confused' | 'frustrated' | 'bored' | 'neutral'> = {
        'confident': 'confident',
        'curious': 'confident',
        'confused': 'confused',
        'frustrated': 'frustrated',
        'bored': 'bored',
        'neutral': 'neutral',
        'happy': 'confident',
        'sad': 'frustrated'
      };
      const voiceCurriculumEmotion = voiceEmotionMap[emotionResult.emotion] || 'neutral';

      // 1. Check for demotivation signals
      const voiceDemotivationCheck = tutorSessionService.checkDemotivation(session, queryText, 5000);

      if (voiceDemotivationCheck.needsIntervention) {
        console.log(`[TEXT QUERY CURRICULUM] Demotivation detected (level ${voiceDemotivationCheck.level})`);
      }

      // 2. Determine request type from intent
      const voiceRequestTypeMap: Record<string, 'doubt' | 'practice' | 'revision' | 'concept'> = {
        'ask_doubt': 'doubt',
        'request_hint': 'doubt',
        'request_practice': 'practice',
        'request_revision': 'revision',
        'ask_concept': 'concept',
        'submit_answer': 'practice'
      };
      const voiceRequestType = voiceRequestTypeMap[intentResult.intent] || 'concept';

      // 3. Decide teaching mode based on context
      const voiceTeachingDecision = tutorSessionService.decideTeachingMode(session, voiceCurriculumEmotion, voiceRequestType);
      console.log(`[TEXT QUERY CURRICULUM] Teaching mode: ${voiceTeachingDecision.mode} (${voiceTeachingDecision.toneModifier})`);

      // 4. Build enhanced prompt context
      const voiceDetectedLangForPrompt = detectedLang as 'english' | 'hindi' | 'hinglish';
      const voiceEnhancedContext = tutorSessionService.buildEnhancedPromptContext(session, voiceCurriculumEmotion, voiceDetectedLangForPrompt);

      if (voiceDemotivationCheck.needsIntervention && voiceDemotivationCheck.level) {
        voiceEnhancedContext.demotivationLevel = voiceDemotivationCheck.level;
      }

      // 5. Generate enhanced system prompt
      const voiceEnhancedPromptResult = enhancedPromptEngine.generateEnhancedSystemPrompt(voiceEnhancedContext);

      // Add persona and teaching approach context
      const voicePersonaContext = `
TEACHING APPROACH: ${voiceTeachingDecision.mode} (${voiceTeachingDecision.toneModifier})
${voiceDemotivationCheck.needsIntervention ? `STUDENT SUPPORT NEEDED: ${voiceDemotivationCheck.intervention}` : ''}
      `.trim();

      const systemPrompt = `${voiceEnhancedPromptResult.systemPrompt}\n\n${voicePersonaContext}`;
      console.log(`[TEXT QUERY PROMPT] Generated ${systemPrompt.length} chars | Teaching: ${voiceTeachingDecision.mode}`);

      // Save user message
      const userMessage = await storage.addMessage({
        chatId,
        role: 'user',
        content: queryText,
        tool: null,
        metadata: {
          intent: intentResult.intent,
          emotion: emotionResult.emotion,
          detectedLanguage: detectedLang,
          confidence: intentResult.confidence,
          source: 'text_websocket'
        } as any
      });

      // 🔧 FIX: Fetch conversation history AFTER saving user message
      const messages = await storage.getChatMessages(chatId);
      const conversationHistory = messages
        .slice(0, -1) // Exclude the last message (current user message)
        .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
        .join('\n\n');

      console.log(`[TEXT QUERY] 🔍 Context: ${messages.length} messages in history`);

      // Generate messageId for this response
      const messageId = `${ws.sessionId}-${Date.now()}`;

      // Stream AI response
      let fullResponse = '';
      let sentenceIndex = 0;
      let currentSentence = '';

      // 🔥 CRITICAL: Clear TTS in-flight map for new session to prevent stale duplicates
      if (!ws.ttsInFlightMap) {
        ws.ttsInFlightMap = new Map<string, Promise<void>>();
      } else {
        console.log(`[TEXT QUERY] 🧹 Clearing ${ws.ttsInFlightMap.size} stale TTS promises from previous session`);
        ws.ttsInFlightMap.clear();
      }

      await optimizedAI.generateStreamingResponse(
        queryText,
        systemPrompt,
        conversationHistory,
        async (chunk, metadata) => {
          if (metadata.type === 'chunk' && chunk) {
            fullResponse += chunk;
            currentSentence += chunk;

            // Split into sentences for TTS
            const sentenceBoundary = /[।.!?]\s+|[।.!?]$/;
            const parts = currentSentence.split(sentenceBoundary);

            // Process complete sentences
            if (parts.length > 1) {
              for (let i = 0; i < parts.length - 1; i++) {
                const sentence = parts[i].trim();
                if (sentence) {
                  // ⚡ ALWAYS send text chunk FIRST (for instant display)
                  const chunkMsg: VoiceMessage = {
                    type: 'AI_RESPONSE_CHUNK',
                    timestamp: new Date().toISOString(),
                    sessionId: ws.sessionId,
                    content: sentence + ' ',
                    messageId,
                    isFirst: sentenceIndex === 0,
                    chunkIndex: sentenceIndex // 🔢 Add sequence number for deduplication
                  };
                  ws.send(JSON.stringify(chunkMsg));

                  // 🎵 THEN generate TTS in parallel (don't block text streaming!)
                  const canGenerateTTS = avatarStateService.canGenerateTTS(ws.sessionId || '');
                  if (canGenerateTTS) {
                    // 🔥 REFACTOR: Send explicit TTS_START signal for the first sentence
                    if (sentenceIndex === 0) {
                      const startMsg: VoiceMessage = {
                        type: 'TTS_START',
                        timestamp: new Date().toISOString(),
                        sessionId: ws.sessionId,
                        messageId // Associate with this response
                      };
                      ws.send(JSON.stringify(startMsg));
                      ws.ttsSentCount = 0; // 🔢 Reset sequential TTS counter for new message
                      console.log(`[TEXT QUERY] 🚀 Sent TTS_START signal for message ${messageId}`);
                    }

                    // Fire-and-forget: TTS generation happens in background
                    // Note: generateAndStreamSentenceTTS returns immediately (line 673)
                    // The actual TTS work runs async in the ttsInFlightMap
                    this.generateAndStreamSentenceTTS(
                      ws,
                      sentence,
                      sentenceIndex,
                      false,
                      {
                        emotion: emotionResult.emotion,
                        intent: intentResult.intent,
                        personaId: session.personaId,
                        language,
                        enableMathSpeech: true,
                        enablePauses: true,
                        enableEmphasis: true,
                        enablePhonemes: true
                      },
                      ws.ttsInFlightMap  // 🔥 Pass SHARED in-flight Map (atomic dedup)
                    ).catch(err => {
                      console.error(`[TEXT QUERY] ❌ Background TTS failed for sentence ${sentenceIndex}:`, err);
                      // Don't throw - text is already sent, TTS is optional enhancement
                    });
                  }

                  sentenceIndex++;
                }
              }
              currentSentence = parts[parts.length - 1] || '';
            }
          }
        }
      );

      // Handle remaining text
      if (currentSentence.trim()) {
        // ⚡ ALWAYS send text chunk FIRST (for instant display)
        const chunkMsg: VoiceMessage = {
          type: 'AI_RESPONSE_CHUNK',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          content: currentSentence.trim(),
          messageId,
          isFirst: sentenceIndex === 0,
          chunkIndex: sentenceIndex // 🔢 Add sequence number for deduplication
        };
        ws.send(JSON.stringify(chunkMsg));

        // 🎵 THEN generate TTS in parallel (don't block text streaming!)
        const canGenerateTTS = avatarStateService.canGenerateTTS(ws.sessionId || '');
        if (canGenerateTTS) {
          // Fire-and-forget: TTS generation happens in background
          // Note: generateAndStreamSentenceTTS returns immediately (line 673)
          // The actual TTS work runs async in the ttsInFlightMap
          this.generateAndStreamSentenceTTS(
            ws,
            currentSentence.trim(),
            sentenceIndex,
            true,
            {
              emotion: emotionResult.emotion,
              intent: intentResult.intent,
              personaId: session.personaId,
              language,
              enableMathSpeech: true,
              enablePauses: true,
              enableEmphasis: true,
              enablePhonemes: true
            },
            ws.ttsInFlightMap  // 🔥 Pass SHARED in-flight Map (atomic dedup)
          ).catch(err => {
            console.error(`[TEXT QUERY] ❌ Background TTS failed for final sentence ${sentenceIndex}:`, err);
            // Don't throw - text is already sent, TTS is optional enhancement
          });
        }
      }

      // Send TTS_END if TTS was generated
      if (avatarStateService.canGenerateTTS(ws.sessionId || '')) {
        const endMsg: VoiceMessage = {
          type: 'TTS_END',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          totalChunks: ws.ttsSentCount || (sentenceIndex + 1)  // 🔢 Use actual sent count
        };
        ws.send(JSON.stringify(endMsg));
      }

      // 🎯 Generate proper SSML using dual output service (post-streaming)
      console.log(`[TEXT QUERY] 🔄 Generating proper SSML for final message using dual output...`);

      const { generateDualOutput } = await import('./aiDualOutput');

      let speakSSML = '';
      let speakMeta: any = {};
      let dualOutputSource = 'fallback';

      try {
        // Get recent context for dual output
        const contextMessages = await storage.getChatMessages(chatId, 5);

        // Map personaId to dual output persona (Garima → Priya for female voice)
        const dualOutputPersona = session.personaId === 'garima' ? 'Priya' :
          session.personaId === 'amit' ? 'Amit' : 'Priya';

        const dualOutput = await generateDualOutput({
          userQuery: queryText,
          contextMessages: contextMessages
            .filter(m => m.role !== 'assistant' || m.content !== fullResponse) // Exclude current response
            .map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            })),
          persona: dualOutputPersona,
          language: language as 'en' | 'hi' | 'hinglish',
          emotion: emotionResult.emotion
        });

        speakSSML = dualOutput.speak_ssml;
        speakMeta = dualOutput.speak_meta;
        dualOutputSource = dualOutput.metadata?.source || 'ai';

        console.log(`[TEXT QUERY] ✅ Dual output SSML generated: ${speakSSML.substring(0, 50)}...`);
      } catch (error) {
        console.error('[TEXT QUERY] ⚠️ Dual output failed, using fallback SSML:', error);

        // Fallback: Basic SSML wrapping
        const { sanitizeSSML } = await import('../utils/ssmlUtils');
        const plainText = fullResponse
          .replace(/[*_#`]/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .trim();
        speakSSML = sanitizeSSML(`<speak>${plainText}</speak>`);
        speakMeta = {
          persona: session.personaId as 'Priya' | 'Amit',
          language: language as 'hi' | 'en' | 'hinglish',
          emotion: emotionResult.emotion
        };
      }

      // 🔬 ACCURACY ASSURANCE - Verify math/science accuracy for text queries
      let textQueryAccuracyAudit: AccuracyAuditResult | null = null;
      const chatSubject = chat.subject?.toLowerCase() || '';
      if (['physics', 'chemistry', 'math', 'maths', 'biology'].includes(chatSubject)) {
        const startAccuracy = Date.now();
        try {
          textQueryAccuracyAudit = await accuracyAssuranceService.validateFinalResponse(
            fullResponse,
            chatSubject,
            chat.topic || undefined,
            user.examTarget || undefined
          );
          const accuracyTime = Date.now() - startAccuracy;
          console.log(`[TEXT QUERY] 🔬 Accuracy Audit: ${textQueryAccuracyAudit.passed ? 'PASSED' : 'ISSUES FOUND'} - Calcs: ${textQueryAccuracyAudit.calculationsVerified}, Units: ${textQueryAccuracyAudit.unitsValidated}, Formulas: ${textQueryAccuracyAudit.formulasChecked} (${accuracyTime}ms)`);
          
          if (!textQueryAccuracyAudit.passed && textQueryAccuracyAudit.issues.length > 0) {
            const criticalIssues = textQueryAccuracyAudit.issues.filter(i => i.severity === 'critical' || i.severity === 'error');
            if (criticalIssues.length > 0) {
              console.warn(`[TEXT QUERY] ⚠️ ${criticalIssues.length} accuracy issues detected:`, criticalIssues.map(i => i.issue).join('; '));
            }
          }
        } catch (accuracyError) {
          console.error('[TEXT QUERY] Accuracy audit error (non-blocking):', accuracyError);
        }
      }

      // Send completion message with chatId for frontend refetch
      const completeMsg: VoiceMessage = {
        type: 'AI_RESPONSE_COMPLETE',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        messageId,
        chatId,  // 🔥 CRITICAL: Include chatId for frontend to refetch messages
        emotion: emotionResult.emotion,
        personaId: session.personaId,
        phase: session.currentPhase as any,
        phaseStep: session.phaseStep || 0,
        language,
        accuracyAudit: textQueryAccuracyAudit ? {
          passed: textQueryAccuracyAudit.passed,
          calculationsVerified: textQueryAccuracyAudit.calculationsVerified,
          unitsValidated: textQueryAccuracyAudit.unitsValidated,
          formulasChecked: textQueryAccuracyAudit.formulasChecked,
          totalIssues: textQueryAccuracyAudit.issues.length
        } : undefined
      };
      ws.send(JSON.stringify(completeMsg));

      // Save AI response WITH proper SSML metadata
      await storage.addMessage({
        chatId,
        role: 'assistant',
        content: fullResponse,
        tool: null,
        metadata: {
          speakSSML,
          speakMeta,
          emotion: emotionResult.emotion,
          personaId: session.personaId,
          phase: session.currentPhase,
          source: `text_websocket_${dualOutputSource}`,
          avatarTTS: avatarStateService.canGenerateTTS(ws.sessionId || ''),
          accuracyAudit: textQueryAccuracyAudit ? {
            passed: textQueryAccuracyAudit.passed,
            calculationsVerified: textQueryAccuracyAudit.calculationsVerified,
            unitsValidated: textQueryAccuracyAudit.unitsValidated,
            formulasChecked: textQueryAccuracyAudit.formulasChecked,
            issueCount: textQueryAccuracyAudit.issues.length
          } : undefined
        } as any
      });

      console.log(`[TEXT QUERY] ✅ Complete: ${fullResponse.length} chars streamed`);

    } catch (error) {
      console.error('[TEXT QUERY] Error:', error);

      const errorMsg: VoiceMessage = {
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        code: 'TEXT_QUERY_ERROR',
        message: error instanceof Error ? error.message : 'Text query processing failed',
        recoverable: true
      };

      ws.send(JSON.stringify(errorMsg));
    }
  }
}

// Export singleton instance
export const voiceStreamService = new VoiceStreamService();
