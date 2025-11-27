/**
 * OpenTelemetry instrumentation for VaktaAI Prompt System
 * Single source of truth for distributed tracing
 */
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { trace, SpanStatusCode } from '@opentelemetry/api';
// Enable OpenTelemetry diagnostics
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
export const tracer = trace.getTracer('vaktaai-orchestrator', '1.0.0');
/**
 * Wrap async function with OpenTelemetry span
 *
 * @param name - Span name (e.g., 'orchestrator.run', 'lang.detect')
 * @param attrs - Span attributes for filtering/grouping
 * @param fn - Async function to wrap
 * @returns Result of fn with automatic span management
 *
 * @example
 * const result = await withSpan('router.decide', { mode: 'solve' }, async () => {
 *   return router.route(task);
 * });
 */
export async function withSpan(name, attrs, fn) {
    const span = tracer.startSpan(name);
    // Set attributes
    Object.entries(attrs || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
            span.setAttribute(k, String(v));
        }
    });
    try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
    }
    catch (err) {
        span.recordException(err);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: String(err?.message || err),
        });
        span.end();
        throw err;
    }
}
/**
 * Synchronous version of withSpan
 */
export function withSpanSync(name, attrs, fn) {
    const span = tracer.startSpan(name);
    Object.entries(attrs || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
            span.setAttribute(k, String(v));
        }
    });
    try {
        const result = fn();
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
    }
    catch (err) {
        span.recordException(err);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: String(err?.message || err),
        });
        span.end();
        throw err;
    }
}
/**
 * Add event to current active span
 */
export function addSpanEvent(name, attrs) {
    const span = trace.getActiveSpan();
    if (span) {
        span.addEvent(name, attrs);
    }
}
/**
 * Set attribute on current active span
 */
export function setSpanAttribute(key, value) {
    const span = trace.getActiveSpan();
    if (span) {
        span.setAttribute(key, String(value));
    }
}
//# sourceMappingURL=otel.js.map