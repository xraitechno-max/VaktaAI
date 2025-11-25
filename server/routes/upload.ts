import { Router } from 'express';
import { resumableUploadService } from '../services/upload/resumableUploadService';
import { deduplicationService } from '../services/deduplication/deduplicationService';
import { ncertDetectionService } from '../services/ncert/ncertDetectionService';
import { virusScanService } from '../services/security/virusScanService';
import { isAuthenticated } from '../auth';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Initialize resumable upload
 */
router.post('/upload/init', isAuthenticated, async (req, res) => {
  try {
    const { fileName, fileSize, fileHash } = req.body;
    const userId = req.user!.id;

    // Check for duplicates first
    const dupCheck = await deduplicationService.checkDuplicate(fileHash, userId);
    if (dupCheck.isDuplicate) {
      return res.json({
        success: true,
        isDuplicate: true,
        existingDocument: dupCheck.existingDocument,
        message: 'This file has already been uploaded'
      });
    }

    const session = await resumableUploadService.initializeUpload({
      fileName,
      fileSize,
      fileHash,
      userId
    });

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('[Upload] Init failed:', error);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});

/**
 * Upload chunk
 */
router.post('/upload/chunk', isAuthenticated, upload.single('chunk'), async (req, res) => {
  try {
    const { sessionId, chunkIndex } = req.body;
    const chunkData = req.file!.buffer;

    const result = await resumableUploadService.uploadChunk({
      sessionId,
      chunkIndex: parseInt(chunkIndex),
      chunkData
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Upload] Chunk upload failed:', error);
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
});

/**
 * Finalize upload
 */
router.post('/upload/finalize', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user!.id;

    const result = await resumableUploadService.finalizeUpload(sessionId);

    // Check for duplicates again (in case of race condition)
    const dupCheck = await deduplicationService.checkDuplicate(
      result.fileHash,
      userId
    );

    if (dupCheck.isDuplicate) {
      // Handle duplicate
      const handled = await deduplicationService.handleDuplicate({
        existingDocumentId: dupCheck.existingDocument.id,
        userId
      });

      return res.json({
        success: true,
        isDuplicate: true,
        action: handled.action,
        documentId: handled.documentId,
        message: handled.action === 'already_owned'
          ? 'You already uploaded this document'
          : 'Document linked to existing content'
      });
    }

    // Virus scan
    const scanResult = await virusScanService.scanFile(result.filePath);
    if (scanResult.isInfected) {
      await virusScanService.quarantineFile({
        filePath: result.filePath,
        documentId: crypto.randomUUID(),
        viruses: scanResult.viruses!
      });

      return res.status(400).json({
        error: 'File infected with virus',
        message: '⚠️ Security Alert: File contains malicious content and has been quarantined.'
      });
    }

    // NCERT detection
    const ncertResult = await ncertDetectionService.detectNCERT({
      filePath: result.filePath,
      fileName: path.basename(result.filePath),
      fileHash: result.fileHash,
      fileSize: fs.statSync(result.filePath).size,
      userId
    });

    // Create document record (simplified for now)
    const document = {
      id: crypto.randomUUID(),
      userId,
      filePath: result.filePath,
      fileHash: result.fileHash,
      fileName: path.basename(result.filePath),
      fileType: path.extname(result.filePath).slice(1),
      isNCERT: ncertResult.isNCERT,
      ncertClass: ncertResult.book?.class,
      ncertSubject: ncertResult.book?.subject
    };

    // TODO: Implement document creation and processing queue
    console.log('Document created:', document.id);

    res.json({
      success: true,
      documentId: document.id,
      isNCERT: ncertResult.isNCERT,
      ncertBook: ncertResult.book,
      progressUrl: `/ws/document/${document.id}/progress`
    });
  } catch (error) {
    console.error('[Upload] Finalize failed:', error);
    res.status(500).json({ error: 'Failed to finalize upload' });
  }
});

/**
 * Get upload status (for resume)
 */
router.get('/upload/status/:sessionId', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const status = await resumableUploadService.getUploadStatus(sessionId);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('[Upload] Status check failed:', error);
    res.status(404).json({ error: 'Session not found' });
  }
});

/**
 * Cancel upload
 */
router.delete('/upload/:sessionId', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;

    await resumableUploadService.cancelUpload(sessionId);

    res.json({ success: true });
  } catch (error) {
    console.error('[Upload] Cancel failed:', error);
    res.status(500).json({ error: 'Failed to cancel upload' });
  }
});

/**
 * Get upload statistics
 */
router.get('/upload/stats', isAuthenticated, async (req, res) => {
  try {
    const stats = await resumableUploadService.getUploadStats();
    const dedupStats = await deduplicationService.getDedupStats();
    const quarantineStats = await virusScanService.getQuarantineStats();

    res.json({
      success: true,
      upload: stats,
      deduplication: dedupStats,
      quarantine: quarantineStats
    });
  } catch (error) {
    console.error('[Upload] Stats failed:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * Clean up expired uploads
 */
router.post('/upload/cleanup', isAuthenticated, async (req, res) => {
  try {
    const cleanedSessions = await resumableUploadService.cleanupExpiredSessions();
    const cleanedFiles = await virusScanService.cleanupQuarantine(30);
    const cleanedChunks = await deduplicationService.cleanupOrphanedChunks();

    res.json({
      success: true,
      cleaned: {
        sessions: cleanedSessions,
        quarantinedFiles: cleanedFiles,
        orphanedChunks: cleanedChunks
      }
    });
  } catch (error) {
    console.error('[Upload] Cleanup failed:', error);
    res.status(500).json({ error: 'Failed to cleanup' });
  }
});

export default router;
