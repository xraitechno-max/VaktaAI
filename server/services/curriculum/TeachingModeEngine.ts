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
}

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
  decide(context: TeachingModeContext): TeachingModeDecision {
    const mode = this.determineMode(context);
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
    const baseDecision = this.decide(context);
    
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

    return baseDecision;
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

  private determineMode(context: TeachingModeContext): TeachingMode {
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
      return 'revision_mode';
    }

    if (frustrationCount >= 3 && emotion === 'frustrated') {
      return 'metacognitive';
    }

    if (frustrationCount >= 2 && emotion === 'frustrated') {
      return 'scaffolded_direct';
    }

    if (recentAttempts >= 4) {
      return 'worked_example';
    }

    if (recentAttempts >= 3) {
      return 'scaffolded_direct';
    }

    if (prerequisiteStatus === 'missing') {
      return 'scaffolded_direct';
    }

    if (masteryScore < 0.3 && emotion === 'confused') {
      return 'analogical';
    }

    if (masteryScore > 0.75) {
      if (emotion === 'bored') {
        return 'case_study';
      }
      return 'direct';
    }

    if (requestType === 'practice') {
      return 'worked_example';
    }

    if (masteryScore >= 0.6 && masteryScore <= 0.85 && emotion === 'confident') {
      return 'elaborative';
    }

    if (masteryScore >= 0.4 && masteryScore <= 0.75 && emotion !== 'frustrated') {
      return 'socratic';
    }

    if (emotion === 'bored' && masteryScore >= 0.5) {
      return 'case_study';
    }

    return 'direct';
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
