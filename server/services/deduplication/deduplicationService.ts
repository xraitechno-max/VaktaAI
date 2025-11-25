import { db } from '../../db';
import { documents } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

export class DeduplicationService {
  /**
   * Check if document already exists
   */
  async checkDuplicate(fileHash: string, userId: string): Promise<{
    isDuplicate: boolean;
    existingDocument?: any;
  }> {
    // Check user's documents
    const existing = await db.query.documents.findFirst({
      where: eq(documents.fileHash, fileHash)
    });

    if (existing) {
      console.log(`[Dedup] Found duplicate: ${existing.id}`);
      
      return {
        isDuplicate: true,
        existingDocument: existing
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Handle duplicate document
   */
  async handleDuplicate(params: {
    existingDocumentId: string;
    userId: string;
  }): Promise<any> {
    const { existingDocumentId, userId } = params;

    // Check if user already has access
    const userDocument = await db.query.documents.findFirst({
      where: eq(documents.id, existingDocumentId)
    });

    if (userDocument?.userId === userId) {
      // User already owns this document
      return {
        action: 'already_owned',
        documentId: existingDocumentId
      };
    }

    // Create reference to existing document (shared access)
    // This avoids duplicating chunks and embeddings
    const newDocument = await db.insert(documents).values({
      userId,
      title: userDocument!.title,
      fileType: userDocument!.fileType,
      fileUrl: userDocument!.fileUrl,
      fileHash: userDocument!.fileHash,
      processingStatus: 'completed',
      isNCERT: userDocument!.isNCERT,
      ncertClass: userDocument!.ncertClass,
      ncertSubject: userDocument!.ncertSubject,
      sharedFrom: existingDocumentId // Reference to original
    }).returning();

    console.log(`[Dedup] Created reference document ${newDocument[0].id}`);

    return {
      action: 'referenced',
      documentId: newDocument[0].id,
      originalDocumentId: existingDocumentId
    };
  }

  /**
   * Link chunks to new document reference
   */
  async linkChunks(newDocumentId: string, originalDocumentId: string): Promise<void> {
    // This creates a virtual link without duplicating data
    await db.execute(sql`
      INSERT INTO document_chunk_links (document_id, chunk_id)
      SELECT ${newDocumentId}, id
      FROM chunks
      WHERE document_id = ${originalDocumentId}
    `);
  }

  /**
   * Calculate file hash
   */
  async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = require('fs').createReadStream(filePath);

      stream.on('data', (data: Buffer) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Get deduplication statistics
   */
  async getDedupStats(): Promise<{
    totalDocuments: number;
    uniqueDocuments: number;
    duplicatesFound: number;
    storageSaved: number;
  }> {
    try {
      const totalDocs = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents);

      const uniqueHashes = await db
        .select({ count: sql<number>`count(distinct file_hash)` })
        .from(documents);

      const duplicates = totalDocs[0]?.count - uniqueHashes[0]?.count;

      // Calculate approximate storage saved
      const avgFileSize = 2 * 1024 * 1024; // 2MB average
      const storageSaved = duplicates * avgFileSize;

      return {
        totalDocuments: totalDocs[0]?.count || 0,
        uniqueDocuments: uniqueHashes[0]?.count || 0,
        duplicatesFound: duplicates || 0,
        storageSaved
      };
    } catch (error) {
      console.error('[Dedup] Failed to get stats:', error);
      return {
        totalDocuments: 0,
        uniqueDocuments: 0,
        duplicatesFound: 0,
        storageSaved: 0
      };
    }
  }

  /**
   * Find potential duplicates by similarity
   */
  async findSimilarDocuments(params: {
    documentId: string;
    threshold?: number;
    limit?: number;
  }): Promise<any[]> {
    const { documentId, threshold = 0.8, limit = 10 } = params;

    try {
      // Get document details
      const document = await db.query.documents.findFirst({
        where: eq(documents.id, documentId)
      });

      if (!document) return [];

      // Find similar documents by title and file type
      const similar = await db
        .select()
        .from(documents)
        .where(
          sql`id != ${documentId} 
              AND file_type = ${document.fileType}
              AND similarity(title, ${document.title}) > ${threshold}`
        )
        .limit(limit);

      return similar;
    } catch (error) {
      console.error('[Dedup] Failed to find similar documents:', error);
      return [];
    }
  }

  /**
   * Merge duplicate documents
   */
  async mergeDuplicates(params: {
    primaryDocumentId: string;
    duplicateDocumentIds: string[];
    userId: string;
  }): Promise<{
    success: boolean;
    mergedCount: number;
    error?: string;
  }> {
    const { primaryDocumentId, duplicateDocumentIds, userId } = params;

    try {
      let mergedCount = 0;

      for (const duplicateId of duplicateDocumentIds) {
        // Verify user owns both documents
        const primary = await db.query.documents.findFirst({
          where: eq(documents.id, primaryDocumentId)
        });
        const duplicate = await db.query.documents.findFirst({
          where: eq(documents.id, duplicateId)
        });

        if (!primary || !duplicate || 
            primary.userId !== userId || duplicate.userId !== userId) {
          continue;
        }

        // Move chunks from duplicate to primary
        await db.execute(sql`
          UPDATE chunks 
          SET document_id = ${primaryDocumentId}
          WHERE document_id = ${duplicateId}
        `);

        // Delete duplicate document
        await db.delete(documents).where(eq(documents.id, duplicateId));

        mergedCount++;
      }

      console.log(`[Dedup] Merged ${mergedCount} duplicates into ${primaryDocumentId}`);

      return {
        success: true,
        mergedCount
      };
    } catch (error) {
      console.error('[Dedup] Merge failed:', error);
      return {
        success: false,
        mergedCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Clean up orphaned chunks
   */
  async cleanupOrphanedChunks(): Promise<number> {
    try {
      const orphanedChunks = await db.execute(sql`
        DELETE FROM chunks 
        WHERE document_id NOT IN (
          SELECT id FROM documents
        )
      `);

      console.log(`[Dedup] Cleaned up ${orphanedChunks.rowCount} orphaned chunks`);
      return orphanedChunks.rowCount || 0;
    } catch (error) {
      console.error('[Dedup] Cleanup failed:', error);
      return 0;
    }
  }
}

export const deduplicationService = new DeduplicationService();
