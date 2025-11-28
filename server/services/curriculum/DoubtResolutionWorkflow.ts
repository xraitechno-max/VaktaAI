import type {
  SubjectCode,
  CurriculumContext,
  RootCauseCategory,
  DoubtResolutionStep,
  DoubtWorkflowState,
  VerificationQuestion,
  PracticeProblem,
  ExamTarget,
} from '@shared/schema';
import { nanoid } from 'nanoid';

const DOUBT_RESOLUTION_STEPS: DoubtResolutionStep[] = [
  {
    id: 'acknowledge',
    actions: [
      'Validate the doubt',
      'Show empathy and understanding',
      'Normalize the confusion',
    ],
    promptTemplate: 'Yeh doubt bahut common hai, {studentName}. Let me help you understand {topic} step by step...',
  },
  {
    id: 'diagnose',
    actions: [
      'Identify root cause category',
      'Analyze prerequisite knowledge',
      'Detect misconceptions',
    ],
    promptTemplate: 'Let me understand where the confusion is coming from. Can you tell me what you understand about {relatedConcept}?',
  },
  {
    id: 'explain',
    actions: [
      'Address based on diagnosis',
      'Provide targeted explanation',
      'Use appropriate examples',
    ],
    promptTemplate: '{explanationContent}',
  },
  {
    id: 'verify',
    actions: [
      'Check understanding',
      'Ask verification question',
      'Confirm comprehension',
    ],
    promptTemplate: 'Ab check karte hain ki concept clear ho gaya ya nahi. {verificationQuestion}',
  },
  {
    id: 'consolidate',
    actions: [
      'Reinforce with practice',
      'Provide board-style question',
      'Offer competitive variant',
    ],
    promptTemplate: 'Great! Now let\'s practice with some questions to make this concept stick. {practiceProblems}',
  },
];

const ACKNOWLEDGMENT_TEMPLATES: Record<SubjectCode, string[]> = {
  physics: [
    'Yeh doubt bahut common hai Physics mein. Let me help you understand this concept clearly...',
    'Physics mein is type ke questions aksar confusing lagte hain. Let\'s break it down...',
    'Bahut students ko yeh concept tricky lagta hai. Don\'t worry, hum step by step samjhenge...',
  ],
  chemistry: [
    'Chemistry mein yeh topic thoda tricky hai, but we\'ll make it simple...',
    'Is concept pe doubt hona natural hai. Let me explain it in a clearer way...',
    'Yeh confusion bahut students ko hoti hai. Let\'s clear it together...',
  ],
  math: [
    'Math mein is type ke problems practice se clear hote hain. Let me guide you...',
    'Yeh ek common doubt hai. Let\'s understand the underlying concept first...',
    'Is problem type mein confusion normal hai. Hum step by step solve karenge...',
  ],
  biology: [
    'Biology mein yeh topic thoda complex hai, but we\'ll simplify it...',
    'Is concept pe doubt hona normal hai. Let me explain with examples...',
    'Bahut students ko yeh confusing lagta hai. Let\'s break it down...',
  ],
};

const EXPLANATION_STRATEGIES: Record<RootCauseCategory, {
  approach: string;
  hinglishTemplate: string;
}> = {
  prerequisite_gap: {
    approach: 'Quick revision of foundation concepts',
    hinglishTemplate: 'Pehle hum {prerequisite} ko quickly revise kar lete hain, phir {topic} samajhna easy ho jayega...',
  },
  terminology_confusion: {
    approach: 'Clear definition with examples',
    hinglishTemplate: 'Sabse pehle, let\'s be clear about what {term} actually means. {definition}. For example: {example}',
  },
  conceptual_misconception: {
    approach: 'Counter-example to break wrong mental model',
    hinglishTemplate: 'Interesting point! But actually yeh aise nahi work karta. Let me show you with an example: {counterExample}',
  },
  procedural_error: {
    approach: 'Step-by-step walkthrough',
    hinglishTemplate: 'Concept clear hai, bas approach mein thoda improvement chahiye. Let\'s go step by step: {steps}',
  },
};

const VERIFICATION_QUESTION_TEMPLATES: Record<RootCauseCategory, { type: VerificationQuestion['type']; template: string }> = {
  prerequisite_gap: {
    type: 'mcq',
    template: 'Ab check karte hain: {question}',
  },
  terminology_confusion: {
    type: 'mcq',
    template: 'Let\'s verify: {term} ka matlab hai...',
  },
  conceptual_misconception: {
    type: 'mcq',
    template: 'Based on what we discussed, {scenario}. What will happen?',
  },
  procedural_error: {
    type: 'fill_blank',
    template: 'Fill in the missing step: {stepSequence}',
  },
};

export class DoubtResolutionWorkflow {
  startWorkflow(
    doubt: string,
    subject: SubjectCode,
    context: CurriculumContext
  ): DoubtWorkflowState {
    return {
      doubt,
      subject,
      context,
      currentStep: 'acknowledge',
      stepIndex: 0,
      userResponses: {},
      isComplete: false,
      startedAt: new Date(),
    };
  }

  advanceStep(
    state: DoubtWorkflowState,
    userResponse?: string
  ): { step: DoubtResolutionStep; content: string; updatedState: DoubtWorkflowState } {
    const currentStepDef = DOUBT_RESOLUTION_STEPS[state.stepIndex];
    
    if (userResponse) {
      state.userResponses[state.currentStep] = userResponse;
    }

    let content = '';
    const updatedState = { ...state };

    switch (state.currentStep) {
      case 'acknowledge':
        content = this.generateAcknowledgment(state.subject, state.context.topic);
        updatedState.currentStep = 'diagnose';
        updatedState.stepIndex = 1;
        break;

      case 'diagnose':
        const prereqs = state.context.prerequisites.map(p => p.topic);
        updatedState.rootCause = this.diagnoseRootCause(state.doubt, prereqs);
        content = this.generateDiagnosisResponse(updatedState.rootCause, state.context);
        updatedState.currentStep = 'explain';
        updatedState.stepIndex = 2;
        break;

      case 'explain':
        content = this.generateExplanation(
          state.rootCause!,
          state.context.topic,
          state.subject
        );
        updatedState.explanation = content;
        updatedState.currentStep = 'verify';
        updatedState.stepIndex = 3;
        break;

      case 'verify':
        updatedState.verificationQuestion = this.generateVerificationQuestion(
          state.rootCause!,
          state.context.topic
        );
        content = this.formatVerificationQuestion(updatedState.verificationQuestion);
        updatedState.currentStep = 'consolidate';
        updatedState.stepIndex = 4;
        break;

      case 'consolidate':
        const examTarget = state.context.examRelevance?.examType || 'board-only';
        updatedState.practiceProblems = this.generatePracticeProblems(
          state.context.topic,
          examTarget
        );
        content = this.formatPracticeProblems(updatedState.practiceProblems);
        updatedState.isComplete = true;
        updatedState.completedAt = new Date();
        break;
    }

    return {
      step: DOUBT_RESOLUTION_STEPS[updatedState.stepIndex] || currentStepDef,
      content,
      updatedState,
    };
  }

  diagnoseRootCause(doubt: string, prereqs: string[]): RootCauseCategory {
    const normalizedDoubt = doubt.toLowerCase();

    const terminologyPatterns = [
      /what is|kya hai|meaning|matlab|define|definition/i,
      /difference between|antar|difference/i,
      /why is it called|naam kyun/i,
    ];

    const conceptualPatterns = [
      /why does|kyun hota|how come|but i thought/i,
      /doesn't make sense|samajh nahi|confused about/i,
      /contradiction|opposite|ulta/i,
    ];

    const proceduralPatterns = [
      /how to solve|kaise solve|steps|process|method/i,
      /getting wrong answer|galat aa raha|calculation/i,
      /where am i going wrong|mistake/i,
    ];

    const prerequisitePatterns = [
      /don't know|nahi pata|never learned|base se/i,
      /forgot|bhool gaya|basic|foundation/i,
    ];

    for (const pattern of prerequisitePatterns) {
      if (pattern.test(normalizedDoubt)) {
        return 'prerequisite_gap';
      }
    }

    for (const pattern of terminologyPatterns) {
      if (pattern.test(normalizedDoubt)) {
        return 'terminology_confusion';
      }
    }

    for (const pattern of conceptualPatterns) {
      if (pattern.test(normalizedDoubt)) {
        return 'conceptual_misconception';
      }
    }

    for (const pattern of proceduralPatterns) {
      if (pattern.test(normalizedDoubt)) {
        return 'procedural_error';
      }
    }

    const missingPrereqs = prereqs.some(p => 
      normalizedDoubt.includes(p.toLowerCase())
    );
    if (missingPrereqs) {
      return 'prerequisite_gap';
    }

    return 'conceptual_misconception';
  }

  generateVerificationQuestion(
    rootCause: RootCauseCategory,
    topic: string
  ): VerificationQuestion {
    const template = VERIFICATION_QUESTION_TEMPLATES[rootCause];
    
    const questionsByRootCause: Record<RootCauseCategory, () => VerificationQuestion> = {
      prerequisite_gap: () => ({
        id: nanoid(),
        type: 'mcq',
        question: `Which of the following is a prerequisite for understanding ${topic}?`,
        options: [
          `Basic understanding of related concepts`,
          `Advanced mathematical knowledge`,
          `No prerequisites needed`,
          `Only memorization required`,
        ],
        correctAnswer: 'Basic understanding of related concepts',
        hint: 'Think about what concepts you need to know before learning this topic.',
        explanation: 'Every topic builds on foundational concepts. Understanding these prerequisites makes learning new topics easier.',
        topic,
        rootCause,
      }),
      terminology_confusion: () => ({
        id: nanoid(),
        type: 'mcq',
        question: `Based on our discussion, what best describes ${topic}?`,
        options: [
          `The correct definition we discussed`,
          `A common misconception`,
          `An unrelated concept`,
          `None of the above`,
        ],
        correctAnswer: 'The correct definition we discussed',
        hint: 'Remember the key points from our explanation.',
        explanation: 'Clear terminology understanding is the foundation for deeper concept mastery.',
        topic,
        rootCause,
      }),
      conceptual_misconception: () => ({
        id: nanoid(),
        type: 'mcq',
        question: `After our discussion about ${topic}, which statement is correct?`,
        options: [
          `The corrected understanding`,
          `The original misconception`,
          `Both are correct`,
          `Neither is correct`,
        ],
        correctAnswer: 'The corrected understanding',
        hint: 'Think about the counter-example we discussed.',
        explanation: 'The counter-example helps break the wrong mental model and establish correct understanding.',
        topic,
        rootCause,
      }),
      procedural_error: () => ({
        id: nanoid(),
        type: 'fill_blank',
        question: `Complete the correct sequence for solving ${topic} problems: Step 1: Identify given values, Step 2: _____, Step 3: Apply formula, Step 4: Calculate answer`,
        correctAnswer: 'Select appropriate formula',
        hint: 'Think about what comes between identifying values and applying the formula.',
        explanation: 'The correct procedure ensures accurate problem-solving every time.',
        topic,
        rootCause,
      }),
    };

    return questionsByRootCause[rootCause]();
  }

  generatePracticeProblems(topic: string, examTarget: ExamTarget): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    problems.push({
      id: nanoid(),
      type: 'board',
      question: `[Board-style Question] Explain the concept of ${topic} with a suitable example. (3 marks)`,
      difficulty: 'medium',
      marks: 3,
      solution: `Step 1: Define ${topic}\nStep 2: Explain the underlying principle\nStep 3: Provide a real-world example\nStep 4: Show the application`,
      solutionGated: true,
      topic,
      hints: [
        'Start with a clear definition',
        'Use diagrams if applicable',
        'Connect to real-world applications',
      ],
    });

    if (examTarget.includes('jee')) {
      problems.push({
        id: nanoid(),
        type: 'jee_main',
        question: `[JEE Main Style] A numerical problem involving ${topic}. Calculate the required quantity using given data.`,
        difficulty: 'hard',
        marks: 4,
        solution: `Detailed step-by-step solution with formula application and numerical calculations.`,
        solutionGated: true,
        topic,
        hints: [
          'Identify the relevant formula',
          'Convert units if necessary',
          'Check your answer with dimensional analysis',
        ],
      });
    } else if (examTarget.includes('neet')) {
      problems.push({
        id: nanoid(),
        type: 'neet',
        question: `[NEET Style] A conceptual MCQ about ${topic} with application to biological/medical context.`,
        difficulty: 'medium',
        marks: 4,
        solution: `Explanation of why the correct option is right and why other options are incorrect.`,
        solutionGated: true,
        topic,
        hints: [
          'Focus on the conceptual understanding',
          'Eliminate obviously wrong options first',
          'Think about biological relevance',
        ],
      });
    } else {
      problems.push({
        id: nanoid(),
        type: 'board',
        question: `[Board Practice] A long-answer question on ${topic} covering all aspects of the concept. (5 marks)`,
        difficulty: 'medium',
        marks: 5,
        solution: `Complete solution with introduction, explanation, examples, and conclusion.`,
        solutionGated: true,
        topic,
        hints: [
          'Structure your answer with proper headings',
          'Include diagrams where relevant',
          'Conclude with significance or applications',
        ],
      });
    }

    return problems;
  }

  private generateAcknowledgment(subject: SubjectCode, topic: string): string {
    const templates = ACKNOWLEDGMENT_TEMPLATES[subject];
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace('{topic}', topic);
  }

  private generateDiagnosisResponse(
    rootCause: RootCauseCategory,
    context: CurriculumContext
  ): string {
    const diagnosisMessages: Record<RootCauseCategory, string> = {
      prerequisite_gap: `I think the confusion might be because of missing foundation in ${context.prerequisites[0]?.topic || 'related concepts'}. Let me help you build that first.`,
      terminology_confusion: `It seems like there might be some confusion about the terminology. Let me clarify the definitions first.`,
      conceptual_misconception: `I notice you might have a different mental model about this. Let me show you why this concept works the way it does.`,
      procedural_error: `You understand the concept well! The issue seems to be in the approach. Let me walk you through the correct steps.`,
    };

    return diagnosisMessages[rootCause];
  }

  private generateExplanation(
    rootCause: RootCauseCategory,
    topic: string,
    subject: SubjectCode
  ): string {
    const strategy = EXPLANATION_STRATEGIES[rootCause];
    
    const explanations: Record<RootCauseCategory, string> = {
      prerequisite_gap: `Pehle hum quickly revise karte hain jo concepts zaruri hain ${topic} samajhne ke liye. Once the foundation is clear, the main concept will make much more sense.`,
      terminology_confusion: `Sabse pehle, let's understand what ${topic} actually means. I'll explain the definition clearly and then show you examples to make it stick.`,
      conceptual_misconception: `Here's an interesting way to think about ${topic}. Let me show you a counter-example that will help you see why it works differently than you might expect.`,
      procedural_error: `Good news - you understand the concept! Let's just fix the approach. Here are the correct steps to solve ${topic} problems, step by step.`,
    };

    return explanations[rootCause];
  }

  private formatVerificationQuestion(question: VerificationQuestion): string {
    let formatted = `\n**Quick Check:**\n${question.question}\n`;
    
    if (question.options) {
      question.options.forEach((opt, i) => {
        formatted += `  ${String.fromCharCode(65 + i)}) ${opt}\n`;
      });
    }
    
    if (question.hint) {
      formatted += `\n*Hint: ${question.hint}*`;
    }
    
    return formatted;
  }

  private formatPracticeProblems(problems: PracticeProblem[]): string {
    let formatted = '\n**Practice Time!**\n\n';
    
    problems.forEach((problem, i) => {
      formatted += `**Problem ${i + 1}** (${problem.type.replace('_', ' ').toUpperCase()}):\n`;
      formatted += `${problem.question}\n`;
      if (problem.marks) {
        formatted += `*Marks: ${problem.marks}*\n`;
      }
      formatted += '\n';
    });
    
    formatted += '\n*Solutions will be shown after you attempt the problems.*';
    
    return formatted;
  }

  getStepDefinitions(): DoubtResolutionStep[] {
    return [...DOUBT_RESOLUTION_STEPS];
  }

  getStepByIndex(index: number): DoubtResolutionStep | undefined {
    return DOUBT_RESOLUTION_STEPS[index];
  }

  getCurrentStepDescription(state: DoubtWorkflowState): string {
    const step = DOUBT_RESOLUTION_STEPS[state.stepIndex];
    if (!step) return 'Unknown step';
    
    const stepDescriptions: Record<DoubtResolutionStep['id'], string> = {
      acknowledge: 'Acknowledging your doubt and building understanding',
      diagnose: 'Diagnosing the root cause of confusion',
      explain: 'Providing targeted explanation',
      verify: 'Verifying understanding',
      consolidate: 'Consolidating with practice',
    };
    
    return stepDescriptions[step.id];
  }
}

export const doubtResolutionWorkflow = new DoubtResolutionWorkflow();
