/**
 * FormulaBankService - STEM Formula Accuracy & TTS-Ready Formatting
 * 
 * Part of Phase 1 Knowledge Intelligence Layer.
 * Provides formula retrieval with speakable text for voice tutoring.
 * 
 * Features:
 * - Subject/topic-specific formula retrieval
 * - TTS-ready speakable text (natural language formulas)
 * - Common mistake detection
 * - Exam-specific formula variants (JEE/NEET)
 * - Derivation steps for advanced teaching
 */

import { db } from '../../db.js';
import { formulaBank } from '@shared/schema';
import { eq, and, ilike, or, desc } from 'drizzle-orm';
import memoizee from 'memoizee';
import { lintSSMLStrict } from '../../utils/ssmlUtils.js';

export interface FormulaBankEntry {
  id: string;
  formulaId: string;
  subject: string;
  classLevel: string;
  chapter: string;
  topic: string;
  subtopic?: string | null;
  latex: string;
  plainText: string;
  speakableText: string;
  unicodeMath?: string | null;
  variables: Array<{
    symbol: string;
    name: string;
    unit: string;
    siUnit?: string;
    description?: string;
  }>;
  resultUnit?: string | null;
  dimensions?: string | null;
  applicableConditions: string[];
  limitations: string[];
  derivationSteps?: Array<{
    step: number;
    description: string;
    formula?: string;
  }>;
  commonMistakes: Array<{
    mistake: string;
    correction: string;
    reason: string;
  }>;
  relatedFormulas: string[];
  prerequisiteFormulas: string[];
  jeeWeightage: number;
  neetWeightage: number;
  boardWeightage: number;
  workedExamples: Array<{
    problem: string;
    solution: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  isVerified: boolean;
  verifiedBy?: string | null;
  source?: string | null;
}

export interface FormulaSearchOptions {
  subject?: string;
  topic?: string;
  classLevel?: string;
  examTarget?: 'jee_main' | 'jee_advanced' | 'neet' | 'boards';
  includeDerivations?: boolean;
  limit?: number;
}

export interface FormulaTTSContext {
  formula: FormulaBankEntry;
  speakableText: string;
  variableExplanation: string;
  conditionsStatement?: string;
  commonMistakeWarning?: string;
}

type FormulaBankRow = typeof formulaBank.$inferSelect;

class FormulaBankService {
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private getFormulasByTopicCached = memoizee(
    async (subject: string, topic: string): Promise<FormulaBankEntry[]> => {
      try {
        const results = await db
          .select()
          .from(formulaBank)
          .where(and(
            ilike(formulaBank.subject, subject),
            ilike(formulaBank.topic, `%${topic}%`)
          ))
          .limit(20);

        return results.map((r: FormulaBankRow) => this.mapDbToEntry(r));
      } catch (error) {
        console.error('[FormulaBank] Error fetching by topic:', error);
        return [];
      }
    },
    { maxAge: this.CACHE_TTL, promise: true, normalizer: (args) => `${args[0]}_${args[1]}` }
  );

  private getFormulaByIdCached = memoizee(
    async (formulaId: string): Promise<FormulaBankEntry | null> => {
      try {
        const results = await db
          .select()
          .from(formulaBank)
          .where(eq(formulaBank.formulaId, formulaId))
          .limit(1);

        if (results.length === 0) return null;
        return this.mapDbToEntry(results[0]);
      } catch (error) {
        console.error('[FormulaBank] Error fetching by ID:', error);
        return null;
      }
    },
    { maxAge: this.CACHE_TTL, promise: true }
  );

  private mapDbToEntry(row: FormulaBankRow): FormulaBankEntry {
    return {
      id: row.id,
      formulaId: row.formulaId,
      subject: row.subject,
      classLevel: row.classLevel,
      chapter: row.chapter,
      topic: row.topic,
      subtopic: row.subtopic,
      latex: row.latex,
      plainText: row.plainText,
      speakableText: row.speakableText,
      unicodeMath: row.unicodeMath,
      variables: row.variables || [],
      resultUnit: row.resultUnit,
      dimensions: row.dimensions,
      applicableConditions: row.applicableConditions || [],
      limitations: row.limitations || [],
      derivationSteps: row.derivationSteps || undefined,
      commonMistakes: row.commonMistakes || [],
      relatedFormulas: row.relatedFormulas || [],
      prerequisiteFormulas: row.prerequisiteFormulas || [],
      jeeWeightage: row.jeeWeightage || 0,
      neetWeightage: row.neetWeightage || 0,
      boardWeightage: row.boardWeightage || 0,
      workedExamples: row.workedExamples || [],
      isVerified: row.isVerified || false,
      verifiedBy: row.verifiedBy,
      source: row.source
    };
  }

  async getFormulasForTopic(
    subject: string,
    topic: string,
    options: FormulaSearchOptions = {}
  ): Promise<FormulaBankEntry[]> {
    let formulas = await this.getFormulasByTopicCached(subject, topic);
    
    if (formulas.length === 0) {
      formulas = await this.fallbackSearch(subject, topic, options);
    }
    
    let filtered = formulas;
    
    if (options.classLevel) {
      filtered = filtered.filter(f => 
        f.classLevel === options.classLevel || f.classLevel.toLowerCase() === options.classLevel?.toLowerCase()
      );
    }

    if (options.examTarget) {
      filtered = filtered.sort((a, b) => {
        const scoreA = this.getWeightageScore(a, options.examTarget!);
        const scoreB = this.getWeightageScore(b, options.examTarget!);
        return scoreB - scoreA;
      });
    }

    if (!options.includeDerivations) {
      filtered = filtered.map(f => ({
        ...f,
        derivationSteps: undefined
      }));
    }

    return filtered.slice(0, options.limit || 10);
  }

  private async fallbackSearch(
    subject: string,
    topic: string,
    options: FormulaSearchOptions
  ): Promise<FormulaBankEntry[]> {
    try {
      const results = await db
        .select()
        .from(formulaBank)
        .where(and(
          ilike(formulaBank.subject, subject),
          ilike(formulaBank.chapter, `%${topic}%`)
        ))
        .limit(15);

      if (results.length > 0) {
        return results.map((r: FormulaBankRow) => this.mapDbToEntry(r));
      }

      const weightageColumn = options.examTarget 
        ? this.getWeightageColumn(options.examTarget)
        : formulaBank.boardWeightage;
      
      const subjectResults = await db
        .select()
        .from(formulaBank)
        .where(ilike(formulaBank.subject, subject))
        .orderBy(desc(weightageColumn))
        .limit(10);

      return subjectResults.map((r: FormulaBankRow) => this.mapDbToEntry(r));
    } catch (error) {
      console.error('[FormulaBank] Fallback search error:', error);
      return [];
    }
  }

  async getFormulaById(formulaId: string): Promise<FormulaBankEntry | null> {
    return this.getFormulaByIdCached(formulaId);
  }

  async searchFormulas(query: string, options: FormulaSearchOptions = {}): Promise<FormulaBankEntry[]> {
    try {
      const conditions: any[] = [
        or(
          ilike(formulaBank.topic, `%${query}%`),
          ilike(formulaBank.plainText, `%${query}%`),
          ilike(formulaBank.chapter, `%${query}%`)
        )
      ];

      if (options.subject) {
        conditions.push(ilike(formulaBank.subject, options.subject));
      }

      if (options.classLevel) {
        conditions.push(eq(formulaBank.classLevel, options.classLevel));
      }

      const results = await db
        .select()
        .from(formulaBank)
        .where(and(...conditions))
        .limit(options.limit || 20);

      return results.map((r: FormulaBankRow) => this.mapDbToEntry(r));
    } catch (error) {
      console.error('[FormulaBank] Search error:', error);
      return [];
    }
  }

  formatForTTS(formula: FormulaBankEntry): FormulaTTSContext {
    const variableExplanation = this.buildVariableExplanation(formula.variables);
    
    let conditionsStatement: string | undefined;
    if (formula.applicableConditions.length > 0) {
      conditionsStatement = `This formula applies when: ${formula.applicableConditions.join(', and ')}`;
    }

    let commonMistakeWarning: string | undefined;
    if (formula.commonMistakes.length > 0) {
      const topMistake = formula.commonMistakes[0];
      commonMistakeWarning = `Common mistake to avoid: ${topMistake.mistake}. Remember: ${topMistake.correction}`;
    }

    return {
      formula,
      speakableText: formula.speakableText,
      variableExplanation,
      conditionsStatement,
      commonMistakeWarning
    };
  }

  private buildVariableExplanation(variables: FormulaBankEntry['variables']): string {
    if (!variables || variables.length === 0) return '';
    
    const parts: string[] = [];
    for (const v of variables) {
      let part = `${v.symbol} represents ${v.name}`;
      if (v.unit) {
        part += ` measured in ${v.unit}`;
      }
      parts.push(part);
    }
    return parts.length > 0 
      ? `Where ${parts.join(', ')}.`
      : '';
  }

  async getMistakesForTopic(subject: string, topic: string): Promise<FormulaBankEntry['commonMistakes']> {
    const formulas = await this.getFormulasForTopic(subject, topic, { limit: 5 });
    const allMistakes: FormulaBankEntry['commonMistakes'] = [];
    
    for (const formula of formulas) {
      allMistakes.push(...formula.commonMistakes);
    }
    
    return allMistakes;
  }

  async getDerivationSteps(formulaId: string): Promise<FormulaBankEntry['derivationSteps']> {
    const formula = await this.getFormulaById(formulaId);
    return formula?.derivationSteps || [];
  }

  async getRelatedFormulas(formulaId: string): Promise<FormulaBankEntry[]> {
    try {
      const formula = await this.getFormulaById(formulaId);
      if (!formula || !formula.relatedFormulas || formula.relatedFormulas.length === 0) {
        return [];
      }

      const related: FormulaBankEntry[] = [];
      for (const relatedId of formula.relatedFormulas.slice(0, 5)) {
        const relatedFormula = await this.getFormulaById(relatedId);
        if (relatedFormula) {
          related.push(relatedFormula);
        }
      }
      
      return related;
    } catch (error) {
      console.error('[FormulaBank] Error fetching related formulas:', error);
      return [];
    }
  }

  formatForSSML(formula: FormulaBankEntry): string {
    let text = this.escapeForSSML(formula.speakableText);

    const symbolPauses = [
      { symbol: 'equals', pause: '200ms' },
      { symbol: 'plus', pause: '150ms' },
      { symbol: 'minus', pause: '150ms' },
      { symbol: 'times', pause: '100ms' },
      { symbol: 'divided by', pause: '200ms' }
    ];

    for (const { symbol, pause } of symbolPauses) {
      text = text.replace(
        new RegExp(`\\b${symbol}\\b`, 'gi'),
        `<break time="${pause}"/> ${symbol} <break time="${pause}"/>`
      );
    }

    text = text.replace(/squared/gi, '<emphasis level="moderate">squared</emphasis>');
    text = text.replace(/cubed/gi, '<emphasis level="moderate">cubed</emphasis>');

    text = text.replace(/\b(\d+(?:\.\d+)?)\b/g, (match) => {
      return `<say-as interpret-as="number">${match}</say-as>`;
    });

    const lintResult = lintSSMLStrict(text);
    return lintResult.fixed;
  }

  private escapeForSSML(text: string): string {
    return text
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async getHighYieldFormulas(
    subject: string,
    examTarget: 'jee_main' | 'jee_advanced' | 'neet' | 'boards',
    limit: number = 10
  ): Promise<FormulaBankEntry[]> {
    try {
      const weightageColumn = this.getWeightageColumn(examTarget);
      
      const results = await db
        .select()
        .from(formulaBank)
        .where(ilike(formulaBank.subject, subject))
        .orderBy(desc(weightageColumn))
        .limit(limit);

      return results.map((r: FormulaBankRow) => this.mapDbToEntry(r));
    } catch (error) {
      console.error('[FormulaBank] Error fetching high-yield formulas:', error);
      return [];
    }
  }

  private getWeightageColumn(examTarget: string) {
    switch (examTarget) {
      case 'jee_main':
      case 'jee_advanced':
        return formulaBank.jeeWeightage;
      case 'neet':
        return formulaBank.neetWeightage;
      case 'boards':
      default:
        return formulaBank.boardWeightage;
    }
  }

  private getWeightageScore(formula: FormulaBankEntry, examTarget: string): number {
    switch (examTarget) {
      case 'jee_main':
      case 'jee_advanced':
        return formula.jeeWeightage;
      case 'neet':
        return formula.neetWeightage;
      case 'boards':
      default:
        return formula.boardWeightage;
    }
  }

  async getFormulasForChapter(
    subject: string,
    chapter: string,
    classLevel?: string
  ): Promise<FormulaBankEntry[]> {
    try {
      const conditions: any[] = [
        ilike(formulaBank.subject, subject),
        ilike(formulaBank.chapter, `%${chapter}%`)
      ];

      if (classLevel) {
        conditions.push(eq(formulaBank.classLevel, classLevel));
      }

      const results = await db
        .select()
        .from(formulaBank)
        .where(and(...conditions))
        .orderBy(desc(formulaBank.jeeWeightage))
        .limit(30);

      return results.map((r: FormulaBankRow) => this.mapDbToEntry(r));
    } catch (error) {
      console.error('[FormulaBank] Error fetching chapter formulas:', error);
      return [];
    }
  }

  formatForKnowledgeIntelligence(formula: FormulaBankEntry): {
    formulaId: string;
    plainText: string;
    speakableText: string;
    applicableConditions: string[];
    commonMistakes: Array<{ mistake: string; correction: string }>;
  } {
    return {
      formulaId: formula.formulaId,
      plainText: formula.plainText,
      speakableText: formula.speakableText,
      applicableConditions: formula.applicableConditions,
      commonMistakes: formula.commonMistakes.map(m => ({
        mistake: m.mistake,
        correction: m.correction
      }))
    };
  }
}

export const formulaBankService = new FormulaBankService();
