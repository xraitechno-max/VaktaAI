import { embeddingService } from '../embeddingService';

console.log('[CACHE] ✅ Semantic caching disabled (in-memory storage)');

// In-memory cache
interface CacheEntry {
  query: string;
  embedding: number[];
  response: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_PREFIX = 'vaktaai:cache:';
const CACHE_TTL = 3600 * 1000; // 1 hour in ms
const MAX_CACHE_SIZE = 1000;

export class SemanticCache {
  private readonly SIMILARITY_THRESHOLD = 0.90;
  private readonly MAX_SCAN_ENTRIES = 200;
  private readonly CACHE_ENABLED = false; // Disabled for now
  
  async check(query: string): Promise<string | null> {
    if (!this.CACHE_ENABLED) {
      return null;
    }
    
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      
      const entries = Array.from(cache.values()).slice(0, this.MAX_SCAN_ENTRIES);
      
      if (entries.length === 0) {
        console.log('[CACHE] Empty cache');
        return null;
      }
      
      for (const entry of entries) {
        const similarity = this.dotProductSimilarity(queryEmbedding, entry.embedding);
        
        if (similarity > this.SIMILARITY_THRESHOLD) {
          console.log(`[CACHE HIT] ✅ Similarity: ${similarity.toFixed(3)}`);
          return entry.response;
        }
      }
      
      console.log(`[CACHE MISS] ❌ Checked ${entries.length} entries`);
      return null;
    } catch (error) {
      console.error('[CACHE] Error checking cache:', error);
      return null;
    }
  }
  
  async store(query: string, response: string) {
    if (!this.CACHE_ENABLED) {
      return;
    }
    
    try {
      // Enforce max cache size
      if (cache.size >= MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        if (firstKey) {
          cache.delete(firstKey);
        }
      }
      
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const cacheKey = `${CACHE_PREFIX}${Date.now()}:${Math.random().toString(36).substring(7)}`;
      
      cache.set(cacheKey, {
        query,
        embedding: queryEmbedding,
        response,
        timestamp: Date.now()
      });
      
      console.log(`[CACHE STORE] ✅ Cached query`);
    } catch (error) {
      console.error('[CACHE] Error storing in cache:', error);
    }
  }
  
  private dotProductSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }
    
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
  
  async clear() {
    cache.clear();
    console.log(`[CACHE] Cleared all cached queries`);
  }
  
  async getStats() {
    // Clean up expired entries
    const now = Date.now();
    let expired = 0;
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        expired++;
      }
    }
    
    return {
      size: cache.size,
      maxSize: MAX_CACHE_SIZE,
      ttl: CACHE_TTL / 1000,
      threshold: this.SIMILARITY_THRESHOLD,
      status: 'connected',
      expiredRemoved: expired
    };
  }
}

export const semanticCache = new SemanticCache();
