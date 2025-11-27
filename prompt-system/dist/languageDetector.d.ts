/**
 * Language Detector for VaktaAI Dynamic Prompt System
 * Detects Hindi, Hinglish, or English with confidence scoring
 */
import type { LanguageDetectionResult } from "./contracts.js";
export declare class LanguageDetector {
    private readonly MIN_CHARS;
    private readonly CONFIDENCE_THRESHOLD;
    private readonly HYSTERESIS_THRESHOLD;
    private lastDetectedLanguage;
    /**
     * Detect language from user message
     */
    detect(text: string, preferredLang?: string): LanguageDetectionResult;
    /**
     * Analyze text for language indicators
     */
    private analyzeText;
    /**
     * Classify language based on analysis
     */
    private classifyLanguage;
    /**
     * Apply hysteresis to avoid frequent language switching
     */
    private applyHysteresis;
    /**
     * Reset detector state (useful for new sessions)
     */
    reset(): void;
}
export declare const languageDetector: LanguageDetector;
//# sourceMappingURL=languageDetector.d.ts.map