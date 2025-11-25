/**
 * Unit verification utilities for VaktaAI Dynamic Prompt System
 * Handles SI unit validation and dimensional analysis
 */

// Common SI units and their dimensions
export const SI_UNITS: Record<string, string[]> = {
  length: ["m", "km", "cm", "mm", "nm"],
  mass: ["kg", "g", "mg", "ton"],
  time: ["s", "ms", "min", "h", "hour"],
  velocity: ["m/s", "km/h", "km/hr"],
  acceleration: ["m/s²", "m/s^2"],
  force: ["N", "Newton", "kN"],
  energy: ["J", "Joule", "kJ", "MJ", "eV"],
  power: ["W", "Watt", "kW", "MW"],
  pressure: ["Pa", "Pascal", "kPa", "atm", "bar"],
  temperature: ["K", "°C", "C"],
  charge: ["C", "Coulomb", "mC"],
  current: ["A", "Ampere", "mA"],
  voltage: ["V", "Volt", "kV", "mV"],
  resistance: ["Ω", "Ohm", "kΩ"],
  frequency: ["Hz", "Hertz", "kHz", "MHz"],
  angle: ["rad", "radian", "degree", "°"],
};

// Unit conversion factors to base SI
export const UNIT_CONVERSIONS: Record<string, number> = {
  // Length
  km: 1000,
  cm: 0.01,
  mm: 0.001,
  nm: 1e-9,
  // Mass
  g: 0.001,
  mg: 1e-6,
  ton: 1000,
  // Time
  ms: 0.001,
  min: 60,
  h: 3600,
  hour: 3600,
  // Velocity
  "km/h": 1000 / 3600,
  "km/hr": 1000 / 3600,
  // Energy
  kJ: 1000,
  MJ: 1e6,
  eV: 1.602e-19,
  // Power
  kW: 1000,
  MW: 1e6,
  // Pressure
  kPa: 1000,
  atm: 101325,
  bar: 100000,
  // Current
  mA: 0.001,
  // Voltage
  kV: 1000,
  mV: 0.001,
  // Resistance
  kΩ: 1000,
  // Frequency
  kHz: 1000,
  MHz: 1e6,
};

/**
 * Extract units from text
 */
export function extractUnits(text: string): string[] {
  const unitPattern = /\b(\d+\.?\d*)\s*([a-zA-Z°Ω]+(?:\/[a-zA-Z°]+)?(?:\^?\d)?)/g;
  const units = new Set<string>();

  const matches = text.matchAll(unitPattern);
  for (const match of matches) {
    const unit = match[2];
    units.add(unit);
  }

  return Array.from(units);
}

/**
 * Check if unit is valid SI unit
 */
export function isValidSIUnit(unit: string): boolean {
  // Normalize unit (remove superscripts, handle common variations)
  const normalized = unit
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/·/g, "")
    .trim();

  // Check against known units
  for (const category of Object.values(SI_UNITS)) {
    if (category.some((u) => u === normalized || u === unit)) {
      return true;
    }
  }

  // Check for compound units like m/s, kg·m/s²
  if (normalized.includes("/") || normalized.includes("·")) {
    return true; // Simplified check for compound units
  }

  return false;
}

/**
 * Extract formulas with units from text
 */
export function extractFormulasWithUnits(text: string): string[] {
  // Match equations with units
  const formulaPattern = /([a-zA-Z]\s*=\s*[^.!?\n]+)/g;
  const formulas: string[] = [];

  const matches = text.matchAll(formulaPattern);
  for (const match of matches) {
    formulas.push(match[0].trim());
  }

  return formulas;
}

/**
 * Verify unit consistency in a calculation
 */
export function verifyUnitConsistency(calculation: string): {
  consistent: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const units = extractUnits(calculation);

  // Check if all units are valid SI
  for (const unit of units) {
    if (!isValidSIUnit(unit)) {
      errors.push(`Invalid or non-SI unit detected: ${unit}`);
    }
  }

  // Basic dimensional analysis (simplified)
  // Check for common mistakes like mixing km/h with m/s without conversion
  if (units.includes("km/h") && units.includes("m/s")) {
    errors.push("Mixed velocity units (km/h and m/s) detected - ensure proper conversion");
  }

  if (units.includes("g") && units.includes("kg")) {
    errors.push("Mixed mass units (g and kg) detected - ensure proper conversion");
  }

  return {
    consistent: errors.length === 0,
    errors,
  };
}

/**
 * Check if formulas contain only English units (not translated)
 */
export function checkFormulasInEnglish(text: string): {
  all_english: boolean;
  non_english_formulas: string[];
} {
  const formulas = extractFormulasWithUnits(text);
  const nonEnglish: string[] = [];

  // Common Hindi/Sanskrit physics terms that should NOT appear in formulas
  const hindiTerms = [
    "द्रव्यमान", // mass
    "त्वरण", // acceleration
    "बल", // force
    "ऊर्जा", // energy
    "शक्ति", // power
    "वेग", // velocity
    "दूरी", // distance
    "समय", // time
    "विद्युत", // electric
    "आवेश", // charge
  ];

  for (const formula of formulas) {
    for (const term of hindiTerms) {
      if (formula.includes(term)) {
        nonEnglish.push(formula);
        break;
      }
    }
  }

  return {
    all_english: nonEnglish.length === 0,
    non_english_formulas: nonEnglish,
  };
}

/**
 * Verify significant figures consistency
 */
export function verifySigFigs(calculation: string): {
  consistent: boolean;
  message: string;
} {
  // Extract all numbers
  const numberPattern = /\b(\d+\.?\d*)\b/g;
  const numbers: number[] = [];
  const matches = calculation.matchAll(numberPattern);

  for (const match of matches) {
    numbers.push(parseFloat(match[1]));
  }

  if (numbers.length < 2) {
    return { consistent: true, message: "Insufficient data for sig fig check" };
  }

  // Simplified check: warn if final answer has way more precision than inputs
  // This is a heuristic, not a rigorous check
  const inputPrecisions = numbers.slice(0, -1).map((n) => {
    const str = n.toString();
    return str.includes(".") ? str.split(".")[1].length : 0;
  });

  const maxInputPrecision = Math.max(...inputPrecisions);
  const finalNumber = numbers[numbers.length - 1];
  const finalStr = finalNumber.toString();
  const finalPrecision = finalStr.includes(".") ? finalStr.split(".")[1].length : 0;

  if (finalPrecision > maxInputPrecision + 1) {
    return {
      consistent: false,
      message: `Final answer has ${finalPrecision} decimal places, but inputs have max ${maxInputPrecision}`,
    };
  }

  return { consistent: true, message: "Significant figures appear consistent" };
}
