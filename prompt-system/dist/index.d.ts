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
import { type LLMService } from "./orchestrator.js";
import { type RAGService } from "./toolplan.js";
export type { OrchestratorTask, OrchestratorResult, TaskMode, Subject, Board, Language, DetectedLanguage, ModelName, Answer, FinalAnswer, PlanAnswer, EvidencePack, EvidenceChunk, } from "./contracts.js";
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
export declare function runOrchestrator(task: OrchestratorTask): Promise<OrchestratorResult>;
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
export declare function configureLLM(service: LLMService): void;
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
export declare function configureRAG(service: RAGService): void;
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
export declare function setLogLevel(level: "debug" | "info" | "warn" | "error"): void;
/**
 * Enable or disable logging
 *
 * @param enabled - Whether logging is enabled
 */
export declare function setLoggingEnabled(enabled: boolean): void;
/**
 * Get system version
 */
export declare function getVersion(): string;
/**
 * Health check - verify system is properly configured
 *
 * @returns Object with configuration status
 */
export declare function healthCheck(): {
    configured: boolean;
    llm_service: boolean;
    rag_service: boolean;
    version: string;
};
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
export declare function getPrometheusMetrics(): Promise<string>;
/**
 * Get the content type for Prometheus metrics endpoint
 *
 * @returns string - Content-Type header value for /metrics
 */
export declare function getPrometheusContentType(): string;
declare const _default: {
    runOrchestrator: typeof runOrchestrator;
    configureLLM: typeof configureLLM;
    configureRAG: typeof configureRAG;
    setLogLevel: typeof setLogLevel;
    setLoggingEnabled: typeof setLoggingEnabled;
    getVersion: typeof getVersion;
    healthCheck: typeof healthCheck;
    getPrometheusMetrics: typeof getPrometheusMetrics;
    getPrometheusContentType: typeof getPrometheusContentType;
};
export default _default;
//# sourceMappingURL=index.d.ts.map