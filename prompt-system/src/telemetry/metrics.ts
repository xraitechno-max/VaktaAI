/**
 * Prometheus metrics for VaktaAI Prompt System
 * Drop-in instrumentation for production monitoring
 */

import { Counter, Histogram, Gauge, Registry } from 'prom-client';

export const registry = new Registry();

/**
 * Total responses by mode, subject, language, model, and status
 * Status: ok (passed first time) | regen (passed after regeneration) | fail (exhausted attempts)
 */
export const responsesTotal = new Counter({
  name: 'vaktaai_responses_total',
  help: 'Total orchestrator responses',
  labelNames: ['mode', 'subject', 'lang', 'model', 'status'],
  registers: [registry],
});

/**
 * Confidence score distribution
 * Target: 95%+ responses with confidence >= 0.82
 */
export const confidenceHist = new Histogram({
  name: 'vaktaai_confidence',
  help: 'Final confidence distribution',
  buckets: [0.5, 0.6, 0.7, 0.75, 0.8, 0.82, 0.85, 0.9, 0.95, 1.0],
  labelNames: ['mode', 'subject', 'model'],
  registers: [registry],
});

/**
 * Regeneration counter
 * Target: <15% regeneration rate
 */
export const regenTotal = new Counter({
  name: 'vaktaai_regenerations_total',
  help: 'Count of regenerations triggered',
  labelNames: ['mode', 'reason'], // reason: fact_unsupported | math_fail | citation_missing | low_conf
  registers: [registry],
});

/**
 * Language detection outcomes
 * Track detection accuracy and switch behavior
 */
export const langDetect = new Counter({
  name: 'vaktaai_language_detect_total',
  help: 'Language detection outcomes',
  labelNames: ['detected', 'switched', 'conf_bucket'], // conf_bucket: <0.6 | 0.6-0.75 | >=0.75
  registers: [registry],
});

/**
 * End-to-end latency
 * Target: p95 within 1.7-4.2s depending on mode
 */
export const latency = new Histogram({
  name: 'vaktaai_e2e_latency_ms',
  help: 'End-to-end latency in milliseconds',
  buckets: [400, 700, 1000, 1500, 1700, 2000, 2500, 3000, 3500, 4200, 6000],
  labelNames: ['mode', 'model'],
  registers: [registry],
});

/**
 * Citation validation success
 */
export const citationsOk = new Counter({
  name: 'vaktaai_citations_ok_total',
  help: 'Answers with valid citation coverage',
  labelNames: ['mode', 'subject'],
  registers: [registry],
});

/**
 * Citation validation failures
 */
export const citationsFail = new Counter({
  name: 'vaktaai_citations_fail_total',
  help: 'Answers missing or invalid citations',
  labelNames: ['mode', 'subject', 'reason'], // reason: none | format | not_in_evidence
  registers: [registry],
});

/**
 * RAG retrieval metrics
 */
export const ragRetrievalCount = new Histogram({
  name: 'vaktaai_rag_chunks_retrieved',
  help: 'Number of chunks retrieved from RAG',
  buckets: [0, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20],
  labelNames: ['mode', 'subject'],
  registers: [registry],
});

/**
 * RAG similarity scores
 */
export const ragSimilarity = new Histogram({
  name: 'vaktaai_rag_avg_similarity',
  help: 'Average similarity score of retrieved chunks',
  buckets: [0.0, 0.3, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0],
  labelNames: ['mode', 'subject'],
  registers: [registry],
});

/**
 * Model-specific call counts
 */
export const modelCalls = new Counter({
  name: 'vaktaai_model_calls_total',
  help: 'LLM API calls by model',
  labelNames: ['model', 'attempt'], // attempt: 1 | 2 | 3
  registers: [registry],
});

/**
 * Model latency
 */
export const modelLatency = new Histogram({
  name: 'vaktaai_model_latency_ms',
  help: 'LLM response latency',
  buckets: [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7000, 10000],
  labelNames: ['model'],
  registers: [registry],
});

/**
 * Token usage
 */
export const tokensUsed = new Counter({
  name: 'vaktaai_tokens_total',
  help: 'Total tokens consumed',
  labelNames: ['model', 'type'], // type: prompt | completion
  registers: [registry],
});

/**
 * Verification gate failures
 */
export const gateFailures = new Counter({
  name: 'vaktaai_gate_failures_total',
  help: 'Verification gate failures',
  labelNames: ['gate', 'reason'], // gate: fact | math | language
  registers: [registry],
});

/**
 * Current active requests (gauge)
 */
export const activeRequests = new Gauge({
  name: 'vaktaai_active_requests',
  help: 'Currently processing requests',
  labelNames: ['mode'],
  registers: [registry],
});

// Helper functions to record common metric patterns

/**
 * Record a successful response
 */
export function recordResponse(
  mode: string,
  subject: string,
  lang: string,
  model: string,
  confidence: number,
  regenerations: number,
  latencyMs: number
) {
  const status = regenerations === 0 ? 'ok' : regenerations <= 2 ? 'regen' : 'fail';

  responsesTotal.labels(mode, subject, lang, model, status).inc();
  confidenceHist.labels(mode, subject, model).observe(confidence);
  latency.labels(mode, model).observe(latencyMs);
}

/**
 * Record language detection
 */
export function recordLanguageDetection(detected: string, switched: boolean, confidence: number) {
  const confBucket = confidence < 0.6 ? '<0.6' : confidence < 0.75 ? '0.6-0.75' : '>=0.75';

  langDetect.labels(detected, String(switched), confBucket).inc();
}

/**
 * Record citation validation
 */
export function recordCitationValidation(
  mode: string,
  subject: string,
  passed: boolean,
  reason?: string
) {
  if (passed) {
    citationsOk.labels(mode, subject).inc();
  } else {
    citationsFail.labels(mode, subject, reason || 'unknown').inc();
  }
}

/**
 * Record RAG retrieval
 */
export function recordRAGRetrieval(mode: string, subject: string, chunkCount: number, avgSimilarity: number) {
  ragRetrievalCount.labels(mode, subject).observe(chunkCount);
  ragSimilarity.labels(mode, subject).observe(avgSimilarity);
}

/**
 * Record model call
 */
export function recordModelCall(
  model: string,
  attempt: number,
  latencyMs: number,
  promptTokens: number,
  completionTokens: number
) {
  modelCalls.labels(model, String(attempt)).inc();
  modelLatency.labels(model).observe(latencyMs);
  tokensUsed.labels(model, 'prompt').inc(promptTokens);
  tokensUsed.labels(model, 'completion').inc(completionTokens);
}

/**
 * Get all metrics as Prometheus exposition format
 */
export async function getMetrics(): Promise<string> {
  return await registry.metrics();
}

/**
 * Get content type for Prometheus metrics
 */
export function getContentType(): string {
  return registry.contentType;
}
