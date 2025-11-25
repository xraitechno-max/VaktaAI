/**
 * VaktaAI - Enhanced DocChat API Routes
 * Integrates intelligent query processing with existing Express routes
 */

import { Router } from 'express';
import { IntelligentDocChatOrchestrator, detectLanguage, type Language } from '../services/enhanced-docchat-processor';
import { isAuthenticated } from '../auth';
import { db } from '../db';
import { chats, messages, documents } from '@shared/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { streamSentences, streamText } from '../services/streamingUtils';
import { processWithVaktaAI, extractAnswerText, extractCitations } from '../services/vaktaai-integration';

const router = Router();
const docChatOrchestrator = new IntelligentDocChatOrchestrator();

/**
 * Post-process AI response for better Hinglish
 */
function enhanceHinglishResponse(response: string, language: Language): string {
  if (language !== 'hinglish') return response;

  // Remove unwanted formal translations
  response = response.replace(/,?\s*or\s+"[^"]+"\s+in Hindi,?/gi, '');
  response = response.replace(/,?\s*or\s+'[^']+'\s+in Hindi,?/gi, '');
  response = response.replace(/\(in Hindi:?[^)]+\)/gi, '');
  response = response.replace(/\(Hindi:?[^)]+\)/gi, '');

  // Remove Sanskrit translations
  response = response.replace(/\(Vidhut Avesh\)/gi, '');
  response = response.replace(/,?\s*known as\s+"[^"]+"\s+in Hindi,?/gi, '');

  // Ensure conversational tone markers
  if (!response.match(/\b(dekho|basically|matlab|yaani|samajh|chaliye|toh|agar|jab)\b/i)) {
    // Add conversational opener if missing and starts with formal English
    if (response.match(/^[A-Z][a-z]+\s+(is|are|has|have|was|were)\b/)) {
      response = 'Dekho, ' + response.charAt(0).toLowerCase() + response.slice(1);
    }
  }

  return response;
}

/**
 * Enhanced DocChat Session Endpoint
 * Handles intelligent query processing and streaming responses
 */
router.post('/docchat/enhanced-session', isAuthenticated, async (req, res) => {
  try {
    const { chatId, query, documentIds } = req.body;

    // Validation
    if (!chatId || !query || !documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({
        error: 'Missing required fields: chatId, query, documentIds'
      });
    }

    // Verify chat ownership
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, req.user!.id)
      ))
      .limit(1);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify document access
    const userDocuments = await db
      .select()
      .from(documents)
      .where(and(
        inArray(documents.id, documentIds),
        eq(documents.userId, req.user!.id)
      ));

    if (userDocuments.length === 0) {
      return res.status(403).json({ error: 'No accessible documents found' });
    }

    const accessibleDocIds = userDocuments.map(doc => doc.id);

    // ============ START STREAMING IMMEDIATELY ============

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send immediate "thinking" indicator
    res.write(`data: ${JSON.stringify({ type: 'thinking' })}\n\n`);

    // ============ LANGUAGE DETECTION (FIRST) ============

    console.log(`[Enhanced DocChat] Processing query: "${query}"`);
    console.log(`[Enhanced DocChat] Document IDs: ${accessibleDocIds.join(', ')}`);

    // Get conversation history FIRST for language detection
    const conversationHistory = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(20);

    // Reverse to get chronological order (oldest first)
    conversationHistory.reverse();

    // Detect current query language
    const currentLanguage = detectLanguage(query);
    console.log(`[Language] Current query detected: ${currentLanguage}`);

    // Detect conversation language (from previous messages + current)
    let conversationLanguage: Language = currentLanguage;
    if (conversationHistory.length > 0) {
      const recentUserMessages = conversationHistory
        .filter(msg => msg.role === 'user')
        .slice(-3); // Last 3 user messages

      if (recentUserMessages.length > 0) {
        const languages = recentUserMessages.map(msg =>
          detectLanguage(msg.content)
        );

        // Count language occurrences
        const langCount: Record<Language, number> = {
          english: languages.filter(l => l === 'english').length,
          hindi: languages.filter(l => l === 'hindi').length,
          hinglish: languages.filter(l => l === 'hinglish').length
        };

        // Use majority language from history, with current language as tiebreaker
        conversationLanguage = Object.entries(langCount).reduce((a, b) =>
          langCount[a[0] as Language] > langCount[b[0] as Language] ? a : b
        )[0] as Language;

        // If conversation was in one language but current query is in another, use current
        // (user might be switching language intentionally)
        if (currentLanguage !== conversationLanguage) {
          console.log(`[Language] Language switch detected: ${conversationLanguage} → ${currentLanguage}`);
          conversationLanguage = currentLanguage;
        }
      }
    }

    console.log(`[Language] Final language for response: ${conversationLanguage}`);

    // ============ INTELLIGENT QUERY PROCESSING ============

    const {
      classification,
      searchResults,
      documentStructures,
      promptContext
    } = await docChatOrchestrator.processQuery(query, accessibleDocIds, conversationLanguage);

    console.log(`[Enhanced DocChat] Intent: ${classification.intent} (confidence: ${classification.confidence.toFixed(2)})`);
    console.log(`[Enhanced DocChat] Retrieved ${searchResults.length} chunks`);
    console.log(`[Enhanced DocChat] Expanded queries: ${classification.expandedQueries.length}`);

    // ============ FORMAT CONVERSATION HISTORY FOR AI ============

    // Format existing conversation history (all previous messages)
    const conversationMessages = conversationHistory
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    console.log(`[Enhanced DocChat] Conversation history: ${conversationMessages.length} messages`);

    // ============ FOLLOW-UP QUERY DETECTION ============
    // Detect if this is a follow-up query (references previous conversation)
    const followUpKeywords = /^(samjhao|samjha|brief|bata|batao|bataye|explain this|isme|uske|iske|ispe|uspe|tell me more|aur|more|iske bare|uske bare|iske baare|explain|elaborate|detail|expand|continue|aage|piche|why|kyon|kyun|how|kaise)/i;
    const questionStarters = /^(what is|what are|who is|who are|when|where|which|tell me about|define|explain what is|kya hai|kya hota|kon hai|kab|kahan|kaun|kis cheez)/i;

    // Count previous user messages (not total messages)
    const previousUserMessages = conversationHistory.filter(msg => msg.role === 'user');
    const hasConversationContext = previousUserMessages.length > 0;

    // A query is a follow-up if:
    // 1. There's previous conversation AND
    // 2. (It starts with follow-up keywords OR it's short and doesn't start with question words)
    const isFollowUpQuery = hasConversationContext &&
      (followUpKeywords.test(query.trim()) ||
       (!questionStarters.test(query.trim()) && query.trim().split(/\s+/).length <= 8));

    console.log(`[Enhanced DocChat] Follow-up detection: hasContext=${hasConversationContext}, isFollowUp=${isFollowUpQuery}`);

    // Add current query - for follow-ups use just the query, for new questions use full context
    if (isFollowUpQuery) {
      // ✅ For follow-ups, just add the query (AI uses conversation history for context)
      console.log(`[Enhanced DocChat] Detected FOLLOW-UP query - AI will use conversation history`);
      conversationMessages.push({
        role: 'user',
        content: query
      });
    } else {
      // ✅ For new questions, add full context with document information
      console.log(`[Enhanced DocChat] Detected NEW question - providing full document context`);
      conversationMessages.push({
        role: 'user',
        content: promptContext.userPrompt
      });
    }

    // ============ SAVE USER MESSAGE (after formatting conversation) ============

    await db
      .insert(messages)
      .values({
        chatId,
        role: 'user',
        content: query,
        metadata: {
          intent: classification.intent,
          confidence: classification.confidence,
          language: currentLanguage,
          conversationLanguage: conversationLanguage,
          expandedQueries: classification.expandedQueries,
          chunkCount: searchResults.length,
          isFollowUp: isFollowUpQuery
        }
      })
      .returning();

    // ============ STREAM AI RESPONSE ============

    let fullResponse = '';
    let citationsUsed: Array<{
      text: string;
      source: string;
      page?: number;
    }> = [];

    try {
      // PHASE 3: Stream response sentence-by-sentence for smoother UX
      await streamSentences(
        conversationMessages,
        promptContext.systemPrompt,
        (sentence) => {
          fullResponse += sentence + ' '; // Add space between sentences
          res.write(`data: ${JSON.stringify({ type: 'sentence', content: sentence })}\n\n`);
        },
        {
          temperature: 0.7,
          maxTokens: 2048
        }
      );

      // Extract citations from search results (format: { text, source, page })
      citationsUsed = searchResults.slice(0, 5).map(result => ({
        text: result.content.substring(0, 150) + '...',
        source: result.documentTitle || `Chunk ${result.chunkId}`,
        ...(result.pageNumber && { page: result.pageNumber })
      }));

      // Send metadata
      res.write(`data: ${JSON.stringify({
        type: 'metadata',
        intent: classification.intent,
        confidence: classification.confidence,
        chunksRetrieved: searchResults.length,
        citations: citationsUsed,
        documentStructures: documentStructures.map(ds => ({
          title: ds.title,
          chapters: ds.chapters.length,
          keyTopics: ds.keyTopics.slice(0, 5)
        }))
      })}\n\n`);

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

      // ============ SAVE ASSISTANT MESSAGE ============

      // Post-process response for better Hinglish
      fullResponse = enhanceHinglishResponse(fullResponse.trim(), conversationLanguage);

      await db
        .insert(messages)
        .values({
          chatId,
          role: 'assistant',
          content: fullResponse,
          metadata: {
            intent: classification.intent,
            confidence: classification.confidence,
            language: conversationLanguage,
            chunkCount: searchResults.length,
            citations: citationsUsed,
            model: 'enhanced-docchat'
          }
        });

      res.end();

    } catch (error) {
      console.error('[Enhanced DocChat] Streaming error:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Failed to generate response'
      })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('[Enhanced DocChat] Error:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * Get Query Suggestions based on document content
 */
router.get('/docchat/suggestions/:documentId', isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);

    // Verify document access
    const [document] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.userId, req.user!.id)
      ))
      .limit(1);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get document structure
    const structure = await (docChatOrchestrator as any).structureAnalyzer.analyzeDocument(documentId);

    // Generate smart suggestions
    const suggestions: string[] = [];

    // General suggestions
    suggestions.push(`${document.title} me kya hai?`);
    suggestions.push(`Summarize the main points`);

    // Chapter-based suggestions
    if (structure.chapters.length > 0) {
      suggestions.push(`Explain ${structure.chapters[0].title}`);
      if (structure.chapters.length > 1) {
        suggestions.push(`What is ${structure.chapters[1].title}?`);
      }
    }

    // Topic-based suggestions
    if (structure.keyTopics.length > 0) {
      suggestions.push(`Tell me about ${structure.keyTopics[0]}`);
      if (structure.keyTopics.length > 1) {
        suggestions.push(`Difference between ${structure.keyTopics[0]} and ${structure.keyTopics[1]}`);
      }
    }

    // Type-specific suggestions
    if (document.mimeType?.includes('pdf')) {
      suggestions.push('What are the important formulas?');
      suggestions.push('Give me practice questions');
    }

    res.json({
      suggestions: suggestions.slice(0, 6),
      documentStructure: {
        title: structure.title,
        chapters: structure.chapters.length,
        keyTopics: structure.keyTopics.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('[DocChat Suggestions] Error:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze Query Intent (for debugging/testing)
 */
router.post('/docchat/analyze-intent', isAuthenticated, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const queryProcessor = (docChatOrchestrator as any).queryProcessor;
    const classification = queryProcessor.classifyQuery(query);

    res.json({
      query,
      classification: {
        intent: classification.intent,
        confidence: classification.confidence,
        expandedQueries: classification.expandedQueries,
        requiresComprehensiveContext: classification.requiresComprehensiveContext,
        suggestedChunkCount: classification.suggestedChunkCount
      }
    });

  } catch (error) {
    console.error('[Intent Analysis] Error:', error);
    res.status(500).json({
      error: 'Failed to analyze intent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get Document Structure Analysis
 */
router.get('/docchat/structure/:documentId', isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);

    // Verify document access
    const [document] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.userId, req.user!.id)
      ))
      .limit(1);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Analyze document structure
    const structure = await (docChatOrchestrator as any).structureAnalyzer.analyzeDocument(documentId);

    res.json({
      success: true,
      structure
    });

  } catch (error) {
    console.error('[Document Structure] Error:', error);
    res.status(500).json({
      error: 'Failed to analyze document structure',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * VaktaAI Orchestrator Endpoint with Streaming
 * Uses the VaktaAI prompt system for enhanced DocChat with real-time streaming
 * Features:
 * - Multi-LLM routing (GPT-4o, Gemini, Claude based on task)
 * - Evidence-first RAG with strict citations
 * - Bilingual auto-switch (English/Hindi/Hinglish)
 * - Math & fact verification gates
 * - Auto-regeneration with fallbacks
 * - Server-Sent Events (SSE) for real-time streaming
 */
router.post('/docchat/vaktaai/stream', isAuthenticated, async (req, res) => {
  try {
    const { chatId, query, documentIds, language = 'auto', subject, board = 'CBSE', classLevel = 11 } = req.body;

    // Validation
    if (!chatId || !query || !documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({
        error: 'Missing required fields: chatId, query, documentIds'
      });
    }

    // Verify chat ownership
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, req.user!.id)
      ))
      .limit(1);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify document access
    const userDocuments = await db
      .select()
      .from(documents)
      .where(and(
        inArray(documents.id, documentIds),
        eq(documents.userId, req.user!.id)
      ));

    if (userDocuments.length === 0) {
      return res.status(403).json({ error: 'No accessible documents found' });
    }

    const accessibleDocIds = userDocuments.map(doc => parseInt(doc.id));

    // Set up SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send immediate "thinking" indicator
    res.write(`data: ${JSON.stringify({ type: 'thinking' })}\n\n`);

    console.log(`[VaktaAI Stream] Processing query: "${query}"`);
    console.log(`[VaktaAI Stream] Language: ${language}, Subject: ${subject || 'auto'}`);
    console.log(`[VaktaAI Stream] Document IDs: ${accessibleDocIds.join(', ')}`);

    try {
      // Process query with VaktaAI orchestrator
      const result = await processWithVaktaAI(
        query,
        accessibleDocIds,
        language,
        subject || chat.subject || undefined,
        board,
        classLevel
      );

      if (!result.success) {
        console.error('[VaktaAI Stream] Orchestrator error:', result.error);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: result.error?.message || 'Failed to generate response',
          code: result.error?.code
        })}\n\n`);
        res.end();
        return;
      }

      // Extract answer and citations
      const answerText = extractAnswerText(result);
      const citations = extractCitations(result);

      console.log(`[VaktaAI Stream] Success! Confidence: ${result.metadata.confidence_score}`);
      console.log(`[VaktaAI Stream] Model used: ${result.metadata.model_used}`);
      console.log(`[VaktaAI Stream] Latency: ${result.metadata.total_latency_ms}ms`);

      // Stream the answer sentence by sentence
      await streamText(answerText, (sentence: string) => {
        res.write(`data: ${JSON.stringify({
          type: 'content',
          content: sentence
        })}\n\n`);
      });

      // Send metadata
      res.write(`data: ${JSON.stringify({
        type: 'metadata',
        metadata: {
          model: result.metadata.model_used,
          confidence: result.metadata.confidence_score,
          latency_ms: result.metadata.total_latency_ms,
          language: result.metadata.language_detected || language,
          vaktaai: true,
        }
      })}\n\n`);

      // Send citations
      if (citations.length > 0) {
        res.write(`data: ${JSON.stringify({
          type: 'citations',
          citations
        })}\n\n`);
      }

      // Send completion
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

      // Save messages to database
      await db.insert(messages).values({
        chatId,
        role: 'user',
        content: query,
        metadata: {
          timestamp: new Date().toISOString(),
          language: result.metadata.language_detected || language,
        }
      });

      await db.insert(messages).values({
        chatId,
        role: 'assistant',
        content: answerText,
        metadata: {
          timestamp: new Date().toISOString(),
          language: result.metadata.language_detected || language,
          model: result.metadata.model_used,
          confidence: result.metadata.confidence_score,
          latency_ms: result.metadata.total_latency_ms,
          vaktaai: true,
        }
      });

      res.end();

    } catch (error) {
      console.error('[VaktaAI Stream] Processing error:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Failed to process query'
      })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('[VaktaAI Stream] Error:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * VaktaAI Orchestrator Endpoint (Non-streaming)
 * Uses the VaktaAI prompt system for enhanced DocChat with:
 * - Multi-LLM routing (GPT-4o, Gemini, Claude based on task)
 * - Evidence-first RAG with strict citations
 * - Bilingual auto-switch (English/Hindi/Hinglish)
 * - Math & fact verification gates
 * - Auto-regeneration with fallbacks
 */
router.post('/docchat/vaktaai', isAuthenticated, async (req, res) => {
  try {
    const { chatId, query, documentIds, language = 'auto', subject, board = 'CBSE', classLevel = 11 } = req.body;

    // Validation
    if (!chatId || !query || !documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({
        error: 'Missing required fields: chatId, query, documentIds'
      });
    }

    // Verify chat ownership
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, req.user!.id)
      ))
      .limit(1);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify document access
    const userDocuments = await db
      .select()
      .from(documents)
      .where(and(
        inArray(documents.id, documentIds),
        eq(documents.userId, req.user!.id)
      ));

    if (userDocuments.length === 0) {
      return res.status(403).json({ error: 'No accessible documents found' });
    }

    const accessibleDocIds = userDocuments.map(doc => parseInt(doc.id));

    console.log(`[VaktaAI Endpoint] Processing query: "${query}"`);
    console.log(`[VaktaAI Endpoint] Language: ${language}, Subject: ${subject || 'auto'}`);
    console.log(`[VaktaAI Endpoint] Document IDs: ${accessibleDocIds.join(', ')}`);

    // Process query with VaktaAI orchestrator
    const result = await processWithVaktaAI(
      query,
      accessibleDocIds,
      language,
      subject || chat.subject || undefined,
      board,
      classLevel
    );

    if (!result.success) {
      console.error('[VaktaAI Endpoint] Orchestrator error:', result.error);
      return res.status(500).json({
        error: 'Failed to generate response',
        details: result.error?.message,
        code: result.error?.code
      });
    }

    // Extract answer and citations
    const answerText = extractAnswerText(result);
    const citations = extractCitations(result);

    console.log(`[VaktaAI Endpoint] Success! Confidence: ${result.metadata.confidence_score}`);
    console.log(`[VaktaAI Endpoint] Model used: ${result.metadata.model_used}`);
    console.log(`[VaktaAI Endpoint] Latency: ${result.metadata.total_latency_ms}ms`);

    // Save user message
    await db.insert(messages).values({
      chatId,
      role: 'user',
      content: query,
      metadata: {
        timestamp: new Date().toISOString(),
        language: result.metadata.language_detected || language,
      }
    });

    // Save AI response
    await db.insert(messages).values({
      chatId,
      role: 'assistant',
      content: answerText,
      metadata: {
        timestamp: new Date().toISOString(),
        language: result.metadata.language_detected || language,
        model: result.metadata.model_used,
        confidence: result.metadata.confidence_score,
        latency_ms: result.metadata.total_latency_ms,
        vaktaai: true, // Flag to indicate VaktaAI processing
      }
    });

    // Return response
    res.json({
      success: true,
      answer: answerText,
      citations,
      metadata: {
        model: result.metadata.model_used,
        confidence: result.metadata.confidence_score,
        latency_ms: result.metadata.total_latency_ms,
        language: result.metadata.language_detected || language,
        vaktaai: true,
      }
    });

  } catch (error) {
    console.error('[VaktaAI Endpoint] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
