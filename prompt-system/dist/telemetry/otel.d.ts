/**
 * OpenTelemetry instrumentation for VaktaAI Prompt System
 * Single source of truth for distributed tracing
 */
export declare const tracer: import("@opentelemetry/api").Tracer;
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
export declare function withSpan<T>(name: string, attrs: Record<string, any>, fn: () => Promise<T>): Promise<T>;
/**
 * Synchronous version of withSpan
 */
export declare function withSpanSync<T>(name: string, attrs: Record<string, any>, fn: () => T): T;
/**
 * Add event to current active span
 */
export declare function addSpanEvent(name: string, attrs?: Record<string, any>): void;
/**
 * Set attribute on current active span
 */
export declare function setSpanAttribute(key: string, value: any): void;
//# sourceMappingURL=otel.d.ts.map