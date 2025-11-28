import { db } from '../../db.js';
import { sql, and, eq, gte, inArray } from 'drizzle-orm';
import { generateEmbedding } from '../embedding/embeddingService.js';
import {
  ncertCurriculumChunks,
  type NCERTCurriculumChunk,
  type ClassLevel,
  type SubjectCode,
  type ChunkType,
  type CurriculumContext,
} from '@shared/schema';

const SIMILARITY_THRESHOLD = 0.78;
const FALLBACK_THRESHOLD = 0.73;
const MAX_RESULTS = 10;
const RERANK_BY_EXAM_WEIGHTAGE = true;

export interface SearchFilters {
  classLevel?: ClassLevel;
  subject?: SubjectCode;
  chapterNumber?: string;
  chunkType?: ChunkType[];
  minExamWeightage?: number;
}

export interface RetrievedChunk {
  chunk: NCERTCurriculumChunk;
  similarity: number;
  citation: string;
}

export class NCERTRetriever {
  async search(query: string, filters: SearchFilters = {}): Promise<RetrievedChunk[]> {
    try {
      const embeddingResult = await generateEmbedding(query);
      const queryEmbedding = embeddingResult.embedding;

      let results = await this.queryWithThreshold(
        queryEmbedding,
        filters,
        SIMILARITY_THRESHOLD
      );

      if (results.length === 0) {
        console.log('[NCERTRetriever] No results above primary threshold, trying fallback');
        results = await this.queryWithThreshold(
          queryEmbedding,
          filters,
          FALLBACK_THRESHOLD
        );
      }

      if (RERANK_BY_EXAM_WEIGHTAGE && results.length > 1) {
        results = this.rerankByExamWeightage(results);
      }

      return results.slice(0, MAX_RESULTS);
    } catch (error) {
      console.error('[NCERTRetriever] Search error:', error);
      throw error;
    }
  }

  async searchWithContext(
    query: string,
    context: CurriculumContext
  ): Promise<RetrievedChunk[]> {
    const filters: SearchFilters = {
      classLevel: context.classLevel,
      subject: context.subject,
    };

    const mainResults = await this.search(query, filters);

    if (context.prerequisites && context.prerequisites.length > 0) {
      const prerequisiteTopics = context.prerequisites
        .filter(p => p.masteryStatus !== 'solid')
        .map(p => p.topic);

      if (prerequisiteTopics.length > 0) {
        const prereqQuery = `Prerequisites for ${context.topic}: ${prerequisiteTopics.join(', ')}`;
        
        try {
          const prereqResults = await this.search(prereqQuery, {
            classLevel: context.classLevel,
            subject: context.subject,
          });

          const mainIds = new Set(mainResults.map(r => r.chunk.chunkId));
          const uniquePrereqs = prereqResults.filter(r => !mainIds.has(r.chunk.chunkId));

          return [...mainResults, ...uniquePrereqs.slice(0, 3)];
        } catch (error) {
          console.error('[NCERTRetriever] Failed to fetch prerequisites:', error);
        }
      }
    }

    return mainResults;
  }

  formatCitation(chunk: NCERTCurriculumChunk): string {
    const pageRange = chunk.pageStart && chunk.pageEnd
      ? `Page ${chunk.pageStart}-${chunk.pageEnd}`
      : chunk.pageStart
        ? `Page ${chunk.pageStart}`
        : '';

    const subject = chunk.subject.charAt(0).toUpperCase() + chunk.subject.slice(1);

    const parts = [
      'NCERT',
      `Class ${chunk.classLevel}`,
      subject,
      `Ch ${chunk.chapterNumber}`,
    ];

    if (pageRange) {
      parts.push(pageRange);
    }

    return `[${parts.join(' | ')}]`;
  }

  private async queryWithThreshold(
    queryEmbedding: number[],
    filters: SearchFilters,
    threshold: number
  ): Promise<RetrievedChunk[]> {
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    const conditions: any[] = [];

    if (filters.classLevel) {
      conditions.push(eq(ncertCurriculumChunks.classLevel, filters.classLevel));
    }

    if (filters.subject) {
      conditions.push(eq(ncertCurriculumChunks.subject, filters.subject));
    }

    if (filters.chapterNumber) {
      conditions.push(eq(ncertCurriculumChunks.chapterNumber, filters.chapterNumber));
    }

    if (filters.chunkType && filters.chunkType.length > 0) {
      conditions.push(inArray(ncertCurriculumChunks.chunkType, filters.chunkType));
    }

    if (filters.minExamWeightage !== undefined) {
      conditions.push(gte(ncertCurriculumChunks.examWeightage, filters.minExamWeightage));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        chunk: ncertCurriculumChunks,
        similarity: sql<number>`1 - (${ncertCurriculumChunks.embedding} <=> ${embeddingString}::vector)`.as('similarity'),
      })
      .from(ncertCurriculumChunks)
      .where(whereClause)
      .orderBy(sql`${ncertCurriculumChunks.embedding} <=> ${embeddingString}::vector`)
      .limit(MAX_RESULTS * 2);

    return results
      .filter(row => row.similarity >= threshold)
      .map(row => ({
        chunk: row.chunk,
        similarity: row.similarity,
        citation: this.formatCitation(row.chunk),
      }));
  }

  private rerankByExamWeightage(results: RetrievedChunk[]): RetrievedChunk[] {
    return results.sort((a, b) => {
      const weightageA = a.chunk.examWeightage || 0;
      const weightageB = b.chunk.examWeightage || 0;
      
      const scoreA = a.similarity * 0.7 + (weightageA / 10) * 0.3;
      const scoreB = b.similarity * 0.7 + (weightageB / 10) * 0.3;
      
      return scoreB - scoreA;
    });
  }

  async getChunksByChapter(
    classLevel: ClassLevel,
    subject: SubjectCode,
    chapterNumber: string
  ): Promise<NCERTCurriculumChunk[]> {
    const results = await db
      .select()
      .from(ncertCurriculumChunks)
      .where(
        and(
          eq(ncertCurriculumChunks.classLevel, classLevel),
          eq(ncertCurriculumChunks.subject, subject),
          eq(ncertCurriculumChunks.chapterNumber, chapterNumber)
        )
      )
      .orderBy(ncertCurriculumChunks.chunkIndex);

    return results;
  }

  async getFormulaChunks(
    classLevel: ClassLevel,
    subject: SubjectCode
  ): Promise<NCERTCurriculumChunk[]> {
    const results = await db
      .select()
      .from(ncertCurriculumChunks)
      .where(
        and(
          eq(ncertCurriculumChunks.classLevel, classLevel),
          eq(ncertCurriculumChunks.subject, subject),
          eq(ncertCurriculumChunks.chunkType, 'formulas')
        )
      );

    return results;
  }

  async getSummaryChunks(
    classLevel: ClassLevel,
    subject: SubjectCode,
    chapterNumber?: string
  ): Promise<NCERTCurriculumChunk[]> {
    const conditions = [
      eq(ncertCurriculumChunks.classLevel, classLevel),
      eq(ncertCurriculumChunks.subject, subject),
      eq(ncertCurriculumChunks.chunkType, 'summary'),
    ];

    if (chapterNumber) {
      conditions.push(eq(ncertCurriculumChunks.chapterNumber, chapterNumber));
    }

    const results = await db
      .select()
      .from(ncertCurriculumChunks)
      .where(and(...conditions));

    return results;
  }

  async getRelatedChunks(
    chunkId: string,
    limit: number = 5
  ): Promise<RetrievedChunk[]> {
    const sourceChunk = await db
      .select()
      .from(ncertCurriculumChunks)
      .where(eq(ncertCurriculumChunks.chunkId, chunkId))
      .limit(1);

    if (sourceChunk.length === 0) {
      return [];
    }

    const chunk = sourceChunk[0];

    if (!chunk.embedding) {
      return [];
    }

    const embeddingString = JSON.stringify(chunk.embedding);

    const results = await db
      .select({
        chunk: ncertCurriculumChunks,
        similarity: sql<number>`1 - (${ncertCurriculumChunks.embedding} <=> ${embeddingString}::vector)`.as('similarity'),
      })
      .from(ncertCurriculumChunks)
      .where(
        and(
          eq(ncertCurriculumChunks.classLevel, chunk.classLevel),
          eq(ncertCurriculumChunks.subject, chunk.subject),
          sql`${ncertCurriculumChunks.chunkId} != ${chunkId}`
        )
      )
      .orderBy(sql`${ncertCurriculumChunks.embedding} <=> ${embeddingString}::vector`)
      .limit(limit);

    return results.map(row => ({
      chunk: row.chunk,
      similarity: row.similarity,
      citation: this.formatCitation(row.chunk),
    }));
  }
}

export const ncertRetriever = new NCERTRetriever();
