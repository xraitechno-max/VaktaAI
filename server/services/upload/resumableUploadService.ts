import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

console.log('[ResumableUpload] ✅ Using in-memory session storage');

// In-memory storage for upload sessions
const sessionStore = new Map<string, UploadSession>();

interface UploadSession {
  sessionId: string;
  fileName: string;
  totalChunks: number;
  uploadedChunks: number[];
  fileHash: string;
  userId: string;
}

export class ResumableUploadService {
  private uploadDir = path.join(process.cwd(), 'uploads', 'temp');
  private chunkSize = 5 * 1024 * 1024; // 5MB chunks

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Initialize upload session
   */
  async initializeUpload(params: {
    fileName: string;
    fileSize: number;
    fileHash: string;
    userId: string;
  }): Promise<{ sessionId: string; chunkSize: number; totalChunks: number }> {
    const { fileName, fileSize, fileHash, userId } = params;

    const sessionId = crypto.randomUUID();
    const totalChunks = Math.ceil(fileSize / this.chunkSize);

    const session: UploadSession = {
      sessionId,
      fileName,
      totalChunks,
      uploadedChunks: [],
      fileHash,
      userId
    };

    // Store session in memory
    sessionStore.set(`upload:session:${sessionId}`, session);

    console.log(`[ResumableUpload] Initialized session ${sessionId} for ${fileName}`);

    return {
      sessionId,
      chunkSize: this.chunkSize,
      totalChunks
    };
  }

  /**
   * Upload chunk
   */
  async uploadChunk(params: {
    sessionId: string;
    chunkIndex: number;
    chunkData: Buffer;
  }): Promise<{ uploaded: number; total: number; complete: boolean }> {
    const { sessionId, chunkIndex, chunkData } = params;

    // Get session from memory
    const sessionData = sessionStore.get(`upload:session:${sessionId}`);
    if (!sessionData) {
      throw new Error('Upload session not found or expired');
    }

    const session = sessionData;

    // Save chunk to disk
    const chunkPath = path.join(
      this.uploadDir,
      `${sessionId}_chunk_${chunkIndex}`
    );

    fs.writeFileSync(chunkPath, chunkData);

    // Update session
    if (!session.uploadedChunks.includes(chunkIndex)) {
      session.uploadedChunks.push(chunkIndex);
    }

    // Update in memory
    sessionStore.set(`upload:session:${sessionId}`, session);

    const complete = session.uploadedChunks.length === session.totalChunks;

    console.log(
      `[ResumableUpload] Chunk ${chunkIndex}/${session.totalChunks} uploaded for session ${sessionId}`
    );

    return {
      uploaded: session.uploadedChunks.length,
      total: session.totalChunks,
      complete
    };
  }

  /**
   * Finalize upload (combine chunks)
   */
  async finalizeUpload(sessionId: string): Promise<{ filePath: string; fileHash: string }> {
    // Get session from memory
    const sessionData = sessionStore.get(`upload:session:${sessionId}`);
    if (!sessionData) {
      throw new Error('Upload session not found');
    }

    const session = sessionData;

    // Verify all chunks uploaded
    if (session.uploadedChunks.length !== session.totalChunks) {
      throw new Error('Not all chunks uploaded');
    }

    // Combine chunks
    const finalPath = path.join(
      process.cwd(),
      'uploads',
      `${sessionId}_${session.fileName}`
    );

    const writeStream = fs.createWriteStream(finalPath);

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(this.uploadDir, `${sessionId}_chunk_${i}`);
      const chunkData = fs.readFileSync(chunkPath);
      writeStream.write(chunkData);

      // Delete chunk after combining
      fs.unlinkSync(chunkPath);
    }

    writeStream.end();

    // Verify file hash
    const fileHash = await this.calculateFileHash(finalPath);
    if (fileHash !== session.fileHash) {
      throw new Error('File hash mismatch - file may be corrupted');
    }

    // Clean up session from memory
    sessionStore.delete(`upload:session:${sessionId}`);

    console.log(`[ResumableUpload] Finalized upload ${sessionId} -> ${finalPath}`);

    return { filePath: finalPath, fileHash };
  }

  /**
   * Calculate file hash
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Get upload status
   */
  async getUploadStatus(sessionId: string): Promise<{
    uploadedChunks: number[];
    missingChunks: number[];
    totalChunks: number;
  }> {
    // Get session from memory
    const sessionData = sessionStore.get(`upload:session:${sessionId}`);
    if (!sessionData) {
      throw new Error('Upload session not found or expired');
    }

    const session = sessionData;

    const allChunks = Array.from({ length: session.totalChunks }, (_, i) => i);
    const missingChunks = allChunks.filter(
      i => !session.uploadedChunks.includes(i)
    );

    return {
      uploadedChunks: session.uploadedChunks,
      missingChunks,
      totalChunks: session.totalChunks
    };
  }

  /**
   * Cancel upload
   */
  async cancelUpload(sessionId: string): Promise<void> {
    // Get session from memory
    const session = sessionStore.get(`upload:session:${sessionId}`);
    if (!session) return;

    // Delete all chunks
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(this.uploadDir, `${sessionId}_chunk_${i}`);
      if (fs.existsSync(chunkPath)) {
        fs.unlinkSync(chunkPath);
      }
    }

    // Delete session from memory
    sessionStore.delete(`upload:session:${sessionId}`);

    console.log(`[ResumableUpload] Cancelled upload ${sessionId}`);
  }

  /**
   * Get upload statistics
   */
  async getUploadStats(): Promise<{
    activeSessions: number;
    totalChunks: number;
    storageUsed: number;
  }> {
    try {
      const activeSessions = sessionStore.size;
      let totalChunks = 0;
      let storageUsed = 0;

      // Get stats from memory store
      for (const [_, session] of sessionStore.entries()) {
        totalChunks += session.uploadedChunks.length;
      }

      // Calculate storage used (approximate)
      const tempFiles = fs.readdirSync(this.uploadDir);
      for (const file of tempFiles) {
        const filePath = path.join(this.uploadDir, file);
        const stats = fs.statSync(filePath);
        storageUsed += stats.size;
      }

      return {
        activeSessions,
        totalChunks,
        storageUsed
      };
    } catch (error) {
      console.error('[ResumableUpload] Failed to get stats:', error);
      return {
        activeSessions: 0,
        totalChunks: 0,
        storageUsed: 0
      };
    }
  }

  /**
   * Clean up expired sessions (in-memory cleanup)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      let cleanedCount = 0;

      // In-memory cleanup: Clean up orphaned chunk files
      const tempFiles = fs.readdirSync(this.uploadDir);
      const sessionIds = new Set(
        Array.from(sessionStore.keys()).map(key => key.replace('upload:session:', ''))
      );

      for (const file of tempFiles) {
        const match = file.match(/^(.+)_chunk_\d+$/);
        if (match) {
          const sessionId = match[1];
          if (!sessionIds.has(sessionId)) {
            // Orphaned chunk - session doesn't exist
            fs.unlinkSync(path.join(this.uploadDir, file));
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`[ResumableUpload] Cleaned up ${cleanedCount} orphaned chunks`);
      }
      return cleanedCount;
    } catch (error) {
      console.error('[ResumableUpload] Cleanup failed:', error);
      return 0;
    }
  }
}

export const resumableUploadService = new ResumableUploadService();
