/**
 * General validation utilities for VaktaAI Dynamic Prompt System
 */
/**
 * Detect chain-of-thought leakage in output
 */
export declare function detectCOTLeakage(text: string): {
    has_leakage: boolean;
    markers_found: string[];
};
/**
 * Detect language in text
 */
export declare function detectLanguage(text: string): {
    language: "english" | "hindi" | "hinglish" | "mixed";
    confidence: number;
};
/**
 * Validate that formulas use only English (not Hindi translations)
 */
export declare function validateFormulasInEnglish(formulas: string[]): {
    valid: boolean;
    violations: string[];
};
/**
 * Extract factual claims from text (heuristic)
 */
export declare function extractFactualClaims(text: string): string[];
/**
 * Calculate text quality score (simple heuristic)
 */
export declare function calculateQualityScore(text: string, metadata: {
    has_citations: boolean;
    citation_count: number;
    has_formulas: boolean;
    has_cot_leakage: boolean;
    language_match: boolean;
}): number;
/**
 * Validate task input
 */
export declare function validateTaskInput(task: any): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=validation.d.ts.map