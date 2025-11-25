import { OpenAI } from 'openai';
import {
  getCachedEmbedding,
  cacheEmbedding,
  getCachedEmbeddingsBatch,
  cacheEmbeddingsBatch,
} from '../cache/embeddingCache.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
  cached?: boolean; // Indicates if result was from cache
}

/**
 * Generate embedding with caching
 * Checks cache first, only calls API if not found
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    // Try cache first
    const cachedEmbedding = await getCachedEmbedding(text, EMBEDDING_MODEL);

    if (cachedEmbedding) {
      return {
        embedding: cachedEmbedding,
        model: EMBEDDING_MODEL,
        usage: {
          prompt_tokens: 0, // Cached - no API call
          total_tokens: 0,
        },
        cached: true,
      };
    }

    // Cache miss - call OpenAI API
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    const embedding = response.data[0].embedding;

    // Cache the result asynchronously (don't await to not block response)
    cacheEmbedding(text, embedding, EMBEDDING_MODEL).catch((err) =>
      console.error('[Embedding] Failed to cache embedding:', err)
    );

    return {
      embedding,
      model: response.model,
      usage: response.usage,
      cached: false,
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate multiple embeddings with batch caching
 * Checks cache for each text, only calls API for cache misses
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  try {
    // Try to get cached embeddings for all texts
    const cachedMap = await getCachedEmbeddingsBatch(texts, EMBEDDING_MODEL);

    // Separate cached and uncached texts
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    texts.forEach((text, index) => {
      if (!cachedMap.has(text)) {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });

    console.log(`[Embedding] Batch: ${cachedMap.size} cached, ${uncachedTexts.length} need API call`);

    // If all are cached, return immediately
    if (uncachedTexts.length === 0) {
      return texts.map((text) => ({
        embedding: cachedMap.get(text)!,
        model: EMBEDDING_MODEL,
        usage: {
          prompt_tokens: 0,
          total_tokens: 0,
        },
        cached: true,
      }));
    }

    // Call API only for uncached texts
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: uncachedTexts,
    });

    // Build results map with new embeddings
    const newEmbeddingsMap = new Map<string, number[]>();
    uncachedTexts.forEach((text, idx) => {
      newEmbeddingsMap.set(text, response.data[idx].embedding);
    });

    // Cache new embeddings asynchronously
    cacheEmbeddingsBatch(newEmbeddingsMap, EMBEDDING_MODEL).catch((err) =>
      console.error('[Embedding] Failed to cache batch embeddings:', err)
    );

    // Build final results array in original order
    return texts.map((text) => {
      const cached = cachedMap.has(text);
      const embedding = cached ? cachedMap.get(text)! : newEmbeddingsMap.get(text)!;

      return {
        embedding,
        model: response.model,
        usage: cached
          ? { prompt_tokens: 0, total_tokens: 0 }
          : response.usage, // Approximate - shared across batch
        cached,
      };
    });
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}
