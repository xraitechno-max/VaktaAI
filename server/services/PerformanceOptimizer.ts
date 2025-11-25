import type { DetectedLanguage, LanguageDetectionResult } from './LanguageDetectionEngine';
import type { ValidationResult } from './ResponseValidator';

console.log('[PERFORMANCE] ✅ Performance caching disabled (in-memory storage)');

// In-memory caches
const languageCache = new Map<string, { result: LanguageDetectionResult; timestamp: number }>();
const validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();
const CACHE_TTL = 3600 * 1000; // 1 hour in ms

/**
 * Performance Optimizer - Caching and optimization utilities
 */
export class PerformanceOptimizer {
  private readonly LANG_CACHE_PREFIX = 'vaktaai:lang_cache:';
  private readonly VAL_CACHE_PREFIX = 'vaktaai:val_cache:';

  /**
   * Cache language detection result
   */
  async cacheLanguageDetection(
    text: string,
    result: LanguageDetectionResult
  ): Promise<void> {
    const key = this.getLanguageCacheKey(text);
    languageCache.set(key, { result, timestamp: Date.now() });
    console.log('[PERF CACHE] ✅ Cached language detection');
  }

  /**
   * Get cached language detection result
   */
  async getCachedLanguageDetection(text: string): Promise<LanguageDetectionResult | null> {
    const key = this.getLanguageCacheKey(text);
    const cached = languageCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[PERF CACHE] ⚡ Language detection served from cache');
      return cached.result;
    }
    
    if (cached) {
      languageCache.delete(key);
    }
    
    return null;
  }

  /**
   * Cache validation result
   */
  async cacheValidation(
    response: string,
    context: string,
    result: ValidationResult
  ): Promise<void> {
    const key = this.getValidationCacheKey(response, context);
    validationCache.set(key, { result, timestamp: Date.now() });
    console.log('[PERF CACHE] ✅ Cached validation result');
  }

  /**
   * Get cached validation result
   */
  async getCachedValidation(
    response: string,
    context: string
  ): Promise<ValidationResult | null> {
    const key = this.getValidationCacheKey(response, context);
    const cached = validationCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[PERF CACHE] ⚡ Validation served from cache');
      return cached.result;
    }
    
    if (cached) {
      validationCache.delete(key);
    }
    
    return null;
  }

  /**
   * Batch language detection
   */
  async batchLanguageDetection(
    texts: string[]
  ): Promise<Map<string, LanguageDetectionResult | null>> {
    const results = new Map<string, LanguageDetectionResult | null>();
    
    for (const text of texts) {
      const cached = await this.getCachedLanguageDetection(text);
      results.set(text, cached);
    }
    
    const hitCount = Array.from(results.values()).filter(v => v !== null).length;
    if (hitCount > 0) {
      console.log(`[PERF CACHE] ⚡ Batch cache hits: ${hitCount}/${texts.length}`);
    }
    
    return results;
  }

  /**
   * Clear all performance caches
   */
  async clearCaches(): Promise<void> {
    languageCache.clear();
    validationCache.clear();
    console.log(`[PERF CACHE] Cleared all cache entries`);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    languageCache: { size: number };
    validationCache: { size: number };
    status: string;
  }> {
    return {
      languageCache: { size: languageCache.size },
      validationCache: { size: validationCache.size },
      status: 'connected'
    };
  }

  /**
   * Warmup cache with common queries
   */
  async warmupCache(commonQueries: Array<{ text: string; result: LanguageDetectionResult }>): Promise<void> {
    for (const query of commonQueries) {
      await this.cacheLanguageDetection(query.text, query.result);
    }
    console.log(`[PERF CACHE] Warmed up cache with ${commonQueries.length} entries`);
  }

  // Helper methods
  private getLanguageCacheKey(text: string): string {
    const textKey = text.substring(0, 100).replace(/\s+/g, '_');
    return `${this.LANG_CACHE_PREFIX}${this.hashString(textKey)}`;
  }

  private getValidationCacheKey(response: string, context: string): string {
    const combined = response.substring(0, 100) + '::' + context.substring(0, 50);
    return `${this.VAL_CACHE_PREFIX}${this.hashString(combined)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Metrics Tracker - Track system performance metrics
 */
export class MetricsTracker {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Record a metric value
   */
  record(metric: string, value: number): void {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    
    const values = this.metrics.get(metric)!;
    values.push(value);
    
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * Get metric statistics
   */
  getStats(metric: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(metric);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    const entries = Array.from(this.metrics.entries());
    for (const [metric, _] of entries) {
      result[metric] = this.getStats(metric);
    }
    
    return result;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    console.log('\n[PERFORMANCE METRICS SUMMARY]');
    console.log('='.repeat(50));
    
    const entries = Array.from(this.metrics.entries());
    for (const [metric, _] of entries) {
      const stats = this.getStats(metric);
      if (stats) {
        console.log(`\n${metric}:`);
        console.log(`  Count: ${stats.count}`);
        console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
        console.log(`  P50: ${stats.p50}ms | P95: ${stats.p95}ms | P99: ${stats.p99}ms`);
        console.log(`  Range: ${stats.min}ms - ${stats.max}ms`);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
}

export const performanceOptimizer = new PerformanceOptimizer();
export const metricsTracker = new MetricsTracker();
