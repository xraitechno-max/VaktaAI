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

interface CompoundUnitConversion {
  from: string;
  to: string;
  factor: number;
  dimension: string;
  aliases?: string[];
}

interface MathPattern {
  name: string;
  pattern: RegExp;
  validator: (match: RegExpMatchArray) => { expected: number; stated: number; tolerance: number } | null;
  description: string;
}

const COMPOUND_UNIT_CONVERSIONS: CompoundUnitConversion[] = [
  { from: 'm/s', to: 'km/h', factor: 3.6, dimension: 'velocity', aliases: ['m/sec', 'ms^-1'] },
  { from: 'km/h', to: 'm/s', factor: 1/3.6, dimension: 'velocity', aliases: ['kmph', 'km/hr', 'kmh^-1'] },
  { from: 'cm/s', to: 'm/s', factor: 0.01, dimension: 'velocity' },
  { from: 'ft/s', to: 'm/s', factor: 0.3048, dimension: 'velocity' },
  
  { from: 'm/s2', to: 'cm/s2', factor: 100, dimension: 'acceleration', aliases: ['m/s^2', 'ms^-2'] },
  { from: 'cm/s2', to: 'm/s2', factor: 0.01, dimension: 'acceleration', aliases: ['cm/s^2', 'cms^-2'] },
  { from: 'g', to: 'm/s2', factor: 9.8, dimension: 'acceleration' },
  { from: 'ft/s2', to: 'm/s2', factor: 0.3048, dimension: 'acceleration' },
  
  { from: 'kg/m3', to: 'g/cm3', factor: 0.001, dimension: 'density', aliases: ['kg/m^3', 'kgm^-3'] },
  { from: 'g/cm3', to: 'kg/m3', factor: 1000, dimension: 'density', aliases: ['g/cc', 'gcm^-3'] },
  { from: 'g/mL', to: 'kg/m3', factor: 1000, dimension: 'density' },
  { from: 'kg/L', to: 'kg/m3', factor: 1000, dimension: 'density' },
  
  { from: 'mol/L', to: 'mM', factor: 1000, dimension: 'concentration', aliases: ['M', 'molar'] },
  { from: 'mM', to: 'mol/L', factor: 0.001, dimension: 'concentration', aliases: ['millimolar'] },
  { from: 'mol/L', to: 'mmol/L', factor: 1000, dimension: 'concentration' },
  { from: 'g/L', to: 'mg/mL', factor: 1, dimension: 'concentration' },
  { from: 'ppm', to: 'mg/L', factor: 1, dimension: 'concentration' },
  { from: 'ppm', to: 'mg/kg', factor: 1, dimension: 'concentration' },
  { from: 'ppb', to: 'ug/L', factor: 1, dimension: 'concentration', aliases: ['μg/L'] },
  { from: '%w/v', to: 'g/100mL', factor: 1, dimension: 'concentration' },
  { from: '%w/w', to: 'g/100g', factor: 1, dimension: 'concentration' },
  
  { from: 'J/(mol.K)', to: 'cal/(mol.K)', factor: 0.239, dimension: 'molar_heat_capacity', aliases: ['J/mol.K', 'J/(mol·K)'] },
  { from: 'cal/(mol.K)', to: 'J/(mol.K)', factor: 4.184, dimension: 'molar_heat_capacity' },
  { from: 'J/(g.K)', to: 'cal/(g.K)', factor: 0.239, dimension: 'specific_heat', aliases: ['J/g.K', 'J/(g·K)'] },
  { from: 'cal/(g.K)', to: 'J/(g.K)', factor: 4.184, dimension: 'specific_heat' },
  { from: 'J/(kg.K)', to: 'J/(g.K)', factor: 0.001, dimension: 'specific_heat' },
  
  { from: 'Pa.s', to: 'P', factor: 10, dimension: 'dynamic_viscosity', aliases: ['Pa·s', 'Pas'] },
  { from: 'P', to: 'Pa.s', factor: 0.1, dimension: 'dynamic_viscosity', aliases: ['poise'] },
  { from: 'cP', to: 'Pa.s', factor: 0.001, dimension: 'dynamic_viscosity', aliases: ['centipoise'] },
  { from: 'm2/s', to: 'St', factor: 1e4, dimension: 'kinematic_viscosity', aliases: ['m^2/s'] },
  { from: 'St', to: 'm2/s', factor: 1e-4, dimension: 'kinematic_viscosity', aliases: ['stokes'] },
  { from: 'cSt', to: 'm2/s', factor: 1e-6, dimension: 'kinematic_viscosity', aliases: ['centistokes'] },
  
  { from: 'W/(m.K)', to: 'cal/(cm.s.C)', factor: 0.00239, dimension: 'thermal_conductivity', aliases: ['W/m.K', 'W/(m·K)'] },
  { from: 'cal/(cm.s.C)', to: 'W/(m.K)', factor: 418.4, dimension: 'thermal_conductivity' },
  
  { from: 'V/m', to: 'N/C', factor: 1, dimension: 'electric_field', aliases: ['V/m', 'Vm^-1'] },
  { from: 'kV/m', to: 'V/m', factor: 1000, dimension: 'electric_field' },
  { from: 'V/cm', to: 'V/m', factor: 100, dimension: 'electric_field' },
  
  { from: 'T', to: 'G', factor: 1e4, dimension: 'magnetic_field', aliases: ['tesla'] },
  { from: 'G', to: 'T', factor: 1e-4, dimension: 'magnetic_field', aliases: ['gauss'] },
  { from: 'mT', to: 'T', factor: 0.001, dimension: 'magnetic_field' },
  { from: 'Wb/m2', to: 'T', factor: 1, dimension: 'magnetic_field', aliases: ['Wb/m^2'] },
  
  { from: 'N/m2', to: 'Pa', factor: 1, dimension: 'pressure', aliases: ['N/m^2', 'Nm^-2'] },
  { from: 'kPa', to: 'Pa', factor: 1000, dimension: 'pressure' },
  { from: 'MPa', to: 'Pa', factor: 1e6, dimension: 'pressure' },
  { from: 'bar', to: 'Pa', factor: 1e5, dimension: 'pressure' },
  { from: 'atm', to: 'Pa', factor: 101325, dimension: 'pressure' },
  { from: 'atm', to: 'bar', factor: 1.01325, dimension: 'pressure' },
  { from: 'mmHg', to: 'Pa', factor: 133.322, dimension: 'pressure', aliases: ['torr'] },
  { from: 'atm', to: 'mmHg', factor: 760, dimension: 'pressure' },
  
  { from: 'N.m', to: 'J', factor: 1, dimension: 'energy', aliases: ['N·m', 'Nm'] },
  { from: 'kJ', to: 'J', factor: 1000, dimension: 'energy' },
  { from: 'MJ', to: 'J', factor: 1e6, dimension: 'energy' },
  { from: 'kJ/mol', to: 'J/mol', factor: 1000, dimension: 'molar_energy' },
  { from: 'kcal/mol', to: 'kJ/mol', factor: 4.184, dimension: 'molar_energy' },
  { from: 'eV', to: 'J', factor: 1.602e-19, dimension: 'energy' },
  { from: 'MeV', to: 'J', factor: 1.602e-13, dimension: 'energy' },
  { from: 'erg', to: 'J', factor: 1e-7, dimension: 'energy' },
  
  { from: 'kg.m/s', to: 'N.s', factor: 1, dimension: 'momentum', aliases: ['kg·m/s', 'kgm/s'] },
  { from: 'g.cm/s', to: 'kg.m/s', factor: 1e-5, dimension: 'momentum' },
  
  { from: 'J/s', to: 'W', factor: 1, dimension: 'power' },
  { from: 'kW', to: 'W', factor: 1000, dimension: 'power' },
  { from: 'MW', to: 'W', factor: 1e6, dimension: 'power' },
  { from: 'hp', to: 'W', factor: 745.7, dimension: 'power', aliases: ['horsepower'] },
  
  { from: 'C/s', to: 'A', factor: 1, dimension: 'current' },
  { from: 'mA', to: 'A', factor: 0.001, dimension: 'current' },
  { from: 'uA', to: 'A', factor: 1e-6, dimension: 'current', aliases: ['μA'] },
  
  { from: 'J/C', to: 'V', factor: 1, dimension: 'voltage' },
  { from: 'mV', to: 'V', factor: 0.001, dimension: 'voltage' },
  { from: 'kV', to: 'V', factor: 1000, dimension: 'voltage' },
  
  { from: 'V/A', to: 'ohm', factor: 1, dimension: 'resistance', aliases: ['Ω'] },
  { from: 'kohm', to: 'ohm', factor: 1000, dimension: 'resistance', aliases: ['kΩ'] },
  { from: 'Mohm', to: 'ohm', factor: 1e6, dimension: 'resistance', aliases: ['MΩ'] },
  
  { from: 'C/V', to: 'F', factor: 1, dimension: 'capacitance' },
  { from: 'uF', to: 'F', factor: 1e-6, dimension: 'capacitance', aliases: ['μF'] },
  { from: 'nF', to: 'F', factor: 1e-9, dimension: 'capacitance' },
  { from: 'pF', to: 'F', factor: 1e-12, dimension: 'capacitance' },
  
  { from: 'Wb/A', to: 'H', factor: 1, dimension: 'inductance' },
  { from: 'mH', to: 'H', factor: 0.001, dimension: 'inductance' },
  { from: 'uH', to: 'H', factor: 1e-6, dimension: 'inductance', aliases: ['μH'] },
  
  { from: 'mol/kg', to: 'molal', factor: 1, dimension: 'molality', aliases: ['m'] },
  { from: 'eq/L', to: 'N', factor: 1, dimension: 'normality', aliases: ['normal'] },
  
  { from: 'L.atm/(mol.K)', to: 'J/(mol.K)', factor: 101.325, dimension: 'gas_constant' },
  { from: 'cal/(mol.K)', to: 'L.atm/(mol.K)', factor: 0.0413, dimension: 'gas_constant' },
  
  { from: 'rad/s', to: 'rpm', factor: 9.5493, dimension: 'angular_velocity' },
  { from: 'rpm', to: 'rad/s', factor: 0.10472, dimension: 'angular_velocity' },
  { from: 'deg/s', to: 'rad/s', factor: 0.01745, dimension: 'angular_velocity' },
  
  { from: 'kg.m2', to: 'g.cm2', factor: 1e7, dimension: 'moment_of_inertia', aliases: ['kg·m²', 'kg.m^2'] },
  { from: 'g.cm2', to: 'kg.m2', factor: 1e-7, dimension: 'moment_of_inertia', aliases: ['g·cm²', 'g.cm^2'] },
  
  { from: 'N/m', to: 'dyne/cm', factor: 1000, dimension: 'surface_tension' },
  { from: 'mN/m', to: 'N/m', factor: 0.001, dimension: 'surface_tension' },
];

const JEE_NEET_MATH_PATTERNS: MathPattern[] = [
  {
    name: 'quadratic_discriminant',
    pattern: /(?:discriminant|D)\s*=\s*b²\s*-\s*4ac\s*=\s*\(?(\d+(?:\.\d+)?)\)?²\s*-\s*4\s*[×\*]?\s*\(?(\d+(?:\.\d+)?)\)?\s*[×\*]?\s*\(?(-?\d+(?:\.\d+)?)\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const b = parseFloat(m[1]), a = parseFloat(m[2]), c = parseFloat(m[3]), stated = parseFloat(m[4]);
      return { expected: b*b - 4*a*c, stated, tolerance: 0.01 };
    },
    description: 'Quadratic discriminant D = b² - 4ac'
  },
  {
    name: 'quadratic_roots',
    pattern: /x\s*=\s*\(-?(\d+(?:\.\d+)?)\s*[±]\s*√(\d+(?:\.\d+)?)\)\s*\/\s*\(?2\s*[×\*]?\s*(\d+(?:\.\d+)?)\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const negB = parseFloat(m[1]), sqrtD = parseFloat(m[2]), twoA = 2 * parseFloat(m[3]), stated = parseFloat(m[4]);
      const expected1 = (-negB + Math.sqrt(sqrtD)) / twoA;
      const expected2 = (-negB - Math.sqrt(sqrtD)) / twoA;
      const closest = Math.abs(expected1 - stated) < Math.abs(expected2 - stated) ? expected1 : expected2;
      return { expected: closest, stated, tolerance: 0.01 };
    },
    description: 'Quadratic formula roots'
  },
  {
    name: 'logarithm_base10',
    pattern: /log\s*\(?(\d+(?:\.\d+)?)\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const num = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: Math.log10(num), stated, tolerance: 0.01 };
    },
    description: 'Logarithm base 10'
  },
  {
    name: 'natural_log',
    pattern: /ln\s*\(?(\d+(?:\.\d+)?)\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const num = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: Math.log(num), stated, tolerance: 0.01 };
    },
    description: 'Natural logarithm'
  },
  {
    name: 'log_with_base',
    pattern: /log[_₂₃₄₅₆₇₈₉]?(\d+)\s*\(?(\d+(?:\.\d+)?)\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const base = parseFloat(m[1]), num = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: Math.log(num) / Math.log(base), stated, tolerance: 0.01 };
    },
    description: 'Logarithm with custom base'
  },
  {
    name: 'sine_degrees',
    pattern: /sin\s*\(?(\d+(?:\.\d+)?)\s*°\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const deg = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: Math.sin(deg * Math.PI / 180), stated, tolerance: 0.001 };
    },
    description: 'Sine in degrees'
  },
  {
    name: 'cosine_degrees',
    pattern: /cos\s*\(?(\d+(?:\.\d+)?)\s*°\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const deg = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: Math.cos(deg * Math.PI / 180), stated, tolerance: 0.001 };
    },
    description: 'Cosine in degrees'
  },
  {
    name: 'tangent_degrees',
    pattern: /tan\s*\(?(\d+(?:\.\d+)?)\s*°\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const deg = parseFloat(m[1]), stated = parseFloat(m[2]);
      if (deg === 90 || deg === 270) return null;
      return { expected: Math.tan(deg * Math.PI / 180), stated, tolerance: 0.001 };
    },
    description: 'Tangent in degrees'
  },
  {
    name: 'sine_radians',
    pattern: /sin\s*\(?(\d+(?:\.\d+)?)\s*(?:rad)?\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const rad = parseFloat(m[1]), stated = parseFloat(m[2]);
      if (m[0].includes('°')) return null;
      return { expected: Math.sin(rad), stated, tolerance: 0.001 };
    },
    description: 'Sine in radians'
  },
  {
    name: 'cosine_radians',
    pattern: /cos\s*\(?(\d+(?:\.\d+)?)\s*(?:rad)?\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const rad = parseFloat(m[1]), stated = parseFloat(m[2]);
      if (m[0].includes('°')) return null;
      return { expected: Math.cos(rad), stated, tolerance: 0.001 };
    },
    description: 'Cosine in radians'
  },
  {
    name: 'exponential',
    pattern: /e\s*\^\s*\(?(-?\d+(?:\.\d+)?)\)?\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi,
    validator: (m) => {
      const exp = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: Math.exp(exp), stated, tolerance: Math.abs(Math.exp(exp)) * 0.01 };
    },
    description: 'Exponential e^x'
  },
  {
    name: 'power_10',
    pattern: /10\s*\^\s*\(?(-?\d+(?:\.\d+)?)\)?\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi,
    validator: (m) => {
      const exp = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: Math.pow(10, exp), stated, tolerance: Math.abs(Math.pow(10, exp)) * 0.01 };
    },
    description: 'Power of 10'
  },
  {
    name: 'factorial',
    pattern: /(\d+)!\s*=\s*(\d+)/g,
    validator: (m) => {
      const n = parseInt(m[1]), stated = parseInt(m[2]);
      let factorial = 1;
      for (let i = 2; i <= n; i++) factorial *= i;
      return { expected: factorial, stated, tolerance: 0 };
    },
    description: 'Factorial'
  },
  {
    name: 'combination',
    pattern: /(?:C|nCr|C_?)(\d+)[_,](\d+)\s*=\s*(\d+)/gi,
    validator: (m) => {
      const n = parseInt(m[1]), r = parseInt(m[2]), stated = parseInt(m[3]);
      const factorial = (x: number) => { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; };
      const expected = factorial(n) / (factorial(r) * factorial(n - r));
      return { expected, stated, tolerance: 0 };
    },
    description: 'Combination nCr'
  },
  {
    name: 'permutation',
    pattern: /(?:P|nPr|P_?)(\d+)[_,](\d+)\s*=\s*(\d+)/gi,
    validator: (m) => {
      const n = parseInt(m[1]), r = parseInt(m[2]), stated = parseInt(m[3]);
      const factorial = (x: number) => { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; };
      const expected = factorial(n) / factorial(n - r);
      return { expected, stated, tolerance: 0 };
    },
    description: 'Permutation nPr'
  },
  {
    name: 'percentage',
    pattern: /(\d+(?:\.\d+)?)\s*%\s*(?:of)?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const percent = parseFloat(m[1]), total = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: (percent / 100) * total, stated, tolerance: 0.01 };
    },
    description: 'Percentage calculation'
  },
  {
    name: 'ratio_proportion',
    pattern: /(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*(?:=|::)\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/g,
    validator: (m) => {
      const a = parseFloat(m[1]), b = parseFloat(m[2]), c = parseFloat(m[3]), d = parseFloat(m[4]);
      return { expected: a/b, stated: c/d, tolerance: 0.01 };
    },
    description: 'Ratio proportion check'
  },
  {
    name: 'arithmetic_progression_nth',
    pattern: /a[_n]?\s*=\s*(\d+(?:\.\d+)?)\s*\+\s*\((\d+)\s*-\s*1\)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const a = parseFloat(m[1]), n = parseInt(m[2]), d = parseFloat(m[3]), stated = parseFloat(m[4]);
      return { expected: a + (n - 1) * d, stated, tolerance: 0.01 };
    },
    description: 'AP nth term'
  },
  {
    name: 'geometric_progression_nth',
    pattern: /a[_n]?\s*=\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*\^\s*\((\d+)\s*-\s*1\)\s*=\s*(\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const a = parseFloat(m[1]), r = parseFloat(m[2]), n = parseInt(m[3]), stated = parseFloat(m[4]);
      return { expected: a * Math.pow(r, n - 1), stated, tolerance: Math.abs(a * Math.pow(r, n - 1)) * 0.01 };
    },
    description: 'GP nth term'
  },
  {
    name: 'sum_ap',
    pattern: /S[_n]?\s*=\s*\(?(\d+)\s*\/\s*2\)?\s*[×\*]?\s*\(2\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*\+\s*\((\d+)\s*-\s*1\)\s*[×\*]?\s*(\d+(?:\.\d+)?)\)\s*=\s*(\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const n = parseInt(m[1]), a = parseFloat(m[2]), n2 = parseInt(m[3]), d = parseFloat(m[4]), stated = parseFloat(m[5]);
      return { expected: (n / 2) * (2 * a + (n - 1) * d), stated, tolerance: 0.01 };
    },
    description: 'Sum of AP'
  },
  {
    name: 'binomial_coefficient',
    pattern: /\((\d+)\s*\+\s*(\d+)\)\s*\^\s*(\d+)\s*.*?=\s*(\d+)/gi,
    validator: (m) => {
      const a = parseInt(m[1]), b = parseInt(m[2]), n = parseInt(m[3]), stated = parseInt(m[4]);
      return { expected: Math.pow(a + b, n), stated, tolerance: 0 };
    },
    description: 'Binomial expansion result'
  },
  {
    name: 'pythagorean',
    pattern: /√\s*\((\d+(?:\.\d+)?)\s*²\s*\+\s*(\d+(?:\.\d+)?)\s*²\)\s*=\s*(\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const a = parseFloat(m[1]), b = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: Math.sqrt(a*a + b*b), stated, tolerance: 0.01 };
    },
    description: 'Pythagorean theorem'
  },
  {
    name: 'distance_formula',
    pattern: /√\s*\[\s*\((-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\)\s*²\s*\+\s*\((-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\)\s*²\s*\]\s*=\s*(\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const x1 = parseFloat(m[1]), x2 = parseFloat(m[2]), y1 = parseFloat(m[3]), y2 = parseFloat(m[4]), stated = parseFloat(m[5]);
      return { expected: Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)), stated, tolerance: 0.01 };
    },
    description: 'Distance formula'
  },
  {
    name: 'area_triangle_base_height',
    pattern: /(?:area|A)\s*=\s*(?:1\/2|0\.5)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const base = parseFloat(m[1]), height = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: 0.5 * base * height, stated, tolerance: 0.01 };
    },
    description: 'Area of triangle (base × height / 2)'
  },
  {
    name: 'area_circle',
    pattern: /(?:area|A)\s*=\s*π\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*²\s*=\s*(\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const r = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: Math.PI * r * r, stated, tolerance: 0.01 };
    },
    description: 'Area of circle πr²'
  },
  {
    name: 'circumference',
    pattern: /(?:circumference|C)\s*=\s*2\s*[×\*]?\s*π\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const r = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: 2 * Math.PI * r, stated, tolerance: 0.01 };
    },
    description: 'Circumference 2πr'
  },
  {
    name: 'volume_sphere',
    pattern: /(?:volume|V)\s*=\s*\(4\/3\)\s*[×\*]?\s*π\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*³\s*=\s*(\d+(?:\.\d+)?)/gi,
    validator: (m) => {
      const r = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: (4/3) * Math.PI * Math.pow(r, 3), stated, tolerance: 0.01 };
    },
    description: 'Volume of sphere (4/3)πr³'
  },
  {
    name: 'derivative_power',
    pattern: /d\/dx\s*\[?\s*x\s*\^\s*(\d+)\s*\]?\s*=\s*(\d+)\s*x\s*\^\s*(\d+)/gi,
    validator: (m) => {
      const n = parseInt(m[1]), coeff = parseInt(m[2]), newPow = parseInt(m[3]);
      if (coeff === n && newPow === n - 1) return null;
      return { expected: n, stated: coeff, tolerance: 0 };
    },
    description: 'Power rule derivative d/dx[x^n] = nx^(n-1)'
  },
  {
    name: 'integral_power',
    pattern: /∫\s*x\s*\^\s*(\d+)\s*dx\s*=\s*x\s*\^\s*(\d+)\s*\/\s*(\d+)/gi,
    validator: (m) => {
      const n = parseInt(m[1]), newPow = parseInt(m[2]), denom = parseInt(m[3]);
      if (newPow === n + 1 && denom === n + 1) return null;
      return { expected: n + 1, stated: newPow, tolerance: 0 };
    },
    description: 'Power rule integral ∫x^n dx = x^(n+1)/(n+1)'
  },
];

const PHYSICS_FORMULAS: { pattern: RegExp; formula: string; validator: (m: RegExpMatchArray) => { expected: number; stated: number; tolerance: number } | null }[] = [
  {
    pattern: /v\s*=\s*u\s*\+\s*a\s*t\s*=\s*(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'v = u + at',
    validator: (m) => {
      const u = parseFloat(m[1]), a = parseFloat(m[2]), t = parseFloat(m[3]), stated = parseFloat(m[4]);
      return { expected: u + a * t, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /s\s*=\s*u\s*t\s*\+\s*(?:1\/2|0\.5)\s*a\s*t\s*²\s*=\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*\+\s*(?:1\/2|0\.5)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*²?\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 's = ut + ½at²',
    validator: (m) => {
      const u = parseFloat(m[1]), t1 = parseFloat(m[2]), a = parseFloat(m[3]), t2 = parseFloat(m[4]), stated = parseFloat(m[5]);
      return { expected: u * t1 + 0.5 * a * t2 * t2, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /v\s*²\s*=\s*u\s*²\s*\+\s*2\s*a\s*s\s*=\s*(\d+(?:\.\d+)?)\s*²\s*\+\s*2\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'v² = u² + 2as',
    validator: (m) => {
      const u = parseFloat(m[1]), a = parseFloat(m[2]), s = parseFloat(m[3]), stated = parseFloat(m[4]);
      return { expected: u * u + 2 * a * s, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /F\s*=\s*m\s*a\s*=\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'F = ma',
    validator: (m) => {
      const mass = parseFloat(m[1]), acc = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: mass * acc, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /p\s*=\s*m\s*v\s*=\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'p = mv (momentum)',
    validator: (m) => {
      const mass = parseFloat(m[1]), vel = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: mass * vel, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /KE\s*=\s*(?:1\/2|0\.5)\s*m\s*v\s*²\s*=\s*(?:1\/2|0\.5)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*²\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'KE = ½mv²',
    validator: (m) => {
      const mass = parseFloat(m[1]), vel = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: 0.5 * mass * vel * vel, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /PE\s*=\s*m\s*g\s*h\s*=\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'PE = mgh',
    validator: (m) => {
      const mass = parseFloat(m[1]), g = parseFloat(m[2]), h = parseFloat(m[3]), stated = parseFloat(m[4]);
      return { expected: mass * g * h, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /W\s*=\s*F\s*[×\*·]?\s*d\s*=\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'W = Fd (work)',
    validator: (m) => {
      const force = parseFloat(m[1]), dist = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: force * dist, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /P\s*=\s*W\s*\/\s*t\s*=\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'P = W/t (power)',
    validator: (m) => {
      const work = parseFloat(m[1]), time = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: work / time, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /T\s*=\s*2\s*π\s*√\s*\(?\s*l\s*\/\s*g\s*\)?\s*=\s*2\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*√\s*\(?\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*\)?\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'T = 2π√(l/g) (pendulum)',
    validator: (m) => {
      const pi = parseFloat(m[1]), l = parseFloat(m[2]), g = parseFloat(m[3]), stated = parseFloat(m[4]);
      return { expected: 2 * pi * Math.sqrt(l / g), stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /V\s*=\s*I\s*R\s*=\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'V = IR (Ohm\'s law)',
    validator: (m) => {
      const I = parseFloat(m[1]), R = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: I * R, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /P\s*=\s*I\s*²\s*R\s*=\s*(\d+(?:\.\d+)?)\s*²\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'P = I²R',
    validator: (m) => {
      const I = parseFloat(m[1]), R = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: I * I * R, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /E\s*=\s*k\s*[×\*]?\s*q\s*\/\s*r\s*²\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*²\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi,
    formula: 'E = kq/r² (electric field)',
    validator: (m) => {
      const k = parseFloat(m[1]), q = parseFloat(m[2]), r = parseFloat(m[3]), stated = parseFloat(m[4]);
      return { expected: k * q / (r * r), stated, tolerance: Math.abs(k * q / (r * r)) * 0.02 };
    }
  },
  {
    pattern: /F\s*=\s*G\s*[×\*]?\s*m1\s*[×\*]?\s*m2\s*\/\s*r\s*²\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*\/\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*²\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi,
    formula: 'F = Gm₁m₂/r² (gravitation)',
    validator: (m) => {
      const G = parseFloat(m[1]), m1 = parseFloat(m[2]), m2 = parseFloat(m[3]), r = parseFloat(m[4]), stated = parseFloat(m[5]);
      return { expected: G * m1 * m2 / (r * r), stated, tolerance: Math.abs(G * m1 * m2 / (r * r)) * 0.02 };
    }
  },
];

const CHEMISTRY_FORMULAS: { pattern: RegExp; formula: string; validator: (m: RegExpMatchArray) => { expected: number; stated: number; tolerance: number } | null }[] = [
  {
    pattern: /PV\s*=\s*nRT\s*.*?(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(\d+(?:\.\d+)?)/gi,
    formula: 'PV = nRT (ideal gas)',
    validator: (m) => {
      const P = parseFloat(m[1]), V = parseFloat(m[2]), n = parseFloat(m[3]), R = parseFloat(m[4]), T = parseFloat(m[5]);
      return { expected: P * V, stated: n * R * T, tolerance: 0.02 };
    }
  },
  {
    pattern: /M\s*=\s*n\s*\/\s*V\s*=\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'M = n/V (molarity)',
    validator: (m) => {
      const n = parseFloat(m[1]), V = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: n / V, stated, tolerance: 0.001 };
    }
  },
  {
    pattern: /m\s*=\s*n\s*\/\s*W\s*=\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'm = n/W (molality)',
    validator: (m) => {
      const n = parseFloat(m[1]), W = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: n / W, stated, tolerance: 0.001 };
    }
  },
  {
    pattern: /ΔG\s*=\s*ΔH\s*-\s*TΔS\s*=\s*(-?\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*[×\*]?\s*(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    formula: 'ΔG = ΔH - TΔS',
    validator: (m) => {
      const dH = parseFloat(m[1]), T = parseFloat(m[2]), dS = parseFloat(m[3]), stated = parseFloat(m[4]);
      return { expected: dH - T * dS, stated, tolerance: Math.abs(dH - T * dS) * 0.01 };
    }
  },
  {
    pattern: /pH\s*=\s*-log\s*\[H\+\]\s*=\s*-log\s*\(?(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\)?\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'pH = -log[H⁺]',
    validator: (m) => {
      const H = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: -Math.log10(H), stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /pOH\s*=\s*14\s*-\s*pH\s*=\s*14\s*-\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi,
    formula: 'pOH = 14 - pH',
    validator: (m) => {
      const pH = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: 14 - pH, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /E\s*°?\s*cell\s*=\s*E\s*°?\s*cathode\s*-\s*E\s*°?\s*anode\s*=\s*(-?\d+(?:\.\d+)?)\s*-\s*\(?(-?\d+(?:\.\d+)?)\)?\s*=\s*(-?\d+(?:\.\d+)?)/gi,
    formula: 'E°cell = E°cathode - E°anode',
    validator: (m) => {
      const cathode = parseFloat(m[1]), anode = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: cathode - anode, stated, tolerance: 0.01 };
    }
  },
  {
    pattern: /K\s*=\s*\[products\]\s*\/\s*\[reactants\]\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*\/\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi,
    formula: 'K = [products]/[reactants]',
    validator: (m) => {
      const prod = parseFloat(m[1]), react = parseFloat(m[2]), stated = parseFloat(m[3]);
      return { expected: prod / react, stated, tolerance: Math.abs(prod / react) * 0.02 };
    }
  },
  {
    pattern: /t½\s*=\s*0\.693\s*\/\s*k\s*=\s*0\.693\s*\/\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi,
    formula: 't½ = 0.693/k (half-life)',
    validator: (m) => {
      const k = parseFloat(m[1]), stated = parseFloat(m[2]);
      return { expected: 0.693 / k, stated, tolerance: Math.abs(0.693 / k) * 0.01 };
    }
  },
];

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

      const jeeNeetMathIssues = this.validateJEENEETMathPatterns(chunk);
      issues.push(...jeeNeetMathIssues);
      calculationsVerified += jeeNeetMathIssues.filter(i => i.severity !== 'error' && i.severity !== 'critical').length;

      const compoundUnitIssues = this.validateCompoundUnits(chunk);
      issues.push(...compoundUnitIssues);

      const physicsIssues = this.validatePhysicsFormulas(chunk);
      issues.push(...physicsIssues);
      formulasChecked += physicsIssues.length === 0 ? 1 : 0;

      const chemistryIssues = this.validateChemistryFormulas(chunk);
      issues.push(...chemistryIssues);
      formulasChecked += chemistryIssues.length === 0 ? 1 : 0;

      const unitIssues = this.validateUnitConversions(chunk);
      issues.push(...unitIssues);
      unitsValidated = unitIssues.length === 0 ?
        (chunk.match(UNIT_CONVERSION_PATTERN)?.length || 0) + compoundUnitIssues.filter(i => i.severity !== 'error').length :
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

  private validateJEENEETMathPatterns(text: string): AccuracyIssue[] {
    const issues: AccuracyIssue[] = [];

    for (const mathPattern of JEE_NEET_MATH_PATTERNS) {
      const pattern = new RegExp(mathPattern.pattern.source, mathPattern.pattern.flags);
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        try {
          const result = mathPattern.validator(match);
          if (result === null) continue;

          const { expected, stated, tolerance } = result;
          const actualTolerance = tolerance > 0 ? tolerance : Math.abs(expected) * 0.01;
          
          if (Math.abs(expected - stated) > actualTolerance) {
            issues.push({
              type: 'calculation',
              severity: 'error',
              originalText: match[0],
              issue: `${mathPattern.description} error: expected ${this.formatNumber(expected)}, got ${stated}`,
              autoFix: match[0].replace(String(stated), this.formatNumber(expected)),
              confidence: 0.95,
              requiresRegeneration: false,
            });
          }
        } catch (e) {
          console.error(`[AccuracyAssurance] Math pattern ${mathPattern.name} error:`, e);
        }
      }
    }

    return issues;
  }

  private validateCompoundUnits(text: string): AccuracyIssue[] {
    const issues: AccuracyIssue[] = [];
    
    const compoundUnitPattern = /(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*([a-zA-Z]+(?:[\/·\.\(\)][a-zA-Z·\.\(\)\d\^]*)*)\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*([a-zA-Z]+(?:[\/·\.\(\)][a-zA-Z·\.\(\)\d\^]*)*)/gi;
    
    let match;
    while ((match = compoundUnitPattern.exec(text)) !== null) {
      const [fullMatch, value1Str, unit1, value2Str, unit2] = match;
      const value1 = parseFloat(value1Str);
      const value2 = parseFloat(value2Str);
      
      const normalizedUnit1 = this.normalizeCompoundUnit(unit1);
      const normalizedUnit2 = this.normalizeCompoundUnit(unit2);
      
      const conversion = this.findCompoundConversion(normalizedUnit1, normalizedUnit2);
      
      if (conversion) {
        const expectedValue = value1 * conversion.factor;
        const tolerance = Math.max(Math.abs(expectedValue) * 0.02, 0.01);
        
        if (Math.abs(expectedValue - value2) > tolerance) {
          issues.push({
            type: 'unit',
            severity: 'error',
            originalText: fullMatch,
            issue: `Compound unit conversion error (${conversion.dimension}): ${value1Str} ${unit1} should equal ${this.formatNumber(expectedValue)} ${unit2}, not ${value2Str}`,
            autoFix: `${value1Str} ${unit1} = ${this.formatNumber(expectedValue)} ${unit2}`,
            confidence: 0.92,
            requiresRegeneration: false,
          });
        }
      }
    }

    return issues;
  }

  private normalizeCompoundUnit(unit: string): string {
    return unit
      .replace(/·/g, '.')
      .replace(/\^/g, '')
      .replace(/²/g, '2')
      .replace(/³/g, '3')
      .replace(/\s+/g, '')
      .toLowerCase()
      .replace(/sec/g, 's')
      .replace(/hr/g, 'h')
      .replace(/hour/g, 'h')
      .replace(/meter/g, 'm')
      .replace(/kilogram/g, 'kg')
      .replace(/gram/g, 'g')
      .replace(/litre/g, 'L')
      .replace(/liter/g, 'L')
      .replace(/mole/g, 'mol')
      .replace(/joule/g, 'J')
      .replace(/watt/g, 'W')
      .replace(/newton/g, 'N')
      .replace(/pascal/g, 'Pa')
      .replace(/kelvin/g, 'K')
      .replace(/celsius/g, 'C')
      .replace(/tesla/g, 'T')
      .replace(/gauss/g, 'G')
      .replace(/ohm/g, 'ohm')
      .replace(/farad/g, 'F')
      .replace(/henry/g, 'H')
      .replace(/ampere/g, 'A')
      .replace(/volt/g, 'V')
      .replace(/coulomb/g, 'C');
  }

  private findCompoundConversion(fromUnit: string, toUnit: string): CompoundUnitConversion | null {
    const direct = COMPOUND_UNIT_CONVERSIONS.find(c => {
      const normalizedFrom = this.normalizeCompoundUnit(c.from);
      const normalizedTo = this.normalizeCompoundUnit(c.to);
      const aliasesFrom = c.aliases?.map(a => this.normalizeCompoundUnit(a)) || [];
      const aliasesTo = c.aliases?.map(a => this.normalizeCompoundUnit(a)) || [];
      
      return (normalizedFrom === fromUnit || aliasesFrom.includes(fromUnit)) &&
             (normalizedTo === toUnit || aliasesTo.includes(toUnit));
    });
    
    if (direct) return direct;
    
    const reverse = COMPOUND_UNIT_CONVERSIONS.find(c => {
      const normalizedFrom = this.normalizeCompoundUnit(c.from);
      const normalizedTo = this.normalizeCompoundUnit(c.to);
      const aliasesFrom = c.aliases?.map(a => this.normalizeCompoundUnit(a)) || [];
      const aliasesTo = c.aliases?.map(a => this.normalizeCompoundUnit(a)) || [];
      
      return (normalizedTo === fromUnit || aliasesTo.includes(fromUnit)) &&
             (normalizedFrom === toUnit || aliasesFrom.includes(toUnit));
    });
    
    if (reverse) {
      return { ...reverse, from: fromUnit, to: toUnit, factor: 1 / reverse.factor };
    }
    
    return null;
  }

  private validatePhysicsFormulas(text: string): AccuracyIssue[] {
    const issues: AccuracyIssue[] = [];

    for (const formula of PHYSICS_FORMULAS) {
      const pattern = new RegExp(formula.pattern.source, formula.pattern.flags);
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        try {
          const result = formula.validator(match);
          if (result === null) continue;

          const { expected, stated, tolerance } = result;
          const actualTolerance = tolerance > 0 ? tolerance : Math.abs(expected) * 0.01;
          
          if (Math.abs(expected - stated) > actualTolerance) {
            issues.push({
              type: 'formula',
              severity: 'error',
              originalText: match[0],
              issue: `Physics formula error (${formula.formula}): expected ${this.formatNumber(expected)}, got ${stated}`,
              autoFix: match[0].replace(String(stated), this.formatNumber(expected)),
              confidence: 0.93,
              requiresRegeneration: false,
            });
          }
        } catch (e) {
          console.error(`[AccuracyAssurance] Physics formula error:`, e);
        }
      }
    }

    return issues;
  }

  private validateChemistryFormulas(text: string): AccuracyIssue[] {
    const issues: AccuracyIssue[] = [];

    for (const formula of CHEMISTRY_FORMULAS) {
      const pattern = new RegExp(formula.pattern.source, formula.pattern.flags);
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        try {
          const result = formula.validator(match);
          if (result === null) continue;

          const { expected, stated, tolerance } = result;
          const actualTolerance = tolerance > 0 ? tolerance : Math.abs(expected) * 0.01;
          
          if (Math.abs(expected - stated) > actualTolerance) {
            issues.push({
              type: 'formula',
              severity: 'error',
              originalText: match[0],
              issue: `Chemistry formula error (${formula.formula}): expected ${this.formatNumber(expected)}, got ${stated}`,
              autoFix: match[0].replace(String(stated), this.formatNumber(expected)),
              confidence: 0.93,
              requiresRegeneration: false,
            });
          }
        } catch (e) {
          console.error(`[AccuracyAssurance] Chemistry formula error:`, e);
        }
      }
    }

    return issues;
  }
}

export const accuracyAssuranceService = new AccuracyAssuranceService();
