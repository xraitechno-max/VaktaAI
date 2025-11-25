import OpenAI from 'openai';
import { generateEmbedding } from '../embedding/embeddingService';
import { db } from '../../db';
import { chunks } from '../../db/schema';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Please add it to your secrets.');
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

interface ChunkParams {
  text: string;
  documentId: string;
  metadata?: Record<string, any>;
  language?: 'hi' | 'en' | 'mixed';
}

interface Chunk {
  content: string;
  startIndex: number;
  endIndex: number;
  metadata: Record<string, any>;
}

export class SemanticChunkingService {
  private bufferSize = 1; // Look ahead/behind sentences
  private breakpointThreshold = 0.75; // Cosine similarity threshold
  private minChunkSize = 200; // Minimum characters per chunk
  private maxChunkSize = 800; // Maximum characters per chunk
  private overlapSize = 100; // Overlap between chunks

  /**
   * Main semantic chunking method
   */
  async chunkText(params: ChunkParams): Promise<Chunk[]> {
    const { text, documentId, metadata = {}, language = 'en' } = params;

    console.log(`[SemanticChunk] Starting chunking for doc ${documentId}`);

    // Step 1: Split into sentences
    const sentences = this.splitIntoSentences(text, language);
    
    if (sentences.length < 3) {
      // Too few sentences, return as single chunk
      return [{
        content: text,
        startIndex: 0,
        endIndex: text.length,
        metadata: { ...metadata, chunkIndex: 0 }
      }];
    }

    // Step 2: Generate embeddings for each sentence
    const embeddings = await this.generateSentenceEmbeddings(sentences);

    // Step 3: Calculate semantic similarity between adjacent sentences
    const similarities = this.calculateSimilarities(embeddings);

    // Step 4: Identify breakpoints (where similarity drops)
    const breakpoints = this.findBreakpoints(similarities);

    // Step 5: Create chunks based on breakpoints
    const semanticChunks = this.createChunksFromBreakpoints(
      sentences,
      breakpoints,
      text
    );

    // Step 6: Add overlap between chunks
    const chunksWithOverlap = this.addOverlap(semanticChunks, text);

    console.log(`[SemanticChunk] Created ${chunksWithOverlap.length} chunks`);

    return chunksWithOverlap.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...metadata,
        chunkIndex: index,
        totalChunks: chunksWithOverlap.length
      }
    }));
  }

  /**
   * Split text into sentences (Hindi/English aware)
   */
  private splitIntoSentences(text: string, language: string): string[] {
    // Basic sentence splitting
    let sentences: string[] = [];

    if (language === 'hi' || language === 'mixed') {
      // Hindi also uses । (purna viram) for sentence end
      sentences = text.split(/[।.!?]+/).filter(s => s.trim().length > 0);
    } else {
      sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    }

    // Clean sentences
    return sentences.map(s => s.trim());
  }

  /**
   * Generate embeddings for sentences
   */
  private async generateSentenceEmbeddings(sentences: string[]): Promise<number[][]> {
    try {
      // Use OpenAI for faster batch processing
      const response = await getOpenAI().embeddings.create({
        model: 'text-embedding-3-small',
        input: sentences
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('[SemanticChunk] OpenAI embeddings failed, using local:', error);
      
      // Fallback to local embeddings
      const embeddings: number[][] = [];
      for (const sentence of sentences) {
        const result = await generateEmbedding(sentence);
        embeddings.push(result.embedding);
      }
      return embeddings;
    }
  }

  /**
   * Calculate cosine similarity between adjacent sentences
   */
  private calculateSimilarities(embeddings: number[][]): number[] {
    const similarities: number[] = [];

    for (let i = 0; i < embeddings.length - 1; i++) {
      const sim = this.cosineSimilarity(embeddings[i], embeddings[i + 1]);
      similarities.push(sim);
    }

    return similarities;
  }

  /**
   * Cosine similarity calculation
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
  }

  /**
   * Find breakpoints where similarity drops below threshold
   */
  private findBreakpoints(similarities: number[]): number[] {
    const breakpoints: number[] = [0]; // Start with beginning

    for (let i = 0; i < similarities.length; i++) {
      if (similarities[i] < this.breakpointThreshold) {
        breakpoints.push(i + 1);
      }
    }

    breakpoints.push(similarities.length + 1); // End
    return breakpoints;
  }

  /**
   * Create chunks from identified breakpoints
   */
  private createChunksFromBreakpoints(
    sentences: string[],
    breakpoints: number[],
    originalText: string
  ): Chunk[] {
    const chunks: Chunk[] = [];

    for (let i = 0; i < breakpoints.length - 1; i++) {
      const start = breakpoints[i];
      const end = breakpoints[i + 1];

      const chunkSentences = sentences.slice(start, end);
      const content = chunkSentences.join(' ');

      // Check size constraints
      if (content.length < this.minChunkSize && i < breakpoints.length - 2) {
        // Merge with next chunk if too small
        continue;
      }

      if (content.length > this.maxChunkSize) {
        // Split further by character limit
        const subChunks = this.splitBySize(content);
        chunks.push(...subChunks);
      } else {
        const startIndex = originalText.indexOf(chunkSentences[0]);
        const endIndex = startIndex + content.length;

        chunks.push({
          content,
          startIndex,
          endIndex,
          metadata: {}
        });
      }
    }

    return chunks;
  }

  /**
   * Split large chunks by size
   */
  private splitBySize(text: string): Chunk[] {
    const chunks: Chunk[] = [];
    let currentPos = 0;

    while (currentPos < text.length) {
      const end = Math.min(currentPos + this.maxChunkSize, text.length);
      const chunk = text.substring(currentPos, end);

      chunks.push({
        content: chunk,
        startIndex: currentPos,
        endIndex: end,
        metadata: { splitBySize: true }
      });

      currentPos += this.maxChunkSize - this.overlapSize;
    }

    return chunks;
  }

  /**
   * Add overlap between chunks
   */
  private addOverlap(chunks: Chunk[], originalText: string): Chunk[] {
    const overlappedChunks: Chunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Add previous context
      const prevStart = Math.max(0, chunk.startIndex - this.overlapSize);
      const prevContext = originalText.substring(prevStart, chunk.startIndex);

      // Add next context
      const nextEnd = Math.min(originalText.length, chunk.endIndex + this.overlapSize);
      const nextContext = originalText.substring(chunk.endIndex, nextEnd);

      overlappedChunks.push({
        content: prevContext + chunk.content + nextContext,
        startIndex: prevStart,
        endIndex: nextEnd,
        metadata: {
          ...chunk.metadata,
          hasOverlap: true,
          overlapSize: this.overlapSize
        }
      });
    }

    return overlappedChunks;
  }

  /**
   * Store chunks in database
   */
  async storeChunks(
    documentId: string,
    chunks: Chunk[],
    embeddings: number[][]
  ): Promise<void> {
    const chunkRecords = chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      documentId,
      content: chunk.content,
      position: index,
      embedding: JSON.stringify(embeddings[index]), // Will be converted to vector
      metadata: chunk.metadata,
      createdAt: new Date()
    }));

    // Batch insert
    await db.insert(chunks).values(chunkRecords);

    console.log(`[SemanticChunk] Stored ${chunks.length} chunks for doc ${documentId}`);
  }

  /**
   * Chunk with custom parameters
   */
  async chunkWithCustomParams(params: ChunkParams & {
    minChunkSize?: number;
    maxChunkSize?: number;
    overlapSize?: number;
    breakpointThreshold?: number;
  }): Promise<Chunk[]> {
    // Temporarily override parameters
    const originalMinSize = this.minChunkSize;
    const originalMaxSize = this.maxChunkSize;
    const originalOverlap = this.overlapSize;
    const originalThreshold = this.breakpointThreshold;

    this.minChunkSize = params.minChunkSize || this.minChunkSize;
    this.maxChunkSize = params.maxChunkSize || this.maxChunkSize;
    this.overlapSize = params.overlapSize || this.overlapSize;
    this.breakpointThreshold = params.breakpointThreshold || this.breakpointThreshold;

    try {
      const result = await this.chunkText(params);
      return result;
    } finally {
      // Restore original parameters
      this.minChunkSize = originalMinSize;
      this.maxChunkSize = originalMaxSize;
      this.overlapSize = originalOverlap;
      this.breakpointThreshold = originalThreshold;
    }
  }

  /**
   * Get chunking statistics
   */
  getChunkingStats(): {
    minChunkSize: number;
    maxChunkSize: number;
    overlapSize: number;
    breakpointThreshold: number;
    supportedLanguages: string[];
  } {
    return {
      minChunkSize: this.minChunkSize,
      maxChunkSize: this.maxChunkSize,
      overlapSize: this.overlapSize,
      breakpointThreshold: this.breakpointThreshold,
      supportedLanguages: ['Hindi', 'English', 'Mixed']
    };
  }
}

export const semanticChunkingService = new SemanticChunkingService();


