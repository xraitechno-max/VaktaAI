import memoizee from 'memoizee';
import { db } from '../../db';
import { studentTopicMastery, studentInteractionMetrics, misconceptionDatabase } from '../../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export type AssessmentType = 'diagnostic' | 'formative' | 'summative' | 'quick_check';
export type DifficultyCognitive = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'short_answer' | 'numerical' | 'true_false' | 'fill_blank';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  subject: string;
  difficulty: number;
  cognitiveLevel: DifficultyCognitive;
  commonMisconceptions?: string[];
  hints?: string[];
  marks: number;
  timeLimit?: number;
}

export interface AssessmentResult {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  timeSpent: number;
  hintsUsed: number;
  attemptsCount: number;
  confidenceLevel?: number;
}

export interface DiagnosticReport {
  userId: string;
  subject: string;
  assessmentDate: Date;
  overallScore: number;
  masteryLevel: number;
  strengthTopics: TopicAnalysis[];
  weaknessTopics: TopicAnalysis[];
  misconceptionsDetected: MisconceptionEntry[];
  recommendedTopics: string[];
  learningPath: LearningPathStep[];
  cognitiveProfile: CognitiveProfile;
  timeAnalysis: TimeAnalysis;
  confidenceAnalysis: ConfidenceAnalysis;
}

interface TopicAnalysis {
  topic: string;
  accuracy: number;
  averageTime: number;
  questionsAttempted: number;
  questionsCorrect: number;
  cognitiveLevel: DifficultyCognitive;
  trend: 'improving' | 'stable' | 'declining';
}

interface MisconceptionEntry {
  id: string;
  topic: string;
  description: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high';
  correctingStrategy: string;
}

interface LearningPathStep {
  order: number;
  topic: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimatedTime: string;
  resources: string[];
}

interface CognitiveProfile {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
  dominantLevel: DifficultyCognitive;
  developmentNeeded: DifficultyCognitive[];
}

interface TimeAnalysis {
  averageTimePerQuestion: number;
  fastQuestions: number;
  slowQuestions: number;
  optimalPaceQuestions: number;
  timeManagementScore: number;
}

interface ConfidenceAnalysis {
  averageConfidence: number;
  overconfidentQuestions: number;
  underconfidentQuestions: number;
  calibrationScore: number;
}

interface AssessmentContext {
  userId: string;
  subject: string;
  classLevel: number;
  examTarget?: string;
  previousAssessments?: DiagnosticReport[];
}

const COGNITIVE_WEIGHTS: Record<DifficultyCognitive, number> = {
  remember: 1.0,
  understand: 1.2,
  apply: 1.4,
  analyze: 1.6,
  evaluate: 1.8,
  create: 2.0,
};

const OPTIMAL_TIME_PER_MARK = 60;

export class AssessmentService {
  private questionBank: Map<string, Question[]> = new Map();

  private memoizedMasteryFetch = memoizee(
    async (userId: string, subject: string): Promise<any[]> => {
      return db.select()
        .from(studentTopicMastery)
        .where(and(
          eq(studentTopicMastery.userId, userId),
          sql`${studentTopicMastery.topicId} ILIKE ${`${subject}%`}`
        ))
        .orderBy(desc(studentTopicMastery.updatedAt))
        .limit(50);
    },
    { maxAge: 60000, max: 50 }
  );

  async generateDiagnosticAssessment(
    context: AssessmentContext,
    options?: { questionCount?: number; focusTopics?: string[]; includeReview?: boolean }
  ): Promise<Question[]> {
    const targetCount = options?.questionCount || 20;
    const questions: Question[] = [];

    const mastery = await this.memoizedMasteryFetch(context.userId, context.subject);
    
    const weakTopics = mastery
      .filter(m => (m.masteryScore ?? 0) < 0.5)
      .map(m => m.topicId);

    const mediumTopics = mastery
      .filter(m => (m.masteryScore ?? 0) >= 0.5 && (m.masteryScore ?? 0) < 0.75)
      .map(m => m.topicId);

    const strongTopics = mastery
      .filter(m => (m.masteryScore ?? 0) >= 0.75)
      .map(m => m.topicId);

    const defaultTopics = this.getDefaultTopicsForSubject(context.subject, context.classLevel);

    const allTopics = [...new Set([...weakTopics, ...mediumTopics, ...strongTopics, ...defaultTopics])];
    
    if (allTopics.length === 0) {
      allTopics.push(...defaultTopics.slice(0, 5));
    }

    const bloomLevels: DifficultyCognitive[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    const bloomDistribution = {
      remember: Math.ceil(targetCount * 0.15),
      understand: Math.ceil(targetCount * 0.20),
      apply: Math.ceil(targetCount * 0.25),
      analyze: Math.ceil(targetCount * 0.20),
      evaluate: Math.ceil(targetCount * 0.12),
      create: Math.ceil(targetCount * 0.08),
    };

    let topicIndex = 0;
    for (const level of bloomLevels) {
      const count = bloomDistribution[level];
      for (let i = 0; i < count && questions.length < targetCount; i++) {
        const topic = allTopics[topicIndex % allTopics.length];
        topicIndex++;
        
        const difficulty = this.getDifficultyForBloomLevel(level, topic, mastery);
        questions.push(this.generateQuestion(topic, context.subject, level, difficulty));
      }
    }

    while (questions.length < targetCount) {
      const topic = allTopics[topicIndex % allTopics.length];
      topicIndex++;
      const randomLevel = bloomLevels[Math.floor(Math.random() * bloomLevels.length)];
      questions.push(this.generateQuestion(topic, context.subject, randomLevel, 0.5));
    }

    return this.shuffleQuestions(questions.slice(0, targetCount));
  }

  private getDefaultTopicsForSubject(subject: string, classLevel?: number): string[] {
    const defaults: Record<string, string[]> = {
      physics: ['mechanics', 'thermodynamics', 'waves', 'optics', 'electricity', 'magnetism', 'modern_physics'],
      chemistry: ['atomic_structure', 'chemical_bonding', 'states_of_matter', 'thermodynamics', 'equilibrium', 'organic_chemistry'],
      maths: ['algebra', 'calculus', 'trigonometry', 'coordinate_geometry', 'vectors', 'probability'],
      biology: ['cell_biology', 'genetics', 'evolution', 'ecology', 'human_physiology', 'plant_physiology'],
    };
    return defaults[subject.toLowerCase()] || ['general_concepts', 'fundamentals', 'applications'];
  }

  private getDifficultyForBloomLevel(level: DifficultyCognitive, topic: string, mastery: any[]): number {
    const topicMastery = mastery.find(m => m.topicId === topic);
    const currentMastery = topicMastery?.masteryScore ?? 0.5;
    
    const baseDifficulty: Record<DifficultyCognitive, number> = {
      remember: 0.2,
      understand: 0.35,
      apply: 0.5,
      analyze: 0.65,
      evaluate: 0.8,
      create: 0.9,
    };
    
    const adjusted = baseDifficulty[level] * (1 - currentMastery * 0.3);
    return Math.max(0.1, Math.min(0.95, adjusted));
  }

  async evaluateAssessment(
    context: AssessmentContext,
    questions: Question[],
    results: AssessmentResult[]
  ): Promise<DiagnosticReport> {
    const resultMap = new Map(results.map(r => [r.questionId, r]));
    
    let totalScore = 0;
    let maxScore = 0;
    const topicPerformance: Map<string, { correct: number; total: number; time: number; cognitive: DifficultyCognitive[] }> = new Map();
    const cognitiveScores: Record<DifficultyCognitive, { correct: number; total: number }> = {
      remember: { correct: 0, total: 0 },
      understand: { correct: 0, total: 0 },
      apply: { correct: 0, total: 0 },
      analyze: { correct: 0, total: 0 },
      evaluate: { correct: 0, total: 0 },
      create: { correct: 0, total: 0 },
    };

    for (const question of questions) {
      const result = resultMap.get(question.id);
      maxScore += question.marks * COGNITIVE_WEIGHTS[question.cognitiveLevel];

      if (result) {
        const weightedScore = result.isCorrect 
          ? question.marks * COGNITIVE_WEIGHTS[question.cognitiveLevel]
          : 0;
        totalScore += weightedScore;

        const topicData = topicPerformance.get(question.topic) || { correct: 0, total: 0, time: 0, cognitive: [] };
        topicData.total++;
        topicData.time += result.timeSpent;
        topicData.cognitive.push(question.cognitiveLevel);
        if (result.isCorrect) topicData.correct++;
        topicPerformance.set(question.topic, topicData);

        cognitiveScores[question.cognitiveLevel].total++;
        if (result.isCorrect) cognitiveScores[question.cognitiveLevel].correct++;
      }
    }

    const strengthTopics: TopicAnalysis[] = [];
    const weaknessTopics: TopicAnalysis[] = [];

    for (const [topic, data] of topicPerformance) {
      const accuracy = data.total > 0 ? data.correct / data.total : 0;
      const avgTime = data.total > 0 ? data.time / data.total : 0;
      const dominantCognitive = this.getMostFrequent(data.cognitive);

      const analysis: TopicAnalysis = {
        topic,
        accuracy,
        averageTime: avgTime,
        questionsAttempted: data.total,
        questionsCorrect: data.correct,
        cognitiveLevel: dominantCognitive,
        trend: 'stable',
      };

      if (accuracy >= 0.7) {
        strengthTopics.push(analysis);
      } else {
        weaknessTopics.push(analysis);
      }
    }

    const misconceptionsDetected = await this.detectMisconceptions(context, results, questions);

    const cognitiveProfile = this.buildCognitiveProfile(cognitiveScores);

    const timeAnalysis = this.analyzeTimeManagement(questions, results);

    const confidenceAnalysis = this.analyzeConfidence(results);

    const recommendedTopics = this.generateRecommendations(weaknessTopics, misconceptionsDetected);

    const learningPath = this.generateLearningPath(
      weaknessTopics,
      misconceptionsDetected,
      cognitiveProfile,
      context
    );

    const report: DiagnosticReport = {
      userId: context.userId,
      subject: context.subject,
      assessmentDate: new Date(),
      overallScore: maxScore > 0 ? totalScore / maxScore : 0,
      masteryLevel: this.calculateMasteryLevel(totalScore, maxScore, cognitiveProfile),
      strengthTopics: strengthTopics.sort((a, b) => b.accuracy - a.accuracy),
      weaknessTopics: weaknessTopics.sort((a, b) => a.accuracy - b.accuracy),
      misconceptionsDetected,
      recommendedTopics,
      learningPath,
      cognitiveProfile,
      timeAnalysis,
      confidenceAnalysis,
    };

    await this.updateMasteryFromAssessment(context.userId, report);

    return report;
  }

  private async detectMisconceptions(
    context: AssessmentContext,
    results: AssessmentResult[],
    questions: Question[]
  ): Promise<MisconceptionEntry[]> {
    const misconceptions: MisconceptionEntry[] = [];
    const incorrectAnswers = results.filter(r => !r.isCorrect);
    
    const questionMap = new Map(questions.map(q => [q.id, q]));
    
    const topicMistakes: Map<string, string[]> = new Map();
    
    for (const result of incorrectAnswers) {
      const question = questionMap.get(result.questionId);
      if (question) {
        const mistakes = topicMistakes.get(question.topic) || [];
        mistakes.push(result.userAnswer);
        topicMistakes.set(question.topic, mistakes);
      }
    }

    for (const [topic, mistakes] of topicMistakes) {
      if (mistakes.length >= 2) {
        const patterns = this.findAnswerPatterns(mistakes);
        
        for (const pattern of patterns) {
          const dbMisconception = await this.lookupMisconception(context.subject, topic, pattern);
          
          if (dbMisconception) {
            misconceptions.push({
              id: dbMisconception.id,
              topic,
              description: dbMisconception.description || pattern,
              frequency: mistakes.length,
              severity: mistakes.length >= 3 ? 'high' : mistakes.length >= 2 ? 'medium' : 'low',
              correctingStrategy: dbMisconception.correction || 'Review foundational concepts',
            });
          } else {
            misconceptions.push({
              id: `detected-${Date.now()}`,
              topic,
              description: `Recurring error pattern: ${pattern}`,
              frequency: mistakes.length,
              severity: 'medium',
              correctingStrategy: 'Practice more problems on this topic',
            });
          }
        }
      }
    }

    return misconceptions;
  }

  private async lookupMisconception(subject: string, topic: string, pattern: string): Promise<any> {
    try {
      const results = await db.select()
        .from(misconceptionDatabase)
        .where(and(
          eq(misconceptionDatabase.subject, subject),
          sql`${misconceptionDatabase.topic} ILIKE ${`%${topic}%`}`
        ))
        .limit(1);
      
      return results[0] || null;
    } catch {
      return null;
    }
  }

  private findAnswerPatterns(answers: string[]): string[] {
    const patterns: string[] = [];
    const answerCounts: Map<string, number> = new Map();
    
    for (const answer of answers) {
      const normalized = answer.toLowerCase().trim();
      answerCounts.set(normalized, (answerCounts.get(normalized) || 0) + 1);
    }

    for (const [answer, count] of answerCounts) {
      if (count >= 2) {
        patterns.push(answer);
      }
    }

    return patterns;
  }

  private buildCognitiveProfile(
    scores: Record<DifficultyCognitive, { correct: number; total: number }>
  ): CognitiveProfile {
    const profile: CognitiveProfile = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0,
      dominantLevel: 'remember',
      developmentNeeded: [],
    };

    let maxScore = 0;
    const levels: DifficultyCognitive[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

    for (const level of levels) {
      const { correct, total } = scores[level];
      const score = total > 0 ? correct / total : 0;
      profile[level] = score;

      if (score > maxScore) {
        maxScore = score;
        profile.dominantLevel = level;
      }

      if (score < 0.5 && total > 0) {
        profile.developmentNeeded.push(level);
      }
    }

    return profile;
  }

  private analyzeTimeManagement(questions: Question[], results: AssessmentResult[]): TimeAnalysis {
    const resultMap = new Map(results.map(r => [r.questionId, r]));
    
    let totalTime = 0;
    let fastCount = 0;
    let slowCount = 0;
    let optimalCount = 0;
    let questionCount = 0;

    for (const question of questions) {
      const result = resultMap.get(question.id);
      if (result) {
        const optimalTime = question.marks * OPTIMAL_TIME_PER_MARK;
        const actualTime = result.timeSpent;

        totalTime += actualTime;
        questionCount++;

        if (actualTime < optimalTime * 0.5) {
          fastCount++;
        } else if (actualTime > optimalTime * 1.5) {
          slowCount++;
        } else {
          optimalCount++;
        }
      }
    }

    const avgTime = questionCount > 0 ? totalTime / questionCount : 0;
    const optimalRatio = questionCount > 0 ? optimalCount / questionCount : 0;

    return {
      averageTimePerQuestion: avgTime,
      fastQuestions: fastCount,
      slowQuestions: slowCount,
      optimalPaceQuestions: optimalCount,
      timeManagementScore: optimalRatio,
    };
  }

  private analyzeConfidence(results: AssessmentResult[]): ConfidenceAnalysis {
    const withConfidence = results.filter(r => r.confidenceLevel !== undefined);
    
    if (withConfidence.length === 0) {
      return {
        averageConfidence: 0,
        overconfidentQuestions: 0,
        underconfidentQuestions: 0,
        calibrationScore: 0,
      };
    }

    let totalConfidence = 0;
    let overconfident = 0;
    let underconfident = 0;
    let calibrated = 0;

    for (const result of withConfidence) {
      const confidence = result.confidenceLevel!;
      totalConfidence += confidence;

      if (result.isCorrect && confidence < 0.5) {
        underconfident++;
      } else if (!result.isCorrect && confidence > 0.7) {
        overconfident++;
      } else {
        calibrated++;
      }
    }

    return {
      averageConfidence: totalConfidence / withConfidence.length,
      overconfidentQuestions: overconfident,
      underconfidentQuestions: underconfident,
      calibrationScore: calibrated / withConfidence.length,
    };
  }

  private calculateMasteryLevel(
    score: number,
    maxScore: number,
    cognitiveProfile: CognitiveProfile
  ): number {
    const baseScore = maxScore > 0 ? score / maxScore : 0;
    
    const higherOrderAvg = (
      cognitiveProfile.analyze +
      cognitiveProfile.evaluate +
      cognitiveProfile.create
    ) / 3;

    const masteryLevel = baseScore * 0.7 + higherOrderAvg * 0.3;
    
    return Math.min(1, Math.max(0, masteryLevel));
  }

  private generateRecommendations(
    weakTopics: TopicAnalysis[],
    misconceptions: MisconceptionEntry[]
  ): string[] {
    const recommendations: string[] = [];

    const criticalTopics = weakTopics
      .filter(t => t.accuracy < 0.4)
      .map(t => t.topic);
    recommendations.push(...criticalTopics);

    const misconceptionTopics = misconceptions
      .filter(m => m.severity === 'high')
      .map(m => m.topic);
    
    for (const topic of misconceptionTopics) {
      if (!recommendations.includes(topic)) {
        recommendations.push(topic);
      }
    }

    const developmentTopics = weakTopics
      .filter(t => t.cognitiveLevel === 'apply' || t.cognitiveLevel === 'analyze')
      .filter(t => t.accuracy < 0.6)
      .map(t => t.topic);
    
    for (const topic of developmentTopics) {
      if (!recommendations.includes(topic)) {
        recommendations.push(topic);
      }
    }

    return recommendations.slice(0, 10);
  }

  private generateLearningPath(
    weakTopics: TopicAnalysis[],
    misconceptions: MisconceptionEntry[],
    cognitiveProfile: CognitiveProfile,
    context: AssessmentContext
  ): LearningPathStep[] {
    const path: LearningPathStep[] = [];
    let order = 1;

    const criticalTopics = weakTopics.filter(t => t.accuracy < 0.3);
    for (const topic of criticalTopics.slice(0, 3)) {
      path.push({
        order: order++,
        topic: topic.topic,
        priority: 'high',
        reason: `Critical weakness: Only ${Math.round(topic.accuracy * 100)}% accuracy`,
        estimatedTime: '2-3 hours',
        resources: ['NCERT textbook', 'Video lectures', 'Practice problems'],
      });
    }

    const highSeverityMisconceptions = misconceptions.filter(m => m.severity === 'high');
    for (const misconception of highSeverityMisconceptions.slice(0, 2)) {
      if (!path.find(p => p.topic === misconception.topic)) {
        path.push({
          order: order++,
          topic: misconception.topic,
          priority: 'high',
          reason: `Misconception detected: ${misconception.description}`,
          estimatedTime: '1-2 hours',
          resources: [misconception.correctingStrategy, 'Concept clarification'],
        });
      }
    }

    const developmentNeeded = cognitiveProfile.developmentNeeded;
    if (developmentNeeded.includes('apply')) {
      path.push({
        order: order++,
        topic: 'Application Practice',
        priority: 'medium',
        reason: 'Need to improve problem-solving skills',
        estimatedTime: '2-3 hours',
        resources: ['Numerical problems', 'NCERT exercises', 'Previous year questions'],
      });
    }

    const mediumWeakTopics = weakTopics.filter(t => t.accuracy >= 0.3 && t.accuracy < 0.6);
    for (const topic of mediumWeakTopics.slice(0, 3)) {
      if (!path.find(p => p.topic === topic.topic)) {
        path.push({
          order: order++,
          topic: topic.topic,
          priority: 'medium',
          reason: `Room for improvement: ${Math.round(topic.accuracy * 100)}% accuracy`,
          estimatedTime: '1-2 hours',
          resources: ['Practice problems', 'Revision notes'],
        });
      }
    }

    if (path.length === 0) {
      const defaults = this.getDefaultTopicsForSubject(context.subject, context.classLevel);
      const fallbackTopics = defaults.slice(0, 5);
      
      for (const topic of fallbackTopics) {
        path.push({
          order: order++,
          topic,
          priority: 'medium',
          reason: 'Foundational topic for comprehensive understanding',
          estimatedTime: '1-2 hours',
          resources: ['NCERT textbook', 'Concept videos', 'Practice exercises'],
        });
      }

      if (context.examTarget) {
        path.push({
          order: order++,
          topic: `${context.examTarget} Preparation Strategy`,
          priority: 'medium',
          reason: `Targeted preparation for ${context.examTarget}`,
          estimatedTime: '2-3 hours',
          resources: ['Previous year papers', 'Mock tests', 'Important formulas'],
        });
      }
    }

    if (path.length < 3 && developmentNeeded.length > 0) {
      for (const level of developmentNeeded.slice(0, 2)) {
        if (!path.find(p => p.topic.includes(level))) {
          path.push({
            order: order++,
            topic: `${level.charAt(0).toUpperCase() + level.slice(1)} Skills Development`,
            priority: 'low',
            reason: `Strengthen ${level}-level thinking skills`,
            estimatedTime: '1 hour',
            resources: ['Targeted practice', 'Concept maps', 'Self-assessment'],
          });
        }
      }
    }

    return path;
  }

  private generateQuestion(
    topic: string,
    subject: string,
    cognitiveLevel: DifficultyCognitive,
    difficulty: number
  ): Question {
    const id = `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      text: `[${cognitiveLevel.toUpperCase()}] Question about ${topic}`,
      type: 'mcq',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: `This tests ${cognitiveLevel} level understanding of ${topic}`,
      topic,
      subject,
      difficulty,
      cognitiveLevel,
      marks: Math.ceil(difficulty * 4),
      timeLimit: Math.ceil(difficulty * 120),
    };
  }

  private shuffleQuestions(questions: Question[]): Question[] {
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getMostFrequent<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    let maxCount = 0;
    let maxItem = arr[0];

    for (const item of arr) {
      const count = (counts.get(item) || 0) + 1;
      counts.set(item, count);
      if (count > maxCount) {
        maxCount = count;
        maxItem = item;
      }
    }

    return maxItem;
  }

  async updateMasteryFromAssessment(
    userId: string,
    report: DiagnosticReport
  ): Promise<void> {
    try {
      for (const topic of report.strengthTopics) {
        const blendedMastery = topic.accuracy * 0.7 + 0.3;
        await this.upsertTopicMastery(userId, report.subject, topic.topic, blendedMastery, topic.questionsAttempted);
      }

      for (const topic of report.weaknessTopics) {
        const blendedMastery = topic.accuracy * 0.8;
        await this.upsertTopicMastery(userId, report.subject, topic.topic, blendedMastery, topic.questionsAttempted);
      }

      for (const misconception of report.misconceptionsDetected) {
        await this.recordMisconception(userId, misconception.topic, misconception.description);
      }

      console.log(`[ASSESSMENT] Updated mastery for ${report.strengthTopics.length + report.weaknessTopics.length} topics`);
    } catch (error) {
      console.error('[ASSESSMENT] Failed to update mastery:', error);
    }
  }

  private async upsertTopicMastery(
    userId: string,
    subject: string,
    topic: string,
    newMastery: number,
    attempts: number
  ): Promise<void> {
    const clampedMastery = Math.min(1, Math.max(0, newMastery));
    
    try {
      const existing = await db.select()
        .from(studentTopicMastery)
        .where(and(
          eq(studentTopicMastery.userId, userId),
          eq(studentTopicMastery.topicId, topic)
        ))
        .limit(1);

      if (existing.length > 0) {
        const current = existing[0];
        const currentScore = current.masteryScore ?? 0;
        const smoothedScore = currentScore * 0.3 + clampedMastery * 0.7;
        
        await db.update(studentTopicMastery)
          .set({
            masteryScore: smoothedScore,
            totalAttempts: (current.totalAttempts ?? 0) + attempts,
            lastPracticed: new Date(),
            practiceCount: (current.practiceCount ?? 0) + 1,
            updatedAt: new Date(),
          })
          .where(and(
            eq(studentTopicMastery.userId, userId),
            eq(studentTopicMastery.topicId, topic)
          ));
      } else {
        await db.insert(studentTopicMastery)
          .values({
            userId,
            topicId: topic,
            masteryScore: clampedMastery,
            totalAttempts: attempts,
            correctAttempts: Math.round(attempts * clampedMastery),
            lastPracticed: new Date(),
            practiceCount: 1,
            confidenceLevel: clampedMastery > 0.7 ? 'high' : clampedMastery > 0.4 ? 'medium' : 'low',
          });
      }
    } catch (error) {
      console.error('[ASSESSMENT] Failed to upsert topic mastery:', error);
    }
  }

  private async recordMisconception(userId: string, topic: string, description: string): Promise<void> {
    try {
      const existing = await db.select()
        .from(studentTopicMastery)
        .where(and(
          eq(studentTopicMastery.userId, userId),
          eq(studentTopicMastery.topicId, topic)
        ))
        .limit(1);

      if (existing.length > 0) {
        const current = existing[0];
        const currentMisconceptions = (current.misconceptions as string[]) || [];
        if (!currentMisconceptions.includes(description)) {
          currentMisconceptions.push(description);
          await db.update(studentTopicMastery)
            .set({
              misconceptions: currentMisconceptions,
              updatedAt: new Date(),
            })
            .where(and(
              eq(studentTopicMastery.userId, userId),
              eq(studentTopicMastery.topicId, topic)
            ));
        }
      }
    } catch (error) {
      console.error('[ASSESSMENT] Failed to record misconception:', error);
    }
  }

  generateReportSummary(report: DiagnosticReport): string {
    const parts: string[] = [];

    parts.push(`## Assessment Summary for ${report.subject}`);
    parts.push(`Overall Score: ${Math.round(report.overallScore * 100)}%`);
    parts.push(`Mastery Level: ${Math.round(report.masteryLevel * 100)}%`);
    parts.push('');

    if (report.strengthTopics.length > 0) {
      parts.push('### Strong Areas:');
      for (const topic of report.strengthTopics.slice(0, 3)) {
        parts.push(`- ${topic.topic}: ${Math.round(topic.accuracy * 100)}%`);
      }
      parts.push('');
    }

    if (report.weaknessTopics.length > 0) {
      parts.push('### Areas for Improvement:');
      for (const topic of report.weaknessTopics.slice(0, 3)) {
        parts.push(`- ${topic.topic}: ${Math.round(topic.accuracy * 100)}%`);
      }
      parts.push('');
    }

    if (report.misconceptionsDetected.length > 0) {
      parts.push('### Misconceptions Detected:');
      for (const misconception of report.misconceptionsDetected.slice(0, 3)) {
        parts.push(`- ${misconception.topic}: ${misconception.description}`);
      }
      parts.push('');
    }

    if (report.learningPath.length > 0) {
      parts.push('### Recommended Learning Path:');
      for (const step of report.learningPath.slice(0, 5)) {
        parts.push(`${step.order}. ${step.topic} (${step.priority} priority)`);
        parts.push(`   Reason: ${step.reason}`);
        parts.push(`   Time: ${step.estimatedTime}`);
      }
    }

    return parts.join('\n');
  }
}

export const assessmentService = new AssessmentService();
