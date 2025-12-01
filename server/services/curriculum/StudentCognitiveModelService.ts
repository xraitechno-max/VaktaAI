import { db } from '../../db.js';
import { studentTopicMastery, studentInteractionMetrics, topicPrerequisites, curriculumEdges, ncertCurriculumChunks } from '@shared/schema';
import type { StudentTopicMastery, StudentInteractionMetrics } from '@shared/schema';
import { eq, and, desc, sql, inArray, or, like } from 'drizzle-orm';
import memoize from 'memoizee';

export interface BKTParameters {
  pL0: number;
  pT: number;
  pG: number;
  pS: number;
}

export interface DKTHiddenState {
  knowledgeVector: number[];
  temporalWeight: number;
  attentionScores: Map<string, number>;
  sequencePosition: number;
}

export interface DKTConfig {
  hiddenDim: number;
  temporalDecayRate: number;
  attentionWindowSize: number;
  knowledgeTransferRate: number;
  forgettingCurveBase: number;
  minSequenceLength: number;
}

export interface DKTPrediction {
  topicId: string;
  masteryProbability: number;
  hiddenState: DKTHiddenState;
  temporalFactors: {
    recency: number;
    spacing: number;
    consistency: number;
  };
  transferKnowledge: Map<string, number>;
  predictedNextPerformance: number;
  confidenceInterval: [number, number];
}

export interface MasteryEstimate {
  topicId: string;
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  dataPoints: number;
  lastUpdated: Date;
  dktEnhanced?: boolean;
  hiddenState?: DKTHiddenState;
}

export interface PrerequisiteAnalysis {
  topicId: string;
  prerequisitesMet: boolean;
  missingPrerequisites: Array<{
    topicId: string;
    topicName: string;
    currentMastery: number;
    requiredMastery: number;
  }>;
  readinessScore: number;
}

export interface LearningVelocity {
  topicId: string;
  velocityScore: number;
  trend: 'improving' | 'stable' | 'declining';
  recommendedPace: 'faster' | 'maintain' | 'slower';
}

export interface CognitiveProfile {
  userId: string;
  overallMastery: number;
  strongTopics: string[];
  weakTopics: string[];
  learningStyle: 'fast_learner' | 'steady' | 'needs_support';
  preferredDifficulty: number;
  recentProgress: number;
  dktInsights?: {
    knowledgeGaps: string[];
    transferOpportunities: string[];
    optimalReviewTiming: Map<string, Date>;
    learningMomentum: number;
  };
}

const DEFAULT_BKT_PARAMS: Record<string, BKTParameters> = {
  default: { pL0: 0.3, pT: 0.1, pG: 0.25, pS: 0.1 },
  physics: { pL0: 0.25, pT: 0.09, pG: 0.2, pS: 0.12 },
  chemistry: { pL0: 0.28, pT: 0.1, pG: 0.22, pS: 0.11 },
  math: { pL0: 0.22, pT: 0.08, pG: 0.18, pS: 0.15 },
  biology: { pL0: 0.32, pT: 0.12, pG: 0.28, pS: 0.08 },
};

const DIFFICULTY_MODIFIERS: Record<number, { pG: number; pS: number }> = {
  1: { pG: 0.4, pS: 0.05 },
  2: { pG: 0.35, pS: 0.06 },
  3: { pG: 0.3, pS: 0.08 },
  4: { pG: 0.28, pS: 0.09 },
  5: { pG: 0.25, pS: 0.1 },
  6: { pG: 0.22, pS: 0.12 },
  7: { pG: 0.18, pS: 0.14 },
  8: { pG: 0.15, pS: 0.15 },
  9: { pG: 0.12, pS: 0.16 },
  10: { pG: 0.1, pS: 0.18 },
};

const DEFAULT_DKT_CONFIG: DKTConfig = {
  hiddenDim: 64,
  temporalDecayRate: 0.1,
  attentionWindowSize: 20,
  knowledgeTransferRate: 0.3,
  forgettingCurveBase: 0.85,
  minSequenceLength: 3,
};

const ALL_SUBJECTS = [
  'physics', 'math', 'maths', 'chemistry', 'biology', 'science',
  'english', 'hindi', 'social', 'history', 'geography', 'political_science',
  'civics', 'sociology', 'psychology', 'philosophy', 'economics', 'accountancy',
  'business_studies', 'entrepreneurship', 'statistics', 'computer',
  'physical_education', 'literature', 'fine_arts', 'music'
] as const;

const BASE_SIMILARITY: Record<string, Record<string, number>> = {
  physics: { math: 0.8, maths: 0.8, chemistry: 0.5, biology: 0.3, science: 0.6, computer: 0.4, geography: 0.3, statistics: 0.5 },
  math: { maths: 1.0, physics: 0.8, chemistry: 0.4, biology: 0.3, economics: 0.6, accountancy: 0.7, science: 0.5, computer: 0.6, statistics: 0.9 },
  maths: { math: 1.0, physics: 0.8, chemistry: 0.4, biology: 0.3, economics: 0.6, accountancy: 0.7, science: 0.5, computer: 0.6, statistics: 0.9 },
  chemistry: { physics: 0.5, biology: 0.6, math: 0.4, maths: 0.4, science: 0.7, geography: 0.3 },
  biology: { chemistry: 0.6, physics: 0.3, math: 0.3, maths: 0.3, science: 0.8, physical_education: 0.5, geography: 0.4, psychology: 0.4 },
  science: { physics: 0.6, chemistry: 0.7, biology: 0.8, math: 0.5, maths: 0.5, geography: 0.4, computer: 0.4 },
  english: { hindi: 0.4, literature: 0.6, social: 0.3 },
  hindi: { english: 0.4, literature: 0.5, social: 0.3 },
  social: { economics: 0.5, history: 0.7, geography: 0.7, political_science: 0.6, civics: 0.6, sociology: 0.5 },
  history: { social: 0.7, political_science: 0.5, geography: 0.4, civics: 0.4, sociology: 0.4 },
  geography: { social: 0.7, science: 0.4, biology: 0.4, history: 0.4, physics: 0.3, chemistry: 0.3, economics: 0.4 },
  political_science: { social: 0.6, history: 0.5, civics: 0.7, economics: 0.4, sociology: 0.5 },
  civics: { political_science: 0.7, social: 0.6, history: 0.4 },
  sociology: { social: 0.5, political_science: 0.5, history: 0.4, psychology: 0.5 },
  psychology: { biology: 0.4, sociology: 0.5, philosophy: 0.4, physical_education: 0.3 },
  philosophy: { psychology: 0.4, english: 0.3, literature: 0.3 },
  economics: { math: 0.6, maths: 0.6, accountancy: 0.7, business_studies: 0.6, social: 0.5, geography: 0.4, statistics: 0.6, entrepreneurship: 0.5 },
  accountancy: { math: 0.7, maths: 0.7, economics: 0.7, business_studies: 0.5, statistics: 0.5 },
  business_studies: { economics: 0.6, accountancy: 0.5, entrepreneurship: 0.6 },
  entrepreneurship: { business_studies: 0.6, economics: 0.4 },
  statistics: { math: 0.8, maths: 0.8, economics: 0.6, accountancy: 0.5, physics: 0.4, computer: 0.5 },
  computer: { math: 0.6, maths: 0.6, physics: 0.4, science: 0.4, statistics: 0.5 },
  physical_education: { biology: 0.5, psychology: 0.3 },
  literature: { english: 0.6, hindi: 0.5, philosophy: 0.3 },
  fine_arts: { music: 0.4 },
  music: { fine_arts: 0.4 },
};

const SUBJECT_SIMILARITY_MATRIX: Record<string, Record<string, number>> = (() => {
  const matrix: Record<string, Record<string, number>> = {};
  
  for (const subj of ALL_SUBJECTS) {
    matrix[subj] = { [subj]: 1.0 };
    
    for (const other of ALL_SUBJECTS) {
      if (subj !== other) {
        const directSim = BASE_SIMILARITY[subj]?.[other];
        const reverseSim = BASE_SIMILARITY[other]?.[subj];
        matrix[subj][other] = directSim ?? reverseSim ?? 0.15;
      }
    }
  }
  
  return matrix;
})();

const SUBJECT_ALIASES: Record<string, string> = {
  'mathematics': 'math',
  'bio': 'biology',
  'chem': 'chemistry',
  'phy': 'physics',
  'phys': 'physics',
  'cs': 'computer',
  'comp': 'computer',
  'computer_science': 'computer',
  'pe': 'physical_education',
  'bst': 'business_studies',
  'eco': 'economics',
  'acc': 'accountancy',
  'sst': 'social',
  'social_science': 'social',
  'social_studies': 'social',
  'eng': 'english',
  'hin': 'hindi',
  'geo': 'geography',
  'hist': 'history',
  'pol_sci': 'political_science',
  'polsci': 'political_science',
  'poli_sci': 'political_science',
  'pol': 'political_science',
  'psych': 'psychology',
  'phil': 'philosophy',
  'stats': 'statistics',
  'stat': 'statistics',
  'lit': 'literature',
  'arts': 'fine_arts',
  'art': 'fine_arts',
  'ent': 'entrepreneurship',
  'soc': 'sociology',
  'socio': 'sociology',
};

function normalizeSubject(subject: string): string {
  const lower = subject.toLowerCase().trim().replace(/[_\-\s]+/g, '_');
  return SUBJECT_ALIASES[lower] ?? lower;
}

export class StudentCognitiveModelService {
  private dktConfig: DKTConfig = DEFAULT_DKT_CONFIG;
  private hiddenStateCache: Map<string, DKTHiddenState> = new Map();
  private getBKTParams = memoize(
    (subject: string, difficulty: number = 5): BKTParameters => {
      const baseParams = DEFAULT_BKT_PARAMS[subject.toLowerCase()] || DEFAULT_BKT_PARAMS.default;
      const diffMod = DIFFICULTY_MODIFIERS[Math.min(10, Math.max(1, difficulty))];
      
      return {
        pL0: baseParams.pL0,
        pT: baseParams.pT,
        pG: (baseParams.pG + diffMod.pG) / 2,
        pS: (baseParams.pS + diffMod.pS) / 2,
      };
    },
    { maxAge: 60000 }
  );

  async updateMasteryAfterInteraction(
    userId: string,
    topicId: string,
    wasCorrect: boolean,
    subject: string,
    difficulty: number = 5,
    hintsUsed: number = 0
  ): Promise<MasteryEstimate> {
    const params = this.getBKTParams(subject, difficulty);
    
    const hintPenalty = Math.min(0.3, hintsUsed * 0.1);
    const adjustedPG = Math.min(0.5, params.pG + hintPenalty);
    const adjustedPS = params.pS * (1 + hintPenalty);

    const existingMastery = await db.query.studentTopicMastery.findFirst({
      where: and(
        eq(studentTopicMastery.userId, userId),
        eq(studentTopicMastery.topicId, topicId)
      ),
    });

    const currentP = existingMastery?.masteryScore ?? params.pL0;
    const totalAttempts = (existingMastery?.totalAttempts ?? 0) + 1;
    const correctAttempts = (existingMastery?.correctAttempts ?? 0) + (wasCorrect ? 1 : 0);
    const accumulatedHints = (existingMastery?.hintsUsed ?? 0) + hintsUsed;

    let newP: number;
    if (wasCorrect) {
      const numerator = currentP * (1 - adjustedPS);
      const denominator = numerator + (1 - currentP) * adjustedPG;
      const pLGivenCorrect = denominator > 0 ? numerator / denominator : currentP;
      newP = pLGivenCorrect + (1 - pLGivenCorrect) * params.pT;
    } else {
      const numerator = currentP * adjustedPS;
      const denominator = numerator + (1 - currentP) * (1 - adjustedPG);
      const pLGivenIncorrect = denominator > 0 ? numerator / denominator : currentP;
      newP = pLGivenIncorrect + (1 - pLGivenIncorrect) * params.pT;
    }

    newP = Math.max(0.01, Math.min(0.99, newP));

    const confidence = this.calculateConfidence(totalAttempts, newP);

    const now = new Date();
    const nextReview = this.calculateNextReviewDate(newP, totalAttempts);

    if (existingMastery) {
      await db.update(studentTopicMastery)
        .set({
          masteryScore: newP,
          confidenceLevel: confidence,
          totalAttempts,
          correctAttempts,
          hintsUsed: accumulatedHints,
          lastPracticed: now,
          practiceCount: sql`${studentTopicMastery.practiceCount} + 1`,
          srsInterval: this.calculateSRSInterval(newP),
          nextReviewDate: nextReview,
          updatedAt: now,
        })
        .where(eq(studentTopicMastery.id, existingMastery.id));
    } else {
      await db.insert(studentTopicMastery).values({
        userId,
        topicId,
        masteryScore: newP,
        confidenceLevel: confidence,
        totalAttempts,
        correctAttempts,
        hintsUsed: accumulatedHints,
        lastPracticed: now,
        practiceCount: 1,
        srsInterval: this.calculateSRSInterval(newP),
        nextReviewDate: nextReview,
        misconceptions: [],
      });
    }

    return {
      topicId,
      probability: newP,
      confidence,
      dataPoints: totalAttempts,
      lastUpdated: now,
    };
  }

  private calculateConfidence(attempts: number, mastery: number): 'low' | 'medium' | 'high' {
    if (attempts < 3) return 'low';
    if (attempts < 7) return 'medium';
    
    const variance = mastery * (1 - mastery);
    if (variance < 0.1) return 'high';
    if (variance < 0.2) return 'medium';
    return 'low';
  }

  private calculateSRSInterval(mastery: number): number {
    if (mastery >= 0.9) return 14;
    if (mastery >= 0.8) return 7;
    if (mastery >= 0.7) return 4;
    if (mastery >= 0.5) return 2;
    return 1;
  }

  private calculateNextReviewDate(mastery: number, attempts: number): Date {
    const interval = this.calculateSRSInterval(mastery);
    const confidenceBonus = Math.min(3, Math.floor(attempts / 5));
    const totalDays = interval + confidenceBonus;
    
    const next = new Date();
    next.setDate(next.getDate() + totalDays);
    return next;
  }

  async getMasteryForTopic(userId: string, topicId: string): Promise<MasteryEstimate | null> {
    const mastery = await db.query.studentTopicMastery.findFirst({
      where: and(
        eq(studentTopicMastery.userId, userId),
        eq(studentTopicMastery.topicId, topicId)
      ),
    });

    if (!mastery) return null;

    return {
      topicId: mastery.topicId,
      probability: mastery.masteryScore ?? 0,
      confidence: mastery.confidenceLevel ?? 'low',
      dataPoints: mastery.totalAttempts ?? 0,
      lastUpdated: mastery.updatedAt ?? new Date(),
    };
  }

  async getMasteryForMultipleTopics(
    userId: string,
    topicIds: string[]
  ): Promise<Map<string, MasteryEstimate>> {
    if (topicIds.length === 0) return new Map();

    const masteries = await db.query.studentTopicMastery.findMany({
      where: and(
        eq(studentTopicMastery.userId, userId),
        inArray(studentTopicMastery.topicId, topicIds)
      ),
    });

    const result = new Map<string, MasteryEstimate>();
    for (const m of masteries) {
      result.set(m.topicId, {
        topicId: m.topicId,
        probability: m.masteryScore ?? 0,
        confidence: m.confidenceLevel ?? 'low',
        dataPoints: m.totalAttempts ?? 0,
        lastUpdated: m.updatedAt ?? new Date(),
      });
    }

    return result;
  }

  async analyzePrerequisites(
    userId: string,
    targetTopicId: string,
    requiredMastery: number = 0.6
  ): Promise<PrerequisiteAnalysis> {
    const topicData = await db.query.topicPrerequisites.findFirst({
      where: eq(topicPrerequisites.topicId, targetTopicId),
    });

    const prerequisites = (topicData?.prerequisites as Array<{
      topicId: string;
      topicName: string;
      importance: 'critical' | 'helpful' | 'optional';
    }>) || [];

    if (prerequisites.length === 0) {
      return {
        topicId: targetTopicId,
        prerequisitesMet: true,
        missingPrerequisites: [],
        readinessScore: 1.0,
      };
    }

    const prereqTopicIds = prerequisites.map(p => p.topicId);
    const masteries = await this.getMasteryForMultipleTopics(userId, prereqTopicIds);

    const missingPrereqs: PrerequisiteAnalysis['missingPrerequisites'] = [];
    let totalMastery = 0;
    let weightSum = 0;

    for (const prereq of prerequisites) {
      const mastery = masteries.get(prereq.topicId);
      const currentMastery = mastery?.probability ?? 0;
      
      const weight = prereq.importance === 'critical' ? 3 : prereq.importance === 'helpful' ? 2 : 1;
      const minRequired = prereq.importance === 'critical' ? 0.7 : prereq.importance === 'helpful' ? 0.5 : 0.3;
      
      totalMastery += currentMastery * weight;
      weightSum += weight;

      const effectiveRequired = Math.max(requiredMastery, minRequired);
      
      if (currentMastery < effectiveRequired) {
        missingPrereqs.push({
          topicId: prereq.topicId,
          topicName: prereq.topicName,
          currentMastery,
          requiredMastery: effectiveRequired,
        });
      }
    }

    const readinessScore = weightSum > 0 ? totalMastery / weightSum : 1.0;

    return {
      topicId: targetTopicId,
      prerequisitesMet: missingPrereqs.length === 0,
      missingPrerequisites: missingPrereqs,
      readinessScore: Math.max(0, Math.min(1, readinessScore)),
    };
  }

  async calculateLearningVelocity(
    userId: string,
    topicId: string,
    windowDays: number = 7
  ): Promise<LearningVelocity> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    const interactions = await db.query.studentInteractionMetrics.findMany({
      where: and(
        eq(studentInteractionMetrics.userId, userId),
        eq(studentInteractionMetrics.topic, topicId),
        sql`${studentInteractionMetrics.createdAt} >= ${windowStart}`
      ),
      orderBy: [desc(studentInteractionMetrics.createdAt)],
    });

    if (interactions.length < 2) {
      return {
        topicId,
        velocityScore: 0.5,
        trend: 'stable',
        recommendedPace: 'maintain',
      };
    }

    const half = Math.floor(interactions.length / 2);
    const recentHalf = interactions.slice(0, half);
    const olderHalf = interactions.slice(half);

    const recentAccuracy = this.calculateAccuracy(recentHalf);
    const olderAccuracy = this.calculateAccuracy(olderHalf);

    const velocityScore = recentAccuracy - olderAccuracy + 0.5;
    const clampedVelocity = Math.max(0, Math.min(1, velocityScore));

    let trend: 'improving' | 'stable' | 'declining';
    let recommendedPace: 'faster' | 'maintain' | 'slower';

    if (velocityScore > 0.6) {
      trend = 'improving';
      recommendedPace = 'faster';
    } else if (velocityScore < 0.4) {
      trend = 'declining';
      recommendedPace = 'slower';
    } else {
      trend = 'stable';
      recommendedPace = 'maintain';
    }

    return {
      topicId,
      velocityScore: clampedVelocity,
      trend,
      recommendedPace,
    };
  }

  private calculateAccuracy(interactions: { wasCorrect: boolean | null }[]): number {
    const valid = interactions.filter(i => i.wasCorrect !== null);
    if (valid.length === 0) return 0.5;
    
    const correct = valid.filter(i => i.wasCorrect).length;
    return correct / valid.length;
  }

  async buildCognitiveProfile(userId: string): Promise<CognitiveProfile> {
    const allMasteries = await db.query.studentTopicMastery.findMany({
      where: eq(studentTopicMastery.userId, userId),
    });

    if (allMasteries.length === 0) {
      return {
        userId,
        overallMastery: 0.3,
        strongTopics: [],
        weakTopics: [],
        learningStyle: 'needs_support',
        preferredDifficulty: 5,
        recentProgress: 0,
      };
    }

    const totalMastery = allMasteries.reduce((sum: number, m: StudentTopicMastery) => sum + (m.masteryScore ?? 0), 0);
    const overallMastery = totalMastery / allMasteries.length;

    const sortedByMastery = [...allMasteries].sort(
      (a, b) => (b.masteryScore ?? 0) - (a.masteryScore ?? 0)
    );

    const strongTopics = sortedByMastery
      .filter((m: StudentTopicMastery) => (m.masteryScore ?? 0) >= 0.7)
      .slice(0, 5)
      .map((m: StudentTopicMastery) => m.topicId);

    const weakTopics = sortedByMastery
      .filter((m: StudentTopicMastery) => (m.masteryScore ?? 0) < 0.5)
      .slice(-5)
      .reverse()
      .map((m: StudentTopicMastery) => m.topicId);

    const recentlyPracticed = allMasteries.filter((m: StudentTopicMastery) => {
      if (!m.lastPracticed) return false;
      const daysSince = (Date.now() - m.lastPracticed.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });

    const avgAttemptsPerTopic = allMasteries.reduce((sum: number, m: StudentTopicMastery) => sum + (m.totalAttempts ?? 0), 0) / allMasteries.length;
    const avgCorrectRate = allMasteries.reduce((sum: number, m: StudentTopicMastery) => {
      const total = m.totalAttempts ?? 1;
      const correct = m.correctAttempts ?? 0;
      return sum + correct / total;
    }, 0) / allMasteries.length;

    let learningStyle: 'fast_learner' | 'steady' | 'needs_support';
    if (avgCorrectRate >= 0.75 && avgAttemptsPerTopic <= 5) {
      learningStyle = 'fast_learner';
    } else if (avgCorrectRate >= 0.5) {
      learningStyle = 'steady';
    } else {
      learningStyle = 'needs_support';
    }

    let preferredDifficulty: number;
    if (overallMastery >= 0.8) {
      preferredDifficulty = 8;
    } else if (overallMastery >= 0.6) {
      preferredDifficulty = 6;
    } else if (overallMastery >= 0.4) {
      preferredDifficulty = 5;
    } else {
      preferredDifficulty = 3;
    }

    const recentProgress = recentlyPracticed.length > 0
      ? recentlyPracticed.reduce((sum: number, m: StudentTopicMastery) => sum + (m.masteryScore ?? 0), 0) / recentlyPracticed.length - overallMastery
      : 0;

    return {
      userId,
      overallMastery,
      strongTopics,
      weakTopics,
      learningStyle,
      preferredDifficulty,
      recentProgress: Math.max(-1, Math.min(1, recentProgress)),
    };
  }

  async getTopicsForReview(userId: string, limit: number = 5): Promise<MasteryEstimate[]> {
    const now = new Date();
    
    const dueForReview = await db.query.studentTopicMastery.findMany({
      where: and(
        eq(studentTopicMastery.userId, userId),
        sql`${studentTopicMastery.nextReviewDate} <= ${now}`
      ),
      orderBy: [desc(studentTopicMastery.nextReviewDate)],
      limit,
    });

    return dueForReview.map((m: StudentTopicMastery) => ({
      topicId: m.topicId,
      probability: m.masteryScore ?? 0,
      confidence: m.confidenceLevel ?? 'low',
      dataPoints: m.totalAttempts ?? 0,
      lastUpdated: m.updatedAt ?? new Date(),
    }));
  }

  async recordMisconception(
    userId: string,
    topicId: string,
    misconceptionId: string
  ): Promise<void> {
    const existing = await db.query.studentTopicMastery.findFirst({
      where: and(
        eq(studentTopicMastery.userId, userId),
        eq(studentTopicMastery.topicId, topicId)
      ),
    });

    if (existing) {
      const currentMisconceptions = (existing.misconceptions as string[]) || [];
      if (!currentMisconceptions.includes(misconceptionId)) {
        await db.update(studentTopicMastery)
          .set({
            misconceptions: [...currentMisconceptions, misconceptionId],
            updatedAt: new Date(),
          })
          .where(eq(studentTopicMastery.id, existing.id));
      }
    } else {
      await db.insert(studentTopicMastery).values({
        userId,
        topicId,
        masteryScore: 0.2,
        confidenceLevel: 'low',
        totalAttempts: 0,
        correctAttempts: 0,
        hintsUsed: 0,
        practiceCount: 0,
        misconceptions: [misconceptionId],
        srsInterval: 1,
      });
    }
  }

  async clearMisconception(
    userId: string,
    topicId: string,
    misconceptionId: string
  ): Promise<void> {
    const existing = await db.query.studentTopicMastery.findFirst({
      where: and(
        eq(studentTopicMastery.userId, userId),
        eq(studentTopicMastery.topicId, topicId)
      ),
    });

    if (existing) {
      const currentMisconceptions = (existing.misconceptions as string[]) || [];
      const updated = currentMisconceptions.filter(m => m !== misconceptionId);
      
      await db.update(studentTopicMastery)
        .set({
          misconceptions: updated,
          updatedAt: new Date(),
        })
        .where(eq(studentTopicMastery.id, existing.id));
    }
  }

  predictSuccessProbability(
    currentMastery: number,
    questionDifficulty: number,
    subject: string
  ): number {
    const params = this.getBKTParams(subject, questionDifficulty);
    const pKnow = currentMastery;
    const pGuess = params.pG;
    const pSlip = params.pS;

    const pCorrect = pKnow * (1 - pSlip) + (1 - pKnow) * pGuess;
    return Math.max(0, Math.min(1, pCorrect));
  }

  calculateOptimalDifficulty(
    currentMastery: number,
    targetSuccessRate: number = 0.7,
    subject: string = 'default'
  ): number {
    for (let d = 1; d <= 10; d++) {
      const predicted = this.predictSuccessProbability(currentMastery, d, subject);
      if (predicted <= targetSuccessRate) {
        return Math.max(1, d - 1);
      }
    }
    return 10;
  }

  async runDeepKnowledgeTracing(
    userId: string,
    topicId: string,
    subject: string
  ): Promise<DKTPrediction> {
    const interactions = await this.getInteractionSequence(userId, subject, 50);
    const relatedTopics = await this.getRelatedTopics(topicId, subject);
    
    const hiddenState = await this.computeHiddenState(userId, topicId, interactions);
    const temporalFactors = this.computeTemporalFactors(interactions, topicId);
    
    const relatedTopicSubjects = await this.getTopicSubjects(relatedTopics);
    const transferKnowledge = await this.computeKnowledgeTransfer(
      userId,
      topicId,
      relatedTopics, 
      subject,
      relatedTopicSubjects
    );
    
    const bktMastery = await this.getMasteryForTopic(userId, topicId);
    const baseMastery = bktMastery?.probability ?? 0.3;
    
    const dktMastery = this.fuseBKTWithDKT(
      baseMastery,
      hiddenState,
      temporalFactors,
      transferKnowledge
    );
    
    const predictedPerformance = this.predictNextPerformance(
      dktMastery,
      hiddenState,
      temporalFactors
    );
    
    const confidenceInterval = this.computeConfidenceInterval(
      dktMastery,
      interactions.length,
      temporalFactors.consistency
    );

    return {
      topicId,
      masteryProbability: dktMastery,
      hiddenState,
      temporalFactors,
      transferKnowledge,
      predictedNextPerformance: predictedPerformance,
      confidenceInterval,
    };
  }

  private async getInteractionSequence(
    userId: string,
    subject: string,
    limit: number
  ): Promise<StudentInteractionMetrics[]> {
    const interactions = await db.query.studentInteractionMetrics.findMany({
      where: and(
        eq(studentInteractionMetrics.userId, userId),
        eq(studentInteractionMetrics.subject, subject)
      ),
      orderBy: [desc(studentInteractionMetrics.createdAt)],
      limit,
    });
    return interactions.reverse();
  }

  private async getRelatedTopics(
    topicId: string,
    subject: string
  ): Promise<string[]> {
    try {
      const edges = await db.query.curriculumEdges.findMany({
        where: or(
          eq(curriculumEdges.sourceTopicId, topicId),
          eq(curriculumEdges.targetTopicId, topicId)
        ),
      });
      
      const relatedIds = new Set<string>();
      for (const edge of edges) {
        if (edge.sourceTopicId !== topicId) relatedIds.add(edge.sourceTopicId);
        if (edge.targetTopicId !== topicId) relatedIds.add(edge.targetTopicId);
      }
      return Array.from(relatedIds);
    } catch {
      return [];
    }
  }

  private async computeHiddenState(
    userId: string,
    topicId: string,
    interactions: StudentInteractionMetrics[]
  ): Promise<DKTHiddenState> {
    const cacheKey = `${userId}:${topicId}`;
    const cached = this.hiddenStateCache.get(cacheKey);
    
    if (cached && interactions.length > 0) {
      const latestInteraction = interactions[interactions.length - 1];
      if (latestInteraction.createdAt && cached.sequencePosition >= interactions.length - 1) {
        return cached;
      }
    }

    const knowledgeVector = new Array(this.dktConfig.hiddenDim).fill(0);
    const attentionScores = new Map<string, number>();
    
    let totalWeight = 0;
    let correctWeight = 0;
    let incorrectWeight = 0;
    const now = Date.now();
    
    const topicInteractions = interactions.filter(i => i.topic === topicId);
    const otherInteractions = interactions.filter(i => i.topic !== topicId);
    
    for (let i = 0; i < topicInteractions.length; i++) {
      const interaction = topicInteractions[i];
      const wasCorrect = interaction.wasCorrect ?? false;
      const timestamp = interaction.createdAt?.getTime() ?? now;
      
      const recencyWeight = this.computeRecencyWeight(now - timestamp);
      const positionWeight = (i + 1) / Math.max(1, topicInteractions.length);
      const combinedWeight = recencyWeight * 0.7 + positionWeight * 0.3;
      
      if (wasCorrect) {
        correctWeight += combinedWeight;
      } else {
        incorrectWeight += combinedWeight;
      }
      totalWeight += combinedWeight;
    }
    
    const topicHash = this.hashTopic(topicId);
    const directMastery = totalWeight > 0 
      ? correctWeight / totalWeight 
      : 0.3;
    
    for (let j = 0; j < this.dktConfig.hiddenDim; j++) {
      const topicInfluence = topicHash[j % topicHash.length];
      knowledgeVector[j] = directMastery * topicInfluence;
    }
    
    let relatedInfluence = 0;
    let relatedCount = 0;
    for (const interaction of otherInteractions) {
      const topic = interaction.topic ?? 'unknown';
      const wasCorrect = interaction.wasCorrect ?? false;
      const timestamp = interaction.createdAt?.getTime() ?? now;
      
      const recencyWeight = this.computeRecencyWeight(now - timestamp);
      const similarity = this.computeTopicSimilarity(topicId, topic);
      
      if (similarity > 0.1) {
        relatedInfluence += (wasCorrect ? 1 : 0) * recencyWeight * similarity;
        relatedCount++;
        
        const currentScore = attentionScores.get(topic) ?? 0;
        attentionScores.set(topic, currentScore + recencyWeight * similarity);
      }
    }
    
    if (relatedCount > 0) {
      const avgRelatedInfluence = relatedInfluence / relatedCount;
      for (let j = 0; j < this.dktConfig.hiddenDim; j++) {
        knowledgeVector[j] = knowledgeVector[j] * 0.7 + avgRelatedInfluence * 0.3;
      }
    }
    
    for (let j = 0; j < knowledgeVector.length; j++) {
      knowledgeVector[j] = Math.max(0, Math.min(1, knowledgeVector[j]));
    }
    
    const maxAttention = Math.max(...Array.from(attentionScores.values()), 0.01);
    for (const [topic, score] of attentionScores) {
      attentionScores.set(topic, Math.min(1, score / maxAttention));
    }

    const hiddenState: DKTHiddenState = {
      knowledgeVector,
      temporalWeight: Math.min(1, totalWeight / Math.max(1, topicInteractions.length)),
      attentionScores,
      sequencePosition: interactions.length,
    };
    
    this.hiddenStateCache.set(cacheKey, hiddenState);
    if (this.hiddenStateCache.size > 1000) {
      const firstKey = this.hiddenStateCache.keys().next().value;
      if (firstKey) this.hiddenStateCache.delete(firstKey);
    }
    
    return hiddenState;
  }

  private computeTopicSimilarity(topic1: string, topic2: string): number {
    if (topic1 === topic2) return 1.0;
    
    const words1 = new Set(topic1.toLowerCase().split(/[_\-\s]+/));
    const words2 = new Set(topic2.toLowerCase().split(/[_\-\s]+/));
    
    let intersection = 0;
    for (const word of words1) {
      if (words2.has(word)) intersection++;
    }
    
    const union = words1.size + words2.size - intersection;
    const jaccardSimilarity = union > 0 ? intersection / union : 0;
    
    const hash1 = this.hashTopic(topic1);
    const hash2 = this.hashTopic(topic2);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < hash1.length; i++) {
      dotProduct += hash1[i] * hash2[i];
      norm1 += hash1[i] * hash1[i];
      norm2 += hash2[i] * hash2[i];
    }
    const cosineSimilarity = (norm1 > 0 && norm2 > 0) 
      ? dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2)) 
      : 0;
    
    return jaccardSimilarity * 0.6 + cosineSimilarity * 0.4;
  }

  private computeRecencyWeight(millisAgo: number): number {
    const daysAgo = millisAgo / (1000 * 60 * 60 * 24);
    return Math.pow(this.dktConfig.forgettingCurveBase, daysAgo);
  }

  private hashTopic(topic: string): number[] {
    const hash: number[] = [];
    for (let i = 0; i < 8; i++) {
      let h = 0;
      for (let j = 0; j < topic.length; j++) {
        h = ((h << 5) - h + topic.charCodeAt(j) * (i + 1)) & 0xffffffff;
      }
      hash.push((h & 0x7fffffff) / 0x7fffffff);
    }
    return hash;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, x))));
  }

  private computeTemporalFactors(
    interactions: StudentInteractionMetrics[],
    topicId: string
  ): { recency: number; spacing: number; consistency: number } {
    const topicInteractions = interactions.filter(i => i.topic === topicId);
    
    if (topicInteractions.length === 0) {
      return { recency: 0, spacing: 0.5, consistency: 0.5 };
    }
    
    const now = Date.now();
    const latestTimestamp = topicInteractions[topicInteractions.length - 1]?.createdAt?.getTime() ?? now;
    const recency = this.computeRecencyWeight(now - latestTimestamp);
    
    let spacing = 0.5;
    if (topicInteractions.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < topicInteractions.length; i++) {
        const prev = topicInteractions[i - 1]?.createdAt?.getTime() ?? 0;
        const curr = topicInteractions[i]?.createdAt?.getTime() ?? 0;
        gaps.push(curr - prev);
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const optimalGapMs = 24 * 60 * 60 * 1000;
      spacing = Math.exp(-Math.abs(Math.log(avgGap / optimalGapMs)) / 2);
    }
    
    let consistency = 0.5;
    if (topicInteractions.length >= 2) {
      const correctness = topicInteractions.map(i => i.wasCorrect ? 1 : 0);
      let transitions = 0;
      for (let i = 1; i < correctness.length; i++) {
        if (correctness[i] !== correctness[i - 1]) transitions++;
      }
      const maxTransitions = correctness.length - 1;
      consistency = 1 - (transitions / maxTransitions);
    }
    
    return { recency, spacing, consistency };
  }

  private async computeKnowledgeTransfer(
    userId: string,
    targetTopicId: string,
    relatedTopics: string[],
    targetSubject: string,
    relatedTopicSubjects: Map<string, string>
  ): Promise<Map<string, number>> {
    const transfer = new Map<string, number>();
    
    if (relatedTopics.length === 0) return transfer;
    
    const masteries = await this.getMasteryForMultipleTopics(userId, relatedTopics);
    const normalizedTargetSubject = normalizeSubject(targetSubject);
    const targetSimilarityRow = SUBJECT_SIMILARITY_MATRIX[normalizedTargetSubject] ?? {};
    
    for (const [relatedTopicId, mastery] of masteries) {
      const relatedSubjectRaw = relatedTopicSubjects.get(relatedTopicId);
      
      if (!relatedSubjectRaw) {
        continue;
      }
      
      const relatedSubject = normalizeSubject(relatedSubjectRaw);
      
      let crossSubjectSimilarity = targetSimilarityRow[relatedSubject];
      if (crossSubjectSimilarity === undefined) {
        crossSubjectSimilarity = relatedSubject === normalizedTargetSubject ? 1.0 : 0.15;
      }
      
      const topicSimilarity = this.computeTopicSimilarity(targetTopicId, relatedTopicId);
      
      const sameSubjectBonus = relatedSubject === normalizedTargetSubject ? 1.0 : 0.7;
      const effectiveSimilarity = crossSubjectSimilarity * topicSimilarity * sameSubjectBonus;
      
      const transferAmount = mastery.probability * effectiveSimilarity * this.dktConfig.knowledgeTransferRate;
      transfer.set(relatedTopicId, Math.min(0.3, transferAmount));
    }
    
    return transfer;
  }

  private async getTopicSubjects(topicIds: string[]): Promise<Map<string, string>> {
    const subjectMap = new Map<string, string>();
    
    if (topicIds.length === 0) return subjectMap;
    
    try {
      const prereqData = await db.query.topicPrerequisites.findMany({
        where: inArray(topicPrerequisites.topicId, topicIds),
      });
      
      for (const p of prereqData) {
        if (p.subject) {
          subjectMap.set(p.topicId, normalizeSubject(p.subject));
        }
      }
      
      let remainingTopics = topicIds.filter(id => !subjectMap.has(id));
      
      if (remainingTopics.length > 0) {
        const edgesData = await db.query.curriculumEdges.findMany({
          where: or(
            inArray(curriculumEdges.sourceTopicId, remainingTopics),
            inArray(curriculumEdges.targetTopicId, remainingTopics)
          ),
        });
        
        for (const e of edgesData) {
          if (e.metadata && typeof e.metadata === 'object') {
            const meta = e.metadata as Record<string, unknown>;
            if (meta.subject && typeof meta.subject === 'string') {
              if (remainingTopics.includes(e.sourceTopicId) && !subjectMap.has(e.sourceTopicId)) {
                subjectMap.set(e.sourceTopicId, normalizeSubject(meta.subject));
              }
              if (remainingTopics.includes(e.targetTopicId) && !subjectMap.has(e.targetTopicId)) {
                subjectMap.set(e.targetTopicId, normalizeSubject(meta.subject));
              }
            }
          }
        }
      }
      
      remainingTopics = topicIds.filter(id => !subjectMap.has(id));
      
      if (remainingTopics.length > 0) {
        const masteryData = await db.query.studentTopicMastery.findMany({
          where: inArray(studentTopicMastery.topicId, remainingTopics),
        });
        
        for (const m of masteryData) {
          if (!subjectMap.has(m.topicId) && m.metadata && typeof m.metadata === 'object') {
            const meta = m.metadata as Record<string, unknown>;
            if (meta.subject && typeof meta.subject === 'string') {
              subjectMap.set(m.topicId, normalizeSubject(meta.subject));
            }
          }
        }
      }
      
      remainingTopics = topicIds.filter(id => !subjectMap.has(id));
      
      if (remainingTopics.length > 0) {
        const interactions = await db.query.studentInteractionMetrics.findMany({
          where: inArray(studentInteractionMetrics.topic, remainingTopics),
        });
        
        for (const i of interactions) {
          if (!subjectMap.has(i.topic) && i.subject) {
            subjectMap.set(i.topic, normalizeSubject(i.subject));
          }
        }
      }
      
    } catch {
    }
    
    for (const topicId of topicIds) {
      if (!subjectMap.has(topicId)) {
        const inferredSubject = this.inferSubjectFromTopicId(topicId);
        subjectMap.set(topicId, normalizeSubject(inferredSubject));
      }
    }
    
    return subjectMap;
  }
  
  private inferSubjectFromTopicId(topicId: string): string {
    const lower = topicId.toLowerCase();
    
    const subjectPatterns: Array<[RegExp, string]> = [
      [/physics|motion|force|energy|momentum|wave|optic|electric|magnetic|thermo|mechanic|gravit|newton|coulomb|faraday|ohm|circuit|capacitor|inductor|resistor|electron|proton|nucleus|atom|photon|spectrum|lens|mirror|refract|reflect|diffract|interfere|sound|acoust|fluid|pressure|density|velocity|accelerat|displacement|projectile|friction|tension|torque|angular|rotatio/i, 'physics'],
      [/chemistry|reaction|element|compound|bond|acid|base|organic|inorganic|periodic|mole|molarity|solution|precipitat|oxidat|reduct|redox|electrochemis|thermochemis|kinetic|equilibri|ph|buffer|salt|metal|non-metal|halogen|alkali|alkaline|carbon|hydrogen|oxygen|nitrogen|sulphur|phosphor|polymer|hydrocarbon|alkane|alkene|alkyne|alcohol|aldehyde|ketone|ester|carboxylic/i, 'chemistry'],
      [/biology|cell|gene|dna|rna|protein|enzyme|organ|plant|animal|ecology|evolution|nervous|circulatory|respiratory|digestive|excretory|reproductive|endocrine|immune|tissue|mitosis|meiosis|chromosome|mutation|heredit|mendel|darwin|species|ecosystem|food.?chain|photosynthesis|respiration|metabolism|hormone|neuron|brain|heart|lung|kidney|liver|blood|lymph|muscle|bone|skeleton|bacteria|virus|fungi|microb|pathogen/i, 'biology'],
      [/math|algebra|calculus|geometry|trigonometry|derivative|integral|matrix|vector|equation|polynomial|logarithm|exponential|function|limit|continuity|differentiat|integrat|sequence|series|permutation|combination|probability|statistics|mean|median|mode|variance|deviation|correlation|regression|set|relation|number|rational|irrational|complex|real|integer|fraction|decimal|percent|ratio|proportion|angle|triangle|circle|polygon|parallelogram|quadrilateral|area|perimeter|volume|surface/i, 'math'],
      [/history|empire|war|revolution|civilization|dynasty|movement|colonial|independence|mughal|british|indian|freedom|struggle|partition|constitution|ancient|medieval|modern|king|queen|ruler|battle|treaty|reform|nationalist|congress|league|gandhi|nehru|bose|patel|tilak|gokhale/i, 'history'],
      [/geography|climate|continent|river|mountain|population|migration|resource|terrain|atmosphere|lithosphere|hydrosphere|biosphere|monsoon|rainfall|temperature|soil|vegetation|forest|desert|ocean|sea|island|plateau|plain|delta|valley|glacier|volcano|earthquake|mineral|coal|petroleum|agriculture|industry|urban|rural|transport|trade|map|scale|latitude|longitude/i, 'geography'],
      [/economics|market|demand|supply|gdp|inflation|trade|banking|fiscal|monetary|price|cost|revenue|profit|loss|budget|tax|income|expenditure|saving|investment|consumption|production|distribution|exchange|money|currency|credit|debit|interest|dividend|share|stock|bond|insurance|poverty|unemployment|development|growth|planning/i, 'economics'],
      [/account|ledger|journal|balance.?sheet|profit|loss|asset|liability|depreciation|trial.?balance|cash.?book|bank.?reconciliation|voucher|debit|credit|capital|drawing|revenue|expense|financial.?statement|ratio|analysis|audit|cost|budget|variance|inventory|receivable|payable/i, 'accountancy'],
      [/computer|programming|algorithm|data.?structure|software|hardware|network|database|python|java|c\+\+|javascript|html|css|web|internet|cyber|security|encryption|hacking|virus|malware|operating.?system|memory|processor|storage|input|output|binary|boolean|loop|condition|function|variable|array|list|stack|queue|tree|graph|sort|search/i, 'computer'],
      [/english|grammar|literature|writing|comprehension|vocabulary|essay|poem|poetry|prose|novel|drama|playwright|shakespeare|figure.?of.?speech|metaphor|simile|personification|alliteration|rhyme|stanza|paragraph|sentence|clause|phrase|noun|verb|adjective|adverb|pronoun|preposition|conjunction|article|tense|voice|direct|indirect|active|passive/i, 'english'],
      [/hindi|vyakaran|sahitya|gadya|padya|kavita|kahani|nibandh|patra|samvad|vigyapan|suchna|sandesh|muhavare|lokokti|paryayvachi|vilom|anekarthi|varn|shabd|vakya|ling|vachan|karak|kaal|vachya|samaas|sandhi|upsarg|pratyay|viram.?chinh/i, 'hindi'],
      [/social|civics|political|government|parliament|constitution|democracy|election|vote|citizen|right|duty|fundamental|directive|amendment|judiciary|legislature|executive|supreme.?court|high.?court|president|prime.?minister|governor|chief.?minister/i, 'social'],
      [/business|entrepreneur|management|marketing|finance|human.?resource|operation|strategy|planning|organization|leadership|motivation|communication|teamwork|innovation|startup|venture|company|corporation|partnership|proprietor|cooperative/i, 'business_studies'],
      [/statistics|data|sample|population|frequency|distribution|histogram|bar.?graph|pie.?chart|scatter|correlation|regression|hypothesis|significance|confidence|interval|chi.?square|t.?test|anova|normal.?distribution|binomial|poisson/i, 'statistics'],
      [/physical.?education|fitness|exercise|sport|game|athletics|gymnasium|yoga|health|nutrition|diet|muscle|stamina|endurance|flexibility|agility|coordination|posture|warm.?up|cool.?down|training|competition/i, 'physical_education'],
    ];
    
    for (const [pattern, subject] of subjectPatterns) {
      if (pattern.test(lower)) {
        return subject;
      }
    }
    
    return 'science';
  }

  private fuseBKTWithDKT(
    bktMastery: number,
    hiddenState: DKTHiddenState,
    temporalFactors: { recency: number; spacing: number; consistency: number },
    transferKnowledge: Map<string, number>
  ): number {
    const dktDirectMastery = hiddenState.knowledgeVector.length > 0
      ? hiddenState.knowledgeVector.reduce((a, b) => a + b, 0) / hiddenState.knowledgeVector.length
      : bktMastery;
    
    let transferBonus = 0;
    let transferCount = 0;
    for (const amount of transferKnowledge.values()) {
      if (amount > 0.01) {
        transferBonus += amount;
        transferCount++;
      }
    }
    transferBonus = transferCount > 0 
      ? Math.min(0.15, transferBonus / transferCount) 
      : 0;
    
    const temporalMultiplier = 
      temporalFactors.recency * 0.5 + 
      temporalFactors.spacing * 0.25 + 
      temporalFactors.consistency * 0.25;
    
    const dktAdjustedMastery = dktDirectMastery * (0.7 + temporalMultiplier * 0.3) + transferBonus;
    
    const hasEnoughData = hiddenState.sequencePosition >= this.dktConfig.minSequenceLength;
    const hasMeaningfulDKT = Math.abs(dktDirectMastery - 0.5) > 0.1 || temporalFactors.recency > 0.5;
    
    let dktWeight: number;
    if (!hasEnoughData) {
      dktWeight = 0.1;
    } else if (!hasMeaningfulDKT) {
      dktWeight = 0.2;
    } else {
      dktWeight = 0.4;
    }
    
    const fusedMastery = bktMastery * (1 - dktWeight) + dktAdjustedMastery * dktWeight;
    
    return Math.max(0.01, Math.min(0.99, fusedMastery));
  }

  private predictNextPerformance(
    mastery: number,
    hiddenState: DKTHiddenState,
    temporalFactors: { recency: number; spacing: number; consistency: number }
  ): number {
    const momentumBonus = temporalFactors.consistency > 0.7 ? 0.1 : 0;
    const recencyPenalty = temporalFactors.recency < 0.3 ? 0.1 : 0;
    
    const prediction = mastery * hiddenState.temporalWeight + momentumBonus - recencyPenalty;
    return Math.max(0, Math.min(1, prediction));
  }

  private computeConfidenceInterval(
    mastery: number,
    sampleSize: number,
    consistency: number
  ): [number, number] {
    const baseStdError = Math.sqrt((mastery * (1 - mastery)) / Math.max(1, sampleSize));
    const adjustedStdError = baseStdError / Math.max(0.5, consistency);
    
    const zScore = 1.96;
    const lower = Math.max(0, mastery - zScore * adjustedStdError);
    const upper = Math.min(1, mastery + zScore * adjustedStdError);
    
    return [lower, upper];
  }

  async updateMasteryWithDKT(
    userId: string,
    topicId: string,
    wasCorrect: boolean,
    subject: string,
    difficulty: number = 5,
    hintsUsed: number = 0
  ): Promise<MasteryEstimate> {
    const bktResult = await this.updateMasteryAfterInteraction(
      userId, topicId, wasCorrect, subject, difficulty, hintsUsed
    );
    
    const dktPrediction = await this.runDeepKnowledgeTracing(userId, topicId, subject);
    
    const fusedProbability = (bktResult.probability * 0.6 + dktPrediction.masteryProbability * 0.4);
    
    await db.update(studentTopicMastery)
      .set({
        masteryScore: fusedProbability,
        updatedAt: new Date(),
      })
      .where(and(
        eq(studentTopicMastery.userId, userId),
        eq(studentTopicMastery.topicId, topicId)
      ));
    
    return {
      ...bktResult,
      probability: fusedProbability,
      dktEnhanced: true,
      hiddenState: dktPrediction.hiddenState,
    };
  }

  async getKnowledgeGaps(
    userId: string,
    subject: string,
    targetMastery: number = 0.7
  ): Promise<Array<{ topicId: string; gap: number; priority: number }>> {
    const allMastery = await db.query.studentTopicMastery.findMany({
      where: eq(studentTopicMastery.userId, userId),
    });
    
    const topicIds = allMastery.map(m => m.topicId);
    const topicSubjects = await this.getTopicSubjects(topicIds);
    
    const normalizedSubject = normalizeSubject(subject);
    const subjectMastery = allMastery.filter(m => {
      const topicSubject = topicSubjects.get(m.topicId);
      if (!topicSubject) return false;
      return normalizeSubject(topicSubject) === normalizedSubject;
    });
    
    const gaps: Array<{ topicId: string; gap: number; priority: number }> = [];
    
    for (const m of subjectMastery) {
      const mastery = m.masteryScore ?? 0;
      if (mastery < targetMastery) {
        const dktPrediction = await this.runDeepKnowledgeTracing(userId, m.topicId, subject);
        const gap = targetMastery - dktPrediction.masteryProbability;
        
        const urgency = 1 - dktPrediction.temporalFactors.recency;
        const priority = gap * 0.5 + urgency * 0.3 + (1 - dktPrediction.temporalFactors.consistency) * 0.2;
        
        gaps.push({ topicId: m.topicId, gap, priority });
      }
    }
    
    return gaps.sort((a, b) => b.priority - a.priority);
  }

  async getOptimalReviewSchedule(
    userId: string,
    subject: string,
    numTopics: number = 5
  ): Promise<Map<string, Date>> {
    const schedule = new Map<string, Date>();
    const gaps = await this.getKnowledgeGaps(userId, subject, 0.8);
    
    const now = new Date();
    const topGaps = gaps.slice(0, numTopics);
    
    for (let i = 0; i < topGaps.length; i++) {
      const { topicId, priority } = topGaps[i];
      
      const daysUntilReview = Math.max(1, Math.round((1 - priority) * 7));
      const reviewDate = new Date(now);
      reviewDate.setDate(reviewDate.getDate() + daysUntilReview + i);
      
      schedule.set(topicId, reviewDate);
    }
    
    return schedule;
  }

  async computeLearningMomentum(
    userId: string,
    subject: string,
    windowDays: number = 7
  ): Promise<number> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);
    
    const interactions = await db.query.studentInteractionMetrics.findMany({
      where: and(
        eq(studentInteractionMetrics.userId, userId),
        eq(studentInteractionMetrics.subject, subject),
        sql`${studentInteractionMetrics.createdAt} >= ${windowStart}`
      ),
      orderBy: [desc(studentInteractionMetrics.createdAt)],
    });
    
    if (interactions.length < 3) return 0.5;
    
    const halfPoint = Math.floor(interactions.length / 2);
    const recentHalf = interactions.slice(0, halfPoint);
    const olderHalf = interactions.slice(halfPoint);
    
    const recentAccuracy = this.calculateAccuracy(recentHalf);
    const olderAccuracy = this.calculateAccuracy(olderHalf);
    
    const recentActivity = recentHalf.length / Math.max(1, windowDays / 2);
    const olderActivity = olderHalf.length / Math.max(1, windowDays / 2);
    
    const accuracyTrend = recentAccuracy - olderAccuracy;
    const activityTrend = (recentActivity - olderActivity) / Math.max(1, olderActivity);
    
    const momentum = 0.5 + accuracyTrend * 0.3 + Math.min(0.2, activityTrend * 0.2);
    return Math.max(0, Math.min(1, momentum));
  }

  async buildEnhancedCognitiveProfile(userId: string, subject: string): Promise<CognitiveProfile> {
    const baseProfile = await this.buildCognitiveProfile(userId);
    
    const knowledgeGaps = await this.getKnowledgeGaps(userId, subject, 0.7);
    const optimalReviewTiming = await this.getOptimalReviewSchedule(userId, subject);
    const momentum = await this.computeLearningMomentum(userId, subject);
    
    const relatedTopicsMap = new Map<string, string[]>();
    for (const gap of knowledgeGaps.slice(0, 5)) {
      const related = await this.getRelatedTopics(gap.topicId, subject);
      relatedTopicsMap.set(gap.topicId, related);
    }
    
    const transferOpportunities: string[] = [];
    for (const strongTopic of baseProfile.strongTopics) {
      const related = await this.getRelatedTopics(strongTopic, subject);
      const weakRelated = related.filter(r => 
        knowledgeGaps.some(g => g.topicId === r)
      );
      if (weakRelated.length > 0) {
        transferOpportunities.push(
          `Use mastery of ${strongTopic} to learn ${weakRelated.join(', ')}`
        );
      }
    }
    
    return {
      ...baseProfile,
      dktInsights: {
        knowledgeGaps: knowledgeGaps.slice(0, 10).map(g => g.topicId),
        transferOpportunities: transferOpportunities.slice(0, 5),
        optimalReviewTiming,
        learningMomentum: momentum,
      },
    };
  }
}

export const studentCognitiveModelService = new StudentCognitiveModelService();
