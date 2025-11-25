import crypto from 'crypto';

console.log('[TTS CACHE] ✅ Using in-memory cache (REDIS_DISABLED=true)');

// In-memory fallback cache
interface CacheEntry {
  audio: Buffer;
  timestamp: number;
  hits: number;
}

const memoryCache = new Map<string, CacheEntry>();
const MAX_MEMORY_CACHE_SIZE = 100;
const MEMORY_CACHE_TTL = 3600 * 1000; // 1 hour in ms

/**
 * TTS Cache Service - Caches TTS audio to reduce generation cost
 */
export class TTSCacheService {
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds
  private readonly REDIS_PREFIX = 'tts:audio:';
  
  // Common educational phrases that should be cached
  private readonly COMMON_PHRASES = [
    'Let me explain',
    'For example',
    'Do you understand',
    'Let\'s try',
    'Very good',
    'That\'s correct',
    'Not quite',
    'Try again',
    'चलिए समझते हैं',
    'उदाहरण के लिए',
    'समझ आया',
    'बहुत अच्छे',
  ];

  /**
   * Generate cache key from TTS parameters
   */
  private generateKey(
    text: string, 
    language: 'hi' | 'en',
    emotion?: string,
    voice?: string
  ): string {
    const normalized = text.toLowerCase().trim();
    const textKey = normalized.length > 100 
      ? crypto.createHash('md5').update(normalized).digest('hex')
      : normalized;
    
    return `${this.REDIS_PREFIX}${textKey}:${language}:${emotion || 'neutral'}:${voice || 'default'}`;
  }

  /**
   * Generate unified cache key for SSML
   */
  private generateSSMLKey(
    ssml: string,
    options: {
      voiceId: string;
      engine: string;
      language: 'hi' | 'en' | 'hinglish';
      persona: string;
    }
  ): string {
    const ssmlHash = crypto.createHash('md5').update(ssml.trim()).digest('hex');
    return `tts:v2:${options.voiceId}:${options.engine}:${options.language}:${options.persona}:${ssmlHash}`;
  }

  /**
   * Get unified cache (audio + phonemes) for SSML
   */
  async getUnified(
    ssml: string,
    options: {
      voiceId: string;
      engine: string;
      language: 'hi' | 'en' | 'hinglish';
      persona: string;
    }
  ): Promise<{ audio: Buffer; phonemes: Array<{time: number; blendshape: string; weight: number}> } | null> {
    const baseKey = this.generateSSMLKey(ssml, options);
    const audioKey = `${baseKey}:audio`;
    
    const cached = memoryCache.get(audioKey);
    if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL) {
      console.log(`[TTS CACHE V2] ✅ Memory HIT: ${ssml.substring(0, 50)}...`);
      return null; // Simplified - would need separate phonemes storage
    }
    
    return null;
  }

  /**
   * Set unified cache (audio + phonemes) for SSML
   */
  async setUnified(
    ssml: string,
    options: {
      voiceId: string;
      engine: string;
      language: 'hi' | 'en' | 'hinglish';
      persona: string;
    },
    data: {
      audio: Buffer;
      phonemes: Array<{time: number; blendshape: string; weight: number}>;
    },
    ttl?: number
  ): Promise<void> {
    const baseKey = this.generateSSMLKey(ssml, options);
    const audioKey = `${baseKey}:audio`;
    
    // Store in memory cache
    if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }
    
    memoryCache.set(audioKey, {
      audio: data.audio,
      timestamp: Date.now(),
      hits: 0
    });
    
    console.log(`[TTS CACHE V2] 💾 Memory STORED: ${ssml.substring(0, 50)}...`);
  }

  /**
   * Get cached audio if available
   */
  async get(
    text: string,
    language: 'hi' | 'en',
    emotion?: string,
    voice?: string
  ): Promise<Buffer | null> {
    const key = this.generateKey(text, language, emotion, voice);
    
    const memEntry = memoryCache.get(key);
    if (memEntry && Date.now() - memEntry.timestamp < MEMORY_CACHE_TTL) {
      memEntry.hits++;
      console.log(`[TTS CACHE] ✅ Memory HIT: "${text.substring(0, 30)}..." (${memEntry.hits} hits)`);
      return memEntry.audio;
    }
    
    // Clean up expired entry
    if (memEntry) {
      memoryCache.delete(key);
    }
    
    console.log(`[TTS CACHE] ❌ MISS: "${text.substring(0, 30)}..."`);
    return null;
  }

  /**
   * Store audio in cache
   */
  async set(
    text: string,
    language: 'hi' | 'en',
    audio: Buffer,
    emotion?: string,
    voice?: string,
    ttl?: number
  ): Promise<void> {
    const key = this.generateKey(text, language, emotion, voice);
    
    // Implement LRU: if cache is full, remove oldest entry
    if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }
    
    memoryCache.set(key, {
      audio,
      timestamp: Date.now(),
      hits: 0
    });
    
    console.log(`[TTS CACHE] 💾 Memory STORED: "${text.substring(0, 30)}..." (${memoryCache.size}/${MAX_MEMORY_CACHE_SIZE})`);
  }

  /**
   * Check if text is a common phrase that should be pre-cached
   */
  isCommonPhrase(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return this.COMMON_PHRASES.some(phrase => 
      normalized.includes(phrase.toLowerCase())
    );
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    redisEnabled: boolean;
    memoryCacheSize: number;
    memoryCacheMax: number;
  }> {
    return {
      redisEnabled: false,
      memoryCacheSize: memoryCache.size,
      memoryCacheMax: MAX_MEMORY_CACHE_SIZE,
    };
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    memoryCache.clear();
    console.log('[TTS CACHE] ✨ Cache cleared');
  }

  /**
   * Pre-cache common educational phrases
   */
  async warmup(
    generateTTS: (text: string, language: 'hi' | 'en') => Promise<Buffer>
  ): Promise<void> {
    console.log('[TTS CACHE] 🔥 Warming up cache with common phrases...');
    
    const warmupPromises = this.COMMON_PHRASES.map(async (phrase) => {
      try {
        const language: 'hi' | 'en' = /[\u0900-\u097F]/.test(phrase) ? 'hi' : 'en';
        const cached = await this.get(phrase, language);
        
        if (!cached) {
          const audio = await generateTTS(phrase, language);
          await this.set(phrase, language, audio, undefined, undefined, 7200);
          console.log(`[TTS CACHE] 🔥 Warmed: "${phrase}"`);
        }
      } catch (error) {
        console.error(`[TTS CACHE] Warmup failed for "${phrase}":`, error);
      }
    });
    
    await Promise.allSettled(warmupPromises);
    console.log('[TTS CACHE] ✅ Warmup complete');
  }
}

export const ttsCacheService = new TTSCacheService();
