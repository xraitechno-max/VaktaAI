/**
 * Citation utilities for VaktaAI Dynamic Prompt System
 * Handles NCERT and PYQ citation format validation and extraction
 */

// Citation patterns:
// NCERT:{doc_id}:{section} - e.g., NCERT:phy_11_ch2:2.3.1
// PYQ:{exam}:{year}:{slot}:{qid} - e.g., PYQ:JEE-Main:2023:APR:42

const NCERT_PATTERN = /NCERT:([a-zA-Z0-9_-]+):([a-zA-Z0-9._-]+)/g;
const PYQ_PATTERN = /PYQ:([A-Z-]+):([0-9]{4}):(JAN|APR|MAY|JUN|SEP|OCT):([0-9]+)/g;

export interface ParsedCitation {
  raw: string;
  type: "NCERT" | "PYQ";
  parts: {
    // NCERT
    doc_id?: string;
    section?: string;
    // PYQ
    exam?: string;
    year?: string;
    slot?: string;
    qid?: string;
  };
}

/**
 * Extract all citations from text
 */
export function extractCitations(text: string): string[] {
  const citations = new Set<string>();

  // Extract NCERT citations
  const ncertMatches = text.matchAll(NCERT_PATTERN);
  for (const match of ncertMatches) {
    citations.add(match[0]);
  }

  // Extract PYQ citations
  const pyqMatches = text.matchAll(PYQ_PATTERN);
  for (const match of pyqMatches) {
    citations.add(match[0]);
  }

  return Array.from(citations);
}

/**
 * Validate citation format
 */
export function isValidCitation(citation: string): boolean {
  const ncertMatch = /^NCERT:[a-zA-Z0-9_-]+:[a-zA-Z0-9._-]+$/.test(citation);
  const pyqMatch = /^PYQ:[A-Z-]+:[0-9]{4}:(JAN|APR|MAY|JUN|SEP|OCT):[0-9]+$/.test(citation);
  return ncertMatch || pyqMatch;
}

/**
 * Parse citation into components
 */
export function parseCitation(citation: string): ParsedCitation | null {
  if (!isValidCitation(citation)) {
    return null;
  }

  if (citation.startsWith("NCERT:")) {
    const parts = citation.split(":");
    return {
      raw: citation,
      type: "NCERT",
      parts: {
        doc_id: parts[1],
        section: parts[2],
      },
    };
  }

  if (citation.startsWith("PYQ:")) {
    const parts = citation.split(":");
    return {
      raw: citation,
      type: "PYQ",
      parts: {
        exam: parts[1],
        year: parts[2],
        slot: parts[3],
        qid: parts[4],
      },
    };
  }

  return null;
}

/**
 * Find sentences without citations
 */
export function findUncitedSentences(text: string): string[] {
  // Split text into sentences
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const uncited: string[] = [];

  for (const sentence of sentences) {
    // Skip if sentence contains a citation
    if (NCERT_PATTERN.test(sentence) || PYQ_PATTERN.test(sentence)) {
      continue;
    }

    // Skip if sentence is not a factual claim (heuristic)
    // Skip questions, conversational markers, instructions
    if (
      sentence.includes("?") ||
      sentence.toLowerCase().includes("samajh me aaya") ||
      sentence.toLowerCase().includes("dekho") ||
      sentence.toLowerCase().includes("basically") ||
      sentence.toLowerCase().includes("example:") ||
      sentence.toLowerCase().includes("formula:") ||
      sentence.toLowerCase().includes("solution:")
    ) {
      continue;
    }

    // If sentence contains definitive claims, it needs citation
    if (
      sentence.toLowerCase().includes("is") ||
      sentence.toLowerCase().includes("are") ||
      sentence.toLowerCase().includes("hai") ||
      sentence.toLowerCase().includes("hota hai") ||
      sentence.toLowerCase().includes("states that") ||
      sentence.toLowerCase().includes("law") ||
      sentence.length > 30 // Substantial sentence
    ) {
      uncited.push(sentence);
    }
  }

  return uncited;
}

/**
 * Count citations in text
 */
export function countCitations(text: string): number {
  return extractCitations(text).length;
}

/**
 * Validate all citations in text
 */
export function validateAllCitations(text: string): {
  valid: boolean;
  invalid_citations: string[];
} {
  const citations = extractCitations(text);
  const invalid: string[] = [];

  for (const citation of citations) {
    if (!isValidCitation(citation)) {
      invalid.push(citation);
    }
  }

  return {
    valid: invalid.length === 0,
    invalid_citations: invalid,
  };
}
