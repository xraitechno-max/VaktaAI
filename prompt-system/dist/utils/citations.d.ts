/**
 * Citation utilities for VaktaAI Dynamic Prompt System
 * Handles NCERT and PYQ citation format validation and extraction
 */
export interface ParsedCitation {
    raw: string;
    type: "NCERT" | "PYQ";
    parts: {
        doc_id?: string;
        section?: string;
        exam?: string;
        year?: string;
        slot?: string;
        qid?: string;
    };
}
/**
 * Extract all citations from text
 */
export declare function extractCitations(text: string): string[];
/**
 * Validate citation format
 */
export declare function isValidCitation(citation: string): boolean;
/**
 * Parse citation into components
 */
export declare function parseCitation(citation: string): ParsedCitation | null;
/**
 * Find sentences without citations
 */
export declare function findUncitedSentences(text: string): string[];
/**
 * Count citations in text
 */
export declare function countCitations(text: string): number;
/**
 * Validate all citations in text
 */
export declare function validateAllCitations(text: string): {
    valid: boolean;
    invalid_citations: string[];
};
//# sourceMappingURL=citations.d.ts.map