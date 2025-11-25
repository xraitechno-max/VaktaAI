import { Router } from 'express';
import { pool } from '../db';
import { ttsRouter } from '../services/tts';

const router = Router();

router.get('/rag-diagnosis', async (req, res) => {
  try {
    const { docId, chatId } = req.query;

    if (!docId || !chatId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide both docId and chatId as query parameters'
      });
    }

    const diagnosis: any = {
      docId,
      chatId,
      timestamp: new Date().toISOString()
    };

    // Query 1: Check if chunks exist
    const chunksResult = await pool.query(`
      SELECT id, doc_id, ord,
             LEFT(text, 100) as text_preview,
             tokens
      FROM chunks
      WHERE doc_id = $1
      LIMIT 5
    `, [docId]);

    diagnosis.chunks = {
      count: chunksResult.rows.length,
      sample: chunksResult.rows
    };

    // Query 2: Check embedding status
    const embeddingResult = await pool.query(`
      SELECT id, ord,
             CASE WHEN embedding IS NULL THEN 'NULL' ELSE 'EXISTS' END as embedding_status,
             CASE WHEN embedding IS NOT NULL THEN vector_dims(embedding) ELSE NULL END as embedding_dimension
      FROM chunks
      WHERE doc_id = $1
      LIMIT 5
    `, [docId]);

    diagnosis.embeddings = {
      count: embeddingResult.rows.length,
      details: embeddingResult.rows
    };

    // Query 3: Check all chunks count for this document
    const totalChunksResult = await pool.query(`
      SELECT COUNT(*) as total_chunks,
             COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
             COUNT(CASE WHEN embedding IS NULL THEN 1 END) as chunks_without_embeddings
      FROM chunks
      WHERE doc_id = $1
    `, [docId]);

    diagnosis.chunkStats = totalChunksResult.rows[0];

    // Query 4: Check chat-document relationship
    const chatResult = await pool.query(`
      SELECT id, doc_ids, mode, created_at
      FROM chats
      WHERE id = $1
    `, [chatId]);

    diagnosis.chat = chatResult.rows[0] || null;

    // Query 5: Check document exists
    const docResult = await pool.query(`
      SELECT id, title, source_type, status,
             (metadata->>'chunkCount')::int as chunk_count,
             metadata
      FROM documents
      WHERE id = $1
    `, [docId]);

    diagnosis.document = docResult.rows[0] || null;

    // Query 6: Total chunks in database (all documents)
    const totalResult = await pool.query(`
      SELECT COUNT(*) as total_chunks,
             COUNT(DISTINCT doc_id) as total_docs
      FROM chunks
    `);

    diagnosis.database = totalResult.rows[0];

    // Query 7: Check if docId is in chat's doc_ids array
    // Skip the ANY check since doc_ids structure varies, check manually from chat data
    diagnosis.chatDocumentLink = {
      isLinked: diagnosis.chat?.doc_ids?.includes(docId) || false,
      chatDocIds: diagnosis.chat?.doc_ids || []
    };

    res.json({
      success: true,
      diagnosis
    });

  } catch (error) {
    console.error('[Debug Routes] Error during RAG diagnosis:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * 🎤 TTS Multi-Provider Health Check
 * GET /api/debug/tts-health
 *
 * Returns status of all TTS providers:
 * - Sarvam AI (primary)
 * - Google Cloud TTS (fallback)
 * - AWS Polly (cheapest)
 *
 * Also includes cache statistics
 */
router.get('/tts-health', async (_req, res) => {
  try {
    console.log('[Debug Routes] TTS health check requested');

    // Get provider status (with fresh health checks)
    const providerStatus = await ttsRouter.getProviderStatus();

    // Get cache stats
    const cacheStats = ttsRouter.getCacheStats();

    // Build response
    const health = {
      timestamp: new Date().toISOString(),
      providers: Object.entries(providerStatus).map(([name, status]) => ({
        name,
        available: status.available,
        lastCheck: status.lastCheck,
        status: status.available ? '✅ healthy' : '❌ unavailable',
      })),
      cache: {
        enabled: cacheStats.enabled,
        size: cacheStats.size,
        ttl: `${cacheStats.ttl} seconds (${Math.round(cacheStats.ttl / 86400)} days)`,
      },
      routing: {
        avatar: 'Sarvam → Google → Polly (best quality)',
        quick: 'Google → Sarvam → Polly (fast + good)',
        practice: 'Polly → Sarvam → Google (cheapest)',
        notification: 'Polly only (short messages)',
      },
    };

    // Determine overall health
    const anyHealthy = Object.values(providerStatus).some(p => p.available);
    const allHealthy = Object.values(providerStatus).every(p => p.available);

    res.json({
      success: true,
      overallStatus: allHealthy ? '✅ All providers healthy' :
                     anyHealthy ? '⚠️ Some providers unavailable' :
                     '❌ All providers unavailable',
      health,
    });

  } catch (error) {
    console.error('[Debug Routes] TTS health check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

/**
 * 🗑️ Clear TTS cache (for testing)
 * POST /api/debug/tts-cache-clear
 */
router.post('/tts-cache-clear', (_req, res) => {
  try {
    const statsBefore = ttsRouter.getCacheStats();
    ttsRouter.clearCache();
    const statsAfter = ttsRouter.getCacheStats();

    res.json({
      success: true,
      message: 'TTS cache cleared successfully',
      before: { size: statsBefore.size },
      after: { size: statsAfter.size },
    });

  } catch (error) {
    console.error('[Debug Routes] TTS cache clear error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
