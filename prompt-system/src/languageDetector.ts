/**
 * Language Detector for VaktaAI Dynamic Prompt System
 * Detects Hindi, Hinglish, or English with confidence scoring
 */

import type { LanguageDetectionResult, DetectedLanguage } from "./contracts.js";
import { logger } from "./utils/log.js";

export class LanguageDetector {
  private readonly MIN_CHARS = 6; // From policy
  private readonly CONFIDENCE_THRESHOLD = 0.75; // From policy
  private readonly HYSTERESIS_THRESHOLD = 0.65; // From policy

  private lastDetectedLanguage: DetectedLanguage | null = null;

  /**
   * Detect language from user message
   */
  detect(text: string, preferredLang?: string): LanguageDetectionResult {
    logger.debug("Detecting language", { text_length: text.length, preferred: preferredLang });

    // If text too short, default to English or preferred
    if (text.length < this.MIN_CHARS) {
      const defaultLang = (preferredLang === "hi" || preferredLang === "hinglish" ? preferredLang : "english") as DetectedLanguage;
      return {
        label: defaultLang,
        confidence: 0.5,
        detected_from: text,
        char_count: text.length,
        should_switch: false, // Too short to switch
      };
    }

    // Analyze text
    const analysis = this.analyzeText(text);

    // Determine language based on analysis
    const { language, confidence } = this.classifyLanguage(analysis);

    // Apply hysteresis if we have previous detection
    const finalLanguage = this.applyHysteresis(language, confidence);
    const finalConfidence = language === finalLanguage ? confidence : Math.max(confidence, this.HYSTERESIS_THRESHOLD);

    // Determine if we should switch (confidence >= threshold && chars >= min)
    const shouldSwitch = finalConfidence >= this.CONFIDENCE_THRESHOLD && text.length >= this.MIN_CHARS;

    this.lastDetectedLanguage = finalLanguage;

    const result: LanguageDetectionResult = {
      label: finalLanguage,
      confidence: finalConfidence,
      detected_from: text,
      script: analysis.script,
      char_count: text.length,
      should_switch: shouldSwitch,
      metadata: {
        hindi_char_ratio: analysis.devanagariRatio,
        english_word_count: analysis.englishWordCount,
        hindi_word_count: analysis.hindiWordCount,
      },
    };

    logger.debug("Language detected", {
      language: result.label,
      confidence: result.confidence,
      should_switch: result.should_switch,
    });

    return result;
  }

  /**
   * Analyze text for language indicators
   */
  private analyzeText(text: string): {
    devanagariRatio: number;
    latinRatio: number;
    hindiWordCount: number;
    englishWordCount: number;
    script: "latin" | "devanagari" | "mixed";
  } {
    // Devanagari unicode range: \u0900-\u097F
    const devanagariRegex = /[\u0900-\u097F]/g;
    const latinRegex = /[a-zA-Z]/g;

    const devanagariMatches = text.match(devanagariRegex) || [];
    const latinMatches = text.match(latinRegex) || [];

    const totalChars = text.length;
    const devanagariRatio = devanagariMatches.length / totalChars;
    const latinRatio = latinMatches.length / totalChars;

    // Common Hindi words (transliterated)
    const hindiWords = [
      "hai",
      "hota",
      "hoti",
      "hote",
      "karta",
      "karti",
      "karte",
      "karna",
      "kehlaata",
      "aur",
      "toh",
      "yaani",
      "matlab",
      "samajh",
      "kya",
      "kaise",
      "kyun",
      "kyunki",
      "agar",
      "jab",
      "tum",
      "aap",
      "me",
      "se",
      "ka",
      "ki",
      "ke",
      "lagta",
      "dekho",
      "basically",
    ];

    const lowerText = text.toLowerCase();
    const hindiWordCount = hindiWords.filter((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      return regex.test(lowerText);
    }).length;

    // Estimate English word count (rough heuristic)
    const words = text.split(/\s+/);
    const totalWords = words.length;
    const englishWordCount = Math.max(0, totalWords - hindiWordCount);

    // Determine script
    let script: "latin" | "devanagari" | "mixed";
    if (devanagariRatio > 0.5) {
      script = "devanagari";
    } else if (latinRatio > 0.8 && devanagariRatio === 0) {
      script = "latin";
    } else {
      script = "mixed";
    }

    return {
      devanagariRatio,
      latinRatio,
      hindiWordCount,
      englishWordCount,
      script,
    };
  }

  /**
   * Classify language based on analysis
   */
  private classifyLanguage(analysis: {
    devanagariRatio: number;
    latinRatio: number;
    hindiWordCount: number;
    englishWordCount: number;
    script: "latin" | "devanagari" | "mixed";
  }): { language: DetectedLanguage; confidence: number } {
    const { devanagariRatio, latinRatio, hindiWordCount, englishWordCount, script } = analysis;

    // Pure Hindi (Devanagari script)
    if (devanagariRatio > 0.5) {
      return { language: "hindi", confidence: 0.95 };
    }

    // Hinglish (Latin script with significant Hindi words)
    if (script === "latin" && hindiWordCount >= 3) {
      const hindiRatio = hindiWordCount / (hindiWordCount + englishWordCount + 1);
      if (hindiRatio > 0.3) {
        // Significant Hindi presence
        const confidence = 0.7 + Math.min(hindiRatio * 0.2, 0.25);
        return { language: "hinglish", confidence };
      }
    }

    // Mixed script suggests Hinglish
    if (script === "mixed") {
      return { language: "hinglish", confidence: 0.8 };
    }

    // Pure English (Latin script, no Hindi words)
    if (script === "latin" && hindiWordCount === 0 && latinRatio > 0.7) {
      return { language: "english", confidence: 0.9 };
    }

    // Default to English with lower confidence
    return { language: "english", confidence: 0.6 };
  }

  /**
   * Apply hysteresis to avoid frequent language switching
   */
  private applyHysteresis(newLanguage: DetectedLanguage, newConfidence: number): DetectedLanguage {
    // If no previous language, use new detection
    if (!this.lastDetectedLanguage) {
      return newLanguage;
    }

    // If new language is same as last, keep it
    if (newLanguage === this.lastDetectedLanguage) {
      return newLanguage;
    }

    // If new confidence is below hysteresis threshold, stick to last language
    if (newConfidence < this.HYSTERESIS_THRESHOLD) {
      logger.debug("Applying hysteresis", {
        last: this.lastDetectedLanguage,
        new: newLanguage,
        confidence: newConfidence,
      });
      return this.lastDetectedLanguage;
    }

    // Otherwise, switch to new language
    return newLanguage;
  }

  /**
   * Reset detector state (useful for new sessions)
   */
  reset() {
    this.lastDetectedLanguage = null;
    logger.debug("Language detector reset");
  }
}

// Export singleton instance
export const languageDetector = new LanguageDetector();
