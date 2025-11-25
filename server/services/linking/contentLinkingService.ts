import { db } from '../../db';
import { chunks, pyqs, referenceMaterials, documentPYQLinks, documentReferenceLinks } from '@shared/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { embeddingService } from '../embedding/embeddingService';

export class ContentLinkingService {
  /**
   * Link document to educational content
   */
  async linkContent(documentId: string): Promise<void> {
    console.log(`[ContentLinking] Starting for document ${documentId}`);

    // Get all chunks for this document
    const documentChunks = await db.query.chunks.findMany({
      where: eq(chunks.documentId, documentId),
      limit: 50 // Process first 50 chunks
    });

    for (const chunk of documentChunks) {
      // Link PYQs
      await this.linkPYQs(documentId, chunk);

      // Link reference materials
      await this.linkReferences(documentId, chunk);
    }

    console.log(`[ContentLinking] Completed for document ${documentId}`);
  }

  /**
   * Link similar PYQs using vector similarity
   */
  private async linkPYQs(documentId: string, chunk: any): Promise<void> {
    try {
      // Vector similarity search
      const similarPYQs = await db.execute(sql`
        SELECT 
          id,
          question,
          exam,
          year,
          subject,
          1 - (embedding <=> ${chunk.embedding}::vector) as similarity
        FROM pyqs
        WHERE 1 - (embedding <=> ${chunk.embedding}::vector) > 0.75
        ORDER BY embedding <=> ${chunk.embedding}::vector
        LIMIT 5
      `);

      // Store links
      for (const pyq of similarPYQs.rows) {
        const similarity = Math.round((pyq.similarity as number) * 100);

        await db.insert(documentPYQLinks).values({
          documentId,
          pyqId: pyq.id as string,
          chunkId: chunk.id,
          similarity,
          relevance: similarity > 90 ? 'high' : similarity > 80 ? 'medium' : 'low'
        }).onConflictDoNothing();
      }
    } catch (error) {
      console.error('[ContentLinking] PYQ linking failed:', error);
    }
  }

  /**
   * Link reference materials
   */
  private async linkReferences(documentId: string, chunk: any): Promise<void> {
    try {
      const similarRefs = await db.execute(sql`
        SELECT 
          id,
          title,
          type,
          url,
          1 - (embedding <=> ${chunk.embedding}::vector) as similarity
        FROM reference_materials
        WHERE 1 - (embedding <=> ${chunk.embedding}::vector) > 0.70
        ORDER BY embedding <=> ${chunk.embedding}::vector
        LIMIT 3
      `);

      for (const ref of similarRefs.rows) {
        const similarity = Math.round((ref.similarity as number) * 100);

        await db.insert(documentReferenceLinks).values({
          documentId,
          referenceId: ref.id as string,
          similarity
        }).onConflictDoNothing();
      }
    } catch (error) {
      console.error('[ContentLinking] Reference linking failed:', error);
    }
  }

  /**
   * Get linked content for document
   */
  async getLinkedContent(documentId: string): Promise<{
    pyqs: any[];
    references: any[];
  }> {
    try {
      // Get PYQs
      const pyqLinks = await db
        .select({
          pyq: pyqs,
          similarity: documentPYQLinks.similarity,
          relevance: documentPYQLinks.relevance
        })
        .from(documentPYQLinks)
        .innerJoin(pyqs, eq(documentPYQLinks.pyqId, pyqs.id))
        .where(eq(documentPYQLinks.documentId, documentId))
        .orderBy(desc(documentPYQLinks.similarity))
        .limit(10);

      // Get references
      const refLinks = await db
        .select({
          reference: referenceMaterials,
          similarity: documentReferenceLinks.similarity
        })
        .from(documentReferenceLinks)
        .innerJoin(referenceMaterials, eq(documentReferenceLinks.referenceId, referenceMaterials.id))
        .where(eq(documentReferenceLinks.documentId, documentId))
        .orderBy(desc(documentReferenceLinks.similarity))
        .limit(5);

      return {
        pyqs: pyqLinks.map(l => ({ ...l.pyq, similarity: l.similarity, relevance: l.relevance })),
        references: refLinks.map(l => ({ ...l.reference, similarity: l.similarity }))
      };
    } catch (error) {
      console.error('[ContentLinking] Failed to get linked content:', error);
      return { pyqs: [], references: [] };
    }
  }

  /**
   * Add PYQ to database
   */
  async addPYQ(params: {
    exam: string;
    year: number;
    subject: string;
    topic?: string;
    chapter?: number;
    question: string;
    options?: string[];
    correctAnswer?: string;
    solution?: string;
    explanation?: string;
    difficulty?: number;
    marks?: number;
    timeAllocation?: number;
  }): Promise<string> {
    const pyqId = crypto.randomUUID();

    // Generate embedding for the question
    const embedding = await embeddingService.generateEmbedding(params.question);

    await db.insert(pyqs).values({
      id: pyqId,
      exam: params.exam,
      year: params.year,
      subject: params.subject,
      topic: params.topic,
      chapter: params.chapter,
      question: params.question,
      options: params.options,
      correctAnswer: params.correctAnswer,
      solution: params.solution,
      explanation: params.explanation,
      difficulty: params.difficulty || 3,
      marks: params.marks,
      timeAllocation: params.timeAllocation,
      embedding: JSON.stringify(embedding),
      verified: false,
      createdAt: new Date()
    });

    console.log(`[ContentLinking] Added PYQ: ${params.exam} ${params.year} ${params.subject}`);
    return pyqId;
  }

  /**
   * Add reference material
   */
  async addReferenceMaterial(params: {
    title: string;
    type: 'video' | 'article' | 'book' | 'website';
    source?: string;
    url?: string;
    subject?: string;
    topic?: string;
    class?: number;
    language?: string;
    description?: string;
    quality?: number;
  }): Promise<string> {
    const refId = crypto.randomUUID();

    // Generate embedding for title + description
    const textToEmbed = `${params.title} ${params.description || ''}`;
    const embedding = await embeddingService.generateEmbedding(textToEmbed);

    await db.insert(referenceMaterials).values({
      id: refId,
      title: params.title,
      type: params.type,
      source: params.source,
      url: params.url,
      subject: params.subject,
      topic: params.topic,
      class: params.class,
      language: params.language || 'en',
      description: params.description,
      embedding: JSON.stringify(embedding),
      quality: params.quality || 3,
      views: 0,
      createdAt: new Date()
    });

    console.log(`[ContentLinking] Added reference: ${params.title}`);
    return refId;
  }

  /**
   * Search PYQs by similarity
   */
  async searchPYQs(params: {
    query: string;
    exam?: string;
    subject?: string;
    year?: number;
    limit?: number;
  }): Promise<any[]> {
    const { query, exam, subject, year, limit = 10 } = params;

    // Generate embedding for query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    let sqlQuery = sql`
      SELECT 
        id,
        question,
        exam,
        year,
        subject,
        topic,
        difficulty,
        marks,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
      FROM pyqs
      WHERE 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > 0.7
    `;

    if (exam) {
      sqlQuery = sql`${sqlQuery} AND exam = ${exam}`;
    }
    if (subject) {
      sqlQuery = sql`${sqlQuery} AND subject = ${subject}`;
    }
    if (year) {
      sqlQuery = sql`${sqlQuery} AND year = ${year}`;
    }

    sqlQuery = sql`${sqlQuery} ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector LIMIT ${limit}`;

    const result = await db.execute(sqlQuery);
    return result.rows;
  }

  /**
   * Search reference materials
   */
  async searchReferences(params: {
    query: string;
    type?: string;
    subject?: string;
    class?: number;
    limit?: number;
  }): Promise<any[]> {
    const { query, type, subject, class: classNum, limit = 10 } = params;

    // Generate embedding for query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    let sqlQuery = sql`
      SELECT 
        id,
        title,
        type,
        source,
        url,
        subject,
        class,
        quality,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
      FROM reference_materials
      WHERE 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > 0.6
    `;

    if (type) {
      sqlQuery = sql`${sqlQuery} AND type = ${type}`;
    }
    if (subject) {
      sqlQuery = sql`${sqlQuery} AND subject = ${subject}`;
    }
    if (classNum) {
      sqlQuery = sql`${sqlQuery} AND class = ${classNum}`;
    }

    sqlQuery = sql`${sqlQuery} ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector LIMIT ${limit}`;

    const result = await db.execute(sqlQuery);
    return result.rows;
  }

  /**
   * Get linking statistics
   */
  async getLinkingStats(documentId: string): Promise<{
    totalPYQs: number;
    totalReferences: number;
    highRelevancePYQs: number;
    averageSimilarity: number;
  }> {
    try {
      const pyqCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(documentPYQLinks)
        .where(eq(documentPYQLinks.documentId, documentId));

      const refCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(documentReferenceLinks)
        .where(eq(documentReferenceLinks.documentId, documentId));

      const highRelevanceCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(documentPYQLinks)
        .where(
          sql`${documentPYQLinks.documentId} = ${documentId} AND ${documentPYQLinks.relevance} = 'high'`
        );

      const avgSimilarity = await db
        .select({ avg: sql<number>`avg(${documentPYQLinks.similarity})` })
        .from(documentPYQLinks)
        .where(eq(documentPYQLinks.documentId, documentId));

      return {
        totalPYQs: pyqCount[0]?.count || 0,
        totalReferences: refCount[0]?.count || 0,
        highRelevancePYQs: highRelevanceCount[0]?.count || 0,
        averageSimilarity: avgSimilarity[0]?.avg || 0
      };
    } catch (error) {
      console.error('[ContentLinking] Failed to get stats:', error);
      return {
        totalPYQs: 0,
        totalReferences: 0,
        highRelevancePYQs: 0,
        averageSimilarity: 0
      };
    }
  }
}

export const contentLinkingService = new ContentLinkingService();
