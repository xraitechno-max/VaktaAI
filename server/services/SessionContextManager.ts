import type { DetectedLanguage } from './LanguageDetectionEngine';
import type { EmotionalState } from '../config/emotionPatterns';

console.log('[SESSION CONTEXT] ✅ Using in-memory storage (REDIS_DISABLED=true)');

export interface SessionContext {
  userId: string;
  chatId: string;
  
  languageHistory: Array<{
    language: DetectedLanguage;
    confidence: number;
    timestamp: number;
  }>;
  preferredLanguage?: DetectedLanguage;
  currentLanguage?: DetectedLanguage;
  
  emotionalHistory: Array<{
    emotion: EmotionalState;
    confidence: number;
    timestamp: number;
  }>;
  currentEmotion?: EmotionalState;
  
  messageCount: number;
  lastMessageTime: number;
  avgResponseTime: number;
  
  currentPhase?: string;
  currentTopic?: string;
  currentSubject?: string;
  misconceptions: string[];
  strongConcepts: string[];
  
  responseQualityScore: number;
  languageConsistencyScore: number;
}

export class SessionContextManager {
  private readonly SESSION_TTL = 3600 * 24 * 1000; // 24 hours in ms
  private readonly SESSION_PREFIX = 'vaktaai:session:';
  private readonly MAX_HISTORY_SIZE = 20;
  
  // In-memory storage
  private inMemoryCache = new Map<string, SessionContext>();

  /**
   * Get session context from in-memory storage
   */
  async getContext(userId: string, chatId: string): Promise<SessionContext | null> {
    const key = this.getSessionKey(userId, chatId);
    const context = this.inMemoryCache.get(key);
    
    if (!context) {
      return null;
    }
    
    return { ...context };
  }

  /**
   * Update session context in in-memory storage
   */
  async updateContext(
    userId: string,
    chatId: string,
    updates: Partial<SessionContext>
  ): Promise<void> {
    const key = this.getSessionKey(userId, chatId);
    
    // Get existing context or create new
    let context = await this.getContext(userId, chatId);
    if (!context) {
      context = this.createEmptyContext(userId, chatId);
    }

    // Merge updates
    context = { ...context, ...updates };

    // Trim history arrays to max size
    if (context.languageHistory.length > this.MAX_HISTORY_SIZE) {
      context.languageHistory = context.languageHistory.slice(-this.MAX_HISTORY_SIZE);
    }
    if (context.emotionalHistory.length > this.MAX_HISTORY_SIZE) {
      context.emotionalHistory = context.emotionalHistory.slice(-this.MAX_HISTORY_SIZE);
    }
    
    // Save to in-memory cache
    this.inMemoryCache.set(key, context);
  }

  /**
   * Add language detection to history
   */
  async addLanguageDetection(
    userId: string,
    chatId: string,
    language: DetectedLanguage,
    confidence: number
  ): Promise<void> {
    const context = await this.getContext(userId, chatId);
    
    const languageEntry = {
      language,
      confidence,
      timestamp: Date.now()
    };

    const updates: Partial<SessionContext> = {
      languageHistory: [
        ...(context?.languageHistory || []),
        languageEntry
      ],
      currentLanguage: language
    };

    // Calculate preferred language from history
    if (context?.languageHistory && context.languageHistory.length >= 3) {
      const langCounts: { [key: string]: number } = {};
      context.languageHistory.slice(-10).forEach(h => {
        langCounts[h.language] = (langCounts[h.language] || 0) + 1;
      });
      
      const preferred = Object.keys(langCounts).reduce((a, b) => 
        langCounts[a] > langCounts[b] ? a : b
      ) as DetectedLanguage;
      
      updates.preferredLanguage = preferred;
    }

    await this.updateContext(userId, chatId, updates);
  }

  /**
   * Add emotion detection to history
   */
  async addEmotionDetection(
    userId: string,
    chatId: string,
    emotion: EmotionalState,
    confidence: number
  ): Promise<void> {
    const context = await this.getContext(userId, chatId);
    
    const emotionEntry = {
      emotion,
      confidence,
      timestamp: Date.now()
    };

    const updates: Partial<SessionContext> = {
      emotionalHistory: [
        ...(context?.emotionalHistory || []),
        emotionEntry
      ],
      currentEmotion: emotion
    };

    await this.updateContext(userId, chatId, updates);
  }

  /**
   * Update learning context
   */
  async updateLearningContext(
    userId: string,
    chatId: string,
    updates: {
      currentPhase?: string;
      currentTopic?: string;
      currentSubject?: string;
      misconceptions?: string[];
      strongConcepts?: string[];
    }
  ): Promise<void> {
    await this.updateContext(userId, chatId, updates);
  }

  /**
   * Update performance metrics
   */
  async updateMetrics(
    userId: string,
    chatId: string,
    metrics: {
      responseQualityScore?: number;
      languageConsistencyScore?: number;
      responseTime?: number;
    }
  ): Promise<void> {
    const context = await this.getContext(userId, chatId);
    
    const updates: Partial<SessionContext> = {
      messageCount: (context?.messageCount || 0) + 1,
      lastMessageTime: Date.now()
    };

    if (metrics.responseQualityScore !== undefined) {
      updates.responseQualityScore = metrics.responseQualityScore;
    }

    if (metrics.languageConsistencyScore !== undefined) {
      updates.languageConsistencyScore = metrics.languageConsistencyScore;
    }

    if (metrics.responseTime !== undefined && context) {
      const prevAvg = context.avgResponseTime || 0;
      const count = context.messageCount || 0;
      updates.avgResponseTime = (prevAvg * count + metrics.responseTime) / (count + 1);
    }

    await this.updateContext(userId, chatId, updates);
  }

  /**
   * Get language consistency score
   */
  getLanguageConsistency(context: SessionContext): number {
    if (context.languageHistory.length < 3) {
      return 0.5;
    }

    const recentHistory = context.languageHistory.slice(-10);
    const langCounts: { [key: string]: number } = {};
    
    recentHistory.forEach(h => {
      langCounts[h.language] = (langCounts[h.language] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(langCounts));
    return maxCount / recentHistory.length;
  }

  /**
   * Get emotional stability score
   */
  getEmotionalStability(context: SessionContext): number {
    if (context.emotionalHistory.length < 3) {
      return 0.5;
    }

    const recentHistory = context.emotionalHistory.slice(-10);
    const emotionCounts: { [key: string]: number } = {};
    
    recentHistory.forEach(h => {
      emotionCounts[h.emotion] = (emotionCounts[h.emotion] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(emotionCounts));
    return maxCount / recentHistory.length;
  }

  /**
   * Clear session context
   */
  async clearContext(userId: string, chatId: string): Promise<void> {
    const key = this.getSessionKey(userId, chatId);
    this.inMemoryCache.delete(key);
    console.log(`[SESSION CONTEXT] Cleared context for chat ${chatId}`);
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    const prefix = `${this.SESSION_PREFIX}${userId}:`;
    const sessions: string[] = [];
    
    for (const key of this.inMemoryCache.keys()) {
      if (key.startsWith(prefix)) {
        const chatId = key.substring(prefix.length);
        sessions.push(chatId);
      }
    }
    
    return sessions;
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<{
    totalSessions: number;
    status: string;
    ttl: number;
  }> {
    return {
      totalSessions: this.inMemoryCache.size,
      status: 'connected',
      ttl: this.SESSION_TTL / 1000
    };
  }

  // Helper methods
  private getSessionKey(userId: string, chatId: string): string {
    return `${this.SESSION_PREFIX}${userId}:${chatId}`;
  }

  private createEmptyContext(userId: string, chatId: string): SessionContext {
    return {
      userId,
      chatId,
      languageHistory: [],
      emotionalHistory: [],
      messageCount: 0,
      lastMessageTime: Date.now(),
      avgResponseTime: 0,
      misconceptions: [],
      strongConcepts: [],
      responseQualityScore: 0.5,
      languageConsistencyScore: 0.5
    };
  }
}

export const sessionContextManager = new SessionContextManager();
