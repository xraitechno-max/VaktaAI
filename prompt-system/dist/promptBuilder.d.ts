/**
 * Prompt Builder for VaktaAI Dynamic Prompt System
 * Loads templates and assembles prompts with evidence injection
 */
import type { OrchestratorTask, PromptBuilderOutput, EvidencePack, DetectedLanguage } from "./contracts.js";
export declare class PromptBuilder {
    private templateCache;
    /**
     * Build complete prompt from template and evidence
     */
    build(task: OrchestratorTask, evidence: EvidencePack, language: DetectedLanguage): PromptBuilderOutput;
    /**
     * Load template from file
     */
    private loadTemplate;
    /**
     * Assemble system prompt from template
     */
    private assembleSystemPrompt;
    /**
     * Process conditional blocks in template
     */
    private processConditional;
    /**
     * Assemble user prompt with evidence
     */
    private assembleUserPrompt;
    /**
     * Estimate token count (rough heuristic: ~4 chars per token)
     */
    private estimateTokens;
    /**
     * Generic fallback template
     */
    private getGenericTemplate;
}
export declare const promptBuilder: PromptBuilder;
//# sourceMappingURL=promptBuilder.d.ts.map