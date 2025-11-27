/**
 * Acceptance Gate for VaktaAI Dynamic Prompt System
 * Verifies draft answers against fact, math, and language gates
 */
import type { DraftAnswer, VerifierReport, DetectedLanguage, TaskMode } from "./contracts.js";
export declare class AcceptanceGate {
    /**
     * Verify draft answer against all gates
     */
    verify(draft: DraftAnswer, targetLanguage: DetectedLanguage, mode: TaskMode, attemptNumber?: number): VerifierReport;
    /**
     * Fact-checking gate
     */
    private runFactCheck;
    /**
     * Math verification gate
     */
    private runMathCheck;
    /**
     * Language compliance gate
     */
    private runLanguageCheck;
    /**
     * Calculate overall confidence score
     */
    private calculateConfidence;
    /**
     * Get regeneration strategy based on attempt number
     */
    private getRegenerationStrategy;
    /**
     * Generate tightened instructions based on failures
     */
    private getTightenedInstructions;
}
export declare const acceptanceGate: AcceptanceGate;
//# sourceMappingURL=acceptanceGate.d.ts.map