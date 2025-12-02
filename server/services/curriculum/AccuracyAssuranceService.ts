import * as math from 'mathjs';
import memoizee from 'memoizee';
import { formulaBankService, FormulaBankEntry } from './FormulaBankService';

export type AccuracySeverity = 'info' | 'warning' | 'error' | 'critical';
export type IssueType = 'calculation' | 'unit' | 'formula' | 'citation' | 'scientific_fact';

export interface AccuracyIssue {
  type: IssueType;
  severity: AccuracySeverity;
  originalText: string;
  issue: string;
  suggestion?: string;
  autoFix?: string;
  position?: { start: number; end: number };
  confidence: number;
  requiresRegeneration: boolean;
}

export interface AccuracyAuditResult {
  passed: boolean;
  overallSeverity: AccuracySeverity;
  issues: AccuracyIssue[];
  calculationsVerified: number;
  unitsValidated: number;
  formulasChecked: number;
  processingTimeMs: number;
}

export interface UnitConversion {
  from: string;
  to: string;
  factor: number;
  dimension: string;
}

interface ParsedExpression {
  original: string;
  normalized: string;
  result?: number | string;
  isValid: boolean;
  error?: string;
}

const UNIT_CONVERSIONS: Record<string, UnitConversion[]> = {
  length: [
    { from: 'm', to: 'cm', factor: 100, dimension: 'length' },
    { from: 'm', to: 'mm', factor: 1000, dimension: 'length' },
    { from: 'km', to: 'm', factor: 1000, dimension: 'length' },
    { from: 'cm', to: 'm', factor: 0.01, dimension: 'length' },
    { from: 'mm', to: 'm', factor: 0.001, dimension: 'length' },
    { from: 'inch', to: 'cm', factor: 2.54, dimension: 'length' },
    { from: 'ft', to: 'm', factor: 0.3048, dimension: 'length' },
    { from: 'angstrom', to: 'm', factor: 1e-10, dimension: 'length' },
    { from: 'nm', to: 'm', factor: 1e-9, dimension: 'length' },
  ],
  mass: [
    { from: 'kg', to: 'g', factor: 1000, dimension: 'mass' },
    { from: 'g', to: 'mg', factor: 1000, dimension: 'mass' },
    { from: 'g', to: 'kg', factor: 0.001, dimension: 'mass' },
    { from: 'amu', to: 'kg', factor: 1.66054e-27, dimension: 'mass' },
    { from: 'lb', to: 'kg', factor: 0.453592, dimension: 'mass' },
  ],
  time: [
    { from: 's', to: 'ms', factor: 1000, dimension: 'time' },
    { from: 'min', to: 's', factor: 60, dimension: 'time' },
    { from: 'hr', to: 's', factor: 3600, dimension: 'time' },
    { from: 'hr', to: 'min', factor: 60, dimension: 'time' },
    { from: 'day', to: 'hr', factor: 24, dimension: 'time' },
  ],
  temperature: [
    { from: 'C', to: 'K', factor: 1, dimension: 'temperature' },
    { from: 'K', to: 'C', factor: 1, dimension: 'temperature' },
    { from: 'C', to: 'F', factor: 1, dimension: 'temperature' },
    { from: 'F', to: 'C', factor: 1, dimension: 'temperature' },
    { from: 'F', to: 'K', factor: 1, dimension: 'temperature' },
    { from: 'K', to: 'F', factor: 1, dimension: 'temperature' },
  ],
  force: [
    { from: 'N', to: 'dyne', factor: 1e5, dimension: 'force' },
    { from: 'kN', to: 'N', factor: 1000, dimension: 'force' },
  ],
  energy: [
    { from: 'J', to: 'kJ', factor: 0.001, dimension: 'energy' },
    { from: 'J', to: 'cal', factor: 0.239, dimension: 'energy' },
    { from: 'cal', to: 'J', factor: 4.184, dimension: 'energy' },
    { from: 'eV', to: 'J', factor: 1.602e-19, dimension: 'energy' },
    { from: 'kWh', to: 'J', factor: 3.6e6, dimension: 'energy' },
  ],
  pressure: [
    { from: 'Pa', to: 'kPa', factor: 0.001, dimension: 'pressure' },
    { from: 'atm', to: 'Pa', factor: 101325, dimension: 'pressure' },
    { from: 'bar', to: 'Pa', factor: 1e5, dimension: 'pressure' },
    { from: 'mmHg', to: 'Pa', factor: 133.322, dimension: 'pressure' },
    { from: 'torr', to: 'Pa', factor: 133.322, dimension: 'pressure' },
  ],
  electric: [
    { from: 'mA', to: 'A', factor: 0.001, dimension: 'electric' },
    { from: 'kV', to: 'V', factor: 1000, dimension: 'electric' },
    { from: 'mV', to: 'V', factor: 0.001, dimension: 'electric' },
    { from: 'kOhm', to: 'Ohm', factor: 1000, dimension: 'electric' },
    { from: 'MOhm', to: 'Ohm', factor: 1e6, dimension: 'electric' },
  ],
  concentration: [
    { from: 'M', to: 'mM', factor: 1000, dimension: 'concentration' },
    { from: 'mM', to: 'M', factor: 0.001, dimension: 'concentration' },
    { from: 'mol/L', to: 'M', factor: 1, dimension: 'concentration' },
  ],
};

const SCIENTIFIC_CONSTANTS: Record<string, { value: number; unit: string; tolerance: number }> = {
  'speed_of_light': { value: 3e8, unit: 'm/s', tolerance: 0.01 },
  'c': { value: 3e8, unit: 'm/s', tolerance: 0.01 },
  'planck': { value: 6.626e-34, unit: 'J.s', tolerance: 0.01 },
  'h': { value: 6.626e-34, unit: 'J.s', tolerance: 0.01 },
  'avogadro': { value: 6.022e23, unit: '/mol', tolerance: 0.01 },
  'N_A': { value: 6.022e23, unit: '/mol', tolerance: 0.01 },
  'boltzmann': { value: 1.38e-23, unit: 'J/K', tolerance: 0.01 },
  'k_B': { value: 1.38e-23, unit: 'J/K', tolerance: 0.01 },
  'electron_charge': { value: 1.6e-19, unit: 'C', tolerance: 0.01 },
  'e': { value: 1.6e-19, unit: 'C', tolerance: 0.01 },
  'electron_mass': { value: 9.109e-31, unit: 'kg', tolerance: 0.01 },
  'm_e': { value: 9.109e-31, unit: 'kg', tolerance: 0.01 },
  'proton_mass': { value: 1.673e-27, unit: 'kg', tolerance: 0.01 },
  'm_p': { value: 1.673e-27, unit: 'kg', tolerance: 0.01 },
  'gravitational_constant': { value: 6.674e-11, unit: 'N.m^2/kg^2', tolerance: 0.01 },
  'G': { value: 6.674e-11, unit: 'N.m^2/kg^2', tolerance: 0.01 },
  'gas_constant': { value: 8.314, unit: 'J/(mol.K)', tolerance: 0.01 },
  'R': { value: 8.314, unit: 'J/(mol.K)', tolerance: 0.01 },
  'faraday': { value: 96485, unit: 'C/mol', tolerance: 0.01 },
  'F': { value: 96485, unit: 'C/mol', tolerance: 0.01 },
  'pi': { value: Math.PI, unit: '', tolerance: 0.0001 },
  'g': { value: 9.8, unit: 'm/s^2', tolerance: 0.05 },
  'g_earth': { value: 9.8, unit: 'm/s^2', tolerance: 0.05 },
};

const EXPRESSION_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*[\+\-\*\/\^]\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g,
  /(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g,
  /(\d+(?:\.\d+)?)\s*÷\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g,
  /√(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g,
  /(\d+(?:\.\d+)?)\s*²\s*=\s*(\d+(?:\.\d+)?)/g,
  /(\d+(?:\.\d+)?)\s*³\s*=\s*(\d+(?:\.\d+)?)/g,
  /log\s*\(\s*(\d+(?:\.\d+)?)\s*\)\s*=\s*(\d+(?:\.\d+)?)/gi,
  /ln\s*\(\s*(\d+(?:\.\d+)?)\s*\)\s*=\s*(\d+(?:\.\d+)?)/gi,
  /sin\s*\(\s*(\d+(?:\.\d+)?)\s*°?\s*\)\s*=\s*(\d+(?:\.\d+)?)/gi,
  /cos\s*\(\s*(\d+(?:\.\d+)?)\s*°?\s*\)\s*=\s*(\d+(?:\.\d+)?)/gi,
  /tan\s*\(\s*(\d+(?:\.\d+)?)\s*°?\s*\)\s*=\s*(\d+(?:\.\d+)?)/gi,
];

const UNIT_CONVERSION_PATTERN = /(\d+(?:\.\d+)?)\s*°?([a-zA-Z]+(?:\/[a-zA-Z]+)?(?:\^?\d)?)\s*=\s*(\d+(?:\.\d+)?)\s*°?([a-zA-Z]+(?:\/[a-zA-Z]+)?(?:\^?\d)?)/g;

export class AccuracyAssuranceService {
  private mathParser: math.MathJsInstance;

  constructor() {
    this.mathParser = math.create(math.all);
    
    this.mathParser.config({
      number: 'number',
      precision: 14,
    });
  }

  analyzeChunk = memoizee(
    async (
      chunk: string,
      subject?: string,
      topic?: string
    ): Promise<AccuracyAuditResult> => {
      const startTime = Date.now();
      const issues: AccuracyIssue[] = [];
      let calculationsVerified = 0;
      let unitsValidated = 0;
      let formulasChecked = 0;

      const calcIssues = this.verifyCalculations(chunk);
      issues.push(...calcIssues);
      calculationsVerified = calcIssues.length === 0 ? 
        (chunk.match(/\d+\s*[\+\-\*\/\^×÷]\s*\d+/g)?.length || 0) : 
        calcIssues.filter(i => i.severity !== 'error' && i.severity !== 'critical').length;

      const unitIssues = this.validateUnitConversions(chunk);
      issues.push(...unitIssues);
      unitsValidated = unitIssues.length === 0 ?
        (chunk.match(UNIT_CONVERSION_PATTERN)?.length || 0) :
        unitIssues.filter(i => i.severity !== 'error' && i.severity !== 'critical').length;

      if (subject && topic) {
        const formulaIssues = await this.checkFormulaConsistency(chunk, subject, topic);
        issues.push(...formulaIssues);
        formulasChecked = formulaIssues.length === 0 ? 1 : 0;
      }

      const constantIssues = this.verifyScientificConstants(chunk);
      issues.push(...constantIssues);

      const overallSeverity = this.determineOverallSeverity(issues);
      const passed = overallSeverity !== 'critical' && overallSeverity !== 'error';

      return {
        passed,
        overallSeverity,
        issues,
        calculationsVerified,
        unitsValidated,
        formulasChecked,
        processingTimeMs: Date.now() - startTime,
      };
    },
    { maxAge: 60000, max: 100 }
  );

  async validateFinalResponse(
    fullResponse: string,
    subject?: string,
    topic?: string,
    examTarget?: string
  ): Promise<AccuracyAuditResult> {
    const startTime = Date.now();
    const allIssues: AccuracyIssue[] = [];
    let totalCalcs = 0;
    let totalUnits = 0;
    let totalFormulas = 0;

    const sentences = fullResponse.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
      if (sentence.length < 5) continue;
      
      const chunkResult = await this.analyzeChunk(sentence, subject, topic);
      allIssues.push(...chunkResult.issues);
      totalCalcs += chunkResult.calculationsVerified;
      totalUnits += chunkResult.unitsValidated;
      totalFormulas += chunkResult.formulasChecked;
    }

    const crossRefIssues = await this.crossReferenceFormulas(fullResponse, subject, topic);
    allIssues.push(...crossRefIssues);

    if (examTarget) {
      const examIssues = this.validateForExamTarget(fullResponse, examTarget);
      allIssues.push(...examIssues);
    }

    const deduplicatedIssues = this.deduplicateIssues(allIssues);
    const overallSeverity = this.determineOverallSeverity(deduplicatedIssues);
    const passed = overallSeverity !== 'critical' && overallSeverity !== 'error';

    return {
      passed,
      overallSeverity,
      issues: deduplicatedIssues,
      calculationsVerified: totalCalcs,
      unitsValidated: totalUnits,
      formulasChecked: totalFormulas + crossRefIssues.length,
      processingTimeMs: Date.now() - startTime,
    };
  }

  verifyCitation(
    citedText: string,
    sourceContent: string,
    tolerance: number = 0.8
  ): AccuracyIssue | null {
    const normalizedCited = citedText.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedSource = sourceContent.toLowerCase().replace(/\s+/g, ' ');

    if (normalizedSource.includes(normalizedCited)) {
      return null;
    }

    const citedWords = normalizedCited.split(' ');
    const matchedWords = citedWords.filter(word => normalizedSource.includes(word));
    const matchRatio = matchedWords.length / citedWords.length;

    if (matchRatio < tolerance) {
      return {
        type: 'citation',
        severity: matchRatio < 0.5 ? 'error' : 'warning',
        originalText: citedText,
        issue: `Citation does not match source content (${Math.round(matchRatio * 100)}% match)`,
        confidence: 1 - matchRatio,
        requiresRegeneration: matchRatio < 0.3,
      };
    }

    return null;
  }

  private verifyCalculations(text: string): AccuracyIssue[] {
    const issues: AccuracyIssue[] = [];

    const simpleExprPattern = /(\d+(?:\.\d+)?)\s*([\+\-\*\/×÷\^])\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g;
    let match;

    while ((match = simpleExprPattern.exec(text)) !== null) {
      const [fullMatch, num1, op, num2, result] = match;
      const a = parseFloat(num1);
      const b = parseFloat(num2);
      const stated = parseFloat(result);
      
      let expected: number;
      switch (op) {
        case '+': expected = a + b; break;
        case '-': expected = a - b; break;
        case '*':
        case '×': expected = a * b; break;
        case '/':
        case '÷': expected = b !== 0 ? a / b : NaN; break;
        case '^': expected = Math.pow(a, b); break;
        default: continue;
      }

      if (isNaN(expected)) {
        issues.push({
          type: 'calculation',
          severity: 'error',
          originalText: fullMatch,
          issue: 'Division by zero',
          confidence: 1.0,
          requiresRegeneration: true,
        });
        continue;
      }

      const tolerance = Math.abs(expected) < 1 ? 0.01 : Math.abs(expected) * 0.001;
      if (Math.abs(expected - stated) > tolerance) {
        issues.push({
          type: 'calculation',
          severity: 'error',
          originalText: fullMatch,
          issue: `Calculation error: ${num1} ${op} ${num2} should equal ${this.formatNumber(expected)}, not ${result}`,
          autoFix: `${num1} ${op} ${num2} = ${this.formatNumber(expected)}`,
          confidence: 1.0,
          requiresRegeneration: false,
        });
      }
    }

    const sqrtPattern = /√\(?(\d+(?:\.\d+)?)\)?\s*=\s*(\d+(?:\.\d+)?)/g;
    while ((match = sqrtPattern.exec(text)) !== null) {
      const [fullMatch, num, result] = match;
      const expected = Math.sqrt(parseFloat(num));
      const stated = parseFloat(result);
      
      const tolerance = Math.abs(expected) * 0.01;
      if (Math.abs(expected - stated) > tolerance) {
        issues.push({
          type: 'calculation',
          severity: 'error',
          originalText: fullMatch,
          issue: `Square root error: √${num} should equal ${this.formatNumber(expected)}, not ${result}`,
          autoFix: `√${num} = ${this.formatNumber(expected)}`,
          confidence: 1.0,
          requiresRegeneration: false,
        });
      }
    }

    const squarePattern = /(\d+(?:\.\d+)?)\s*²\s*=\s*(\d+(?:\.\d+)?)/g;
    while ((match = squarePattern.exec(text)) !== null) {
      const [fullMatch, num, result] = match;
      const expected = Math.pow(parseFloat(num), 2);
      const stated = parseFloat(result);
      
      const tolerance = Math.abs(expected) * 0.001;
      if (Math.abs(expected - stated) > tolerance) {
        issues.push({
          type: 'calculation',
          severity: 'error',
          originalText: fullMatch,
          issue: `Square error: ${num}² should equal ${this.formatNumber(expected)}, not ${result}`,
          autoFix: `${num}² = ${this.formatNumber(expected)}`,
          confidence: 1.0,
          requiresRegeneration: false,
        });
      }
    }

    const cubePattern = /(\d+(?:\.\d+)?)\s*³\s*=\s*(\d+(?:\.\d+)?)/g;
    while ((match = cubePattern.exec(text)) !== null) {
      const [fullMatch, num, result] = match;
      const expected = Math.pow(parseFloat(num), 3);
      const stated = parseFloat(result);
      
      const tolerance = Math.abs(expected) * 0.001;
      if (Math.abs(expected - stated) > tolerance) {
        issues.push({
          type: 'calculation',
          severity: 'error',
          originalText: fullMatch,
          issue: `Cube error: ${num}³ should equal ${this.formatNumber(expected)}, not ${result}`,
          autoFix: `${num}³ = ${this.formatNumber(expected)}`,
          confidence: 1.0,
          requiresRegeneration: false,
        });
      }
    }

    return issues;
  }

  private validateUnitConversions(text: string): AccuracyIssue[] {
    const issues: AccuracyIssue[] = [];
    
    const temperaturePattern = /(\d+(?:\.\d+)?)\s*°?\s*(C|K|F|celsius|kelvin|fahrenheit)\s*=\s*(\d+(?:\.\d+)?)\s*°?\s*(C|K|F|celsius|kelvin|fahrenheit)/gi;
    let tempMatch;
    
    while ((tempMatch = temperaturePattern.exec(text)) !== null) {
      const [fullMatch, value1, unit1Raw, value2, unit2Raw] = tempMatch;
      const v1 = parseFloat(value1);
      const v2 = parseFloat(value2);
      const u1 = this.normalizeUnit(unit1Raw);
      const u2 = this.normalizeUnit(unit2Raw);
      
      let expectedValue: number | null = null;
      
      if (u1 === 'C' && u2 === 'K') expectedValue = v1 + 273.15;
      else if (u1 === 'K' && u2 === 'C') expectedValue = v1 - 273.15;
      else if (u1 === 'C' && u2 === 'F') expectedValue = (v1 * 9/5) + 32;
      else if (u1 === 'F' && u2 === 'C') expectedValue = (v1 - 32) * 5/9;
      else if (u1 === 'F' && u2 === 'K') expectedValue = (v1 - 32) * 5/9 + 273.15;
      else if (u1 === 'K' && u2 === 'F') expectedValue = (v1 - 273.15) * 9/5 + 32;
      
      if (expectedValue !== null) {
        const tolerance = Math.max(Math.abs(expectedValue) * 0.02, 0.5);
        if (Math.abs(expectedValue - v2) > tolerance) {
          issues.push({
            type: 'unit',
            severity: 'error',
            originalText: fullMatch,
            issue: `Temperature conversion error: ${value1}${unit1Raw} should equal ${this.formatNumber(expectedValue)}${unit2Raw}, not ${value2}${unit2Raw}`,
            autoFix: `${value1}${unit1Raw} = ${this.formatNumber(expectedValue)}${unit2Raw}`,
            confidence: 0.98,
            requiresRegeneration: false,
          });
        }
      }
    }
    
    const unitConvPattern = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+(?:[\/·\.\(\)][a-zA-Z·\.\(\)]*)*(?:[\^²³]?\d?)?)\s*=\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+(?:[\/·\.\(\)][a-zA-Z·\.\(\)]*)*(?:[\^²³]?\d?)?)/g;
    let match;

    while ((match = unitConvPattern.exec(text)) !== null) {
      const [fullMatch, value1, unit1, value2, unit2] = match;
      const v1 = parseFloat(value1);
      const v2 = parseFloat(value2);
      
      const normalizedUnit1 = this.normalizeUnit(unit1);
      const normalizedUnit2 = this.normalizeUnit(unit2);

      const conversion = this.findConversion(normalizedUnit1, normalizedUnit2);
      
      if (conversion && conversion.dimension !== 'temperature') {
        const expectedValue = v1 * conversion.factor;
        const tolerance = Math.max(Math.abs(expectedValue) * 0.02, 0.5);
        if (Math.abs(expectedValue - v2) > tolerance) {
          issues.push({
            type: 'unit',
            severity: 'error',
            originalText: fullMatch,
            issue: `Unit conversion error: ${value1} ${unit1} should equal ${this.formatNumber(expectedValue)} ${unit2}, not ${value2} ${unit2}`,
            autoFix: `${value1} ${unit1} = ${this.formatNumber(expectedValue)} ${unit2}`,
            confidence: 0.95,
            requiresRegeneration: false,
          });
        }
      }
    }

    return issues;
  }

  private async checkFormulaConsistency(
    text: string,
    subject: string,
    topic: string
  ): Promise<AccuracyIssue[]> {
    const issues: AccuracyIssue[] = [];

    const formulaPatterns = [
      /([A-Za-z])\s*=\s*([A-Za-z0-9\+\-\*\/\^\(\)\s]+)/g,
      /([A-Za-z]+)\s*=\s*([\d\.]+)\s*([A-Za-z\/\^]+)/g,
    ];

    for (const pattern of formulaPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [fullMatch] = match;
        
        try {
          const formulas = await formulaBankService.searchFormulas(topic, {
            subject,
            limit: 5,
          });

          if (formulas.length > 0) {
            const normalizedFound = this.normalizeFormula(fullMatch);
            let matched = false;

            for (const formula of formulas) {
              const normalizedStored = this.normalizeFormula(formula.plainText);
              if (this.formulasMatch(normalizedFound, normalizedStored)) {
                matched = true;
                break;
              }
            }

            if (!matched && formulas.length > 0) {
              issues.push({
                type: 'formula',
                severity: 'warning',
                originalText: fullMatch,
                issue: `Formula may not match standard form. Known formulas for topic: ${formulas.slice(0, 2).map((f: FormulaBankEntry) => f.plainText).join(', ')}`,
                confidence: 0.7,
                requiresRegeneration: false,
              });
            }
          }
        } catch (error) {
          console.error('[AccuracyAssurance] Formula check error:', error);
        }
      }
    }

    return issues;
  }

  private verifyScientificConstants(text: string): AccuracyIssue[] {
    const issues: AccuracyIssue[] = [];

    for (const [name, constant] of Object.entries(SCIENTIFIC_CONSTANTS)) {
      const patterns = [
        new RegExp(`${name}\\s*[=≈]\\s*(\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?)`, 'gi'),
        new RegExp(`${name}\\s*is\\s*(\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?)`, 'gi'),
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const [fullMatch, valueStr] = match;
          const statedValue = parseFloat(valueStr);
          
          const relativeError = Math.abs((statedValue - constant.value) / constant.value);
          
          if (relativeError > constant.tolerance) {
            issues.push({
              type: 'scientific_fact',
              severity: relativeError > 0.5 ? 'error' : 'warning',
              originalText: fullMatch,
              issue: `Scientific constant ${name} has incorrect value. Expected: ${this.formatScientific(constant.value)} ${constant.unit}, got: ${valueStr}`,
              autoFix: `${name} = ${this.formatScientific(constant.value)} ${constant.unit}`,
              confidence: 0.95,
              requiresRegeneration: relativeError > 0.5,
            });
          }
        }
      }
    }

    return issues;
  }

  private async crossReferenceFormulas(
    text: string,
    subject?: string,
    topic?: string
  ): Promise<AccuracyIssue[]> {
    const issues: AccuracyIssue[] = [];

    if (!subject || !topic) return issues;

    try {
      const formulas = await formulaBankService.searchFormulas(topic, {
        subject,
        limit: 10,
      });

      for (const formula of formulas) {
        const formulaLHS = formula.plainText.split('=')[0]?.trim();
        if (formulaLHS && text.includes(formulaLHS)) {
          const fullFormula = formula.plainText;
          const normalizedFull = this.normalizeFormula(fullFormula);
          
          const mentionPattern = new RegExp(
            `${this.escapeRegex(formulaLHS)}\\s*=\\s*[^.\\n]+`,
            'g'
          );
          
          let match;
          while ((match = mentionPattern.exec(text)) !== null) {
            const foundFormula = match[0];
            const normalizedFound = this.normalizeFormula(foundFormula);
            
            if (!this.formulasMatch(normalizedFound, normalizedFull)) {
              const similarity = this.formulaSimilarity(normalizedFound, normalizedFull);
              if (similarity < 0.8 && similarity > 0.3) {
                issues.push({
                  type: 'formula',
                  severity: 'warning',
                  originalText: foundFormula,
                  issue: `Formula may be incomplete or incorrect. Standard form: ${fullFormula}`,
                  suggestion: fullFormula,
                  confidence: 1 - similarity,
                  requiresRegeneration: false,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[AccuracyAssurance] Cross-reference error:', error);
    }

    return issues;
  }

  private validateForExamTarget(text: string, examTarget: string): AccuracyIssue[] {
    const issues: AccuracyIssue[] = [];
    const normalized = examTarget.toLowerCase().replace(/[\s-]/g, '_');

    if (normalized === 'jee_advanced' || normalized === 'jee_main') {
      const significantFigures = text.match(/=\s*(\d+\.?\d*)/g);
      if (significantFigures) {
        for (const match of significantFigures) {
          const numStr = match.replace('=', '').trim();
          const decimalPlaces = (numStr.split('.')[1] || '').length;
          
          if (decimalPlaces > 4 && !numStr.includes('e')) {
            issues.push({
              type: 'scientific_fact',
              severity: 'info',
              originalText: numStr,
              issue: `For JEE, consider using appropriate significant figures (typically 3-4)`,
              confidence: 0.6,
              requiresRegeneration: false,
            });
          }
        }
      }
    }

    return issues;
  }

  evaluateExpression(expression: string): ParsedExpression {
    const original = expression;
    let normalized = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .replace(/√(\d+)/g, 'sqrt($1)')
      .replace(/π/g, 'pi')
      .trim();

    try {
      const result = this.mathParser.evaluate(normalized);
      return {
        original,
        normalized,
        result: typeof result === 'number' ? result : result.toString(),
        isValid: true,
      };
    } catch (error) {
      return {
        original,
        normalized,
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private normalizeUnit(unit: string): string {
    return unit
      .replace(/°/g, '')
      .replace(/²/g, '2')
      .replace(/³/g, '3')
      .replace(/meter/gi, 'm')
      .replace(/kilogram/gi, 'kg')
      .replace(/gram/gi, 'g')
      .replace(/second/gi, 's')
      .replace(/kelvin/gi, 'K')
      .replace(/celsius/gi, 'C')
      .replace(/fahrenheit/gi, 'F')
      .replace(/joule/gi, 'J')
      .replace(/newton/gi, 'N')
      .replace(/pascal/gi, 'Pa')
      .replace(/volt/gi, 'V')
      .replace(/ampere/gi, 'A')
      .replace(/ohm/gi, 'Ohm');
  }

  private findConversion(fromUnit: string, toUnit: string): UnitConversion | null {
    for (const conversions of Object.values(UNIT_CONVERSIONS)) {
      const direct = conversions.find(c => c.from === fromUnit && c.to === toUnit);
      if (direct) return direct;
      
      const reverse = conversions.find(c => c.from === toUnit && c.to === fromUnit);
      if (reverse) {
        return { ...reverse, from: fromUnit, to: toUnit, factor: 1 / reverse.factor };
      }
    }
    return null;
  }

  private normalizeFormula(formula: string): string {
    return formula
      .replace(/\s+/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .toLowerCase();
  }

  private formulasMatch(f1: string, f2: string): boolean {
    return f1 === f2 || f1.includes(f2) || f2.includes(f1);
  }

  private formulaSimilarity(f1: string, f2: string): number {
    const set1 = new Set(f1.split(''));
    const set2 = new Set(f2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  private determineOverallSeverity(issues: AccuracyIssue[]): AccuracySeverity {
    if (issues.some(i => i.severity === 'critical')) return 'critical';
    if (issues.some(i => i.severity === 'error')) return 'error';
    if (issues.some(i => i.severity === 'warning')) return 'warning';
    if (issues.some(i => i.severity === 'info')) return 'info';
    return 'info';
  }

  private deduplicateIssues(issues: AccuracyIssue[]): AccuracyIssue[] {
    const seen = new Set<string>();
    return issues.filter(issue => {
      const key = `${issue.type}-${issue.originalText}-${issue.issue}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private formatNumber(num: number): string {
    if (Math.abs(num) >= 1e6 || (Math.abs(num) < 0.001 && num !== 0)) {
      return num.toExponential(3);
    }
    return Number(num.toPrecision(6)).toString();
  }

  private formatScientific(num: number): string {
    if (Math.abs(num) >= 1000 || Math.abs(num) < 0.01) {
      return num.toExponential(3);
    }
    return num.toString();
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const accuracyAssuranceService = new AccuracyAssuranceService();
