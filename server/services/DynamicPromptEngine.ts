import type { DetectedLanguage, LanguageDetectionResult } from './LanguageDetectionEngine';
import type { SessionContext } from './SessionContextManager';
import type { EmotionalState } from '../config/emotionPatterns';
import type { IntentType } from '../types/intents';
import type {
  TeachingMode,
  HintLevel,
  SubjectCode,
  ClassLevel,
  ExamTarget,
  CurriculumContext,
  NCERTChunk,
  TeachingModeDecision,
  TeachingModeContext,
} from '@shared/schema';
import { SYSTEM_PROMPTS, RESPONSE_TEMPLATES } from '../config/languagePrompts';
import { EMOTION_RESPONSE_MODIFIERS } from '../config/emotionPatterns';
import { teachingModeEngine } from './curriculum/TeachingModeEngine';
import { hintLadderSystem } from './curriculum/HintLadderSystem';
import { AI_MENTOR_PERSONALITY, getRandomPhrase } from '../config/aiMentorPersonality';
import { getAdaptation, getLanguagePromptModifier, getExamFocusPromptModifier } from '../config/classLevelAdaptations';
import { getStrategy, getExamSpecificApproach, getSubjectPromptAdditions } from '../config/subjectStrategies';
import { getHintTemplate, buildHintLadderPromptGuidance, HINT_LADDER_CONFIG } from '../config/hintLadderConfig';
import type { RetrievedKnowledge } from './curriculum/KnowledgeIntelligenceService';

export interface PromptContext {
  detectedLanguage: DetectedLanguage;
  languageConfidence: number;
  preferredLanguage?: DetectedLanguage;
  
  currentEmotion: EmotionalState;
  emotionConfidence: number;
  emotionalStability?: number;
  
  subject: string;
  topic: string;
  level: string;
  currentPhase: string;
  
  intent?: IntentType;
  
  examType?: 'board' | 'competitive';
  
  userProfile?: {
    currentClass?: string;
    examTarget?: string;
    educationBoard?: string;
    firstName?: string;
  };
  
  messageCount?: number;
  misconceptions?: string[];
  strongConcepts?: string[];
  avgResponseTime?: number;
}

export interface EnhancedPromptContext extends PromptContext {
  teachingMode?: TeachingMode;
  teachingModeDecision?: TeachingModeDecision;
  currentHintLevel?: HintLevel;
  curriculumContext?: CurriculumContext;
  demotivationLevel?: number;
  ncertChunks?: NCERTChunk[];
  
  classLevel?: ClassLevel;
  examTarget?: ExamTarget;
  subjectCode?: SubjectCode;
  
  frustrationCount?: number;
  recentAttempts?: number;
  masteryScore?: number;
  prerequisiteStatus?: 'solid' | 'partial' | 'missing';
  timePressure?: boolean;
  
  hintsGiven?: Array<{ level: HintLevel; content: string }>;
  
  retrievedKnowledge?: RetrievedKnowledge;
  knowledgeGaps?: Array<{
    conceptName: string;
    currentMastery: number;
    importance: number;
    suggestedReview: string;
  }>;
  detectedMisconception?: {
    misconceptionId: string;
    misconception: string;
    correctUnderstanding: string;
    remediationStrategy: string;
  };
}

export interface GeneratedPrompt {
  systemPrompt: string;
  userPromptPrefix?: string;
  responseGuidelines: string[];
  adaptations: string[];
}

export interface EnhancedGeneratedPrompt extends GeneratedPrompt {
  teachingModeApplied?: TeachingMode;
  hintLevelActive?: HintLevel;
  personalityTraitsApplied?: string[];
  ncertCitationsIncluded?: number;
}

export class DynamicPromptEngine {
  
  generateSystemPrompt(context: PromptContext): GeneratedPrompt {
    const adaptations: string[] = [];
    
    let systemPrompt = this.getBaseLanguagePrompt(context.detectedLanguage, context.preferredLanguage);
    adaptations.push(`Language: ${context.detectedLanguage} (confidence: ${(context.languageConfidence * 100).toFixed(0)}%)`);
    
    if (context.intent) {
      const intentOverride = this.getIntentOverride(context.detectedLanguage, context.intent);
      if (intentOverride) {
        systemPrompt += '\n\n' + intentOverride;
        adaptations.push(`Intent: ${context.intent}`);
      }
    }
    
    const emotionGuidelines = this.getEmotionGuidelines(context.currentEmotion, context.emotionalStability);
    if (emotionGuidelines) {
      systemPrompt += '\n\n' + emotionGuidelines;
      adaptations.push(`Emotion: ${context.currentEmotion}`);
    }
    
    const learningContext = this.getLearningContext(context);
    systemPrompt += '\n\n' + learningContext;
    adaptations.push(`Phase: ${context.currentPhase}, Level: ${context.level}`);
    
    if (context.examType) {
      if (context.examType === 'competitive') {
        systemPrompt += '\n\nEXAM TYPE: Competitive Exam (JEE/NEET level)\n- Provide in-depth explanations with advanced concepts\n- Include multiple problem-solving approaches and tricks\n- Focus on conceptual clarity and application-level questions\n- Prepare student for competitive exam difficulty';
        adaptations.push('Exam Type: Competitive');
      } else {
        systemPrompt += '\n\nEXAM TYPE: Board Exam (CBSE/State Board level)\n- Provide simplified, board-level explanations\n- Focus on NCERT-aligned concepts and standard problem patterns\n- Emphasize understanding basics and scoring well in school exams\n- Keep complexity moderate and exam-focused';
        adaptations.push('Exam Type: Board');
      }
    }
    
    const socraticStrategy = this.getSocraticTeachingStrategy(context);
    systemPrompt += '\n\n' + socraticStrategy;
    adaptations.push('Socratic method enabled');
    
    if (context.misconceptions && context.misconceptions.length > 0) {
      const misconceptionGuidance = this.getMisconceptionGuidance(context.misconceptions);
      systemPrompt += '\n\n' + misconceptionGuidance;
      adaptations.push(`Targeting ${context.misconceptions.length} misconceptions`);
    }
    
    if (context.strongConcepts && context.strongConcepts.length > 0) {
      const strengthGuidance = this.getStrengthGuidance(context.strongConcepts);
      systemPrompt += '\n\n' + strengthGuidance;
      adaptations.push(`Building on ${context.strongConcepts.length} strong concepts`);
    }
    
    if (context.avgResponseTime && context.avgResponseTime > 3000) {
      systemPrompt += '\n\nIMPORTANT: Keep responses concise and focused (user has slow response times).';
      adaptations.push('Optimized for slow connection');
    }
    
    if (context.preferredLanguage && context.preferredLanguage !== context.detectedLanguage) {
      systemPrompt += `\n\nNOTE: User typically uses ${context.preferredLanguage} but current message is in ${context.detectedLanguage}. Match current message language unless user explicitly requests change.`;
      adaptations.push('Language switch detected');
    }
    
    const responseGuidelines = this.generateResponseGuidelines(context);
    
    return {
      systemPrompt,
      responseGuidelines,
      adaptations
    };
  }

  private getBaseLanguagePrompt(detected: DetectedLanguage, preferred?: DetectedLanguage): string {
    // 🎯 LANGUAGE STRATEGY: Respect user's PROFILE preference
    // 1. Profile preference is the PRIMARY source of truth
    // 2. Stay consistent throughout the session - no mid-conversation switching
    // 3. If user types in different language, still use their profile preference
    
    // Normalize language preference - accept both 'hi'/'en' and 'hindi'/'hinglish'/'english'
    const normalized = this.normalizeLanguagePreference(preferred);
    
    if (normalized === 'hindi') {
      console.log('[DynamicPrompt] 🇮🇳 Using Hindi/Hinglish (from user profile preference)');
      return SYSTEM_PROMPTS.hindi_hinglish.core;
    } else {
      console.log('[DynamicPrompt] 🇬🇧 Using English (from user profile preference)');
      return SYSTEM_PROMPTS.english_pure.core;
    }
  }
  
  /**
   * Normalize language preference to canonical form
   * Accepts: 'hi', 'en', 'hindi', 'hinglish', 'english'
   * Returns: 'hindi' or 'english' for prompt selection
   */
  private normalizeLanguagePreference(lang?: string): 'hindi' | 'english' {
    if (!lang) return 'english';
    const l = lang.toLowerCase().trim();
    if (l === 'hi' || l === 'hindi' || l === 'hinglish') {
      return 'hindi';
    }
    return 'english';
  }

  private getIntentOverride(language: DetectedLanguage, intent: IntentType): string | null {
    // Use prompts matching the session language (normalize to handle 'hi'/'en' codes too)
    const normalized = this.normalizeLanguagePreference(language);
    const basePrompt = normalized === 'hindi' ? SYSTEM_PROMPTS.hindi_hinglish : SYSTEM_PROMPTS.english_pure;
    
    const override = (basePrompt.intent_overrides as Record<string, string>)[intent];
    return override || null;
  }

  private getEmotionGuidelines(emotion: EmotionalState, stability?: number): string | null {
    const modifiers = EMOTION_RESPONSE_MODIFIERS[emotion];
    if (!modifiers) return null;
    
    let guidelines = `\nEMOTIONAL STATE ADAPTATION (${emotion}):\n`;
    guidelines += `- Tone: ${modifiers.tone}\n`;
    guidelines += `- Response Length: ${modifiers.responseLength}\n`;
    guidelines += `- Suggested Actions: ${modifiers.suggestedActions.join(', ')}\n`;
    
    if (stability !== undefined && stability < 0.5) {
      guidelines += `- NOTE: Emotional state is unstable (${(stability * 100).toFixed(0)}% consistency). Be extra attentive to mood shifts.\n`;
    }
    
    return guidelines;
  }

  private normalizeClass(classStr: string | undefined): string | null {
    if (!classStr) return null;
    
    const normalized = classStr.toLowerCase().trim();
    
    if (normalized.includes('dropper') || normalized.includes('drop')) {
      return 'dropper';
    }
    
    const match = normalized.match(/(\d{1,2})/);
    if (match) {
      return match[1];
    }
    
    return null;
  }

  private getLearningContext(context: PromptContext): string {
    let contextStr = `
CURRENT LEARNING CONTEXT:
Subject: ${context.subject}
Topic: ${context.topic}
Student Level: ${context.level}
Session Phase: ${context.currentPhase}
${context.messageCount ? `Messages in Session: ${context.messageCount}` : ''}`;

    if (context.userProfile) {
      const { currentClass, examTarget, educationBoard, firstName } = context.userProfile;
      
      if (currentClass || examTarget) {
        contextStr += '\n\nSTUDENT PROFILE:';
        
        if (firstName) {
          contextStr += `\nName: ${firstName}`;
        }
        
        if (currentClass) {
          contextStr += `\nClass: ${currentClass}`;
          
          const normalizedClass = this.normalizeClass(currentClass);
          
          if (normalizedClass === 'dropper') {
            contextStr += '\n- DROPPER STUDENT: This is their second attempt. They have determination and need focused, exam-oriented preparation. Build confidence while addressing gaps.';
          } else if (normalizedClass && ['6', '7', '8'].includes(normalizedClass)) {
            contextStr += '\n- FOUNDATION STAGE: Focus on building strong fundamentals. Use simple explanations and interesting examples. Avoid overwhelming with advanced concepts.';
          } else if (normalizedClass && ['9', '10'].includes(normalizedClass)) {
            contextStr += '\n- BOARD PREPARATION: Balance conceptual clarity with board exam patterns. Emphasize NCERT concepts and scoring strategies.';
          } else if (normalizedClass && ['11', '12'].includes(normalizedClass)) {
            contextStr += '\n- ADVANCED STAGE: Prepare for both boards and competitive exams. Go deeper into concepts, include problem-solving techniques and exam shortcuts.';
          }
        }
        
        if (examTarget) {
          contextStr += `\nExam Goal: ${examTarget}`;
          
          if (examTarget.includes('JEE')) {
            contextStr += '\n- JEE FOCUS: Emphasize conceptual depth, multiple approaches, and tricky problem patterns. Include time-saving techniques.';
          } else if (examTarget.includes('NEET')) {
            contextStr += '\n- NEET FOCUS: Balance theory with NCERT-based application questions. Include memory techniques and high-yield topics.';
          } else if (examTarget.includes('Board')) {
            contextStr += '\n- BOARD FOCUS: Stick to NCERT patterns. Focus on scoring well with clear, step-by-step solutions.';
          }
        }
        
        if (educationBoard) {
          contextStr += `\nBoard: ${educationBoard}`;
        }
      }
    }

    return contextStr;
  }

  private getMisconceptionGuidance(misconceptions: string[]): string {
    return `
IDENTIFIED MISCONCEPTIONS:
${misconceptions.map((m, i) => `${i + 1}. ${m}`).join('\n')}

IMPORTANT: Address these gently without making student feel bad. Use questions to guide them to correct understanding.`;
  }

  private getStrengthGuidance(strongConcepts: string[]): string {
    return `
STUDENT'S STRONG CONCEPTS:
${strongConcepts.map((s, i) => `${i + 1}. ${s}`).join('\n')}

IMPORTANT: Build on these strengths when teaching new concepts. Use these as anchors for explanations.`;
  }

  private getSocraticTeachingStrategy(context: PromptContext): string {
    const strategies: string[] = [];
    
    strategies.push(`
SOCRATIC TEACHING METHOD:
- NEVER give direct answers to problems
- Ask guiding questions to help student think
- Build understanding through questioning, not telling
- Use "What do you think would happen if..." type questions
- Celebrate the thinking process, not just correct answers`);

    strategies.push(`
PROGRESSIVE HINT SYSTEM (for wrong answers):
Level 1 (First wrong attempt): Gentle nudge - "Good try! But think about..."
Level 2 (Second wrong attempt): More guidance - "Let me guide you. First, consider..."
Level 3 (Third wrong attempt): Detailed help - "Chalo step by step dekhte hain..."
Level 4 (After 3 attempts): Full walkthrough with explanation of each step`);

    if (context.subject) {
      const subjectLower = context.subject.toLowerCase();
      if (subjectLower.includes('physics')) {
        strategies.push(`
PHYSICS HOOKS: Use real-world phenomena
- Connect concepts to everyday experiences (phone, car, sports)
- Explain "why" before "how to calculate"
- Use visual analogies for abstract concepts`);
      } else if (subjectLower.includes('chemistry')) {
        strategies.push(`
CHEMISTRY HOOKS: Use daily life connections
- Relate to cooking, cleaning, health, materials
- Use color, smell, taste analogies for reactions
- Connect molecular behavior to macroscopic observations`);
      } else if (subjectLower.includes('biology')) {
        strategies.push(`
BIOLOGY HOOKS: Use body/nature examples
- Connect to student's own body experiences
- Use familiar organisms as examples
- Relate processes to survival and adaptation`);
      } else if (subjectLower.includes('math')) {
        strategies.push(`
MATH HOOKS: Use problem-solving scenarios
- Frame problems as real-world challenges
- Show practical applications before abstract formulas
- Build intuition before rigor`);
      }
    }

    return strategies.join('\n');
  }

  protected generateResponseGuidelines(context: PromptContext): string[] {
    const guidelines: string[] = [];
    
    if (context.detectedLanguage === 'hindi' || context.detectedLanguage === 'hinglish') {
      guidelines.push('Use natural Hinglish code-switching (60-70% Hindi, 30-40% English for technical terms)');
      guidelines.push('Start sentences in Hindi, include English technical terms mid-sentence');
    } else {
      guidelines.push('Use clear, professional English');
      guidelines.push('Avoid complex jargon unless student level is advanced');
    }
    
    const emotionMods = EMOTION_RESPONSE_MODIFIERS[context.currentEmotion];
    if (emotionMods) {
      guidelines.push(`Tone: ${emotionMods.tone}`);
      guidelines.push(`Encouragement level: ${emotionMods.encouragement}`);
      
      if (context.currentEmotion === 'frustrated') {
        guidelines.push('Simplify questions, use easier examples, validate the struggle');
        guidelines.push('Focus on high-yield topics, reassure about exam preparation');
      } else if (context.currentEmotion === 'confident') {
        guidelines.push('Increase challenge level, ask deeper probing questions');
      } else if (context.currentEmotion === 'confused') {
        guidelines.push('Break down into smaller steps, use simpler analogies');
      } else if (context.currentEmotion === 'bored') {
        guidelines.push('Add interesting hooks, challenge with real-world applications');
      }
    }
    
    switch (context.currentPhase) {
      case 'greeting':
        guidelines.push('Warm welcome, explain how sessions work, ask initial assessment questions');
        break;
      case 'assessment':
        guidelines.push('Diagnose level through questions, not lectures. Ask what they remember.');
        break;
      case 'teaching':
        guidelines.push('Use Socratic questioning: "What do you think?", "Why might that be?"');
        guidelines.push('Break concepts into chunks, check understanding after each');
        guidelines.push('Use analogies and real-world hooks before formulas');
        break;
      case 'practice':
        guidelines.push('CRITICAL: Give progressive hints, NOT answers');
        guidelines.push('Ask guiding questions: "What formula applies here?", "What is the first step?"');
        guidelines.push('Let student struggle productively before helping');
        break;
      case 'feedback':
        guidelines.push('Be specific about what they did well');
        guidelines.push('Address misconceptions gently through questions');
        guidelines.push('Celebrate the thinking process, not just correct answers');
        break;
      case 'closure':
        guidelines.push('Recap 2-3 key takeaways in student\'s words');
        guidelines.push('Connect to exam relevance');
        guidelines.push('Motivate for next session with preview');
        break;
    }
    
    if (context.intent === 'request_hint') {
      guidelines.push('CRITICAL: Give guiding QUESTION, NOT solution hint');
      guidelines.push('Ask: "What formula might help?", "What is given vs unknown?"');
    } else if (context.intent === 'submit_answer') {
      guidelines.push('If correct: Celebrate and ask "How did you think about it?"');
      guidelines.push('If wrong: Ask "Walk me through your thinking" before correcting');
    } else if (context.intent === 'request_explanation') {
      guidelines.push('Start with real-world hook or analogy');
      guidelines.push('Check understanding with quick questions after explanation');
    }
    
    return guidelines;
  }

  generateUserPromptPrefix(context: PromptContext): string | undefined {
    const prefixes: string[] = [];
    
    if (context.messageCount && context.messageCount === 1) {
      prefixes.push('[First message in session]');
    }
    
    if (context.emotionalStability !== undefined && context.emotionalStability < 0.4) {
      prefixes.push('[Student mood is fluctuating]');
    }
    
    if (context.languageConfidence < 0.7) {
      prefixes.push('[Language detection confidence is low]');
    }
    
    return prefixes.length > 0 ? prefixes.join(' ') + '\n\n' : undefined;
  }

  buildPromptPackage(
    context: PromptContext,
    userMessage: string
  ): {
    systemPrompt: string;
    userMessage: string;
    metadata: {
      adaptations: string[];
      guidelines: string[];
    };
  } {
    const generated = this.generateSystemPrompt(context);
    const prefix = this.generateUserPromptPrefix(context);
    
    return {
      systemPrompt: generated.systemPrompt,
      userMessage: prefix ? prefix + userMessage : userMessage,
      metadata: {
        adaptations: generated.adaptations,
        guidelines: generated.responseGuidelines
      }
    };
  }

  getResponseTemplate(
    language: DetectedLanguage,
    type: 'greeting' | 'correct_answer' | 'wrong_answer' | 'check_understanding' | 'encouragement'
  ): string | null {
    const langKey = (language === 'hindi' || language === 'hinglish') ? 'hindi' : 'english';
    const templates = (RESPONSE_TEMPLATES as any)[langKey]?.[type] || [];
    
    if (templates.length === 0) return null;
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  calculateComplexityScore(prompt: string): number {
    const charScore = Math.min(prompt.length / 2000, 1);
    const instructionCount = (prompt.match(/IMPORTANT:|NOTE:|CRITICAL:/g) || []).length;
    const instructionScore = Math.min(instructionCount / 5, 1);
    
    return (charScore + instructionScore) / 2;
  }

  optimizePrompt(prompt: string, maxComplexity: number = 0.8): string {
    const complexity = this.calculateComplexityScore(prompt);
    
    if (complexity <= maxComplexity) {
      return prompt;
    }
    
    let optimized = prompt;
    
    if (complexity > 0.9) {
      optimized = optimized.replace(/\nNOTE:.*?\n/g, '\n');
    }
    
    if (this.calculateComplexityScore(optimized) > maxComplexity) {
      optimized = optimized.replace(/CURRENT LEARNING CONTEXT:[\s\S]*?(?=\n\n|$)/, 
        'CONTEXT: ' + prompt.match(/Subject: (.*?)\nTopic: (.*?)\n/)?.[0] || '');
    }
    
    return optimized;
  }
}

export class EnhancedPromptEngine extends DynamicPromptEngine {
  
  generateEnhancedSystemPrompt(context: EnhancedPromptContext): EnhancedGeneratedPrompt {
    const adaptations: string[] = [];
    const personalityTraitsApplied: string[] = [];
    const promptSections: string[] = [];

    promptSections.push(this.buildIdentityAndSafetySection());
    adaptations.push('Identity & Safety boundaries applied');

    const personalitySection = this.buildPersonalitySection();
    promptSections.push(personalitySection);
    AI_MENTOR_PERSONALITY.traits.forEach(t => personalityTraitsApplied.push(t.name));
    adaptations.push('VaktaAI personality traits applied');

    let teachingModeApplied: TeachingMode | undefined;
    if (context.teachingModeDecision) {
      promptSections.push(this.buildTeachingModeSection(context.teachingModeDecision));
      teachingModeApplied = context.teachingModeDecision.mode;
      adaptations.push(`Teaching mode: ${context.teachingModeDecision.mode}`);
    } else if (context.teachingMode) {
      promptSections.push(this.buildTeachingModeSectionSimple(context.teachingMode));
      teachingModeApplied = context.teachingMode;
      adaptations.push(`Teaching mode: ${context.teachingMode}`);
    }

    if (context.classLevel) {
      const classAdaptation = getAdaptation(context.classLevel, context.examTarget);
      promptSections.push(this.buildClassAdaptationSection(classAdaptation, context.classLevel));
      adaptations.push(`Class adaptation: ${classAdaptation.displayName}`);
    }

    if (context.subjectCode) {
      const strategy = getStrategy(context.subjectCode, context.examTarget);
      promptSections.push(this.buildSubjectStrategySection(strategy, context.examTarget));
      adaptations.push(`Subject strategy: ${strategy.displayName}`);
    }

    let hintLevelActive: HintLevel | undefined;
    if (context.currentHintLevel) {
      promptSections.push(this.buildHintLevelSection(
        context.currentHintLevel, 
        context.subjectCode || 'physics',
        context.topic,
        context.teachingMode
      ));
      hintLevelActive = context.currentHintLevel;
      adaptations.push(`Hint level: L${context.currentHintLevel}`);
    }

    let ncertCitationsIncluded = 0;
    if (context.ncertChunks && context.ncertChunks.length > 0) {
      promptSections.push(this.buildNCERTContextSection(context.ncertChunks));
      ncertCitationsIncluded = context.ncertChunks.length;
      adaptations.push(`NCERT context: ${context.ncertChunks.length} chunks`);
    }

    if (context.retrievedKnowledge) {
      const knowledgeSection = this.buildKnowledgeIntelligenceSection(context.retrievedKnowledge);
      if (knowledgeSection) {
        promptSections.push(knowledgeSection);
        ncertCitationsIncluded += context.retrievedKnowledge.primaryContext.length;
        adaptations.push(`Knowledge Intelligence: ${context.retrievedKnowledge.primaryContext.length} chunks, ${context.retrievedKnowledge.formulas.length} formulas`);
      }
    }

    if (context.knowledgeGaps && context.knowledgeGaps.length > 0) {
      promptSections.push(this.buildKnowledgeGapsSection(context.knowledgeGaps));
      adaptations.push(`Knowledge gaps detected: ${context.knowledgeGaps.length}`);
    }

    if (context.detectedMisconception) {
      promptSections.push(this.buildMisconceptionAlertSection(context.detectedMisconception));
      adaptations.push(`Misconception alert: ${context.detectedMisconception.misconceptionId}`);
    }

    if (context.curriculumContext) {
      promptSections.push(this.buildCurriculumContextSection(context.curriculumContext));
      adaptations.push('Curriculum context applied');
    }

    if (context.demotivationLevel !== undefined && context.demotivationLevel > 0) {
      promptSections.push(this.buildDemotivationAwarenessSection(context.demotivationLevel));
      adaptations.push(`Demotivation awareness: level ${context.demotivationLevel}`);
    }

    promptSections.push(this.buildResponseFormatSection(context));
    adaptations.push('Response format guidelines applied');

    const emotionSection = this.buildEmotionAdaptationSection(context);
    if (emotionSection) {
      promptSections.push(emotionSection);
      adaptations.push(`Emotion adaptation: ${context.currentEmotion}`);
    }

    const systemPrompt = promptSections.filter(Boolean).join('\n\n---\n\n');
    
    const responseGuidelines = this.generateEnhancedResponseGuidelines(context);

    return {
      systemPrompt,
      responseGuidelines,
      adaptations,
      teachingModeApplied,
      hintLevelActive,
      personalityTraitsApplied,
      ncertCitationsIncluded
    };
  }

  private buildIdentityAndSafetySection(): string {
    return `# IDENTITY & SAFETY BOUNDARIES

You are **VaktaAI**, an AI study companion designed specifically for Indian students preparing for board exams (CBSE, ICSE, State Boards), competitive exams (JEE Main, JEE Advanced, NEET), and Olympiads.

## Core Identity
- You are a warm, supportive, and knowledgeable tutor - like a trusted elder sibling who excels at studies
- You understand the Indian education system, exam patterns, and student pressures
- You communicate naturally in Hinglish (Hindi-English mix) unless the student prefers pure English/Hindi
- You are exam-savvy: you know marking schemes, frequently tested concepts, and time management strategies

## Safety Boundaries - STRICTLY FOLLOW
1. **Academic Integrity**: Never provide direct answers to exam questions or homework that could constitute cheating. Guide students to learn, not copy.
2. **Age-Appropriate Content**: All interactions must be suitable for students aged 12-20. No inappropriate content.
3. **No Personal Advice**: Stick to academic topics. Redirect personal, relationship, or mental health concerns to appropriate adults/professionals.
4. **Factual Accuracy**: Only teach content aligned with NCERT and standard textbooks. Clearly state when something is an approximation or simplification.
5. **Exam Ethics**: Never suggest ways to cheat, deceive examiners, or gain unfair advantages.
6. **Cultural Sensitivity**: Be respectful of all religions, regions, and backgrounds. Use inclusive examples.

## What You DO
- Explain concepts using relatable Indian examples (cricket, Diwali, local food, Bollywood, etc.)
- Help students understand "why" before "how to solve"
- Provide progressive hints (Socratic method) rather than direct answers
- Share exam tips, marking scheme insights, and frequently tested patterns
- Celebrate small wins and motivate during struggles

## What You DON'T DO
- Give complete solutions to problems without guided learning
- Discuss non-academic personal matters
- Make promises about exam results or ranks
- Compare students negatively or create pressure
- Use emojis in responses (keep it professional)`;
  }

  private buildPersonalitySection(): string {
    const traits = AI_MENTOR_PERSONALITY.traits;
    const phraseBanks = AI_MENTOR_PERSONALITY.phraseBanks;
    const langStyle = AI_MENTOR_PERSONALITY.languageStyle;

    return `# AI MENTOR PERSONALITY

## Core Personality Traits
${traits.map(t => `### ${t.name}
${t.description}
- Behavior: ${t.behavior}`).join('\n\n')}

## Language Style
- Formality: ${langStyle.formalityLevel}
- Default to Hinglish: ${langStyle.hinglishDefault ? 'Yes' : 'No'}
- Terms to AVOID: ${langStyle.avoidTerms.join(', ')} (these can sound condescending)

## Phrase Bank Examples (use naturally, don't force)

### For Encouragement
${phraseBanks.encouragement.slice(0, 4).map(p => `- "${p}"`).join('\n')}

### For Gentle Correction
${phraseBanks.correction.slice(0, 4).map(p => `- "${p}"`).join('\n')}

### For Support During Struggles
${phraseBanks.support.slice(0, 4).map(p => `- "${p}"`).join('\n')}

### For Motivation
${phraseBanks.motivation.slice(0, 4).map(p => `- "${p}"`).join('\n')}

### Exam Tips to Weave In
${phraseBanks.examTips.slice(0, 4).map(p => `- "${p}"`).join('\n')}

## Voice Characteristics
- Pace: ${AI_MENTOR_PERSONALITY.voiceCharacteristics.pace}
- Warmth: ${AI_MENTOR_PERSONALITY.voiceCharacteristics.warmth}
- Energy: ${AI_MENTOR_PERSONALITY.voiceCharacteristics.energy}`;
  }

  private buildTeachingModeSection(decision: TeachingModeDecision): string {
    const modeDescriptions: Record<TeachingMode, string> = {
      socratic: `SOCRATIC MODE - Guide Through Questions
- Ask probing questions to activate student's thinking
- NEVER give direct answers; lead them to discover
- Use questions like: "What do you think happens when...?", "How would you approach this?"
- Start with broad questions, narrow down based on responses
- Hint levels: Use L1-L3 only (conceptual questions, formula recall, first step)`,
      
      direct: `DIRECT MODE - Clear, Efficient Explanation
- Provide clear, step-by-step explanations
- Get to the point quickly - student needs efficiency
- Include the "why" alongside the "how"
- Use worked examples to demonstrate
- Hint level: L6 (full explanation)`,
      
      scaffolded_direct: `SCAFFOLDED DIRECT MODE - Guided Step-by-Step
- Break down the solution into clear steps
- Explain each step before moving to the next
- Check understanding at each checkpoint
- Student needs structure, not discovery right now
- Hint levels: Start at L3 (first step scaffold), progress to L6`,
      
      revision_mode: `REVISION MODE - Quick Review
- Student is revising or facing time pressure
- Focus on key formulas and exam-relevant points
- Be efficient - quick refresher, not deep teaching
- Highlight important patterns and common question types
- Include memory tricks and shortcuts
- Hint levels: Start at L4 (key formulas and shortcuts)`,
      
      worked_example: `WORKED EXAMPLE MODE - Learn by Watching
- Show a similar problem solved completely
- Walk through each step with explanation
- Then present the original problem for them to try
- Compare their approach to the worked example
- Hint level: L5 (worked examples)`,

      analogical: `ANALOGICAL MODE - Explain Using Relatable Analogies
- Connect abstract concepts to familiar, everyday experiences
- Use Indian context: cricket, trains, chai, festivals
- Bridge the gap between new and known concepts
- Make complex ideas feel intuitive and memorable
- Hint levels: Start at L2 (analogies and metaphors)`,

      case_study: `CASE STUDY MODE - Real-World Application
- Present real-world scenarios where the concept applies
- Use JEE/NEET previous year applications
- Connect theory to practical problem-solving
- Show how concepts appear in actual exam questions
- Hint levels: Start at L4 (exam-relevant applications)`,

      spaced_retrieval: `SPACED RETRIEVAL MODE - Active Recall Practice
- Prompt student to recall previously learned concepts
- Space out retrieval attempts for better retention
- Test understanding before providing new information
- Build on what they already know
- Hint levels: Start at L1 (recall questions)`,

      elaborative: `ELABORATIVE MODE - Deep "Why" and "How" Questioning
- Ask deep questions about underlying mechanisms
- Encourage connections between concepts
- Build comprehensive understanding
- Focus on cause-effect relationships
- Hint levels: Use L2-L3 (deep conceptual questions)`,

      metacognitive: `METACOGNITIVE MODE - Self-Reflection on Learning
- Help student understand their own learning process
- Identify what strategies work best for them
- Build awareness of strengths and weaknesses
- Encourage self-monitoring during problem-solving
- Hint levels: Use L1-L2 (reflection questions)`
    };

    const toneGuidance: Record<string, string> = {
      encouraging: 'Use extra encouragement. Validate struggles. Celebrate attempts.',
      urgent: 'Be efficient. Time is limited. Focus on high-yield points.',
      calm: 'Maintain steady pace. No rush. Focus on deep understanding.'
    };

    return `# TEACHING MODE: ${decision.mode.toUpperCase()}

## Mode Instructions
${modeDescriptions[decision.mode]}

## Why This Mode Was Selected
${decision.rationale}

## Tone Modifier: ${decision.toneMod || 'calm'}
${toneGuidance[decision.toneMod || 'calm']}

${decision.nextHintLevel ? `## Next Hint Level Available: L${decision.nextHintLevel}` : ''}`;
  }

  private buildTeachingModeSectionSimple(mode: TeachingMode): string {
    return this.buildTeachingModeSection({
      mode,
      rationale: `${mode} mode selected based on context`,
      toneMod: 'calm'
    });
  }

  private buildClassAdaptationSection(
    adaptation: ReturnType<typeof getAdaptation>,
    classLevel: ClassLevel
  ): string {
    const languageModifier = getLanguagePromptModifier(adaptation);
    const examFocusModifier = getExamFocusPromptModifier(adaptation);

    return `# CLASS LEVEL ADAPTATION: ${adaptation.displayName}

## Student Profile
- Class Level: ${classLevel}
- Profile: ${adaptation.profile}
- Description: ${adaptation.description}

${languageModifier}

${examFocusModifier}

## Pace & Approach
${adaptation.paceGuidance}

## Encouragement Style
${adaptation.encouragementStyle}

## Explanation Depth: ${adaptation.explanationDepth}
## Vocabulary Level: ${adaptation.vocabularyLevel}
## Complexity Level: ${adaptation.complexityLevel}

## Special Considerations
${adaptation.specialConsiderations.map(c => `- ${c}`).join('\n')}

## Example Contexts to Use
${adaptation.exampleContexts.slice(0, 4).map(e => `- ${e}`).join('\n')}`;
  }

  private buildSubjectStrategySection(
    strategy: ReturnType<typeof getStrategy>,
    examTarget?: ExamTarget
  ): string {
    const examApproach = getExamSpecificApproach(strategy.subject, examTarget);
    const subjectAdditions = getSubjectPromptAdditions(strategy.subject);

    return `# SUBJECT STRATEGY: ${strategy.displayName}

${subjectAdditions}

## Exam-Specific Approach
${examApproach}

## Practice Blueprint (question progression)
${strategy.practiceBlueprint.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## Hinglish Terminology to Use
${Object.entries(strategy.hinglishTerminology).slice(0, 5).map(([en, hi]) => `- ${en} = "${hi}"`).join('\n')}`;
  }

  private buildHintLevelSection(
    level: HintLevel,
    subject: SubjectCode,
    topic: string,
    mode?: TeachingMode
  ): string {
    const hintGuidance = buildHintLadderPromptGuidance(level);
    const template = getHintTemplate(level, subject);
    const levelConfig = HINT_LADDER_CONFIG.levels[level];

    return `# HINT LADDER - ACTIVE LEVEL: L${level}

${hintGuidance}

## Subject-Specific Template for ${subject}
"${template.replace(/\{topic\}/g, topic)}"

## Level Details
- Name: ${levelConfig.name}
- Description: ${levelConfig.description}
- Purpose: ${levelConfig.purpose}
- Reveal Amount: ${levelConfig.revealAmount}
- Next Action: ${levelConfig.nextAction}

## Escalation Rules
- Minimum time between hint levels: ${HINT_LADDER_CONFIG.progressionRules.minTimeBetweenLevels / 1000}s
- Maximum hints per problem: ${HINT_LADDER_CONFIG.progressionRules.maxHintsPerProblem}
- Auto-progress after ${HINT_LADDER_CONFIG.progressionRules.autoProgressAfterAttempts} wrong attempts

## CRITICAL: Do NOT exceed current level
Only reveal what Level ${level} allows. If student needs more help, wait for next interaction to escalate.`;
  }

  private buildNCERTContextSection(chunks: NCERTChunk[]): string {
    const formattedChunks = chunks.map((chunk, i) => {
      const meta = chunk.metadata;
      const citation = `[NCERT | Class ${meta.classLevel} | ${meta.subject} | Ch ${meta.chapterNumber} | ${meta.chunkType}]`;
      
      return `### Reference ${i + 1} ${citation}
**Chapter:** ${meta.chapterTitle}
${meta.sectionTitle ? `**Section:** ${meta.sectionTitle}` : ''}
${meta.pageRange ? `**Pages:** ${meta.pageRange[0]}-${meta.pageRange[1]}` : ''}

${chunk.content}`;
    });

    return `# NCERT CURRICULUM CONTEXT (RAG Retrieved)

The following NCERT content is relevant to the current topic. Use this as your primary source of truth for factual accuracy.

${formattedChunks.join('\n\n---\n\n')}

## NCERT Citation Rules
1. When stating facts from above, reference using format: [NCERT | Class X | Subject | Ch Y]
2. For formulas, use exact NCERT notation
3. If asked about something NOT in the above context, say "Let me check my NCERT reference..." and be careful about accuracy
4. Prioritize NCERT content over other sources for board exams
5. For JEE/NEET, you may extend beyond NCERT but always ground in NCERT first`;
  }

  private buildCurriculumContextSection(context: CurriculumContext): string {
    const prereqSection = context.prerequisites.length > 0 
      ? context.prerequisites.map(p => `- ${p.topic}: ${p.masteryStatus}`).join('\n')
      : 'No specific prerequisites identified';

    return `# CURRICULUM CONTEXT

## Current Topic
- Topic: ${context.topic}
- Chapter: ${context.chapterTitle}
- Class: ${context.classLevel}
- Subject: ${context.subject}

## Prerequisites Status
${prereqSection}

## Exam Relevance
- Exam Type: ${context.examRelevance.examType}
- Weightage: ${context.examRelevance.weightage}/10
- Common Question Types: ${context.examRelevance.questionTypes.join(', ')}
- PYQ Frequency: ${context.examRelevance.pyqFrequency}

${context.ncertReference ? `## NCERT Reference
- Page Range: ${context.ncertReference.pageRange[0]}-${context.ncertReference.pageRange[1]}
- Key Formulas: ${context.ncertReference.keyFormulas.slice(0, 3).join(', ')}
- Common Mistakes to Watch: ${context.ncertReference.commonMistakes.slice(0, 3).join(', ')}` : ''}`;
  }

  private buildDemotivationAwarenessSection(level: number): string {
    const interventions = {
      low: {
        description: 'Mild signs of frustration detected',
        actions: [
          'Use extra encouragement phrases',
          'Acknowledge that this topic is challenging',
          'Offer a simpler example before the main problem'
        ]
      },
      medium: {
        description: 'Moderate demotivation detected - student may be struggling',
        actions: [
          'Take a step back and validate their effort',
          'Switch to a more supportive teaching mode',
          'Share a relatable story about overcoming difficulty',
          'Offer to simplify or approach differently'
        ]
      },
      high: {
        description: 'High demotivation - emotional support needed',
        actions: [
          'Pause teaching and acknowledge feelings',
          'Remind them that struggle is part of learning',
          'Celebrate ANY progress made so far',
          'Suggest a short break if appropriate',
          'Focus on one small win they can achieve'
        ]
      }
    };

    const levelKey = level <= 2 ? 'low' : level <= 4 ? 'medium' : 'high';
    const intervention = interventions[levelKey];

    return `# DEMOTIVATION AWARENESS - Level ${level}/6

## Status: ${intervention.description}

## Required Actions
${intervention.actions.map(a => `- ${a}`).join('\n')}

## Supportive Phrases to Use
${AI_MENTOR_PERSONALITY.phraseBanks.support.slice(0, 3).map(p => `- "${p}"`).join('\n')}

## Motivational Phrases to Use
${AI_MENTOR_PERSONALITY.phraseBanks.motivation.slice(0, 3).map(p => `- "${p}"`).join('\n')}

## Emotional Adjustments
- ${HINT_LADDER_CONFIG.emotionalAdjustments.frustrated}
- ${HINT_LADDER_CONFIG.emotionalAdjustments.confused}

IMPORTANT: Prioritize emotional recovery over content delivery. A demotivated student cannot learn effectively.`;
  }

  private buildResponseFormatSection(context: EnhancedPromptContext): string {
    const classAdaptation = context.classLevel 
      ? getAdaptation(context.classLevel, context.examTarget)
      : null;
    
    const languageRatio = classAdaptation?.languageRatio || { hinglish: 60, english: 40 };
    const isHinglish = context.detectedLanguage === 'hindi' || context.detectedLanguage === 'hinglish';

    return `# RESPONSE FORMAT GUIDELINES

## Language Requirements
${isHinglish 
  ? `- Use Hinglish with approximately ${languageRatio.hinglish}% Hindi and ${languageRatio.english}% English
- Technical terms should remain in English
- Common expressions in Hindi (e.g., "achha", "theek hai", "samjhe?")
- Sentence structure can mix both languages naturally`
  : `- Use clear, professional English
- Simplify vocabulary based on student level
- Define technical terms when first used`}

## Formatting Rules
1. **NO EMOJIS** - Keep responses professional
2. Use **bold** for key terms and formulas
3. Use numbered lists for step-by-step solutions
4. Use bullet points for multiple related points
5. Use code blocks for formulas: \`F = ma\`

## NCERT Citation Format
When referencing NCERT content: [NCERT | Class X | Subject | Ch Y | Page Z]

## Response Length
${context.currentPhase === 'assessment' || context.currentPhase === 'greeting'
  ? 'Keep initial responses shorter to encourage dialogue (2-3 sentences)'
  : context.currentPhase === 'teaching'
  ? 'Detailed but chunked - explain one concept, check understanding, then continue'
  : context.currentPhase === 'practice'
  ? 'Brief hints and questions, not lengthy explanations'
  : 'Appropriate length for the interaction type'}

## Closing Each Response
- End with a question to maintain dialogue (if in teaching/practice phase)
- Or end with clear next step for student

## Things to NEVER Include
- Emojis or emoticons
- Overly formal greetings (e.g., "Dear student")
- Patronizing phrases from avoid list: ${AI_MENTOR_PERSONALITY.languageStyle.avoidTerms.join(', ')}
- Complete solutions without guided discovery (unless in direct mode)`;
  }

  private buildEmotionAdaptationSection(context: EnhancedPromptContext): string | null {
    if (!context.currentEmotion || context.currentEmotion === 'neutral') {
      return null;
    }

    const modifiers = EMOTION_RESPONSE_MODIFIERS[context.currentEmotion];
    if (!modifiers) return null;

    return `# EMOTIONAL STATE ADAPTATION

## Detected Emotion: ${context.currentEmotion}
${context.emotionConfidence ? `Confidence: ${(context.emotionConfidence * 100).toFixed(0)}%` : ''}
${context.emotionalStability !== undefined ? `Stability: ${(context.emotionalStability * 100).toFixed(0)}%` : ''}

## Tone Adjustment
${modifiers.tone}

## Response Length
${modifiers.responseLength}

## Suggested Actions
${modifiers.suggestedActions.map(a => `- ${a}`).join('\n')}

## Encouragement Level
${modifiers.encouragement}`;
  }

  private generateEnhancedResponseGuidelines(context: EnhancedPromptContext): string[] {
    const guidelines = this.generateResponseGuidelines(context);
    
    if (context.teachingMode) {
      switch (context.teachingMode) {
        case 'socratic':
          guidelines.push('End responses with guiding questions, not explanations');
          guidelines.push('Wait for student to think before providing more help');
          break;
        case 'direct':
          guidelines.push('Be concise and clear - efficiency matters here');
          break;
        case 'revision_mode':
          guidelines.push('Be efficient - focus on key formulas and shortcuts');
          guidelines.push('Highlight exam-relevant points and common patterns');
          break;
        case 'scaffolded_direct':
          guidelines.push('Break into clear numbered steps');
          guidelines.push('Check understanding after each step');
          break;
        case 'worked_example':
          guidelines.push('Show similar problem first, then let student apply');
          break;
      }
    }
    
    if (context.currentHintLevel) {
      guidelines.push(`HINT LEVEL L${context.currentHintLevel}: Do not exceed this level of help`);
    }
    
    if (context.demotivationLevel && context.demotivationLevel > 2) {
      guidelines.push('PRIORITY: Emotional support over content delivery');
    }
    
    if (context.ncertChunks && context.ncertChunks.length > 0) {
      guidelines.push('Reference NCERT content when making factual claims');
    }

    return guidelines;
  }

  buildEnhancedPromptPackage(
    context: EnhancedPromptContext,
    userMessage: string
  ): {
    systemPrompt: string;
    userMessage: string;
    metadata: {
      adaptations: string[];
      guidelines: string[];
      teachingMode?: TeachingMode;
      hintLevel?: HintLevel;
      ncertChunksUsed?: number;
    };
  } {
    const generated = this.generateEnhancedSystemPrompt(context);
    const prefix = this.generateUserPromptPrefix(context);
    
    return {
      systemPrompt: generated.systemPrompt,
      userMessage: prefix ? prefix + userMessage : userMessage,
      metadata: {
        adaptations: generated.adaptations,
        guidelines: generated.responseGuidelines,
        teachingMode: generated.teachingModeApplied,
        hintLevel: generated.hintLevelActive,
        ncertChunksUsed: generated.ncertCitationsIncluded
      }
    };
  }

  deriveTeachingModeContext(context: EnhancedPromptContext): TeachingModeContext {
    return {
      masteryScore: context.masteryScore ?? 0.5,
      recentAttempts: context.recentAttempts ?? 0,
      emotion: context.currentEmotion,
      requestType: this.mapIntentToRequestType(context.intent),
      timePressure: context.timePressure ?? false,
      prerequisiteStatus: context.prerequisiteStatus ?? 'solid',
      lastHintLevel: context.currentHintLevel ?? 1,
      frustrationCount: context.frustrationCount ?? 0
    };
  }

  private mapIntentToRequestType(intent?: IntentType): 'explain' | 'doubt' | 'practice' | 'revision' | 'step' {
    if (!intent) return 'explain';
    
    switch (intent) {
      case 'request_explanation':
      case 'request_example':
      case 'request_simplification':
        return 'explain';
      case 'submit_answer':
      case 'ask_doubt':
        return 'doubt';
      case 'request_practice':
        return 'practice';
      case 'review_previous':
        return 'revision';
      case 'request_hint':
      case 'request_solution':
        return 'step';
      default:
        return 'explain';
    }
  }

  decideTeachingMode(context: EnhancedPromptContext): TeachingModeDecision {
    const modeContext = this.deriveTeachingModeContext(context);
    return teachingModeEngine.decide(modeContext);
  }

  getHintForCurrentLevel(
    level: HintLevel,
    subject: SubjectCode,
    topic: string,
    problem: string
  ): string {
    return hintLadderSystem.getHint(level, subject, topic, problem);
  }

  escalateHintLevel(
    currentLevel: HintLevel,
    mode: TeachingMode
  ): HintLevel {
    return hintLadderSystem.escalate(currentLevel, mode);
  }

  getRandomEncouragement(): string {
    return getRandomPhrase('encouragement');
  }

  getRandomCorrection(): string {
    return getRandomPhrase('correction');
  }

  getRandomSupport(): string {
    return getRandomPhrase('support');
  }

  getRandomMotivation(): string {
    return getRandomPhrase('motivation');
  }

  getRandomExamTip(): string {
    return getRandomPhrase('examTips');
  }

  private buildKnowledgeIntelligenceSection(knowledge: RetrievedKnowledge): string {
    const sections: string[] = [];

    sections.push('# AUTHORITATIVE KNOWLEDGE CONTEXT\n');
    sections.push('**IMPORTANT**: Use this verified information for your response. Do NOT hallucinate facts.\n');

    if (knowledge.primaryContext.length > 0) {
      sections.push('## Primary Context (MUST use):');
      for (const ctx of knowledge.primaryContext.slice(0, 5)) {
        sections.push(`\n### ${ctx.topic}`);
        sections.push(`${ctx.content.substring(0, 600)}${ctx.content.length > 600 ? '...' : ''}`);
        sections.push(`*Source: ${ctx.citation}*`);
      }
    }

    if (knowledge.formulas.length > 0) {
      sections.push('\n\n## Relevant Formulas (for accuracy):');
      for (const f of knowledge.formulas) {
        sections.push(`\n- **${f.plainText}**`);
        sections.push(`  - Speak as: "${f.speakableText}"`);
        if (f.applicableConditions.length > 0) {
          sections.push(`  - Applicable when: ${f.applicableConditions.join('; ')}`);
        }
        if (f.commonMistakes.length > 0) {
          sections.push(`  - Common mistakes to address:`);
          for (const m of f.commonMistakes.slice(0, 2)) {
            sections.push(`    - Mistake: "${m.mistake}" -> Correct: "${m.correction}"`);
          }
        }
      }
    }

    if (knowledge.prerequisites.filter(p => p.masteryStatus !== 'solid').length > 0) {
      sections.push('\n\n## Prerequisites Student May Need:');
      for (const p of knowledge.prerequisites.filter(pr => pr.masteryStatus !== 'solid')) {
        const statusEmoji = p.masteryStatus === 'missing' ? 'NOT mastered' : 'Partially understood';
        sections.push(`- **${p.topicName}**: ${statusEmoji} (${p.importance} importance)`);
      }
      sections.push('\nConsider briefly reviewing these before deep-diving into current topic.');
    }

    if (knowledge.possibleMisconceptions.length > 0) {
      sections.push('\n\n## Watch For These Misconceptions:');
      for (const m of knowledge.possibleMisconceptions) {
        sections.push(`\n### ${m.severity === 'critical' ? 'CRITICAL' : 'Common'} Misconception:`);
        sections.push(`- Wrong belief: "${m.misconception}"`);
        sections.push(`- Correct understanding: ${m.correctUnderstanding}`);
        if (m.severity === 'critical') {
          sections.push(`- **ADDRESS THIS IF DETECTED!**`);
        }
      }
    }

    return sections.join('\n');
  }

  private buildKnowledgeGapsSection(gaps: EnhancedPromptContext['knowledgeGaps']): string {
    if (!gaps || gaps.length === 0) return '';

    const sections = ['# KNOWLEDGE GAPS DETECTED\n'];
    sections.push('The student may be missing foundational knowledge:\n');

    for (const gap of gaps) {
      sections.push(`- **${gap.conceptName}**: Current mastery ${Math.round(gap.currentMastery * 100)}%`);
      sections.push(`  - Importance for current topic: ${gap.importance}/10`);
      sections.push(`  - ${gap.suggestedReview}`);
    }

    sections.push('\nConsider briefly reviewing these concepts before proceeding with main explanation.');

    return sections.join('\n');
  }

  private buildMisconceptionAlertSection(misconception: EnhancedPromptContext['detectedMisconception']): string {
    if (!misconception) return '';

    return `# MISCONCEPTION ALERT - HIGH PRIORITY

## Detected Misconception: ${misconception.misconceptionId}

**What the student believes (WRONG)**:
"${misconception.misconception}"

**Correct Understanding**:
${misconception.correctUnderstanding}

## Remediation Strategy
${misconception.remediationStrategy}

**IMPORTANT**: Address this misconception before proceeding with new content.
Use Socratic questions to help the student discover the error themselves.`;
  }
}

export const dynamicPromptEngine = new DynamicPromptEngine();

export const enhancedPromptEngine = new EnhancedPromptEngine();
