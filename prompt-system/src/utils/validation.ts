/**
 * General validation utilities for VaktaAI Dynamic Prompt System
 */

import { logger } from "./log.js";

/**
 * Detect chain-of-thought leakage in output
 */
export function detectCOTLeakage(text: string): {
  has_leakage: boolean;
  markers_found: string[];
} {
  // Common COT markers that should NOT appear in final output
  const cotMarkers = [
    "let me think",
    "first, i will",
    "first i will",
    "step 1:",
    "my approach",
    "i need to",
    "i should",
    "let's think",
    "let me analyze",
    "thinking about this",
    "first, we need to",
    "before answering",
  ];

  const foundMarkers: string[] = [];
  const lowerText = text.toLowerCase();

  for (const marker of cotMarkers) {
    if (lowerText.includes(marker)) {
      foundMarkers.push(marker);
    }
  }

  return {
    has_leakage: foundMarkers.length > 0,
    markers_found: foundMarkers,
  };
}

/**
 * Detect language in text
 */
export function detectLanguage(text: string): {
  language: "english" | "hindi" | "hinglish" | "mixed";
  confidence: number;
} {
  // Devanagari unicode range
  const devanagariRegex = /[\u0900-\u097F]/;
  const latinRegex = /[a-zA-Z]/;

  const hasDevanagari = devanagariRegex.test(text);
  const hasLatin = latinRegex.test(text);

  // Count occurrences
  const devanagariCount = (text.match(new RegExp(devanagariRegex, "g")) || []).length;
  const latinCount = (text.match(new RegExp(latinRegex, "g")) || []).length;
  const totalChars = text.length;

  const devanagariRatio = devanagariCount / totalChars;
  const latinRatio = latinCount / totalChars;

  // Hindi words (common indicators)
  const hindiWords = ["hai", "hota", "karta", "karte", "kehlaata", "aur", "toh", "yaani", "matlab", "samajh"];
  const hindiWordCount = hindiWords.filter((word) => text.toLowerCase().includes(word)).length;

  if (devanagariRatio > 0.5) {
    return { language: "hindi", confidence: 0.95 };
  }

  if (hindiWordCount >= 3 && latinRatio > 0.5) {
    return { language: "hinglish", confidence: 0.85 };
  }

  if (latinRatio > 0.8 && !hasDevanagari && hindiWordCount === 0) {
    return { language: "english", confidence: 0.9 };
  }

  if (hasDevanagari && hasLatin) {
    return { language: "mixed", confidence: 0.7 };
  }

  return { language: "english", confidence: 0.6 };
}

/**
 * Validate that formulas use only English (not Hindi translations)
 */
export function validateFormulasInEnglish(formulas: string[]): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Hindi/Sanskrit physics terms that should NOT appear
  const prohibitedTerms = [
    "द्रव्यमान",
    "त्वरण",
    "बल",
    "ऊर्जा",
    "शक्ति",
    "वेग",
    "दूरी",
    "समय",
    "विद्युत",
    "आवेश",
    "उर्जा",
    "गति",
  ];

  for (const formula of formulas) {
    for (const term of prohibitedTerms) {
      if (formula.includes(term)) {
        violations.push(`Formula contains Hindi term: ${formula}`);
        break;
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Extract factual claims from text (heuristic)
 */
export function extractFactualClaims(text: string): string[] {
  // Split into sentences
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const claims: string[] = [];

  for (const sentence of sentences) {
    // Skip questions
    if (sentence.includes("?")) continue;

    // Skip conversational markers
    if (
      sentence.toLowerCase().includes("samajh me aaya") ||
      sentence.toLowerCase().includes("kuch aur") ||
      sentence.toLowerCase().includes("dekho,")
    ) {
      continue;
    }

    // Identify factual claims (heuristic)
    // Sentences with "is", "are", "states", "law", definitive statements
    if (
      sentence.toLowerCase().includes(" is ") ||
      sentence.toLowerCase().includes(" are ") ||
      sentence.toLowerCase().includes("hai") ||
      sentence.toLowerCase().includes("hota hai") ||
      sentence.toLowerCase().includes("states that") ||
      sentence.toLowerCase().includes("law") ||
      sentence.toLowerCase().includes("formula") ||
      (sentence.length > 30 && !sentence.toLowerCase().startsWith("example"))
    ) {
      claims.push(sentence);
    }
  }

  return claims;
}

/**
 * Calculate text quality score (simple heuristic)
 */
export function calculateQualityScore(text: string, metadata: {
  has_citations: boolean;
  citation_count: number;
  has_formulas: boolean;
  has_cot_leakage: boolean;
  language_match: boolean;
}): number {
  let score = 0.5; // Base score

  // Citations boost
  if (metadata.has_citations) {
    score += 0.2;
    if (metadata.citation_count >= 3) {
      score += 0.1;
    }
  } else {
    score -= 0.3; // Penalty for no citations
  }

  // Formula presence (for technical content)
  if (metadata.has_formulas) {
    score += 0.1;
  }

  // COT leakage penalty
  if (metadata.has_cot_leakage) {
    score -= 0.4; // Severe penalty
  }

  // Language match
  if (metadata.language_match) {
    score += 0.1;
  } else {
    score -= 0.2;
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * Validate task input
 */
export function validateTaskInput(task: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!task.user_msg || typeof task.user_msg !== "string") {
    errors.push("user_msg is required and must be a string");
  }

  if (!task.mode || !["explain", "solve", "derive", "revise", "docchat", "strategy", "plan"].includes(task.mode)) {
    errors.push("mode must be one of: explain, solve, derive, revise, docchat, strategy, plan");
  }

  if (!task.subject) {
    errors.push("subject is required");
  }

  if (!task.board) {
    errors.push("board is required");
  }

  if (!task.class || task.class < 6 || task.class > 12) {
    errors.push("class must be between 6 and 12");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
