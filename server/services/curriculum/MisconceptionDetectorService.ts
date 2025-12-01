import { db } from '../../db.js';
import { misconceptionDatabase, studentInteractionMetrics, studentTopicMastery } from '@shared/schema';
import type { MisconceptionDatabase, StudentTopicMastery } from '@shared/schema';
import { eq, and, sql, ilike, or, desc } from 'drizzle-orm';
import memoize from 'memoizee';

export interface DetectedMisconception {
  misconceptionId: string;
  misconception: string;
  correctUnderstanding: string;
  confidence: number;
  rootCause: string;
  severity: string;
  remediationStrategy: string;
  hintsToOvercome: string[];
  relatedFormulas: string[];
  isRecurring?: boolean;
  occurrenceCount?: number;
  lastDetectedAt?: Date;
}

interface LinguisticIndicator {
  pattern: RegExp;
  weight: number;
  type: 'uncertainty' | 'confusion' | 'wrong_assumption' | 'partial_knowledge';
}

const LINGUISTIC_INDICATORS: LinguisticIndicator[] = [
  { pattern: /i think|maybe|probably|i guess|not sure/i, weight: 0.3, type: 'uncertainty' },
  { pattern: /always|never|every time|in all cases/i, weight: 0.4, type: 'wrong_assumption' },
  { pattern: /confused|don't understand|makes no sense/i, weight: 0.5, type: 'confusion' },
  { pattern: /same as|equal to|equivalent|no difference/i, weight: 0.35, type: 'wrong_assumption' },
  { pattern: /but why|how come|doesn't that mean/i, weight: 0.25, type: 'partial_knowledge' },
  { pattern: /isn't it|right\?|correct\?|na\?|hai na\?/i, weight: 0.2, type: 'uncertainty' },
];

const CLASS_LEVEL_THRESHOLDS: Record<string, number> = {
  foundation: 0.5,
  bridge: 0.55,
  board: 0.6,
  competitive: 0.65,
  dropper: 0.7,
};

const EXAM_TARGET_WEIGHTS: Record<string, Record<string, number>> = {
  jee: { conceptual_confusion: 1.3, formula_misapplication: 1.4, unit_error: 1.2 },
  jee_main: { conceptual_confusion: 1.3, formula_misapplication: 1.4, unit_error: 1.2 },
  jee_advanced: { conceptual_confusion: 1.5, overgeneralization: 1.4, prerequisite_gap: 1.3 },
  neet: { conceptual_confusion: 1.3, formula_misapplication: 1.2, sign_convention: 1.1 },
  boards: { conceptual_confusion: 1.1, formula_misapplication: 1.0, unit_error: 1.0 },
  cbse: { conceptual_confusion: 1.1, formula_misapplication: 1.0, unit_error: 1.0 },
  icse: { conceptual_confusion: 1.1, formula_misapplication: 1.0, unit_error: 1.0 },
  foundation: { conceptual_confusion: 1.0, prerequisite_gap: 1.2, overgeneralization: 1.1 },
};

export interface MisconceptionDetectionResult {
  detected: boolean;
  misconceptions: DetectedMisconception[];
  suggestedApproach: 'address_immediately' | 'gentle_correction' | 'note_for_later';
  context: {
    studentResponse: string;
    topic: string;
    subject: string;
  };
}

export interface RemediationPlan {
  misconceptionId: string;
  steps: Array<{
    step: number;
    action: string;
    teachingMode: string;
    expectedOutcome: string;
  }>;
  estimatedTime: string;
  successCriteria: string;
}

type RootCauseType = 'conceptual_confusion' | 'formula_misapplication' | 'unit_error' | 'sign_convention' | 'prerequisite_gap' | 'overgeneralization';
type SeverityType = 'critical' | 'moderate' | 'minor';
type FrequencyType = 'very_common' | 'common' | 'occasional' | 'rare';

export class MisconceptionDetectorService {
  private getMisconceptionsForTopic = memoize(
    async (subject: string, topic: string): Promise<MisconceptionDatabase[]> => {
      try {
        const misconceptions = await db.query.misconceptionDatabase.findMany({
          where: and(
            eq(misconceptionDatabase.subject, subject.toLowerCase()),
            or(
              ilike(misconceptionDatabase.topic, `%${topic}%`),
              ilike(misconceptionDatabase.topic, topic)
            )
          ),
        });
        return misconceptions;
      } catch (error) {
        console.error('[MisconceptionDetector] Error fetching misconceptions:', error);
        return [];
      }
    },
    { maxAge: 300000, max: 100 }
  );

  async detectMisconceptions(
    studentResponse: string,
    topic: string,
    subject: string,
    classLevel?: string,
    userId?: string,
    examTarget?: string
  ): Promise<MisconceptionDetectionResult> {
    const result: MisconceptionDetectionResult = {
      detected: false,
      misconceptions: [],
      suggestedApproach: 'note_for_later',
      context: { studentResponse, topic, subject },
    };

    if (!studentResponse || studentResponse.trim().length < 10) {
      return result;
    }

    const misconceptions = await this.getMisconceptionsForTopic(subject, topic);
    
    if (misconceptions.length === 0) {
      const subjectMisconceptions = await this.getMisconceptionsForSubject(subject);
      misconceptions.push(...subjectMisconceptions.slice(0, 20));
    }

    const normalizedResponse = studentResponse.toLowerCase().trim();
    
    const linguisticBoost = this.analyzeLinguisticIndicators(normalizedResponse);
    
    const studentHistory = userId 
      ? await this.getStudentMisconceptionHistory(userId, subject)
      : [];
    const historicalMisconceptionIds = new Set(
      studentHistory.flatMap(h => h.misconceptions)
    );

    const classCategory = classLevel ? this.getClassCategory(parseInt(classLevel) || 10) : 'board';
    const baseThreshold = CLASS_LEVEL_THRESHOLDS[classCategory] ?? 0.6;
    
    const normalizedExamTarget = examTarget?.toLowerCase().replace(/[\s-]/g, '_');
    const examWeights = normalizedExamTarget ? EXAM_TARGET_WEIGHTS[normalizedExamTarget] : undefined;

    for (const m of misconceptions) {
      const patterns = m.triggerPatterns as string[];
      if (!patterns || patterns.length === 0) continue;

      let matchScore = 0;
      let matchedPatterns = 0;

      for (const pattern of patterns) {
        try {
          const regex = new RegExp(pattern, 'gi');
          if (regex.test(normalizedResponse)) {
            matchedPatterns++;
            matchScore += 1 / patterns.length;
          }
        } catch {
          if (normalizedResponse.includes(pattern.toLowerCase())) {
            matchedPatterns++;
            matchScore += 0.5 / patterns.length;
          }
        }
      }

      let adjustedScore = matchScore + (linguisticBoost * 0.15);
      
      if (examWeights && examWeights[m.rootCause]) {
        adjustedScore *= examWeights[m.rootCause];
      }
      
      const isRecurring = historicalMisconceptionIds.has(m.misconceptionId);
      if (isRecurring) {
        adjustedScore *= 1.2;
      }

      const effectiveThreshold = baseThreshold * (m.confidenceThreshold ?? 0.7);
      const confidence = Math.min(1, adjustedScore);

      if (confidence >= effectiveThreshold) {
        const historyEntry = studentHistory.find(h => 
          h.misconceptions.includes(m.misconceptionId)
        );
        
        result.detected = true;
        result.misconceptions.push({
          misconceptionId: m.misconceptionId,
          misconception: m.misconception,
          correctUnderstanding: m.correctUnderstanding,
          confidence,
          rootCause: m.rootCause,
          severity: m.severity ?? 'moderate',
          remediationStrategy: m.remediationStrategy,
          hintsToOvercome: (m.hintsToOvercome as string[]) || [],
          relatedFormulas: (m.relatedFormulas as string[]) || [],
          isRecurring,
          occurrenceCount: isRecurring ? (historyEntry?.misconceptions.length || 1) : 0,
          lastDetectedAt: historyEntry?.lastSeen,
        });
      }
    }

    result.misconceptions.sort((a, b) => {
      if (a.isRecurring && !b.isRecurring) return -1;
      if (!a.isRecurring && b.isRecurring) return 1;
      
      const severityOrder: Record<string, number> = { critical: 3, moderate: 2, minor: 1 };
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });

    if (result.detected) {
      const topMisconception = result.misconceptions[0];
      if (topMisconception.isRecurring || topMisconception.severity === 'critical' || topMisconception.confidence > 0.8) {
        result.suggestedApproach = 'address_immediately';
      } else if (topMisconception.severity === 'moderate' || topMisconception.confidence > 0.5) {
        result.suggestedApproach = 'gentle_correction';
      } else {
        result.suggestedApproach = 'note_for_later';
      }
    }

    return result;
  }

  private analyzeLinguisticIndicators(text: string): number {
    let totalWeight = 0;
    let matchCount = 0;

    for (const indicator of LINGUISTIC_INDICATORS) {
      if (indicator.pattern.test(text)) {
        totalWeight += indicator.weight;
        matchCount++;
      }
    }

    return matchCount > 0 ? totalWeight / matchCount : 0;
  }

  private getClassCategory(classLevel: number): string {
    if (classLevel <= 7) return 'foundation';
    if (classLevel <= 9) return 'bridge';
    if (classLevel === 10 || classLevel === 12) return 'board';
    if (classLevel === 11) return 'competitive';
    if (classLevel >= 13) return 'dropper';
    return 'board';
  }

  private async getMisconceptionsForSubject(subject: string): Promise<MisconceptionDatabase[]> {
    try {
      return await db.query.misconceptionDatabase.findMany({
        where: eq(misconceptionDatabase.subject, subject.toLowerCase()),
        limit: 50,
      });
    } catch (error) {
      console.error('[MisconceptionDetector] Error fetching subject misconceptions:', error);
      return [];
    }
  }

  async generateRemediationPlan(
    misconception: DetectedMisconception
  ): Promise<RemediationPlan> {
    const steps: RemediationPlan['steps'] = [];

    if (misconception.rootCause === 'prerequisite_gap') {
      steps.push({
        step: 1,
        action: 'Identify the specific prerequisite concept that is missing',
        teachingMode: 'scaffolded_direct',
        expectedOutcome: 'Student understands what foundational knowledge is needed',
      });
      steps.push({
        step: 2,
        action: 'Briefly review the prerequisite concept with a worked example',
        teachingMode: 'worked_example',
        expectedOutcome: 'Student recalls or learns the prerequisite',
      });
    }

    if (misconception.rootCause === 'conceptual_confusion') {
      steps.push({
        step: steps.length + 1,
        action: 'Use an analogy to clarify the correct concept',
        teachingMode: 'analogical',
        expectedOutcome: 'Student builds correct mental model',
      });
      steps.push({
        step: steps.length + 1,
        action: 'Ask probing questions to check understanding',
        teachingMode: 'elaborative',
        expectedOutcome: 'Student articulates correct understanding',
      });
    }

    if (misconception.rootCause === 'formula_misapplication') {
      steps.push({
        step: steps.length + 1,
        action: 'Show when the formula applies and when it does not',
        teachingMode: 'case_study',
        expectedOutcome: 'Student understands formula applicability',
      });
      steps.push({
        step: steps.length + 1,
        action: 'Practice with contrasting examples',
        teachingMode: 'worked_example',
        expectedOutcome: 'Student correctly identifies when to use formula',
      });
    }

    if (misconception.rootCause === 'unit_error' || misconception.rootCause === 'sign_convention') {
      steps.push({
        step: steps.length + 1,
        action: 'Highlight the common error explicitly',
        teachingMode: 'direct',
        expectedOutcome: 'Student is aware of the pitfall',
      });
      steps.push({
        step: steps.length + 1,
        action: 'Teach a verification technique to catch this error',
        teachingMode: 'metacognitive',
        expectedOutcome: 'Student develops self-checking habit',
      });
    }

    if (misconception.rootCause === 'overgeneralization') {
      steps.push({
        step: steps.length + 1,
        action: 'Present counterexamples to the overgeneralization',
        teachingMode: 'socratic',
        expectedOutcome: 'Student recognizes limits of the rule',
      });
      steps.push({
        step: steps.length + 1,
        action: 'Clarify the exact conditions under which the rule applies',
        teachingMode: 'direct',
        expectedOutcome: 'Student understands boundaries',
      });
    }

    steps.push({
      step: steps.length + 1,
      action: 'Apply the correct understanding to a new problem',
      teachingMode: 'spaced_retrieval',
      expectedOutcome: 'Student demonstrates corrected understanding',
    });

    const estimatedTime = misconception.severity === 'critical' 
      ? '10-15 minutes' 
      : misconception.severity === 'moderate' 
        ? '5-10 minutes' 
        : '2-5 minutes';

    return {
      misconceptionId: misconception.misconceptionId,
      steps,
      estimatedTime,
      successCriteria: `Student correctly explains: "${misconception.correctUnderstanding}"`,
    };
  }

  async recordMisconceptionDetection(
    userId: string,
    sessionId: string,
    topic: string,
    subject: string,
    misconceptionId: string,
    wasRemediated: boolean = false
  ): Promise<void> {
    try {
      await db.insert(studentInteractionMetrics).values({
        userId,
        sessionId,
        topic,
        subject,
        misconceptionDetected: misconceptionId,
        misconceptionRemediated: wasRemediated,
      });

      const existingMastery = await db.query.studentTopicMastery.findFirst({
        where: and(
          eq(studentTopicMastery.userId, userId),
          eq(studentTopicMastery.topicId, topic)
        ),
      });

      if (existingMastery) {
        const currentMisconceptions = (existingMastery.misconceptions as string[]) || [];
        if (!currentMisconceptions.includes(misconceptionId)) {
          await db.update(studentTopicMastery)
            .set({
              misconceptions: [...currentMisconceptions, misconceptionId],
              updatedAt: new Date(),
            })
            .where(eq(studentTopicMastery.id, existingMastery.id));
        }
      }
    } catch (error) {
      console.error('[MisconceptionDetector] Error recording detection:', error);
    }
  }

  async markMisconceptionRemediated(
    userId: string,
    topicId: string,
    misconceptionId: string
  ): Promise<void> {
    try {
      const existingMastery = await db.query.studentTopicMastery.findFirst({
        where: and(
          eq(studentTopicMastery.userId, userId),
          eq(studentTopicMastery.topicId, topicId)
        ),
      });

      if (existingMastery) {
        const currentMisconceptions = (existingMastery.misconceptions as string[]) || [];
        const updated = currentMisconceptions.filter(m => m !== misconceptionId);
        
        await db.update(studentTopicMastery)
          .set({
            misconceptions: updated,
            masteryScore: Math.min(1, (existingMastery.masteryScore ?? 0) + 0.05),
            updatedAt: new Date(),
          })
          .where(eq(studentTopicMastery.id, existingMastery.id));
      }
    } catch (error) {
      console.error('[MisconceptionDetector] Error marking remediated:', error);
    }
  }

  async getStudentMisconceptionHistory(
    userId: string,
    subject?: string
  ): Promise<Array<{ topic: string; misconceptions: string[]; lastSeen: Date }>> {
    try {
      let query = db.query.studentTopicMastery.findMany({
        where: eq(studentTopicMastery.userId, userId),
      });

      const masteries = await query;

      return masteries
        .filter(m => {
          const misconceptions = m.misconceptions as string[];
          return misconceptions && misconceptions.length > 0;
        })
        .map(m => ({
          topic: m.topicId,
          misconceptions: m.misconceptions as string[],
          lastSeen: m.updatedAt ?? new Date(),
        }));
    } catch (error) {
      console.error('[MisconceptionDetector] Error fetching history:', error);
      return [];
    }
  }

  async getCommonMisconceptionsForExam(
    examTarget: 'jee_main' | 'jee_advanced' | 'neet' | 'boards',
    subject: string,
    limit: number = 10
  ): Promise<MisconceptionDatabase[]> {
    try {
      const frequencyOrder: Record<FrequencyType, number> = {
        very_common: 4,
        common: 3,
        occasional: 2,
        rare: 1,
      };

      const misconceptions = await db.query.misconceptionDatabase.findMany({
        where: eq(misconceptionDatabase.subject, subject.toLowerCase()),
      });

      return misconceptions
        .sort((a, b) => {
          const freqA = frequencyOrder[(a.frequency as FrequencyType) ?? 'common'];
          const freqB = frequencyOrder[(b.frequency as FrequencyType) ?? 'common'];
          return freqB - freqA;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('[MisconceptionDetector] Error fetching exam misconceptions:', error);
      return [];
    }
  }

  generateCorrectionPromptSection(misconception: DetectedMisconception): string {
    return `
## Misconception Detected
The student appears to have the following misconception:
"${misconception.misconception}"

### Correct Understanding
${misconception.correctUnderstanding}

### Root Cause
This misconception typically stems from: ${misconception.rootCause.replace(/_/g, ' ')}

### Remediation Approach
${misconception.remediationStrategy}

### Helpful Hints to Use
${misconception.hintsToOvercome.map((h, i) => `${i + 1}. ${h}`).join('\n')}

### Tone Guidance
- Be supportive and non-judgmental - this is a common misconception
- Use phrases like "Many students initially think..." or "That's a common understanding, but..."
- Focus on building correct understanding rather than criticizing the error
`;
  }
}

export const misconceptionDetectorService = new MisconceptionDetectorService();
