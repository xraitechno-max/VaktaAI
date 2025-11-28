import type {
  TeachingMode,
  TeachingModeContext,
  TeachingModeDecision,
  HintLevel,
  EmotionalState,
} from '@shared/schema';

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
      return 'direct';
    }

    if (frustrationCount >= 2 && emotion === 'frustrated') {
      return 'supportive';
    }

    if (recentAttempts >= 3) {
      return 'scaffolded_direct';
    }

    if (prerequisiteStatus === 'missing') {
      return 'scaffolded_direct';
    }

    if (masteryScore > 0.75) {
      return 'direct';
    }

    if (requestType === 'practice') {
      return 'worked_example';
    }

    if (masteryScore >= 0.4 && masteryScore <= 0.75 && emotion !== 'frustrated') {
      return 'socratic';
    }

    return 'direct';
  }

  private getNextHintLevel(mode: TeachingMode, currentLevel: HintLevel): HintLevel {
    const maxLevelByMode: Record<TeachingMode, HintLevel> = {
      socratic: 3,
      direct: 6,
      scaffolded_direct: 6,
      supportive: 6,
      worked_example: 6,
    };

    const entryLevelByMode: Record<TeachingMode, HintLevel> = {
      socratic: 1,
      direct: 6,
      scaffolded_direct: 3,
      supportive: 4,
      worked_example: 5,
    };

    const maxLevel = maxLevelByMode[mode];
    const entryLevel = entryLevelByMode[mode];

    if (currentLevel < entryLevel) {
      return entryLevel;
    }

    if (currentLevel >= maxLevel) {
      return maxLevel;
    }

    return Math.min(currentLevel + 1, maxLevel) as HintLevel;
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

    switch (mode) {
      case 'direct':
        if (requestType === 'revision') {
          return 'Direct mode selected: Student is revising, needs quick refresher';
        }
        if (timePressure) {
          return 'Direct mode selected: Time pressure detected, providing efficient explanation';
        }
        if (masteryScore > 0.75) {
          return 'Direct mode selected: High mastery score indicates solid understanding';
        }
        return 'Direct mode selected: Default approach for clear explanation';

      case 'supportive':
        return `Supportive mode selected: Student showing signs of frustration (count: ${frustrationCount}, emotion: ${emotion})`;

      case 'scaffolded_direct':
        if (recentAttempts >= 3) {
          return `Scaffolded direct mode selected: Student has made ${recentAttempts} recent attempts, needs structured guidance`;
        }
        if (prerequisiteStatus === 'missing') {
          return 'Scaffolded direct mode selected: Missing prerequisites detected, building foundation first';
        }
        return 'Scaffolded direct mode selected: Providing step-by-step guidance';

      case 'worked_example':
        return 'Worked example mode selected: Practice request - showing similar solved problem';

      case 'socratic':
        return `Socratic mode selected: Mastery score (${(masteryScore * 100).toFixed(0)}%) suggests guided discovery approach`;

      default:
        return 'Default teaching mode applied';
    }
  }

  getModeDescription(mode: TeachingMode): string {
    const descriptions: Record<TeachingMode, string> = {
      socratic: 'Guided discovery through questions (uses hints L1-L3)',
      direct: 'Clear, efficient explanation with full solution',
      scaffolded_direct: 'Step-by-step guidance starting from L3',
      supportive: 'Encouraging approach with extra support and patience',
      worked_example: 'Learn by example - showing similar solved problems',
    };
    return descriptions[mode];
  }

  getRecommendedHintRange(mode: TeachingMode): { min: HintLevel; max: HintLevel } {
    const ranges: Record<TeachingMode, { min: HintLevel; max: HintLevel }> = {
      socratic: { min: 1, max: 3 },
      direct: { min: 6, max: 6 },
      scaffolded_direct: { min: 3, max: 6 },
      supportive: { min: 4, max: 6 },
      worked_example: { min: 5, max: 6 },
    };
    return ranges[mode];
  }
}

export const teachingModeEngine = new TeachingModeEngine();
