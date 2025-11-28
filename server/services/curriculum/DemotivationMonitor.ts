import type {
  SubjectCode,
  DemotivationSignal,
  SessionMetrics,
} from '@shared/schema';

const NEGATIVE_PHRASES = [
  'nahi samajh',
  'samajh nahi aa raha',
  'bahut mushkil',
  'give up',
  "can't do",
  'too hard',
  'mushkil hai',
  'nahi ho raha',
  'leave it',
  'chhod do',
  'impossible',
  'never understand',
  'i quit',
  'fed up',
  'bore ho gaya',
  'kuch samajh nahi',
  'dimag kharab',
  'frustrated',
  'hate this',
  'worst topic',
  'bohot difficult',
];

const THRESHOLDS = {
  consecutiveWrongAnswers: 2,
  responseLatency: 45000,
  minimalMessageLength: 15,
  consecutiveMinimalMessages: 3,
  negativeSentiment: -0.4,
};

const EMPATHY_MESSAGES: Record<SubjectCode, string[]> = {
  physics: [
    'Koi baat nahi, Physics mein yeh concept thoda tricky hai. Let\'s try a different approach...',
    'It\'s okay! Physics problems can be challenging. Hum ise alag tarike se dekhte hain...',
    'Don\'t worry! Even the best students find this difficult at first. Let me simplify it...',
  ],
  chemistry: [
    'Chemistry mein yeh reactions thode confusing ho sakte hain. Let\'s break it down...',
    'Koi baat nahi, is concept ko samajhne mein time lagta hai. Try karte hain differently...',
    'It\'s completely normal to struggle here. Let me explain it step by step...',
  ],
  math: [
    'Math problems practice se clear hote hain. Ek aur try karte hain, easier way se...',
    'Don\'t give up! Yeh problem type thoda tricky hai. Let me show you a simpler method...',
    'Koi baat nahi, practice makes perfect. Let\'s approach this differently...',
  ],
  biology: [
    'Biology mein itna yaad rakhna thoda overwhelming lag sakta hai. Let\'s organize it...',
    'It\'s okay! Yeh topic complex hai. Hum ise smaller parts mein break karenge...',
    'Don\'t worry, understanding takes time. Let me make it more relatable...',
  ],
};

const EASIER_SUBPROBLEM_TEMPLATES: Record<SubjectCode, string[]> = {
  physics: [
    'Let\'s start with something simpler. Pehle hum sirf ek force consider karenge...',
    'Okay, let\'s break this down. First, let\'s just find the initial velocity...',
    'Simpler step se shuru karte hain: What happens if we ignore friction for now?',
  ],
  chemistry: [
    'Chalo pehle sirf ek reaction dekh lete hain, phir baaki add karenge...',
    'Let\'s simplify: First, just balance the atoms on one side...',
    'Easier approach: Pehle identify karo what type of reaction this is...',
  ],
  math: [
    'Let\'s make it easier. Pehle sirf first two steps try karo...',
    'Simpler version: What if we substitute x = 1 first to understand the pattern?',
    'Baby steps! First, just simplify the left side of the equation...',
  ],
  biology: [
    'Let\'s focus on just one part first. Pehle sirf structure samajh lete hain...',
    'Easier approach: Instead of the whole pathway, let\'s understand just the first step...',
    'One thing at a time! First, let\'s just remember the names...',
  ],
};

const BREAK_SUGGESTION = `Let's take a quick 2-minute break. Your brain needs a moment to process!

Try this breathing exercise:
1. Breathe in slowly for 4 counts... 1... 2... 3... 4...
2. Hold for 4 counts... 1... 2... 3... 4...
3. Breathe out slowly for 4 counts... 1... 2... 3... 4...

Repeat this 3 times. It really helps with focus and reduces stress!

When you're ready, we'll come back with fresh energy. There's no rush - learning is a journey, not a race!`;

export class DemotivationMonitor {
  checkSignals(metrics: SessionMetrics, latestMessage: string): DemotivationSignal[] {
    const signals: DemotivationSignal[] = [];

    if (metrics.consecutiveWrongAnswers >= THRESHOLDS.consecutiveWrongAnswers) {
      signals.push({
        type: 'consecutive_wrong',
        threshold: THRESHOLDS.consecutiveWrongAnswers,
        detected: true,
        value: metrics.consecutiveWrongAnswers,
      });
    }

    if (metrics.averageResponseLatency > THRESHOLDS.responseLatency) {
      signals.push({
        type: 'slow_response',
        threshold: THRESHOLDS.responseLatency,
        detected: true,
        value: metrics.averageResponseLatency,
      });
    }

    const recentShortMessages = metrics.recentMessageLengths
      .slice(-THRESHOLDS.consecutiveMinimalMessages)
      .filter(len => len < THRESHOLDS.minimalMessageLength);
    
    if (recentShortMessages.length >= THRESHOLDS.consecutiveMinimalMessages) {
      signals.push({
        type: 'minimal_text',
        threshold: THRESHOLDS.minimalMessageLength,
        detected: true,
        value: Math.min(...recentShortMessages),
      });
    }

    const recentSentiment = metrics.sentimentScores.slice(-3);
    const avgSentiment = recentSentiment.length > 0
      ? recentSentiment.reduce((a, b) => a + b, 0) / recentSentiment.length
      : 0;
    
    if (avgSentiment <= THRESHOLDS.negativeSentiment) {
      signals.push({
        type: 'negative_sentiment',
        threshold: THRESHOLDS.negativeSentiment,
        detected: true,
        value: avgSentiment,
      });
    }

    if (this.detectNegativePhrases(latestMessage)) {
      signals.push({
        type: 'negative_phrase',
        threshold: 1,
        detected: true,
        value: 1,
      });
    }

    return signals;
  }

  needsIntervention(signals: DemotivationSignal[]): boolean {
    if (signals.length === 0) return false;

    const detectedSignals = signals.filter(s => s.detected);
    if (detectedSignals.length >= 2) return true;

    const criticalSignals = detectedSignals.filter(
      s => s.type === 'negative_phrase' || s.type === 'negative_sentiment'
    );
    if (criticalSignals.length > 0) return true;

    const frustrationSignal = detectedSignals.find(s => s.type === 'consecutive_wrong');
    if (frustrationSignal && (frustrationSignal.value || 0) >= 3) return true;

    return false;
  }

  getIntervention(level: 1 | 2 | 3, subject: SubjectCode): string {
    switch (level) {
      case 1:
        return this.getEmpathyMessage(subject);
      case 2:
        return this.getEasierSubproblem(subject);
      case 3:
        return BREAK_SUGGESTION;
      default:
        return this.getEmpathyMessage(subject);
    }
  }

  determineInterventionLevel(signals: DemotivationSignal[], metrics: SessionMetrics): 1 | 2 | 3 {
    const detectedCount = signals.filter(s => s.detected).length;

    if (metrics.demotivationEvents >= 3 || detectedCount >= 3) {
      return 3;
    }

    if (metrics.demotivationEvents >= 2 || detectedCount >= 2) {
      return 2;
    }

    return 1;
  }

  updateMetrics(
    metrics: SessionMetrics,
    isCorrect: boolean,
    responseTime: number,
    messageLength: number,
    sentimentScore?: number
  ): SessionMetrics {
    const updated = { ...metrics };

    if (isCorrect) {
      updated.consecutiveWrongAnswers = 0;
    } else {
      updated.consecutiveWrongAnswers++;
    }

    const recentLatencies = [responseTime];
    updated.averageResponseLatency = responseTime;

    updated.recentMessageLengths = [
      ...metrics.recentMessageLengths.slice(-4),
      messageLength,
    ];

    if (sentimentScore !== undefined) {
      updated.sentimentScores = [
        ...metrics.sentimentScores.slice(-4),
        sentimentScore,
      ];
    }

    return updated;
  }

  detectNegativePhrases(text: string): boolean {
    const normalizedText = text.toLowerCase().trim();
    
    return NEGATIVE_PHRASES.some(phrase => 
      normalizedText.includes(phrase.toLowerCase())
    );
  }

  private getEmpathyMessage(subject: SubjectCode): string {
    const messages = EMPATHY_MESSAGES[subject];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getEasierSubproblem(subject: SubjectCode): string {
    const templates = EASIER_SUBPROBLEM_TEMPLATES[subject];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  createInitialMetrics(): SessionMetrics {
    return {
      consecutiveWrongAnswers: 0,
      averageResponseLatency: 0,
      recentMessageLengths: [],
      sentimentScores: [],
      demotivationEvents: 0,
      interventionSuccessRate: 0,
      timeToRecovery: undefined,
    };
  }

  recordDemotivationEvent(metrics: SessionMetrics): SessionMetrics {
    return {
      ...metrics,
      demotivationEvents: metrics.demotivationEvents + 1,
    };
  }

  recordRecovery(
    metrics: SessionMetrics,
    timeSinceIntervention: number,
    wasSuccessful: boolean
  ): SessionMetrics {
    const totalInterventions = metrics.demotivationEvents;
    const previousSuccesses = metrics.interventionSuccessRate * (totalInterventions - 1);
    
    return {
      ...metrics,
      interventionSuccessRate: (previousSuccesses + (wasSuccessful ? 1 : 0)) / totalInterventions,
      timeToRecovery: wasSuccessful ? timeSinceIntervention : metrics.timeToRecovery,
    };
  }

  getSignalSummary(signals: DemotivationSignal[]): string {
    const detected = signals.filter(s => s.detected);
    if (detected.length === 0) return 'No demotivation signals detected';

    const summaries = detected.map(s => {
      switch (s.type) {
        case 'consecutive_wrong':
          return `${s.value} consecutive wrong answers`;
        case 'slow_response':
          return `slow response time (${Math.round((s.value || 0) / 1000)}s)`;
        case 'minimal_text':
          return `short messages detected`;
        case 'negative_sentiment':
          return `negative sentiment detected`;
        case 'negative_phrase':
          return `demotivation phrases detected`;
        default:
          return `unknown signal`;
      }
    });

    return `Detected: ${summaries.join(', ')}`;
  }

  getThresholds(): typeof THRESHOLDS {
    return { ...THRESHOLDS };
  }

  getNegativePhrases(): string[] {
    return [...NEGATIVE_PHRASES];
  }
}

export const demotivationMonitor = new DemotivationMonitor();
