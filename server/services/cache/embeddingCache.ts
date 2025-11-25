/**
 * In-Memory Cache for Embeddings
 * Caches embedding vectors to reduce API calls and improve performance
 */

import crypto from 'crypto';

// In-memory cache storage
interface CacheEntry {
  embedding: number[];
  expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry>();

// Configuration
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
const CACHE_PREFIX = 'embedding:';

/**
 * Generate cache key from text
 * Uses SHA-256 hash for consistent, secure keys
 */
function generateCacheKey(text: string, model: string = 'default'): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${model}:${text}`)
    .digest('hex');
  return `${CACHE_PREFIX}${hash}`;
}

/**
 * Get cached embedding
 *
 * @param text - Text to get embedding for
 * @param model - Model name (for cache separation)
 * @returns Cached embedding vector or null if not found
 */
export async function getCachedEmbedding(
  text: string,
  model: string = 'default'
): Promise<number[] | null> {
  const key = generateCacheKey(text, model);
  const memEntry = memoryCache.get(key);

  if (memEntry) {
    if (memEntry.expiresAt > Date.now()) {
      console.log(`[Embedding Cache] Memory HIT for text (${text.substring(0, 50)}...)`);
      return memEntry.embedding;
    } else {
      // Expired - remove it
      memoryCache.delete(key);
    }
  }

  return null;
}

/**
 * Cache an embedding vector
 *
 * @param text - Text that was embedded
 * @param embedding - The embedding vector
 * @param model - Model name
 * @param ttl - Time to live in seconds (default: 7 days)
 */
export async function cacheEmbedding(
  text: string,
  embedding: number[],
  model: string = 'default',
  ttl: number = CACHE_TTL
): Promise<void> {
  const key = generateCacheKey(text, model);
  const expiresAt = Date.now() + (ttl * 1000);
  memoryCache.set(key, { embedding, expiresAt });
  console.log(`[Embedding Cache] Memory cached for text (${text.substring(0, 50)}...)`);
  
  // Cleanup expired entries periodically (every 100 writes)
  if (memoryCache.size % 100 === 0) {
    cleanupExpiredMemoryCache();
  }
}

/**
 * Cleanup expired entries from memory cache
 */
function cleanupExpiredMemoryCache(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Embedding Cache] Cleaned ${cleaned} expired entries from memory`);
  }
}

/**
 * Get multiple cached embeddings
 *
 * @param texts - Array of texts to get embeddings for
 * @param model - Model name
 * @returns Map of text -> embedding (only for cache hits)
 */
export async function getCachedEmbeddingsBatch(
  texts: string[],
  model: string = 'default'
): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>();
  const now = Date.now();

  for (const text of texts) {
    const key = generateCacheKey(text, model);
    const memEntry = memoryCache.get(key);
    if (memEntry && memEntry.expiresAt > now) {
      results.set(text, memEntry.embedding);
    }
  }

  console.log(`[Embedding Cache] Memory batch: ${results.size}/${texts.length} hits`);
  return results;
}

/**
 * Cache multiple embeddings
 *
 * @param embeddings - Map of text -> embedding
 * @param model - Model name
 * @param ttl - Time to live in seconds
 */
export async function cacheEmbeddingsBatch(
  embeddings: Map<string, number[]>,
  model: string = 'default',
  ttl: number = CACHE_TTL
): Promise<void> {
  if (embeddings.size === 0) return;

  const expiresAt = Date.now() + (ttl * 1000);
  for (const [text, embedding] of embeddings.entries()) {
    const key = generateCacheKey(text, model);
    memoryCache.set(key, { embedding, expiresAt });
  }
  console.log(`[Embedding Cache] Memory cached ${embeddings.size} embeddings in batch`);
}

/**
 * Clear all embedding cache
 * WARNING: Use with caution in production
 */
export async function clearEmbeddingCache(): Promise<void> {
  const memSize = memoryCache.size;
  memoryCache.clear();
  console.log(`[Embedding Cache] Cleared ${memSize} memory entries`);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  totalKeys: number;
  memoryUsed: string;
  memoryKeys?: number;
}> {
  return {
    connected: true,
    totalKeys: memoryCache.size,
    memoryKeys: memoryCache.size,
    memoryUsed: `~${(memoryCache.size * 384 * 4 / 1024 / 1024).toFixed(2)}MB`, // Rough estimate: 384 dims * 4 bytes per float
  };
}

/**
 * Initialize cache (no-op for in-memory)
 */
export function initializeRedisCache() {
  console.log('[Embedding Cache] ✅ Using in-memory cache');
  return null;
}

// Initialize on module load
initializeRedisCache();
