import { AzureTTS } from './azure-tts';
import { SarvamTTS } from './sarvam-tts';
import { GoogleTTS } from './google-tts';
import { PollyTTS } from './polly-tts';
import { TTSProvider, TTSOptions, TTSResult, TTSContext } from './types';
import crypto from 'crypto';

/**
 * 🎯 Smart TTS Router - Multi-Provider System
 *
 * Routing Strategy:
 * - 'avatar': Azure (48kHz Indian voices) → Sarvam → Google → Polly
 * - 'quick': Google Neural2 → Azure → Sarvam → Polly (FAST + good quality)
 * - 'practice': Polly → Sarvam → Google → Azure (CHEAPEST for exercises)
 * - 'notification': Polly only (SHORT messages)
 *
 * Features:
 * - Azure TTS PRIMARY with Indian female voices (en-IN-NeerjaNeural, hi-IN-AartiNeural)
 * - Automatic fallback on provider failure
 * - In-memory caching (reduces API calls by ~70%)
 * - Phoneme/viseme support via Polly
 * - Cost optimization
 */
export class TTSRouter {
  private providers: Map<string, TTSProvider> = new Map();
  private cache: Map<string, { result: TTSResult; timestamp: number }> = new Map();
  private cacheEnabled: boolean;
  private cacheTTL: number; // seconds

  // Provider availability (cached to avoid repeated health checks)
  private providerHealth: Map<string, { available: boolean; lastCheck: number }> = new Map();
  private healthCheckInterval = 300000; // 5 minutes

  constructor() {
    // Initialize providers (Azure first for best quality Indian voices)
    this.providers.set('azure', new AzureTTS());
    this.providers.set('sarvam', new SarvamTTS());
    this.providers.set('google', new GoogleTTS());
    this.providers.set('polly', new PollyTTS());

    // Cache configuration
    this.cacheEnabled = process.env.TTS_CACHE_ENABLED !== 'false';
    this.cacheTTL = parseInt(process.env.TTS_CACHE_TTL_SECONDS || '2592000', 10); // 30 days default

    console.log('[TTS Router] Initialized with providers:', Array.from(this.providers.keys()));
    console.log('[TTS Router] Cache:', this.cacheEnabled ? `enabled (TTL: ${this.cacheTTL}s)` : 'disabled');

    // Initialize provider health checks
    this.checkAllProvidersHealth();
  }

  /**
   * 🎯 Main TTS synthesis method with smart routing
   */
  async synthesize(
    text: string,
    options: TTSOptions = {},
    context: TTSContext = 'avatar'
  ): Promise<TTSResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(text, options, context);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('[TTS Router] 💾 Cache hit!', { context, textLength: text.length });
      return cached;
    }

    // Get provider priority based on context
    const providerPriority = this.getProviderPriority(context);

    console.log('[TTS Router] 🎯 Routing request:', {
      context,
      textLength: text.length,
      priority: providerPriority,
    });

    // Try providers in order
    let lastError: Error | null = null;

    for (const providerName of providerPriority) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      // Check provider health (with cache)
      const isHealthy = await this.isProviderHealthy(providerName);
      if (!isHealthy) {
        console.log(`[TTS Router] ⏭️  Skipping ${providerName} (unhealthy)`);
        if (providerName === 'azure') {
          console.warn('[TTS Router] ⚠️ Azure TTS is marked as unhealthy. Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION env vars.');
        }
        continue;
      }

      try {
        console.log(`[TTS Router] 🔄 Trying ${providerName}...`);

        // 🎯 SSML Fallback Handling
        // Azure supports SSML, but Sarvam/Google/Polly don't
        // Strip SSML tags for ALL non-Azure providers (regardless of Azure attempt status)
        let synthesisText = text;
        let synthesisOptions = { ...options };
        let isSSMLFallback = false;

        if (options.isSSML && providerName !== 'azure') {
          // Strip SSML tags for non-Azure providers
          console.log(`[TTS Router] 📝 Stripping SSML tags for ${providerName} (non-SSML provider)...`);
          synthesisText = text
            .replace(/<[^>]*>/g, '') // Remove all XML tags
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .trim();
          synthesisOptions.isSSML = false; // Mark as plain text
          isSSMLFallback = true; // Flag for cache skipping
          console.log(`[TTS Router] ✂️  Stripped text length: ${synthesisText.length}`);
        }

        const audioBuffer = await provider.synthesize(synthesisText, synthesisOptions);

        const result: TTSResult = {
          audioBuffer,
          format: 'mp3',
          provider: providerName as any,
          cached: false,
        };

        // 🎯 CRITICAL: Don't cache SSML fallback audio (degraded quality)
        // This ensures Azure is retried once healthy, preserving prosody
        if (!isSSMLFallback) {
          this.storeInCache(cacheKey, result);
        } else {
          console.log(`[TTS Router] ⚠️  Skipping cache for SSML fallback (degraded audio)`);
        }

        console.log(`[TTS Router] ✅ Success with ${providerName}`);

        return result;

      } catch (error) {
        console.warn(`[TTS Router] ⚠️  ${providerName} failed:`, error);
        lastError = error as Error;

        // Mark provider as potentially unhealthy
        this.providerHealth.set(providerName, {
          available: false,
          lastCheck: Date.now()
        });
      }
    }

    // All providers failed
    throw new Error(`All TTS providers failed. Last error: ${lastError?.message || 'Unknown'}`);
  }

  /**
   * 🎯 UNIQUE: Synthesize with phonemes/visemes for lip-sync
   * Only available via Polly (fallback to audio-only if Polly unavailable)
   */
  async synthesizeWithPhonemes(
    text: string,
    options: TTSOptions = {},
    context: TTSContext = 'avatar'
  ): Promise<TTSResult> {
    console.log('[TTS Router] 🎤 Synthesize with phonemes requested');

    // 🎯 Azure First Strategy for Phonemes
    // Azure now supports visemes for many neural voices including Indian ones
    const azure = this.providers.get('azure') as AzureTTS;
    const isAzureHealthy = await this.isProviderHealthy('azure');

    if (azure && isAzureHealthy) {
      try {
        console.log('[TTS Router] 🔄 Using Azure for phonemes (Primary)...');
        // Call dedicated method for visemes
        const { audio, visemes } = await azure.synthesizeWithVisemes(text, options);

        // If we got phonemes/visemes, great!
        if (visemes && visemes.length > 0) {
          const result: TTSResult = {
            audioBuffer: audio,
            format: 'mp3',
            provider: 'azure',
            cached: false,
            visemes: visemes, // Return raw Azure visemes
          };
          console.log('[TTS Router] ✅ Success with Azure + visemes:', { count: visemes.length });
          return result;
        } else {
          console.log('[TTS Router] ⚠️ Azure returned audio but NO visemes. Falling back to Polly for lip-sync...');
        }
      } catch (error) {
        console.warn('[TTS Router] ⚠️ Azure with visemes failed:', error);
      }
    }

    // Try Polly as fallback (reliable viseme support)
    const polly = this.providers.get('polly') as PollyTTS;
    const isPollyHealthy = await this.isProviderHealthy('polly');

    if (polly && isPollyHealthy) {
      try {
        console.log('[TTS Router] 🔄 Using Polly for phonemes (Fallback)...');

        const { audio, visemes, words } = await polly.synthesizeWithVisemes(text, options);

        const result: TTSResult = {
          audioBuffer: audio,
          format: 'mp3',
          provider: 'polly',
          cached: false,
          phonemes: visemes, // Polly visemes mapped to Unity phonemes
          wordBoundaries: words, // 🎯 WORD BOUNDARIES for stronger word-level sync
        };

        console.log('[TTS Router] ✅ Success with Polly + visemes + word boundaries:', {
          visemes: visemes.length,
          words: words.length
        });

        return result;

      } catch (error) {
        console.warn('[TTS Router] ⚠️  Polly with visemes failed:', error);
      }
    }

    // Fallback: Use regular synthesis (without phonemes)
    console.log('[TTS Router] 📢 Falling back to audio-only (no phonemes)');
    return this.synthesize(text, options, context);
  }

  /**
   * Get provider priority based on context
   */
  private getProviderPriority(context: TTSContext): string[] {
    const priorities: Record<TTSContext, string[]> = {
      // Best quality for main avatar (Azure has premium Indian voices)
      'avatar': ['azure', 'sarvam', 'google', 'polly'],

      // Fast + good quality for quick responses
      'quick': ['google', 'azure', 'sarvam', 'polly'],

      // Cheapest for practice exercises
      'practice': ['polly', 'sarvam', 'google', 'azure'],

      // Polly only for short notifications (fast + cheap)
      'notification': ['polly'],
    };

    return priorities[context] || priorities['avatar'];
  }

  /**
   * Check provider health (with caching to avoid repeated checks)
   */
  private async isProviderHealthy(providerName: string): Promise<boolean> {
    const cached = this.providerHealth.get(providerName);
    const now = Date.now();

    // Use cached health status if recent
    if (cached && (now - cached.lastCheck) < this.healthCheckInterval) {
      return cached.available;
    }

    // Perform fresh health check
    const provider = this.providers.get(providerName);
    if (!provider) return false;

    try {
      const available = await provider.isAvailable();

      this.providerHealth.set(providerName, {
        available,
        lastCheck: now,
      });

      return available;

    } catch (error) {
      console.error(`[TTS Router] Health check failed for ${providerName}:`, error);

      this.providerHealth.set(providerName, {
        available: false,
        lastCheck: now,
      });

      return false;
    }
  }

  /**
   * Check all providers health on startup
   */
  private async checkAllProvidersHealth(): Promise<void> {
    console.log('[TTS Router] 🏥 Running initial health checks...');

    const checks = Array.from(this.providers.keys()).map(async (name) => {
      const healthy = await this.isProviderHealthy(name);
      console.log(`[TTS Router] ${name}: ${healthy ? '✅ healthy' : '❌ unavailable'}`);
    });

    await Promise.all(checks);
  }

  /**
   * Get current provider health status (for monitoring endpoint)
   */
  async getProviderStatus(): Promise<Record<string, { available: boolean; lastCheck: Date }>> {
    const status: Record<string, { available: boolean; lastCheck: Date }> = {};

    for (const [name, health] of this.providerHealth.entries()) {
      status[name] = {
        available: health.available,
        lastCheck: new Date(health.lastCheck),
      };
    }

    // Refresh stale data
    for (const name of this.providers.keys()) {
      if (!this.providerHealth.has(name)) {
        await this.isProviderHealthy(name);
        const health = this.providerHealth.get(name)!;
        status[name] = {
          available: health.available,
          lastCheck: new Date(health.lastCheck),
        };
      }
    }

    return status;
  }

  /**
   * Cache key generation (text + options + context)
   */
  private getCacheKey(text: string, options: TTSOptions, context: TTSContext): string {
    const data = JSON.stringify({ text, options, context });
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Get from cache (if enabled and not expired)
   */
  private getFromCache(key: string): TTSResult | null {
    if (!this.cacheEnabled) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const age = (now - cached.timestamp) / 1000; // seconds

    // Check if expired
    if (age > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    // Return cached result (mark as cached)
    return { ...cached.result, cached: true };
  }

  /**
   * Store in cache
   */
  private storeInCache(key: string, result: TTSResult): void {
    if (!this.cacheEnabled) return;

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });

    console.log(`[TTS Router] 💾 Cached (total: ${this.cache.size})`);
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[TTS Router] 🗑️  Cache cleared (${size} entries removed)`);
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; enabled: boolean; ttl: number } {
    return {
      size: this.cache.size,
      enabled: this.cacheEnabled,
      ttl: this.cacheTTL,
    };
  }
}

// Singleton instance
export const ttsRouter = new TTSRouter();
