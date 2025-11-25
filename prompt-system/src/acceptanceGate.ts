/**
 * Acceptance Gate for VaktaAI Dynamic Prompt System
 * Verifies draft answers against fact, math, and language gates
 */

import type { DraftAnswer, VerifierReport, DetectedLanguage, TaskMode } from "./contracts.js";
import { extractCitations, countCitations, findUncitedSentences } from "./utils/citations.js";
import { extractFormulasWithUnits, verifyUnitConsistency, checkFormulasInEnglish, verifySigFigs } from "./utils/units.js";
import { detectCOTLeakage, detectLanguage, extractFactualClaims } from "./utils/validation.js";
import { logger } from "./utils/log.js";

// Policy thresholds
const CONFIDENCE_MIN = 0.82;
const AUTO_REGENERATE_BELOW = 0.72;
const MAX_REGENERATIONS = 2;

export class AcceptanceGate {
  /**
   * Verify draft answer against all gates
   */
  verify(
    draft: DraftAnswer,
    targetLanguage: DetectedLanguage,
    mode: TaskMode,
    attemptNumber: number = 0
  ): VerifierReport {
    const startTime = Date.now();

    logger.info("Running acceptance gate verification", {
      mode,
      target_language: targetLanguage,
      attempt: attemptNumber,
    });

    // Run all gate checks
    const factCheck = this.runFactCheck(draft, mode);
    const mathCheck = this.runMathCheck(draft, mode);
    const languageCheck = this.runLanguageCheck(draft, targetLanguage);

    // Calculate overall confidence
    const confidence_score = this.calculateConfidence(factCheck, mathCheck, languageCheck);

    // Determine if pass/fail
    const overall_pass = confidence_score >= CONFIDENCE_MIN && factCheck.passed && mathCheck.passed && languageCheck.passed;

    const should_regenerate = confidence_score < AUTO_REGENERATE_BELOW || !overall_pass;

    // Determine regeneration strategy
    const regeneration_strategy = should_regenerate
      ? this.getRegenerationStrategy(attemptNumber, factCheck, mathCheck, languageCheck)
      : { attempt_number: 0, action: "none" as const, switch_model: false };

    const report: VerifierReport = {
      overall_pass,
      confidence_score,
      should_regenerate,
      gates: {
        fact_check: factCheck,
        math_check: mathCheck,
        language_check: languageCheck,
      },
      regeneration_strategy,
      metadata: {
        verified_at: new Date().toISOString(),
        verification_latency_ms: Date.now() - startTime,
      },
    };

    logger.info("Verification complete", {
      overall_pass,
      confidence: confidence_score,
      should_regenerate,
    });

    return report;
  }

  /**
   * Fact-checking gate
   */
  private runFactCheck(draft: DraftAnswer, mode: TaskMode) {
    const enabled = mode !== "solve" && mode !== "derive"; // Math problems don't need citations

    if (!enabled) {
      return {
        enabled: false,
        passed: true,
        score: 1.0,
      };
    }

    const text = draft.raw_text;
    const citations = extractCitations(text);
    const citation_count = citations.length;
    const has_citations = citation_count > 0;

    // Extract factual claims
    const claims = extractFactualClaims(text);
    const total_claims = claims.length;

    // Find uncited sentences
    const unsupported = findUncitedSentences(text);

    const cited_claims = total_claims - unsupported.length;
    const uncited_claims = unsupported.length;

    // Score based on citation coverage
    let score = total_claims > 0 ? cited_claims / total_claims : 0.5;

    // Bonus for having citations
    if (has_citations && citation_count >= 2) {
      score = Math.min(1.0, score + 0.1);
    }

    const passed = has_citations && uncited_claims === 0;

    const errors: string[] = [];
    if (!has_citations) {
      errors.push("No citations found in response");
    }
    if (uncited_claims > 0) {
      errors.push(`${uncited_claims} factual claims lack citation support`);
    }

    return {
      enabled: true,
      passed,
      score,
      details: {
        total_claims,
        cited_claims,
        uncited_claims,
        invalid_citations: [],
        unsupported_sentences: unsupported,
      },
      errors,
    };
  }

  /**
   * Math verification gate
   */
  private runMathCheck(draft: DraftAnswer, mode: TaskMode) {
    const enabled = mode === "solve" || mode === "derive";

    if (!enabled) {
      return {
        enabled: false,
        passed: true,
        score: 1.0,
      };
    }

    const text = draft.raw_text;
    const formulas = extractFormulasWithUnits(text);
    const unitCheck = verifyUnitConsistency(text);
    const sigFigCheck = verifySigFigs(text);

    const errors: string[] = [];
    if (!unitCheck.consistent) {
      errors.push(...unitCheck.errors);
    }
    if (!sigFigCheck.consistent) {
      errors.push(sigFigCheck.message);
    }

    const passed = unitCheck.consistent && sigFigCheck.consistent;
    const score = passed ? 1.0 : 0.5;

    return {
      enabled: true,
      passed,
      score,
      details: {
        formulas_found: formulas.length,
        unit_consistency: unitCheck.consistent,
        sig_figs_consistent: sigFigCheck.consistent,
        dimensional_analysis: unitCheck.consistent,
        unit_errors: unitCheck.errors,
        calculation_errors: [],
      },
      errors,
    };
  }

  /**
   * Language compliance gate
   */
  private runLanguageCheck(draft: DraftAnswer, targetLanguage: DetectedLanguage) {
    const text = draft.raw_text;

    // Detect language in output
    const detected = detectLanguage(text);

    // Check for COT leakage
    const cotCheck = detectCOTLeakage(text);

    // Check formulas are in English
    const formulaCheck = checkFormulasInEnglish(text);

    const errors: string[] = [];

    if (cotCheck.has_leakage) {
      errors.push(`Chain-of-thought leakage detected: ${cotCheck.markers_found.join(", ")}`);
    }

    if (!formulaCheck.all_english) {
      errors.push(`Formulas contain non-English terms: ${formulaCheck.non_english_formulas.join(", ")}`);
    }

    const language_match = detected.language === targetLanguage || detected.language === "mixed";
    const formulas_in_english = formulaCheck.all_english;
    const has_cot_leakage = cotCheck.has_leakage;

    const passed = language_match && formulas_in_english && !has_cot_leakage;

    let score = 0.5;
    if (language_match) score += 0.2;
    if (formulas_in_english) score += 0.2;
    if (!has_cot_leakage) score += 0.1;

    return {
      enabled: true,
      passed,
      score,
      details: {
        target_language: targetLanguage,
        detected_language: detected.language,
        language_match,
        formulas_in_english,
        units_in_english: true, // Assumed if formulas are in English
        has_cot_leakage,
        cot_markers_found: cotCheck.markers_found,
        non_english_formulas: formulaCheck.non_english_formulas,
      },
      errors,
    };
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(factCheck: any, mathCheck: any, languageCheck: any): number {
    // Weighted average of gate scores
    const weights = {
      fact: factCheck.enabled ? 0.4 : 0,
      math: mathCheck.enabled ? 0.3 : 0,
      language: 0.3,
    };

    const totalWeight = weights.fact + weights.math + weights.language;

    const weightedScore =
      (factCheck.score * weights.fact + mathCheck.score * weights.math + languageCheck.score * weights.language) /
      totalWeight;

    return Math.round(weightedScore * 100) / 100;
  }

  /**
   * Get regeneration strategy based on attempt number
   */
  private getRegenerationStrategy(attemptNumber: number, factCheck: any, mathCheck: any, languageCheck: any) {
    if (attemptNumber >= MAX_REGENERATIONS) {
      return {
        attempt_number: attemptNumber + 1,
        action: "escalate" as const,
        switch_model: false,
        tightened_instructions: undefined,
      };
    }

    if (attemptNumber === 0) {
      // First regeneration: tighten constraints
      return {
        attempt_number: 1,
        action: "tighten_constraints" as const,
        switch_model: false,
        tightened_instructions: this.getTightenedInstructions(factCheck, mathCheck, languageCheck),
      };
    }

    if (attemptNumber === 1) {
      // Second regeneration: switch model and tighten
      return {
        attempt_number: 2,
        action: "switch_model_and_tighten" as const,
        switch_model: true,
        suggested_model: "claude-3.5-sonnet",
        tightened_instructions: this.getTightenedInstructions(factCheck, mathCheck, languageCheck, true),
      };
    }

    return {
      attempt_number: attemptNumber + 1,
      action: "escalate" as const,
      switch_model: false,
    };
  }

  /**
   * Generate tightened instructions based on failures
   */
  private getTightenedInstructions(factCheck: any, mathCheck: any, languageCheck: any, strict: boolean = false): string {
    const issues: string[] = [];

    if (!factCheck.passed) {
      issues.push("- Every factual claim MUST have [NCERT:doc_id:section] or [PYQ:exam:year:slot:qid] citation");
      issues.push("- If no evidence available, say 'I don't have enough information'");
    }

    if (!mathCheck.passed) {
      issues.push("- Show units in EVERY calculation step");
      issues.push("- Verify dimensional analysis");
      issues.push("- Maintain consistent significant figures");
    }

    if (languageCheck.details?.has_cot_leakage) {
      issues.push("- NO chain-of-thought in output (NO 'Let me think', 'First I will', etc.)");
      issues.push("- Output ONLY the final answer, no reasoning process");
    }

    if (!languageCheck.details?.formulas_in_english) {
      issues.push("- ALL formulas MUST be in English: F = ma (NEVER Hindi/Sanskrit terms)");
    }

    if (strict) {
      return `CRITICAL RULES (STRICT MODE):\n${issues.join("\n")}\n\nVIOLATION OF ANY RULE WILL RESULT IN REJECTION.`;
    }

    return `ADDITIONAL CONSTRAINTS:\n${issues.join("\n")}`;
  }
}

// Export singleton
export const acceptanceGate = new AcceptanceGate();
