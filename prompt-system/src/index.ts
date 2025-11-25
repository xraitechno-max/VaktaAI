/**
 * VaktaAI Dynamic Prompt System
 * Main entry point and public API
 *
 * Production-grade prompt orchestration for Indian EdTech (CBSE 6-12 + JEE/NEET)
 * Features:
 * - Multi-LLM routing (GPT, Gemini, Grok, Claude)
 * - Evidence-first RAG with strict citations
 * - Bilingual auto-switch (English ↔ Hindi/Hinglish)
 * - Math & fact verification gates
 * - Regeneration with tightened constraints
 */

import type { OrchestratorTask, OrchestratorResult } from "./contracts.js";
import { orchestrator, type LLMService } from "./orchestrator.js";
import { toolPlanner, type RAGService } from "./toolplan.js";
import { logger } from "./utils/log.js";
import { getMetrics, getContentType } from "./telemetry/metrics.js";

// Re-export types
export type {
  OrchestratorTask,
  OrchestratorResult,
  TaskMode,
  Subject,
  Board,
  Language,
  DetectedLanguage,
  ModelName,
  Answer,
  FinalAnswer,
  PlanAnswer,
  EvidencePack,
  EvidenceChunk,
} from "./contracts.js";

export type { LLMService, RAGService };

/**
 * Main function: Run the orchestrator
 *
 * @param task - The orchestrator task with user query and context
 * @returns Promise<OrchestratorResult> - Final answer or error
 *
 * @example
 * ```typescript
 * const result = await runOrchestrator({
 *   user_msg: "What is Newton's second law?",
 *   mode: "explain",
 *   subject: "Physics",
 *   board: "CBSE",
 *   class: 11,
 *   lang: "hinglish"
 * });
 *
 * if (result.success) {
 *   console.log(result.answer.answer_text);
 *   console.log("Confidence:", result.metadata.confidence_score);
 * }
 * ```
 */
export async function runOrchestrator(task: OrchestratorTask): Promise<OrchestratorResult> {
  return await orchestrator.run(task);
}

/**
 * Configure LLM service for actual API calls
 *
 * @param service - Implementation of LLMService interface
 *
 * @example
 * ```typescript
 * import OpenAI from 'openai';
 *
 * const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *
 * configureLLM({
 *   async generate(messages, model, temperature, maxTokens) {
 *     const start = Date.now();
 *     const response = await openai.chat.completions.create({
 *       model,
 *       messages,
 *       temperature,
 *       max_tokens: maxTokens,
 *     });
 *
 *     return {
 *       text: response.choices[0].message.content || '',
 *       usage: {
 *         prompt_tokens: response.usage?.prompt_tokens || 0,
 *         completion_tokens: response.usage?.completion_tokens || 0,
 *         total_tokens: response.usage?.total_tokens || 0,
 *       },
 *       latency_ms: Date.now() - start,
 *     };
 *   }
 * });
 * ```
 */
export function configureLLM(service: LLMService): void {
  orchestrator.setLLMService(service);
  logger.info("LLM service configured");
}

/**
 * Configure RAG service for document retrieval
 *
 * @param service - Implementation of RAGService interface
 *
 * @example
 * ```typescript
 * configureRAG({
 *   async retrieve(query, filters, topK) {
 *     // Your vector database query here
 *     const results = await vectorDB.search({
 *       query,
 *       filters,
 *       limit: topK,
 *     });
 *
 *     return results.map(r => ({
 *       chunk_id: r.id,
 *       text: r.text,
 *       citation: r.metadata.citation,
 *       metadata: r.metadata,
 *       similarity_score: r.score,
 *     }));
 *   }
 * });
 * ```
 */
export function configureRAG(service: RAGService): void {
  toolPlanner.setRAGService(service);
  logger.info("RAG service configured");
}

/**
 * Configure logging level
 *
 * @param level - Log level: 'debug' | 'info' | 'warn' | 'error'
 *
 * @example
 * ```typescript
 * setLogLevel('debug'); // Show all logs
 * setLogLevel('warn');  // Only warnings and errors
 * ```
 */
export function setLogLevel(level: "debug" | "info" | "warn" | "error"): void {
  logger.setLevel(level);
}

/**
 * Enable or disable logging
 *
 * @param enabled - Whether logging is enabled
 */
export function setLoggingEnabled(enabled: boolean): void {
  logger.setEnabled(enabled);
}

/**
 * Get system version
 */
export function getVersion(): string {
  return "1.0.0";
}

/**
 * Health check - verify system is properly configured
 *
 * @returns Object with configuration status
 */
export function healthCheck(): {
  configured: boolean;
  llm_service: boolean;
  rag_service: boolean;
  version: string;
} {
  return {
    configured: true,
    llm_service: (orchestrator as any).llmService !== null,
    rag_service: (toolPlanner as any).ragService !== null,
    version: getVersion(),
  };
}

/**
 * Get Prometheus metrics in exposition format
 *
 * Expose this at GET /metrics for Prometheus scraping
 *
 * @returns Promise<string> - Prometheus metrics text
 *
 * @example
 * ```typescript
 * // In Express.js
 * app.get('/metrics', async (req, res) => {
 *   const metrics = await getPrometheusMetrics();
 *   res.set('Content-Type', getPrometheusContentType());
 *   res.send(metrics);
 * });
 * ```
 */
export async function getPrometheusMetrics(): Promise<string> {
  return await getMetrics();
}

/**
 * Get the content type for Prometheus metrics endpoint
 *
 * @returns string - Content-Type header value for /metrics
 */
export function getPrometheusContentType(): string {
  return getContentType();
}

// Default export
export default {
  runOrchestrator,
  configureLLM,
  configureRAG,
  setLogLevel,
  setLoggingEnabled,
  getVersion,
  healthCheck,
  getPrometheusMetrics,
  getPrometheusContentType,
};
