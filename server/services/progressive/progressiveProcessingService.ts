import { db } from '../../db';
import { documents, chunks } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { WebSocket } from 'ws';

export class ProgressiveProcessingService {
  private wsConnections = new Map<string, WebSocket[]>();

  /**
   * Make first N pages available immediately
   */
  async makePartialAvailable(params: {
    documentId: string;
    firstChunks: any[];
  }): Promise<void> {
    const { documentId, firstChunks } = params;

    // Store first chunks
    await db.insert(chunks).values(firstChunks);

    // Update document status
    await db.update(documents)
      .set({
        processingStatus: 'partially_ready',
        processingProgress: 20
      })
      .where(eq(documents.id, documentId));

    // Notify via WebSocket
    this.notifyProgress(documentId, {
      status: 'partially_ready',
      progress: 20,
      availableChunks: firstChunks.length,
      message: 'First 10 pages ready! You can start asking questions while we process the rest.'
    });

    console.log(`[Progressive] Made partial content available for ${documentId}`);
  }

  /**
   * Register WebSocket connection for progress updates
   */
  registerConnection(documentId: string, ws: WebSocket): void {
    if (!this.wsConnections.has(documentId)) {
      this.wsConnections.set(documentId, []);
    }

    this.wsConnections.get(documentId)!.push(ws);

    console.log(`[Progressive] Registered WS for document ${documentId}`);

    // Send initial status
    this.sendInitialStatus(documentId, ws);
  }

  /**
   * Send initial document status
   */
  private async sendInitialStatus(documentId: string, ws: WebSocket): Promise<void> {
    try {
      const document = await db.query.documents.findFirst({
        where: eq(documents.id, documentId)
      });

      if (document) {
        ws.send(JSON.stringify({
          type: 'initial_status',
          status: document.processingStatus,
          progress: document.processingProgress
        }));
      }
    } catch (error) {
      console.error('[Progressive] Failed to send initial status:', error);
    }
  }

  /**
   * Notify all connected clients of progress
   */
  notifyProgress(documentId: string, data: any): void {
    const connections = this.wsConnections.get(documentId) || [];

    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: 'progress',
            ...data
          }));
        } catch (error) {
          console.error('[Progressive] Failed to send progress:', error);
        }
      }
    });
  }

  /**
   * Update processing progress
   */
  async updateProgress(params: {
    documentId: string;
    progress: number;
    status: string;
    message?: string;
  }): Promise<void> {
    const { documentId, progress, status, message } = params;

    // Update database
    await db.update(documents)
      .set({
        processingProgress: progress,
        processingStatus: status
      })
      .where(eq(documents.id, documentId));

    // Notify clients
    this.notifyProgress(documentId, {
      status,
      progress,
      message
    });

    console.log(`[Progressive] Updated ${documentId}: ${status} (${progress}%)`);
  }

  /**
   * Mark document as completed
   */
  async markCompleted(documentId: string): Promise<void> {
    await this.updateProgress({
      documentId,
      progress: 100,
      status: 'completed',
      message: 'Document fully processed! 🎉'
    });

    // Clean up connections after a delay
    setTimeout(() => {
      this.cleanup(documentId);
    }, 30000); // 30 seconds
  }

  /**
   * Mark document as failed
   */
  async markFailed(documentId: string, error: string): Promise<void> {
    await this.updateProgress({
      documentId,
      progress: 0,
      status: 'failed',
      message: `Processing failed: ${error}`
    });

    // Clean up connections
    this.cleanup(documentId);
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(documentId: string): Promise<{
    status: string;
    progress: number;
    availableChunks: number;
    totalChunks: number;
  }> {
    try {
      const document = await db.query.documents.findFirst({
        where: eq(documents.id, documentId)
      });

      const chunkCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(chunks)
        .where(eq(chunks.documentId, documentId));

      return {
        status: document?.processingStatus || 'pending',
        progress: document?.processingProgress || 0,
        availableChunks: chunkCount[0]?.count || 0,
        totalChunks: document?.totalChunks || 0
      };
    } catch (error) {
      console.error('[Progressive] Failed to get status:', error);
      return {
        status: 'unknown',
        progress: 0,
        availableChunks: 0,
        totalChunks: 0
      };
    }
  }

  /**
   * Clean up closed connections
   */
  cleanup(documentId: string): void {
    const connections = this.wsConnections.get(documentId) || [];
    const active = connections.filter(ws => ws.readyState === WebSocket.OPEN);

    if (active.length === 0) {
      this.wsConnections.delete(documentId);
    } else {
      this.wsConnections.set(documentId, active);
    }

    console.log(`[Progressive] Cleaned up connections for ${documentId}`);
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): Map<string, number> {
    const active = new Map<string, number>();
    
    for (const [documentId, connections] of this.wsConnections) {
      const activeCount = connections.filter(ws => ws.readyState === WebSocket.OPEN).length;
      if (activeCount > 0) {
        active.set(documentId, activeCount);
      }
    }

    return active;
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(message: any): void {
    for (const [documentId, connections] of this.wsConnections) {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(message));
          } catch (error) {
            console.error('[Progressive] Broadcast failed:', error);
          }
        }
      });
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    totalDocuments: number;
    processingDocuments: number;
    completedDocuments: number;
    failedDocuments: number;
    averageProcessingTime: number;
  }> {
    try {
      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents);

      const processing = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(sql`processing_status IN ('pending', 'processing', 'partially_ready')`);

      const completed = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.processingStatus, 'completed'));

      const failed = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.processingStatus, 'failed'));

      // Calculate average processing time (simplified)
      const avgTime = await db
        .select({ avg: sql<number>`avg(extract(epoch from (updated_at - created_at)))` })
        .from(documents)
        .where(eq(documents.processingStatus, 'completed'));

      return {
        totalDocuments: total[0]?.count || 0,
        processingDocuments: processing[0]?.count || 0,
        completedDocuments: completed[0]?.count || 0,
        failedDocuments: failed[0]?.count || 0,
        averageProcessingTime: avgTime[0]?.avg || 0
      };
    } catch (error) {
      console.error('[Progressive] Failed to get stats:', error);
      return {
        totalDocuments: 0,
        processingDocuments: 0,
        completedDocuments: 0,
        failedDocuments: 0,
        averageProcessingTime: 0
      };
    }
  }
}

export const progressiveProcessingService = new ProgressiveProcessingService();
