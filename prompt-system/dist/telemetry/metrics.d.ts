/**
 * Prometheus metrics for VaktaAI Prompt System
 * Drop-in instrumentation for production monitoring
 */
import { Counter, Histogram, Gauge, Registry } from 'prom-client';
export declare const registry: Registry<"text/plain; version=0.0.4; charset=utf-8">;
/**
 * Total responses by mode, subject, language, model, and status
 * Status: ok (passed first time) | regen (passed after regeneration) | fail (exhausted attempts)
 */
export declare const responsesTotal: Counter<"mode" | "subject" | "lang" | "model" | "status">;
/**
 * Confidence score distribution
 * Target: 95%+ responses with confidence >= 0.82
 */
export declare const confidenceHist: Histogram<"mode" | "subject" | "model">;
/**
 * Regeneration counter
 * Target: <15% regeneration rate
 */
export declare const regenTotal: Counter<"mode" | "reason">;
/**
 * Language detection outcomes
 * Track detection accuracy and switch behavior
 */
export declare const langDetect: Counter<"detected" | "switched" | "conf_bucket">;
/**
 * End-to-end latency
 * Target: p95 within 1.7-4.2s depending on mode
 */
export declare const latency: Histogram<"mode" | "model">;
/**
 * Citation validation success
 */
export declare const citationsOk: Counter<"mode" | "subject">;
/**
 * Citation validation failures
 */
export declare const citationsFail: Counter<"mode" | "subject" | "reason">;
/**
 * RAG retrieval metrics
 */
export declare const ragRetrievalCount: Histogram<"mode" | "subject">;
/**
 * RAG similarity scores
 */
export declare const ragSimilarity: Histogram<"mode" | "subject">;
/**
 * Model-specific call counts
 */
export declare const modelCalls: Counter<"attempt" | "model">;
/**
 * Model latency
 */
export declare const modelLatency: Histogram<"model">;
/**
 * Token usage
 */
export declare const tokensUsed: Counter<"type" | "model">;
/**
 * Verification gate failures
 */
export declare const gateFailures: Counter<"reason" | "gate">;
/**
 * Current active requests (gauge)
 */
export declare const activeRequests: Gauge<"mode">;
/**
 * Record a successful response
 */
export declare function recordResponse(mode: string, subject: string, lang: string, model: string, confidence: number, regenerations: number, latencyMs: number): void;
/**
 * Record language detection
 */
export declare function recordLanguageDetection(detected: string, switched: boolean, confidence: number): void;
/**
 * Record citation validation
 */
export declare function recordCitationValidation(mode: string, subject: string, passed: boolean, reason?: string): void;
/**
 * Record RAG retrieval
 */
export declare function recordRAGRetrieval(mode: string, subject: string, chunkCount: number, avgSimilarity: number): void;
/**
 * Record model call
 */
export declare function recordModelCall(model: string, attempt: number, latencyMs: number, promptTokens: number, completionTokens: number): void;
/**
 * Get all metrics as Prometheus exposition format
 */
export declare function getMetrics(): Promise<string>;
/**
 * Get content type for Prometheus metrics
 */
export declare function getContentType(): string;
//# sourceMappingURL=metrics.d.ts.map