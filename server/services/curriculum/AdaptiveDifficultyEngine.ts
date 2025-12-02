/**
 * AdaptiveDifficultyEngine - Zone of Proximal Development (ZPD) Targeting
 * 
 * Part of Phase 3 Accuracy Assurance & Adaptive Difficulty.
 * Implements Vygotsky's ZPD theory for optimal learning challenge.
 * 
 * Features:
 * - Dynamic difficulty adjustment targeting 65-75% success rate
 * - Bloom's taxonomy level selection
 * - Integration with StudentCognitiveModelService mastery scores
 * - Class-level and exam-target specific difficulty ladders
 */

import { studentCognitiveModelService, CognitiveProfile, MasteryEstimate } from './StudentCognitiveModelService';
import memoizee from 'memoizee';

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export type DifficultyTier = 'foundational' | 'basic' | 'intermediate' | 'advanced' | 'expert' | 'olympiad';

export interface DifficultyConfig {
  tier: DifficultyTier;
  numericLevel: number;
  bloomLevel: BloomLevel;
  complexity: number;
  abstractionLevel: number;
  prerequisiteDepth: number;
  stepCount: 'single' | 'few' | 'many';
  contextFamiliarity: 'familiar' | 'semi_novel' | 'novel';
}

export interface ZPDWindow {
  lowerBound: number;
  upperBound: number;
  optimalTarget: number;
  currentPosition: number;
  stretchZone: [number, number];
}

export interface DifficultyRecommendation {
  recommendedTier: DifficultyTier;
  recommendedBloom: BloomLevel;
  config: DifficultyConfig;
  zpdWindow: ZPDWindow;
  confidence: number;
  reasoning: string;
  adjustmentFactors: {
    masteryInfluence: number;
    velocityInfluence: number;
    recentPerformanceInfluence: number;
    emotionalStateInfluence: number;
  };
}

export interface OutcomeRecord {
  topicId: string;
  difficultyTier: DifficultyTier;
  bloomLevel: BloomLevel;
  success: boolean;
  timeSpent: number;
  hintsUsed: number;
  attemptCount: number;
  timestamp: Date;
}

export interface DifficultyAdjustmentLog {
  userId: string;
  topicId: string;
  previousTier: DifficultyTier;
  newTier: DifficultyTier;
  reason: string;
  masterySnapshot: number;
  successRateWindow: number;
  timestamp: Date;
}

const BLOOM_TAXONOMY_ORDER: BloomLevel[] = [
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create'
];

const DIFFICULTY_TIERS: Record<DifficultyTier, DifficultyConfig> = {
  foundational: {
    tier: 'foundational',
    numericLevel: 1,
    bloomLevel: 'remember',
    complexity: 0.2,
    abstractionLevel: 0.1,
    prerequisiteDepth: 0,
    stepCount: 'single',
    contextFamiliarity: 'familiar',
  },
  basic: {
    tier: 'basic',
    numericLevel: 2,
    bloomLevel: 'understand',
    complexity: 0.35,
    abstractionLevel: 0.25,
    prerequisiteDepth: 1,
    stepCount: 'single',
    contextFamiliarity: 'familiar',
  },
  intermediate: {
    tier: 'intermediate',
    numericLevel: 3,
    bloomLevel: 'apply',
    complexity: 0.5,
    abstractionLevel: 0.4,
    prerequisiteDepth: 2,
    stepCount: 'few',
    contextFamiliarity: 'semi_novel',
  },
  advanced: {
    tier: 'advanced',
    numericLevel: 4,
    bloomLevel: 'analyze',
    complexity: 0.65,
    abstractionLevel: 0.6,
    prerequisiteDepth: 3,
    stepCount: 'few',
    contextFamiliarity: 'semi_novel',
  },
  expert: {
    tier: 'expert',
    numericLevel: 5,
    bloomLevel: 'evaluate',
    complexity: 0.8,
    abstractionLevel: 0.75,
    prerequisiteDepth: 4,
    stepCount: 'many',
    contextFamiliarity: 'novel',
  },
  olympiad: {
    tier: 'olympiad',
    numericLevel: 6,
    bloomLevel: 'create',
    complexity: 0.95,
    abstractionLevel: 0.9,
    prerequisiteDepth: 5,
    stepCount: 'many',
    contextFamiliarity: 'novel',
  },
};

const EXAM_TARGET_DIFFICULTY_CAPS: Record<string, DifficultyTier> = {
  'boards': 'advanced',
  'board': 'advanced',
  'cbse': 'advanced',
  'icse': 'advanced',
  'state_board': 'advanced',
  'jee_main': 'expert',
  'jee_advanced': 'olympiad',
  'neet': 'expert',
  'foundation': 'intermediate',
};

const CLASS_LEVEL_BASE_TIERS: Record<string, DifficultyTier> = {
  'foundation': 'foundational',
  'bridge': 'basic',
  'board': 'intermediate',
  'competitive': 'advanced',
  'dropper': 'advanced',
};

const ZPD_TARGET_SUCCESS_RATE = 0.70;
const ZPD_LOWER_BOUND = 0.65;
const ZPD_UPPER_BOUND = 0.75;
const SUCCESS_WINDOW_SIZE = 10;

export class AdaptiveDifficultyEngine {
  private outcomeHistory: Map<string, OutcomeRecord[]> = new Map();
  private adjustmentLogs: DifficultyAdjustmentLog[] = [];

  async suggestDifficulty(
    userId: string,
    topicId: string,
    subject: string,
    options?: {
      classLevel?: number;
      examTarget?: string;
      emotionalState?: 'confident' | 'neutral' | 'frustrated' | 'confused';
      recentHintsUsed?: number;
      sessionDuration?: number;
    }
  ): Promise<DifficultyRecommendation> {
    const mastery = await studentCognitiveModelService.getMasteryForTopic(userId, topicId);
    const profile = await studentCognitiveModelService.buildEnhancedCognitiveProfile(userId, subject);
    
    const recentOutcomes = this.getRecentOutcomes(userId, topicId);
    const successRate = this.calculateSuccessRate(recentOutcomes);
    
    const zpdWindow = this.calculateZPDWindow(mastery?.probability || 0.3, successRate);
    
    let baseTier = this.determineBaseTier(
      mastery?.probability || 0.3,
      profile,
      options?.classLevel,
      options?.examTarget
    );

    const adjustmentFactors = this.calculateAdjustmentFactors(
      mastery?.probability || 0.3,
      profile,
      successRate,
      options?.emotionalState,
      options?.recentHintsUsed
    );

    baseTier = this.applyAdjustments(baseTier, adjustmentFactors, zpdWindow);

    if (options?.examTarget) {
      baseTier = this.capForExamTarget(baseTier, options.examTarget);
    }

    const config = DIFFICULTY_TIERS[baseTier];
    const bloomLevel = this.selectBloomLevel(
      mastery?.probability || 0.3,
      config.bloomLevel,
      options?.classLevel
    );

    const reasoning = this.generateReasoning(
      baseTier,
      mastery?.probability || 0.3,
      successRate,
      adjustmentFactors,
      options
    );

    return {
      recommendedTier: baseTier,
      recommendedBloom: bloomLevel,
      config: { ...config, bloomLevel },
      zpdWindow,
      confidence: this.calculateConfidence(recentOutcomes.length, mastery?.confidence || 'low'),
      reasoning,
      adjustmentFactors,
    };
  }

  recordOutcome(
    userId: string,
    topicId: string,
    outcome: Omit<OutcomeRecord, 'timestamp'>
  ): void {
    const key = `${userId}:${topicId}`;
    const history = this.outcomeHistory.get(key) || [];
    
    history.push({
      ...outcome,
      timestamp: new Date(),
    });

    if (history.length > 50) {
      history.shift();
    }

    this.outcomeHistory.set(key, history);

    this.checkAndLogAdjustment(userId, topicId, outcome);
  }

  selectBloomLevel(
    mastery: number,
    baseBloom: BloomLevel,
    classLevel?: number
  ): BloomLevel {
    const baseIndex = BLOOM_TAXONOMY_ORDER.indexOf(baseBloom);
    
    let adjustedIndex = baseIndex;
    
    if (mastery > 0.8) {
      adjustedIndex = Math.min(baseIndex + 1, BLOOM_TAXONOMY_ORDER.length - 1);
    } else if (mastery < 0.3) {
      adjustedIndex = Math.max(baseIndex - 1, 0);
    }

    if (classLevel) {
      if (classLevel <= 7) {
        adjustedIndex = Math.min(adjustedIndex, 2);
      } else if (classLevel <= 9) {
        adjustedIndex = Math.min(adjustedIndex, 3);
      } else if (classLevel <= 10) {
        adjustedIndex = Math.min(adjustedIndex, 4);
      }
    }

    return BLOOM_TAXONOMY_ORDER[adjustedIndex];
  }

  getSuccessRateWindow(userId: string, topicId: string): number {
    const outcomes = this.getRecentOutcomes(userId, topicId);
    return this.calculateSuccessRate(outcomes);
  }

  getDifficultyConfig(tier: DifficultyTier): DifficultyConfig {
    return { ...DIFFICULTY_TIERS[tier] };
  }

  getAllTiers(): DifficultyTier[] {
    return Object.keys(DIFFICULTY_TIERS) as DifficultyTier[];
  }

  buildDifficultyPromptSection(recommendation: DifficultyRecommendation): string {
    let section = `## Adaptive Difficulty Guidance\n\n`;
    
    section += `**Recommended Difficulty:** ${recommendation.recommendedTier} (Level ${recommendation.config.numericLevel}/6)\n`;
    section += `**Bloom's Level:** ${recommendation.recommendedBloom}\n`;
    section += `**Confidence:** ${Math.round(recommendation.confidence * 100)}%\n\n`;
    
    section += `**ZPD Window:**\n`;
    section += `- Target Success Rate: ${Math.round(recommendation.zpdWindow.optimalTarget * 100)}%\n`;
    section += `- Acceptable Range: ${Math.round(recommendation.zpdWindow.lowerBound * 100)}% - ${Math.round(recommendation.zpdWindow.upperBound * 100)}%\n`;
    section += `- Current Position: ${Math.round(recommendation.zpdWindow.currentPosition * 100)}%\n\n`;
    
    section += `**Content Guidelines:**\n`;
    section += `- Complexity: ${this.complexityToDescription(recommendation.config.complexity)}\n`;
    section += `- Step Count: ${recommendation.config.stepCount}\n`;
    section += `- Context: ${recommendation.config.contextFamiliarity.replace('_', ' ')}\n`;
    section += `- Prerequisites: Assume ${recommendation.config.prerequisiteDepth} levels of prior knowledge\n\n`;
    
    section += `**Reasoning:** ${recommendation.reasoning}\n`;
    
    return section;
  }

  generateQuestionGuidelines(recommendation: DifficultyRecommendation, subject: string): string[] {
    const guidelines: string[] = [];
    const tier = recommendation.recommendedTier;
    const bloom = recommendation.recommendedBloom;
    
    switch (bloom) {
      case 'remember':
        guidelines.push('Focus on recall of facts, definitions, and basic concepts');
        guidelines.push('Use direct questions about terminology and principles');
        break;
      case 'understand':
        guidelines.push('Ask for explanations in student\'s own words');
        guidelines.push('Include questions about relationships between concepts');
        break;
      case 'apply':
        guidelines.push('Present problems requiring formula or concept application');
        guidelines.push('Use numerical problems with clear given values');
        break;
      case 'analyze':
        guidelines.push('Include multi-step problems requiring breakdown');
        guidelines.push('Ask about cause-effect relationships');
        break;
      case 'evaluate':
        guidelines.push('Present scenarios requiring judgment or comparison');
        guidelines.push('Ask for justification of choices or methods');
        break;
      case 'create':
        guidelines.push('Include open-ended problems with multiple approaches');
        guidelines.push('Ask for novel solutions or extensions');
        break;
    }

    switch (tier) {
      case 'foundational':
        guidelines.push('Use simple, single-step problems only');
        guidelines.push('Provide all necessary information directly');
        break;
      case 'basic':
        guidelines.push('Keep problems to 2-3 steps maximum');
        guidelines.push('Use familiar contexts from daily life');
        break;
      case 'intermediate':
        guidelines.push('Include moderate multi-step problems');
        guidelines.push('Mix familiar and slightly novel contexts');
        break;
      case 'advanced':
        guidelines.push('Use complex multi-step problems');
        guidelines.push('Include some implicit information to be derived');
        break;
      case 'expert':
        guidelines.push('Present challenging problems with multiple concepts');
        guidelines.push('Use abstract or novel contexts');
        break;
      case 'olympiad':
        guidelines.push('Include competition-level problem complexity');
        guidelines.push('Require creative synthesis of multiple concepts');
        break;
    }

    if (subject === 'physics' || subject === 'chemistry') {
      if (tier === 'advanced' || tier === 'expert' || tier === 'olympiad') {
        guidelines.push('Include dimensional analysis verification');
        guidelines.push('Expect proper unit handling throughout');
      }
    }

    if (subject === 'math' || subject === 'maths') {
      if (tier === 'advanced' || tier === 'expert' || tier === 'olympiad') {
        guidelines.push('Include proof-based or reasoning questions');
        guidelines.push('Expect mathematical rigor in solutions');
      }
    }

    return guidelines;
  }

  private getRecentOutcomes(userId: string, topicId: string): OutcomeRecord[] {
    const key = `${userId}:${topicId}`;
    const history = this.outcomeHistory.get(key) || [];
    return history.slice(-SUCCESS_WINDOW_SIZE);
  }

  private calculateSuccessRate(outcomes: OutcomeRecord[]): number {
    if (outcomes.length === 0) return ZPD_TARGET_SUCCESS_RATE;
    
    const successCount = outcomes.filter(o => o.success).length;
    return successCount / outcomes.length;
  }

  private calculateZPDWindow(mastery: number, currentSuccessRate: number): ZPDWindow {
    const optimalTarget = ZPD_TARGET_SUCCESS_RATE;
    
    let adjustedLower = ZPD_LOWER_BOUND;
    let adjustedUpper = ZPD_UPPER_BOUND;
    
    if (mastery < 0.3) {
      adjustedLower = 0.70;
      adjustedUpper = 0.85;
    } else if (mastery > 0.8) {
      adjustedLower = 0.55;
      adjustedUpper = 0.70;
    }
    
    const stretchLower = adjustedLower - 0.1;
    const stretchUpper = adjustedUpper + 0.1;
    
    return {
      lowerBound: adjustedLower,
      upperBound: adjustedUpper,
      optimalTarget,
      currentPosition: currentSuccessRate,
      stretchZone: [stretchLower, stretchUpper],
    };
  }

  private determineBaseTier(
    mastery: number,
    profile: CognitiveProfile,
    classLevel?: number,
    examTarget?: string
  ): DifficultyTier {
    const classCategory = this.getClassCategory(classLevel || 10, examTarget);
    let baseTier = CLASS_LEVEL_BASE_TIERS[classCategory] || 'intermediate';
    
    if (mastery < 0.3) {
      baseTier = this.lowerTier(baseTier);
    } else if (mastery > 0.7) {
      baseTier = this.raiseTier(baseTier);
    }
    
    if (profile.learningStyle === 'fast_learner') {
      baseTier = this.raiseTier(baseTier);
    } else if (profile.learningStyle === 'needs_support') {
      baseTier = this.lowerTier(baseTier);
    }
    
    return baseTier;
  }

  private calculateAdjustmentFactors(
    mastery: number,
    profile: CognitiveProfile,
    successRate: number,
    emotionalState?: string,
    recentHintsUsed?: number
  ): DifficultyRecommendation['adjustmentFactors'] {
    const masteryInfluence = mastery - 0.5;
    
    const velocityInfluence = profile.recentProgress > 0 ? 0.1 : 
                               profile.recentProgress < -0.1 ? -0.1 : 0;
    
    let recentPerformanceInfluence = 0;
    if (successRate > ZPD_UPPER_BOUND) {
      recentPerformanceInfluence = 0.15;
    } else if (successRate < ZPD_LOWER_BOUND) {
      recentPerformanceInfluence = -0.15;
    }
    
    let emotionalStateInfluence = 0;
    if (emotionalState === 'frustrated' || emotionalState === 'confused') {
      emotionalStateInfluence = -0.2;
    } else if (emotionalState === 'confident') {
      emotionalStateInfluence = 0.1;
    }
    
    if (recentHintsUsed && recentHintsUsed > 3) {
      emotionalStateInfluence -= 0.1;
    }
    
    return {
      masteryInfluence,
      velocityInfluence,
      recentPerformanceInfluence,
      emotionalStateInfluence,
    };
  }

  private applyAdjustments(
    baseTier: DifficultyTier,
    factors: DifficultyRecommendation['adjustmentFactors'],
    zpdWindow: ZPDWindow
  ): DifficultyTier {
    const totalAdjustment = 
      factors.masteryInfluence * 0.3 +
      factors.velocityInfluence * 0.2 +
      factors.recentPerformanceInfluence * 0.3 +
      factors.emotionalStateInfluence * 0.2;
    
    let result = baseTier;
    
    if (totalAdjustment > 0.15) {
      result = this.raiseTier(baseTier);
    } else if (totalAdjustment < -0.15) {
      result = this.lowerTier(baseTier);
    }
    
    if (zpdWindow.currentPosition > zpdWindow.upperBound + 0.1) {
      result = this.raiseTier(result);
    } else if (zpdWindow.currentPosition < zpdWindow.lowerBound - 0.1) {
      result = this.lowerTier(result);
    }
    
    return result;
  }

  private capForExamTarget(tier: DifficultyTier, examTarget: string): DifficultyTier {
    const normalized = examTarget.toLowerCase().replace(/[\s-]/g, '_');
    const cap = EXAM_TARGET_DIFFICULTY_CAPS[normalized];
    
    if (!cap) return tier;
    
    const tierOrder: DifficultyTier[] = ['foundational', 'basic', 'intermediate', 'advanced', 'expert', 'olympiad'];
    const currentIndex = tierOrder.indexOf(tier);
    const capIndex = tierOrder.indexOf(cap);
    
    if (currentIndex > capIndex) {
      return cap;
    }
    
    return tier;
  }

  private getClassCategory(classLevel: number, examTarget?: string): string {
    if (classLevel <= 7) return 'foundation';
    if (classLevel <= 9) return 'bridge';
    if (classLevel === 10) return 'board';
    if (classLevel === 11 || classLevel === 12) {
      const normalizedExam = examTarget?.toLowerCase().replace(/[\s-]/g, '_');
      const COMPETITIVE_TOKENS = new Set(['jee', 'jee_main', 'jee_advanced', 'neet']);
      if (normalizedExam && COMPETITIVE_TOKENS.has(normalizedExam)) {
        return 'competitive';
      }
      return 'board';
    }
    if (classLevel >= 13) return 'dropper';
    return 'board';
  }

  private raiseTier(tier: DifficultyTier): DifficultyTier {
    const order: DifficultyTier[] = ['foundational', 'basic', 'intermediate', 'advanced', 'expert', 'olympiad'];
    const index = order.indexOf(tier);
    return order[Math.min(index + 1, order.length - 1)];
  }

  private lowerTier(tier: DifficultyTier): DifficultyTier {
    const order: DifficultyTier[] = ['foundational', 'basic', 'intermediate', 'advanced', 'expert', 'olympiad'];
    const index = order.indexOf(tier);
    return order[Math.max(index - 1, 0)];
  }

  private calculateConfidence(dataPoints: number, masteryConfidence: string): number {
    let base = 0.5;
    
    if (dataPoints >= 10) base += 0.3;
    else if (dataPoints >= 5) base += 0.2;
    else if (dataPoints >= 2) base += 0.1;
    
    if (masteryConfidence === 'high') base += 0.2;
    else if (masteryConfidence === 'medium') base += 0.1;
    
    return Math.min(base, 1.0);
  }

  private generateReasoning(
    tier: DifficultyTier,
    mastery: number,
    successRate: number,
    factors: DifficultyRecommendation['adjustmentFactors'],
    options?: { emotionalState?: string; classLevel?: number; examTarget?: string }
  ): string {
    const parts: string[] = [];
    
    parts.push(`Mastery at ${Math.round(mastery * 100)}%`);
    
    if (successRate !== ZPD_TARGET_SUCCESS_RATE) {
      if (successRate > ZPD_UPPER_BOUND) {
        parts.push('recent success rate high, increasing challenge');
      } else if (successRate < ZPD_LOWER_BOUND) {
        parts.push('recent struggles detected, reducing difficulty');
      }
    }
    
    if (options?.emotionalState === 'frustrated' || options?.emotionalState === 'confused') {
      parts.push('adjusting for current emotional state');
    }
    
    if (options?.examTarget) {
      parts.push(`aligned to ${options.examTarget} requirements`);
    }
    
    return parts.join('; ') + '.';
  }

  private complexityToDescription(complexity: number): string {
    if (complexity < 0.3) return 'Low';
    if (complexity < 0.5) return 'Moderate';
    if (complexity < 0.7) return 'High';
    return 'Very High';
  }

  private checkAndLogAdjustment(
    userId: string,
    topicId: string,
    outcome: Omit<OutcomeRecord, 'timestamp'>
  ): void {
    const recentOutcomes = this.getRecentOutcomes(userId, topicId);
    const successRate = this.calculateSuccessRate(recentOutcomes);
    
    if (successRate > ZPD_UPPER_BOUND + 0.1 || successRate < ZPD_LOWER_BOUND - 0.1) {
      const previousTier = outcome.difficultyTier;
      const newTier = successRate > ZPD_UPPER_BOUND 
        ? this.raiseTier(previousTier)
        : this.lowerTier(previousTier);
      
      if (previousTier !== newTier) {
        this.adjustmentLogs.push({
          userId,
          topicId,
          previousTier,
          newTier,
          reason: successRate > ZPD_UPPER_BOUND 
            ? 'Success rate exceeded upper ZPD bound'
            : 'Success rate fell below lower ZPD bound',
          masterySnapshot: 0,
          successRateWindow: successRate,
          timestamp: new Date(),
        });
      }
    }
  }

  getAdjustmentLogs(userId?: string): DifficultyAdjustmentLog[] {
    if (userId) {
      return this.adjustmentLogs.filter(log => log.userId === userId);
    }
    return [...this.adjustmentLogs];
  }

  clearOutcomeHistory(userId: string, topicId?: string): void {
    if (topicId) {
      const key = `${userId}:${topicId}`;
      this.outcomeHistory.delete(key);
    } else {
      for (const key of this.outcomeHistory.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.outcomeHistory.delete(key);
        }
      }
    }
  }
}

export const adaptiveDifficultyEngine = new AdaptiveDifficultyEngine();
