/**
 * Main Orchestrator for VaktaAI Dynamic Prompt System
 * Coordinates: language detection → routing → prompt building → LLM call → verification → final answer
 */
import type { OrchestratorTask, OrchestratorResult } from "./contracts.js";
export interface LLMService {
    generate(messages: any[], model: string, temperature: number, maxTokens: number): Promise<{
        text: string;
        usage: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        };
        latency_ms: number;
    }>;
}
export declare class Orchestrator {
    private llmService;
    private readonly MAX_REGENERATIONS;
    /**
     * Set LLM service implementation
     */
    setLLMService(service: LLMService): void;
    /**
     * Main orchestration flow
     */
    run(task: OrchestratorTask): Promise<OrchestratorResult>;
    /**
     * Generate draft answer from LLM
     */
    private generateDraft;
    /**
     * Create final answer from verified draft
     */
    private createFinalAnswer;
    /**
     * Create error result
     */
    private createErrorResult;
    /**
     * Create mock draft for testing
     */
    private createMockDraft;
}
export declare const orchestrator: Orchestrator;
//# sourceMappingURL=orchestrator.d.ts.map