import type {
  TeachingMode,
  TeachingModeContext,
  TeachingModeDecision,
  HintLevel,
} from '@shared/schema';

interface ExtendedContext extends TeachingModeContext {
  sessionDuration?: number;
  topicDifficulty?: number;
  learningVelocity?: 'fast' | 'steady' | 'slow';
  lastSessionGap?: number;
  preferredStyle?: TeachingMode;
  subject?: string;
  classLevel?: number;
  examTarget?: 'JEE' | 'JEE_Advanced' | 'NEET' | 'Boards' | 'Foundation';
}

const SUBJECT_STRATEGY_PREFERENCES: Record<string, TeachingMode[]> = {
  physics: ['worked_example', 'analogical', 'case_study', 'elaborative'],
  chemistry: ['worked_example', 'analogical', 'direct', 'spaced_retrieval'],
  math: ['worked_example', 'scaffolded_direct', 'socratic', 'elaborative'],
  biology: ['elaborative', 'spaced_retrieval', 'case_study', 'analogical'],
  english: ['elaborative', 'case_study', 'socratic', 'direct'],
  hindi: ['elaborative', 'direct', 'socratic', 'case_study'],
  history: ['case_study', 'elaborative', 'spaced_retrieval', 'analogical'],
  geography: ['case_study', 'analogical', 'elaborative', 'direct'],
  economics: ['case_study', 'worked_example', 'analogical', 'elaborative'],
  computer: ['worked_example', 'direct', 'case_study', 'scaffolded_direct'],
};

const EXAM_STRATEGY_PREFERENCES: Record<string, TeachingMode[]> = {
  JEE: ['worked_example', 'case_study', 'elaborative', 'spaced_retrieval'],
  JEE_Advanced: ['elaborative', 'socratic', 'worked_example', 'case_study'],
  NEET: ['worked_example', 'spaced_retrieval', 'case_study', 'direct'],
  Boards: ['revision_mode', 'direct', 'worked_example', 'spaced_retrieval'],
  Foundation: ['scaffolded_direct', 'analogical', 'worked_example', 'socratic'],
};

const CLASS_STRATEGY_ADJUSTMENTS: Record<string, TeachingMode[]> = {
  foundation: ['analogical', 'scaffolded_direct', 'worked_example', 'socratic'],
  bridge: ['worked_example', 'scaffolded_direct', 'socratic', 'analogical'],
  board: ['revision_mode', 'worked_example', 'direct', 'spaced_retrieval'],
  competitive: ['elaborative', 'case_study', 'worked_example', 'socratic'],
  dropper: ['spaced_retrieval', 'revision_mode', 'worked_example', 'elaborative'],
};

interface StrategyMetadata {
  name: string;
  description: string;
  idealMasteryRange: [number, number];
  entryHintLevel: HintLevel;
  maxHintLevel: HintLevel;
  emotionSuitability: string[];
  bestFor: string[];
}

const STRATEGY_METADATA: Record<TeachingMode, StrategyMetadata> = {
  socratic: {
    name: 'Socratic Method',
    description: 'Guided discovery through probing questions',
    idealMasteryRange: [0.4, 0.75],
    entryHintLevel: 1,
    maxHintLevel: 3,
    emotionSuitability: ['confident', 'neutral'],
    bestFor: ['conceptual understanding', 'critical thinking'],
  },
  direct: {
    name: 'Direct Instruction',
    description: 'Clear, efficient explanation with full solution',
    idealMasteryRange: [0.7, 1.0],
    entryHintLevel: 6,
    maxHintLevel: 8,
    emotionSuitability: ['confident', 'neutral', 'bored'],
    bestFor: ['time pressure', 'high mastery', 'quick clarification'],
  },
  scaffolded_direct: {
    name: 'Scaffolded Direct',
    description: 'Step-by-step structured guidance with checkpoints',
    idealMasteryRange: [0.2, 0.5],
    entryHintLevel: 3,
    maxHintLevel: 8,
    emotionSuitability: ['confused', 'frustrated', 'neutral'],
    bestFor: ['struggling students', 'missing prerequisites', 'complex topics'],
  },
  revision_mode: {
    name: 'Revision Mode',
    description: 'Quick review focusing on formulas and exam tips',
    idealMasteryRange: [0.5, 0.9],
    entryHintLevel: 4,
    maxHintLevel: 6,
    emotionSuitability: ['confident', 'neutral'],
    bestFor: ['exam prep', 'time pressure', 'refresher'],
  },
  worked_example: {
    name: 'Worked Example',
    description: 'Learn by studying solved problems step-by-step',
    idealMasteryRange: [0.3, 0.6],
    entryHintLevel: 5,
    maxHintLevel: 8,
    emotionSuitability: ['confused', 'neutral'],
    bestFor: ['practice', 'procedural learning', 'problem-solving'],
  },
  analogical: {
    name: 'Analogical Teaching',
    description: 'Explain concepts using relatable real-world analogies',
    idealMasteryRange: [0.2, 0.6],
    entryHintLevel: 2,
    maxHintLevel: 5,
    emotionSuitability: ['confused', 'bored', 'neutral'],
    bestFor: ['abstract concepts', 'building intuition', 'engagement'],
  },
  case_study: {
    name: 'Case Study Method',
    description: 'Learn through real-world application examples',
    idealMasteryRange: [0.5, 0.8],
    entryHintLevel: 4,
    maxHintLevel: 7,
    emotionSuitability: ['confident', 'bored', 'neutral'],
    bestFor: ['application skills', 'JEE/NEET problems', 'connecting theory to practice'],
  },
  spaced_retrieval: {
    name: 'Spaced Retrieval Practice',
    description: 'Active recall with strategic spacing for retention',
    idealMasteryRange: [0.4, 0.8],
    entryHintLevel: 2,
    maxHintLevel: 5,
    emotionSuitability: ['confident', 'neutral'],
    bestFor: ['long-term retention', 'formula memorization', 'review sessions'],
  },
  elaborative: {
    name: 'Elaborative Interrogation',
    description: 'Deep learning through "why" and "how" questioning',
    idealMasteryRange: [0.5, 0.85],
    entryHintLevel: 1,
    maxHintLevel: 4,
    emotionSuitability: ['confident', 'neutral'],
    bestFor: ['deep understanding', 'connecting concepts', 'advanced learners'],
  },
  metacognitive: {
    name: 'Metacognitive Coaching',
    description: 'Teaching students to monitor and reflect on their learning',
    idealMasteryRange: [0.3, 0.7],
    entryHintLevel: 2,
    maxHintLevel: 5,
    emotionSuitability: ['confused', 'frustrated', 'neutral'],
    bestFor: ['self-regulation', 'study skills', 'persistent struggles'],
  },
};

export class TeachingModeEngine {
  private preferenceCache = new Map<string, Map<TeachingMode, number>>();

  decide(context: TeachingModeContext): TeachingModeDecision {
    const { mode, isHardRule } = this.determineModeWithRuleType(context);
    const toneMod = this.selectToneModifier(context);
    const nextHintLevel = this.getNextHintLevel(mode, context.lastHintLevel);
    const rationale = this.generateRationale(mode, context);

    return {
      mode,
      rationale,
      nextHintLevel,
      toneMod,
    };
  }

  decideWithExtendedContext(context: ExtendedContext): TeachingModeDecision {
    const { mode: baseMode, isHardRule } = this.determineModeWithRuleType(context);
    const toneMod = this.selectToneModifier(context);
    const nextHintLevel = this.getNextHintLevel(baseMode, context.lastHintLevel);
    const baseRationale = this.generateRationale(baseMode, context);
    
    const baseDecision: TeachingModeDecision = {
      mode: baseMode,
      rationale: baseRationale,
      nextHintLevel,
      toneMod,
    };
    
    if (isHardRule) {
      return baseDecision;
    }
    
    if (context.preferredStyle && this.isStyleSuitable(context.preferredStyle, context)) {
      return {
        ...baseDecision,
        mode: context.preferredStyle,
        rationale: `Using preferred style: ${this.getModeDescription(context.preferredStyle)}`,
      };
    }

    if (context.lastSessionGap && context.lastSessionGap > 7) {
      if (context.masteryScore >= 0.4) {
        return {
          ...baseDecision,
          mode: 'spaced_retrieval',
          rationale: `Spaced retrieval selected: ${context.lastSessionGap} days since last session, testing retention`,
        };
      }
    }

    if (context.learningVelocity === 'slow' && context.emotion !== 'frustrated') {
      return {
        ...baseDecision,
        mode: 'metacognitive',
        rationale: 'Metacognitive coaching: Helping student reflect on learning strategies',
      };
    }

    const suitableStrategies = this.getSuitableStrategies(context);
    if (suitableStrategies.length > 1 && (context.subject || context.examTarget || context.classLevel)) {
      const result = this.selectWithWeightedPreferences(
        suitableStrategies,
        baseMode,
        context.subject,
        context.examTarget,
        this.getClassCategory(context.classLevel)
      );
      
      if (result && result.mode !== baseMode && result.hasPreferenceData) {
        return {
          ...baseDecision,
          mode: result.mode,
          rationale: this.generatePreferenceRationale(result.mode, context),
        };
      }
    }

    return baseDecision;
  }

  private determineModeWithRuleType(context: TeachingModeContext): { mode: TeachingMode; isHardRule: boolean } {
    const {
      requestType,
      timePressure,
      frustrationCount,
      emotion,
      recentAttempts,
      prerequisiteStatus,
      masteryScore,
    } = context;

    if (requestType === 'revision' || timePressure === true) {
      return { mode: 'revision_mode', isHardRule: true };
    }

    if (frustrationCount >= 3 && emotion === 'frustrated') {
      return { mode: 'metacognitive', isHardRule: true };
    }

    if (frustrationCount >= 2 && emotion === 'frustrated') {
      return { mode: 'scaffolded_direct', isHardRule: true };
    }

    if (recentAttempts >= 4) {
      return { mode: 'worked_example', isHardRule: true };
    }

    if (recentAttempts >= 3) {
      return { mode: 'scaffolded_direct', isHardRule: true };
    }

    if (prerequisiteStatus === 'missing') {
      return { mode: 'scaffolded_direct', isHardRule: true };
    }

    if (masteryScore < 0.3 && emotion === 'confused') {
      return { mode: 'analogical', isHardRule: false };
    }

    if (masteryScore > 0.75) {
      if (emotion === 'bored') {
        return { mode: 'case_study', isHardRule: false };
      }
      return { mode: 'direct', isHardRule: false };
    }

    if (requestType === 'practice') {
      return { mode: 'worked_example', isHardRule: false };
    }

    if (masteryScore >= 0.6 && masteryScore <= 0.85 && emotion === 'confident') {
      return { mode: 'elaborative', isHardRule: false };
    }

    if (masteryScore >= 0.4 && masteryScore <= 0.75 && emotion !== 'frustrated') {
      return { mode: 'socratic', isHardRule: false };
    }

    if (emotion === 'bored' && masteryScore >= 0.5) {
      return { mode: 'case_study', isHardRule: false };
    }

    return { mode: 'direct', isHardRule: false };
  }

  private selectWithWeightedPreferences(
    suitableStrategies: TeachingMode[],
    baseMode: TeachingMode,
    subject?: string,
    examTarget?: string,
    classCategory?: string
  ): { mode: TeachingMode; hasPreferenceData: boolean } | null {
    const cacheKey = `${subject || ''}_${examTarget || ''}_${classCategory || ''}`;
    
    let scores = this.preferenceCache.get(cacheKey);
    if (!scores) {
      scores = this.computePreferenceScores(subject, examTarget, classCategory);
      this.preferenceCache.set(cacheKey, scores);
    }

    const hasPreferenceData = Array.from(scores.values()).some(score => score > 0);
    
    if (!hasPreferenceData) {
      return null;
    }

    const baseScore = scores.get(baseMode) || 0;
    
    let bestMode = baseMode;
    let bestScore = baseScore;
    
    for (const mode of suitableStrategies) {
      const modeScore = scores.get(mode) || 0;
      if (modeScore > bestScore) {
        bestMode = mode;
        bestScore = modeScore;
      }
    }

    return { mode: bestMode, hasPreferenceData };
  }

  private computePreferenceScores(
    subject?: string,
    examTarget?: string,
    classCategory?: string
  ): Map<TeachingMode, number> {
    const scores = new Map<TeachingMode, number>();
    const allModes: TeachingMode[] = Object.keys(STRATEGY_METADATA) as TeachingMode[];
    
    allModes.forEach(mode => scores.set(mode, 0));

    if (subject) {
      const normalizedSubject = subject.toLowerCase();
      const subjectPrefs = SUBJECT_STRATEGY_PREFERENCES[normalizedSubject];
      if (subjectPrefs) {
        subjectPrefs.forEach((mode, index) => {
          const weight = (subjectPrefs.length - index) * 3;
          scores.set(mode, (scores.get(mode) || 0) + weight);
        });
      }
    }

    if (examTarget) {
      const examPrefs = EXAM_STRATEGY_PREFERENCES[examTarget];
      if (examPrefs) {
        examPrefs.forEach((mode, index) => {
          const weight = (examPrefs.length - index) * 2;
          scores.set(mode, (scores.get(mode) || 0) + weight);
        });
      }
    }

    if (classCategory) {
      const classPrefs = CLASS_STRATEGY_ADJUSTMENTS[classCategory];
      if (classPrefs) {
        classPrefs.forEach((mode, index) => {
          const weight = (classPrefs.length - index) * 1;
          scores.set(mode, (scores.get(mode) || 0) + weight);
        });
      }
    }

    return scores;
  }

  private getClassCategory(classLevel?: number): string | undefined {
    if (!classLevel) return undefined;
    
    if (classLevel <= 7) return 'foundation';
    if (classLevel <= 9) return 'bridge';
    if (classLevel === 10 || classLevel === 12) return 'board';
    if (classLevel === 11) return 'competitive';
    if (classLevel >= 13) return 'dropper';
    
    return undefined;
  }

  private generatePreferenceRationale(mode: TeachingMode, context: ExtendedContext): string {
    const metadata = STRATEGY_METADATA[mode];
    const modeName = metadata?.name || mode;
    
    const factors: string[] = [];
    
    if (context.subject) {
      const subjectPrefs = SUBJECT_STRATEGY_PREFERENCES[context.subject.toLowerCase()];
      if (subjectPrefs?.includes(mode)) {
        factors.push(`optimal for ${context.subject}`);
      }
    }
    
    if (context.examTarget) {
      const examPrefs = EXAM_STRATEGY_PREFERENCES[context.examTarget];
      if (examPrefs?.includes(mode)) {
        factors.push(`recommended for ${context.examTarget} preparation`);
      }
    }
    
    if (context.classLevel) {
      const classCategory = this.getClassCategory(context.classLevel);
      if (classCategory) {
        factors.push(`suited for Class ${context.classLevel}`);
      }
    }
    
    if (factors.length > 0) {
      return `${modeName}: ${factors.join(', ')}`;
    }
    
    return `${modeName} selected based on learning context`;
  }

  clearPreferenceCache(): void {
    this.preferenceCache.clear();
  }

  private isStyleSuitable(style: TeachingMode, context: TeachingModeContext): boolean {
    const metadata = STRATEGY_METADATA[style];
    if (!metadata) return false;

    const [minMastery, maxMastery] = metadata.idealMasteryRange;
    if (context.masteryScore < minMastery - 0.1 || context.masteryScore > maxMastery + 0.1) {
      return false;
    }

    if (!metadata.emotionSuitability.includes(context.emotion)) {
      return false;
    }

    return true;
  }

  private getNextHintLevel(mode: TeachingMode, currentLevel: HintLevel): HintLevel {
    const metadata = STRATEGY_METADATA[mode];
    if (!metadata) {
      return Math.min(currentLevel + 1, 8) as HintLevel;
    }

    const { entryHintLevel, maxHintLevel } = metadata;

    if (currentLevel < entryHintLevel) {
      return entryHintLevel;
    }

    if (currentLevel >= maxHintLevel) {
      return maxHintLevel;
    }

    return Math.min(currentLevel + 1, maxHintLevel) as HintLevel;
  }

  private selectToneModifier(context: TeachingModeContext): 'encouraging' | 'urgent' | 'calm' {
    const { emotion, masteryScore, timePressure } = context;

    if (timePressure) {
      return 'urgent';
    }

    if (emotion === 'frustrated' || masteryScore < 0.3) {
      return 'encouraging';
    }

    return 'calm';
  }

  private generateRationale(mode: TeachingMode, context: TeachingModeContext): string {
    const {
      requestType,
      timePressure,
      frustrationCount,
      emotion,
      recentAttempts,
      prerequisiteStatus,
      masteryScore,
    } = context;

    const metadata = STRATEGY_METADATA[mode];
    const modeName = metadata?.name || mode;

    switch (mode) {
      case 'direct':
        if (requestType === 'revision') {
          return `${modeName}: Student is revising, needs quick refresher`;
        }
        if (timePressure) {
          return `${modeName}: Time pressure detected, providing efficient explanation`;
        }
        if (masteryScore > 0.75) {
          return `${modeName}: High mastery (${(masteryScore * 100).toFixed(0)}%) indicates solid understanding`;
        }
        return `${modeName}: Default approach for clear explanation`;

      case 'revision_mode':
        return `${modeName}: Quick review focusing on key formulas and exam-relevant points`;

      case 'scaffolded_direct':
        if (recentAttempts >= 3) {
          return `${modeName}: ${recentAttempts} recent attempts, providing structured guidance`;
        }
        if (prerequisiteStatus === 'missing') {
          return `${modeName}: Missing prerequisites detected, building foundation first`;
        }
        if (emotion === 'frustrated') {
          return `${modeName}: Student frustrated, providing step-by-step support`;
        }
        return `${modeName}: Providing step-by-step guidance with checkpoints`;

      case 'worked_example':
        return `${modeName}: ${requestType === 'practice' ? 'Practice request' : 'Multiple attempts'} - showing similar solved problem`;

      case 'socratic':
        return `${modeName}: Mastery (${(masteryScore * 100).toFixed(0)}%) suggests guided discovery through questions`;

      case 'analogical':
        return `${modeName}: Using relatable analogies to build intuition for abstract concept`;

      case 'case_study':
        if (emotion === 'bored') {
          return `${modeName}: Student seems disengaged, using real-world application to spark interest`;
        }
        return `${modeName}: Connecting theory to real-world JEE/NEET applications`;

      case 'spaced_retrieval':
        return `${modeName}: Testing recall to strengthen long-term retention`;

      case 'elaborative':
        return `${modeName}: Deep exploration through "why" and "how" questioning for mastery (${(masteryScore * 100).toFixed(0)}%)`;

      case 'metacognitive':
        if (frustrationCount >= 3) {
          return `${modeName}: Persistent struggle detected - helping student reflect on learning approach`;
        }
        return `${modeName}: Teaching self-monitoring and reflection strategies`;

      default:
        return `${modeName} applied based on current context`;
    }
  }

  getModeDescription(mode: TeachingMode): string {
    const metadata = STRATEGY_METADATA[mode];
    return metadata?.description || 'Teaching mode';
  }

  getRecommendedHintRange(mode: TeachingMode): { min: HintLevel; max: HintLevel } {
    const metadata = STRATEGY_METADATA[mode];
    if (!metadata) {
      return { min: 1, max: 6 };
    }
    return {
      min: metadata.entryHintLevel,
      max: metadata.maxHintLevel,
    };
  }

  getStrategyMetadata(mode: TeachingMode): StrategyMetadata | undefined {
    return STRATEGY_METADATA[mode];
  }

  getAllStrategies(): Array<{ mode: TeachingMode; metadata: StrategyMetadata }> {
    return Object.entries(STRATEGY_METADATA).map(([mode, metadata]) => ({
      mode: mode as TeachingMode,
      metadata,
    }));
  }

  getSuitableStrategies(context: TeachingModeContext): TeachingMode[] {
    return Object.entries(STRATEGY_METADATA)
      .filter(([mode]) => this.isStyleSuitable(mode as TeachingMode, context))
      .map(([mode]) => mode as TeachingMode);
  }

  getStrategyForEmotion(emotion: string): TeachingMode[] {
    return Object.entries(STRATEGY_METADATA)
      .filter(([, metadata]) => metadata.emotionSuitability.includes(emotion))
      .map(([mode]) => mode as TeachingMode);
  }

  getStrategyForMastery(mastery: number): TeachingMode[] {
    return Object.entries(STRATEGY_METADATA)
      .filter(([, metadata]) => {
        const [min, max] = metadata.idealMasteryRange;
        return mastery >= min && mastery <= max;
      })
      .map(([mode]) => mode as TeachingMode);
  }
}

export const teachingModeEngine = new TeachingModeEngine();
