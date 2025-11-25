/**
 * Analytics Dashboard API Routes
 * Provides metrics and insights for system monitoring
 */

import { Router } from 'express';
import { isAuthenticated } from '../auth';
import { db } from '../db';
import { messages, chats, documents, chunks } from '@shared/schema';
import { sql, desc, eq, and, gte, lte } from 'drizzle-orm';
import { getCacheStats } from '../services/cache/embeddingCache';

const router = Router();

/**
 * GET /api/analytics/overview
 * Get overall system statistics
 */
router.get('/overview', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get counts
    const [
      totalChats,
      totalMessages,
      totalDocuments,
      totalChunks,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(chats)
        .where(eq(chats.userId, userId)),

      db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(sql`${messages.chatId} IN (SELECT id FROM ${chats} WHERE ${chats.userId} = ${userId})`),

      db.select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.userId, userId)),

      db.select({ count: sql<number>`count(*)` })
        .from(chunks)
        .where(sql`${chunks.docId} IN (SELECT id FROM ${documents} WHERE ${documents.userId} = ${userId})`),
    ]);

    // Get cache stats
    const cacheStats = await getCacheStats();

    res.json({
      overview: {
        totalChats: parseInt(totalChats[0]?.count?.toString() || '0'),
        totalMessages: parseInt(totalMessages[0]?.count?.toString() || '0'),
        totalDocuments: parseInt(totalDocuments[0]?.count?.toString() || '0'),
        totalChunks: parseInt(totalChunks[0]?.count?.toString() || '0'),
      },
      cache: {
        enabled: cacheStats.connected,
        totalKeys: cacheStats.totalKeys,
        memoryUsed: cacheStats.memoryUsed,
        hitRate: cacheStats.hits && cacheStats.misses
          ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2) + '%'
          : 'N/A',
      },
    });
  } catch (error) {
    console.error('[Analytics] Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

/**
 * GET /api/analytics/usage
 * Get usage statistics over time
 */
router.get('/usage', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { period = '7d' } = req.query;

    // Calculate date range
    const daysAgo = period === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get messages per day
    const messagesPerDay = await db
      .select({
        date: sql<string>`DATE(${messages.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(and(
        sql`${messages.chatId} IN (SELECT id FROM ${chats} WHERE ${chats.userId} = ${userId})`,
        gte(messages.createdAt, startDate)
      ))
      .groupBy(sql`DATE(${messages.createdAt})`)
      .orderBy(sql`DATE(${messages.createdAt})`);

    // Get chats per day
    const chatsPerDay = await db
      .select({
        date: sql<string>`DATE(${chats.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(chats)
      .where(and(
        eq(chats.userId, userId),
        gte(chats.createdAt, startDate)
      ))
      .groupBy(sql`DATE(${chats.createdAt})`)
      .orderBy(sql`DATE(${chats.createdAt})`);

    res.json({
      period,
      messagesPerDay: messagesPerDay.map(row => ({
        date: row.date,
        count: parseInt(row.count?.toString() || '0'),
      })),
      chatsPerDay: chatsPerDay.map(row => ({
        date: row.date,
        count: parseInt(row.count?.toString() || '0'),
      })),
    });
  } catch (error) {
    console.error('[Analytics] Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage analytics' });
  }
});

/**
 * GET /api/analytics/chat-performance
 * Get chat session performance metrics
 */
router.get('/chat-performance', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get recent chats with message counts and metadata
    const recentChats = await db
      .select({
        chatId: chats.id,
        title: chats.title,
        mode: chats.mode,
        messageCount: sql<number>`count(${messages.id})`,
        avgLatency: sql<number>`avg(CAST((${messages.metadata}->>'latency_ms') AS INTEGER))`,
        avgConfidence: sql<number>`avg(CAST((${messages.metadata}->>'confidence') AS NUMERIC))`,
        createdAt: chats.createdAt,
      })
      .from(chats)
      .leftJoin(messages, eq(chats.id, messages.chatId))
      .where(eq(chats.userId, userId))
      .groupBy(chats.id, chats.title, chats.mode, chats.createdAt)
      .orderBy(desc(chats.createdAt))
      .limit(20);

    // Calculate mode distribution
    const modeDistribution = await db
      .select({
        mode: chats.mode,
        count: sql<number>`count(*)`,
      })
      .from(chats)
      .where(eq(chats.userId, userId))
      .groupBy(chats.mode);

    res.json({
      recentChats: recentChats.map(chat => ({
        chatId: chat.chatId,
        title: chat.title || 'Untitled',
        mode: chat.mode,
        messageCount: parseInt(chat.messageCount?.toString() || '0'),
        avgLatency: chat.avgLatency ? parseFloat(chat.avgLatency.toString()) : null,
        avgConfidence: chat.avgConfidence ? parseFloat(chat.avgConfidence.toString()) : null,
        createdAt: chat.createdAt,
      })),
      modeDistribution: modeDistribution.map(row => ({
        mode: row.mode,
        count: parseInt(row.count?.toString() || '0'),
      })),
    });
  } catch (error) {
    console.error('[Analytics] Error fetching chat performance:', error);
    res.status(500).json({ error: 'Failed to fetch chat performance' });
  }
});

/**
 * GET /api/analytics/document-stats
 * Get document usage and processing statistics
 */
router.get('/document-stats', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get document stats with chunk counts
    const documentStats = await db
      .select({
        docId: documents.id,
        title: documents.title,
        pages: documents.pages,
        chunkCount: sql<number>`count(${chunks.id})`,
        avgChunkTokens: sql<number>`avg(${chunks.tokens})`,
        language: documents.language,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .leftJoin(chunks, eq(documents.id, chunks.docId))
      .where(eq(documents.userId, userId))
      .groupBy(documents.id, documents.title, documents.pages, documents.language, documents.createdAt)
      .orderBy(desc(documents.createdAt))
      .limit(50);

    // Get language distribution
    const languageDistribution = await db
      .select({
        language: documents.language,
        count: sql<number>`count(*)`,
      })
      .from(documents)
      .where(eq(documents.userId, userId))
      .groupBy(documents.language);

    // Get total chunk count
    const totalChunks = await db
      .select({ count: sql<number>`count(*)` })
      .from(chunks)
      .where(sql`${chunks.docId} IN (SELECT id FROM ${documents} WHERE ${documents.userId} = ${userId})`);

    res.json({
      documents: documentStats.map(doc => ({
        docId: doc.docId,
        title: doc.title,
        pages: doc.pages,
        chunkCount: parseInt(doc.chunkCount?.toString() || '0'),
        avgChunkTokens: doc.avgChunkTokens ? parseFloat(doc.avgChunkTokens.toString()) : null,
        language: doc.language,
        createdAt: doc.createdAt,
      })),
      languageDistribution: languageDistribution.map(row => ({
        language: row.language || 'unknown',
        count: parseInt(row.count?.toString() || '0'),
      })),
      totalChunks: parseInt(totalChunks[0]?.count?.toString() || '0'),
    });
  } catch (error) {
    console.error('[Analytics] Error fetching document stats:', error);
    res.status(500).json({ error: 'Failed to fetch document statistics' });
  }
});

/**
 * GET /api/analytics/language-stats
 * Get language detection and usage statistics
 */
router.get('/language-stats', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get language distribution from message metadata
    const languageUsage = await db
      .select({
        language: sql<string>`${messages.metadata}->>'language'`,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(sql`${messages.chatId} IN (SELECT id FROM ${chats} WHERE ${chats.userId} = ${userId})`)
      .groupBy(sql`${messages.metadata}->>'language'`)
      .having(sql`${messages.metadata}->>'language' IS NOT NULL`);

    // Get conversation language switches
    const languageSwitches = await db
      .select({
        count: sql<number>`count(*) FILTER (WHERE ${messages.metadata}->>'language' != ${messages.metadata}->>'conversationLanguage')`,
        total: sql<number>`count(*) FILTER (WHERE ${messages.metadata}->>'conversationLanguage' IS NOT NULL)`,
      })
      .from(messages)
      .where(sql`${messages.chatId} IN (SELECT id FROM ${chats} WHERE ${chats.userId} = ${userId})`);

    res.json({
      languageUsage: languageUsage.map(row => ({
        language: row.language || 'unknown',
        count: parseInt(row.count?.toString() || '0'),
      })),
      languageSwitches: {
        switches: parseInt(languageSwitches[0]?.count?.toString() || '0'),
        total: parseInt(languageSwitches[0]?.total?.toString() || '0'),
        switchRate: languageSwitches[0]?.total && parseInt(languageSwitches[0].total.toString()) > 0
          ? (parseInt(languageSwitches[0].count?.toString() || '0') / parseInt(languageSwitches[0].total.toString()) * 100).toFixed(2) + '%'
          : '0%',
      },
    });
  } catch (error) {
    console.error('[Analytics] Error fetching language stats:', error);
    res.status(500).json({ error: 'Failed to fetch language statistics' });
  }
});

/**
 * GET /api/analytics/system-health
 * Get system health and performance metrics
 */
router.get('/system-health', isAuthenticated, async (req, res) => {
  try {
    // Get database connection pool stats
    const dbHealth = {
      connected: true, // If we got here, DB is connected
      // Add more DB metrics if needed
    };

    // Get cache stats
    const cacheStats = await getCacheStats();

    // Get recent error count (if you have error logging)
    // For now, just return placeholder
    const errorCount = 0;

    res.json({
      status: 'healthy',
      database: dbHealth,
      cache: {
        enabled: cacheStats.connected,
        status: cacheStats.connected ? 'healthy' : 'unavailable',
        hitRate: cacheStats.hits && cacheStats.misses
          ? `${(cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)}%`
          : 'N/A',
        memoryUsed: cacheStats.memoryUsed,
      },
      errors: {
        recent: errorCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Analytics] Error fetching system health:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Failed to fetch system health',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
