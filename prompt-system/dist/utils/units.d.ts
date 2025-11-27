/**
 * Unit verification utilities for VaktaAI Dynamic Prompt System
 * Handles SI unit validation and dimensional analysis
 */
export declare const SI_UNITS: Record<string, string[]>;
export declare const UNIT_CONVERSIONS: Record<string, number>;
/**
 * Extract units from text
 */
export declare function extractUnits(text: string): string[];
/**
 * Check if unit is valid SI unit
 */
export declare function isValidSIUnit(unit: string): boolean;
/**
 * Extract formulas with units from text
 */
export declare function extractFormulasWithUnits(text: string): string[];
/**
 * Verify unit consistency in a calculation
 */
export declare function verifyUnitConsistency(calculation: string): {
    consistent: boolean;
    errors: string[];
};
/**
 * Check if formulas contain only English units (not translated)
 */
export declare function checkFormulasInEnglish(text: string): {
    all_english: boolean;
    non_english_formulas: string[];
};
/**
 * Verify significant figures consistency
 */
export declare function verifySigFigs(calculation: string): {
    consistent: boolean;
    message: string;
};
//# sourceMappingURL=units.d.ts.map