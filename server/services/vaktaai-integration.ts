/**
 * VaktaAI Prompt System Integration
 * Wraps the VaktaAI prompt system for use in enhanced DocChat
 *
 * Features:
 * - Multi-LLM routing (GPT-4o, Gemini, Claude based on task)
 * - Evidence-first RAG with strict citations
 * - Bilingual auto-switch (English/Hindi/Hinglish)
 * - Math & fact verification gates
 * - Auto-regeneration with fallbacks
 */

import {
  runOrchestrator,
  configureLLM,
  configureRAG,
  type OrchestratorTask,
  type OrchestratorResult,
  type TaskMode,
  type Subject,
  type Board,
  type Language,
  type LLMService,
  type RAGService,
} from '../../prompt-system/dist/index.js';
import OpenAI from 'openai';
import { documentService } from './documentService.js';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Please add it to your secrets.');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Map our language codes to VaktaAI language codes
 */
function mapLanguage(lang: string): Language {
  switch (lang.toLowerCase()) {
    case 'en':
    case 'english':
      return 'en';
    case 'hi':
    case 'hindi':
      return 'hi';
    case 'hinglish':
      return 'hinglish';
    default:
      return 'auto'; // Auto-detect
  }
}

/**
 * Map our subject names to VaktaAI subject codes
 */
function mapSubject(subject?: string): Subject {
  if (!subject) return 'General';

  const subjectLower = subject.toLowerCase();
  if (subjectLower.includes('phys')) return 'Physics';
  if (subjectLower.includes('chem')) return 'Chemistry';
  if (subjectLower.includes('bio')) return 'Biology';
  if (subjectLower.includes('math')) return 'Mathematics';
  // Computer Science maps to General since it's not in the Subject type
  if (subjectLower.includes('comp') || subjectLower.includes('cs')) return 'General';

  return 'General';
}

/**
 * Configure LLM service using OpenAI
 */
const llmService: LLMService = {
  async generate(messages: any[], model: string, temperature: number, maxTokens: number) {
    const start = Date.now();

    try {
      // Map model names if needed
      let openaiModel = model;

      // Map VaktaAI model names to OpenAI models
      if (model === 'grok-2-math') {
        openaiModel = 'gpt-4o'; // Use GPT-4o for math (Grok not available via OpenAI)
      } else if (model === 'gemini-1.5-flash') {
        openaiModel = 'gpt-4o-mini'; // Use GPT-4o-mini as fast alternative
      } else if (model === 'gemini-1.5-pro') {
        openaiModel = 'gpt-4o';
      } else if (model === 'claude-3.5-sonnet') {
        openaiModel = 'gpt-4o'; // Use GPT-4o instead of Claude (not available via OpenAI)
      }

      const response = await getOpenAI().chat.completions.create({
        model: openaiModel,
        messages: messages as any,
        temperature,
        max_tokens: maxTokens,
      });

      return {
        text: response.choices[0].message.content || '',
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
        latency_ms: Date.now() - start,
      };
    } catch (error) {
      console.error('[VaktaAI LLM] Error generating response:', error);
      throw error;
    }
  }
};

/**
 * Configure RAG service using our documentService
 */
const ragService: RAGService = {
  async retrieve(query: string, filters: Record<string, any>, topK: number) {
    try {
      console.log(`[VaktaAI RAG] Retrieving top ${topK} chunks for query:`, query.substring(0, 50));
      console.log('[VaktaAI RAG] Filters:', filters);

      // Use documentService to retrieve chunks
      // Filters should contain: { board, class, subject, chapter?, doc_ids?, user_id? }
      const docIds = filters.doc_ids as string[] | undefined;
      const userId = filters.user_id as string | undefined;

      if (!docIds || docIds.length === 0 || !userId) {
        console.warn('[VaktaAI RAG] No doc_ids or user_id provided, returning empty results');
        return [];
      }

      // Retrieve relevant chunks using semantic search
      const results = await documentService.retrieveRelevantChunks(
        query,
        userId,
        docIds,
        topK
      );

      // Map to VaktaAI format
      return results.map((r, index) => ({
        chunk_id: `chunk_${index}`,
        text: r.text,
        citation: r.metadata?.docTitle || r.metadata?.source || 'Unknown Source',
        metadata: {
          doc_title: r.metadata?.docTitle,
          page: r.metadata?.page,
          chapter: r.metadata?.section,
        },
        similarity_score: r.score,
      }));
    } catch (error) {
      console.error('[VaktaAI RAG] Error retrieving chunks:', error);
      return []; // Return empty array on error (graceful degradation)
    }
  }
};

// Configure services once on module load
configureLLM(llmService);
configureRAG(ragService);

console.log('[VaktaAI] Integration configured successfully');

/**
 * Process a DocChat query using VaktaAI orchestrator
 *
 * @param userMessage - User's question
 * @param docIds - Document IDs to search
 * @param language - Preferred language (en, hi, hinglish, auto)
 * @param subject - Subject context (optional)
 * @param board - Educational board (optional, defaults to "CBSE")
 * @param classLevel - Class level (optional, defaults to 11)
 * @returns Promise<OrchestratorResult> - VaktaAI orchestrator result
 */
export async function processWithVaktaAI(
  userMessage: string,
  docIds: number[],
  language: string = 'auto',
  subject?: string,
  board: string = 'CBSE',
  classLevel: number = 11,
  userId?: string
): Promise<OrchestratorResult> {
  try {
    console.log('[VaktaAI] Processing query with VaktaAI orchestrator');
    console.log('[VaktaAI] Language:', language, '→', mapLanguage(language));
    console.log('[VaktaAI] Subject:', subject, '→', mapSubject(subject));

    // Convert number[] to string[] for compatibility
    const docIdsAsStrings = docIds.map(id => id.toString());

    const task: OrchestratorTask = {
      user_msg: userMessage,
      mode: 'docchat' as TaskMode, // Document Q&A mode
      subject: mapSubject(subject),
      board: board as Board,
      class: classLevel,
      lang: mapLanguage(language),
      context: {
        doc_ids: docIdsAsStrings,
        // Note: user_id is passed via RAG service filters instead
      },
      signals: {
        numeric: false, // Detect if query requires math
        complexity: 'medium',
      },
      session: userId ? {
        user_id: userId,
      } : undefined,
    };

    const result = await runOrchestrator(task);

    console.log('[VaktaAI] Orchestrator result:', {
      success: result.success,
      confidence: result.metadata?.confidence_score,
      model: result.metadata?.model_used,
      latency: result.metadata?.total_latency_ms,
    });

    return result;
  } catch (error) {
    console.error('[VaktaAI] Error in orchestrator:', error);

    // Return error result
    return {
      success: false,
      error: {
        code: 'ORCHESTRATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error in VaktaAI orchestrator',
      },
      metadata: {
        total_latency_ms: 0,
        model_used: 'unknown',
        regeneration_count: 0,
        language_detected: 'english' as const,
        confidence_score: 0,
      },
    };
  }
}

/**
 * Extract a simple answer text from VaktaAI result
 * Handles both FinalAnswer and PlanAnswer types
 */
export function extractAnswerText(result: OrchestratorResult): string {
  if (!result.success) {
    return `Error: ${result.error?.message || 'Unknown error'}`;
  }

  if (!result.answer) {
    return 'No answer generated';
  }

  // Check if it's a FinalAnswer (has answer_text)
  if ('answer_text' in result.answer) {
    return result.answer.answer_text;
  }

  // Check if it's a PlanAnswer (has plan_overview)
  if ('plan_overview' in result.answer) {
    const planOverview = (result.answer as any).plan_overview;
    return typeof planOverview === 'string' ? planOverview : JSON.stringify(planOverview);
  }

  return 'Unable to extract answer text';
}

/**
 * Extract citations from VaktaAI result
 */
export function extractCitations(result: OrchestratorResult): Array<{ text: string; source: string; page?: number }> {
  if (!result.success || !result.answer) {
    return [];
  }

  // Check if answer has citations
  if ('citations' in result.answer && Array.isArray(result.answer.citations)) {
    return result.answer.citations.map(citation => {
      // Handle both string citations and Citation objects
      if (typeof citation === 'string') {
        return {
          text: citation.substring(0, 150) + '...',
          source: citation,
        };
      } else {
        // Citation is an object with citation_id, doc_title, page, excerpt
        return {
          text: citation.excerpt?.substring(0, 150) + '...' || 'No excerpt',
          source: citation.doc_title || citation.citation_id,
          page: citation.page,
        };
      }
    });
  }

  return [];
}
