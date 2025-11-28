// Tutor Session Orchestration Service
// Manages 7-phase conversation flow, adaptive learning, and state machine
// Enhanced with curriculum-aligned tutoring engines (Nov 2025)

import { storage } from '../storage';
import { 
  InsertTutorSession, 
  TutorSession, 
  User,
  TeachingMode,
  HintLevel,
  TeachingModeContext,
  ClassLevel,
  SubjectCode,
  SessionMetrics,
  CurriculumContext
} from '@shared/schema';
import { 
  selectPersonaBySubject,
  getPersonaCatchphrase,
  TUTOR_PERSONAS,
  PersonaConfig
} from '../config/tutorPersonas';
import {
  getGreetingTemplate,
  getRapportTemplate,
  getTeachingTemplate,
  getPracticeTemplate,
  getFeedbackTemplate,
  getClosureTemplate,
  fillTemplate,
  TemplateVariant
} from '../config/phaseTemplates';

// Import new curriculum engines
import { teachingModeEngine } from './curriculum/TeachingModeEngine';
import { hintLadderSystem } from './curriculum/HintLadderSystem';
import { demotivationMonitor } from './curriculum/DemotivationMonitor';
import { doubtResolutionWorkflow } from './curriculum/DoubtResolutionWorkflow';

// Import new config integrations
import { getAdaptation } from '../config/classLevelAdaptations';
import { getStrategy } from '../config/subjectStrategies';
import { AI_MENTOR_PERSONALITY, getRandomPhrase } from '../config/aiMentorPersonality';

// Import enhanced prompt engine
import { enhancedPromptEngine, EnhancedPromptContext } from './DynamicPromptEngine';

// Phase progression order
export const PHASE_ORDER = [
  'greeting',
  'rapport',
  'assessment',
  'teaching',
  'practice',
  'feedback',
  'closure'
] as const;

export type Phase = typeof PHASE_ORDER[number];

// Student level classification
export type StudentLevel = 'beginner' | 'intermediate' | 'advanced';

// Assessment result
export interface AssessmentResult {
  score: number; // 0-100
  level: StudentLevel;
  misconceptions: string[];
  strengths: string[];
}

// Session context for resume
export interface SessionContext {
  currentPhase: Phase;
  progress: number;
  lastQuestion?: string;
  lastAnswer?: string;
  checkpointsPassed: number;
  adaptiveMetrics: {
    diagnosticScore: number;
    misconceptions: string[];
    strongConcepts: string[];
  };
}

// Enhanced session context for curriculum-aligned tutoring
export interface EnhancedSessionContext extends SessionContext {
  // Teaching mode state
  currentTeachingMode?: TeachingMode;
  teachingModeRationale?: string;
  
  // Hint ladder state
  currentHintLevel?: HintLevel;
  hintsGiven?: number;
  
  // Student engagement metrics
  sessionMetrics?: SessionMetrics;
  demotivationLevel?: number;
  
  // Curriculum context
  curriculumContext?: CurriculumContext;
  
  // Subject/class context
  classLevel?: ClassLevel;
  subjectCode?: SubjectCode;
  
  // Attempt tracking
  recentAttempts?: number;
  frustrationCount?: number;
}

export class TutorSessionService {
  // Session-level tracking (in-memory for quick access)
  private sessionMetricsCache: Map<string, SessionMetrics> = new Map();
  private hintStateCache: Map<string, { level: HintLevel; count: number }> = new Map();
  private teachingModeCache: Map<string, TeachingMode> = new Map();

  // Initialize new session with profile data
  async initializeSession(
    chatId: string,
    userId: string,
    subject: string,
    topic: string,
    user: User,
    personaId?: string // Optional: auto-select if not provided
  ): Promise<TutorSession> {
    // Select persona (use provided or auto-select based on subject)
    const persona = personaId 
      ? TUTOR_PERSONAS[personaId] || selectPersonaBySubject(subject)
      : selectPersonaBySubject(subject);
    
    // Use language preference from user profile (from onboarding) first, fallback to chat language
    // Priority: user.languagePreference > chat.language
    let preferredLanguage: string;
    
    if (user.languagePreference) {
      // User completed onboarding and selected language
      preferredLanguage = user.languagePreference; // 'english', 'hinglish', or 'hindi'
      // Map 'hindi' to 'hinglish' for TTS compatibility
      if (preferredLanguage === 'hindi') {
        preferredLanguage = 'hinglish';
      }
    } else {
      // Fallback to chat language if user hasn't set preference
      const chat = await storage.getChat(chatId);
      const chatLanguage = chat?.language || 'en';
      // 'en' → 'english', 'hi' → 'hinglish'
      preferredLanguage = chatLanguage === 'hi' ? 'hinglish' : 'english';
    }
    
    // Create profile snapshot
    const profileSnapshot = {
      firstName: user.firstName || 'Student',
      lastName: user.lastName || '',
      currentClass: user.currentClass || 'Class 12',
      examTarget: user.examTarget || 'JEE',
      educationBoard: user.educationBoard || 'CBSE',
      subjects: user.subjects || [subject],
      preferredLanguage
    };
    
    // Create session
    const session: InsertTutorSession = {
      chatId,
      userId,
      currentPhase: 'greeting',
      personaId: persona.id,
      subject,
      topic,
      level: 'beginner', // Will update after assessment
      progress: 0,
      profileSnapshot,
      adaptiveMetrics: {
        diagnosticScore: 0,
        checkpointsPassed: 0,
        misconceptions: [],
        strongConcepts: []
      }
    };
    
    return await storage.createTutorSession(session);
  }
  
  // Get or create session
  async getOrCreateSession(
    chatId: string,
    userId: string,
    subject: string,
    topic: string,
    user: User
  ): Promise<TutorSession> {
    const existing = await storage.getTutorSession(chatId);
    if (existing) {
      return existing;
    }
    
    return await this.initializeSession(chatId, userId, subject, topic, user);
  }
  
  // Get current phase template
  getCurrentPhaseTemplate(session: TutorSession): TemplateVariant {
    const timeOfDay = this.getTimeOfDay();
    
    switch (session.currentPhase) {
      case 'greeting':
        // Get language preference from profile (english or hinglish)
        const language = session.profileSnapshot?.preferredLanguage || 'hinglish';
        // Pass user profile for class-specific and exam-specific greetings
        const userProfile = {
          currentClass: session.profileSnapshot?.currentClass,
          examTarget: session.profileSnapshot?.examTarget
        };
        return getGreetingTemplate(timeOfDay, language as 'english' | 'hinglish', userProfile);
      
      case 'rapport':
        const examTarget = session.profileSnapshot?.examTarget || 'JEE';
        return getRapportTemplate(examTarget);
      
      case 'teaching':
        return getTeachingTemplate('hook');
      
      case 'practice':
        return getPracticeTemplate('problem_introduction');
      
      case 'feedback':
        const performance = session.progress >= 70 ? 'strong_performance'
          : session.progress >= 40 ? 'good_progress'
          : 'needs_practice';
        return getFeedbackTemplate(performance);
      
      case 'closure':
        return getClosureTemplate(session.progress >= 60);
      
      default:
        return {
          text: 'Chalo aage badhte hain!',
          emotion: 'friendly'
        };
    }
  }
  
  // Fill template with session data
  fillSessionTemplate(template: TemplateVariant, session: TutorSession, additionalVars: Record<string, string> = {}): string {
    const persona = TUTOR_PERSONAS[session.personaId];
    const profile = session.profileSnapshot || {};
    
    const variables = {
      studentName: profile.firstName || 'Student',
      teacherName: persona?.name || 'Teacher',
      subject: session.subject || '',
      topic: session.topic || '',
      currentClass: profile.currentClass || 'Class 12',
      examTarget: profile.examTarget || 'JEE',
      checkpointsPassed: String(session.adaptiveMetrics?.checkpointsPassed || 0),
      ...additionalVars
    };
    
    return fillTemplate(template.text, variables);
  }
  
  // Advance to next phase
  async advancePhase(chatId: string): Promise<TutorSession> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const currentIndex = PHASE_ORDER.indexOf(session.currentPhase as Phase);
    if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
      return session; // Already at last phase
    }
    
    const nextPhase = PHASE_ORDER[currentIndex + 1];
    const newProgress = Math.round(((currentIndex + 1) / PHASE_ORDER.length) * 100);
    
    return await storage.updateTutorSession(chatId, {
      currentPhase: nextPhase,
      progress: newProgress
    });
  }
  
  // Record assessment result and adjust level
  async recordAssessment(
    chatId: string,
    assessmentResult: AssessmentResult
  ): Promise<TutorSession> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const updatedMetrics = {
      ...session.adaptiveMetrics,
      diagnosticScore: assessmentResult.score,
      misconceptions: assessmentResult.misconceptions,
      strongConcepts: assessmentResult.strengths
    };
    
    return await storage.updateTutorSession(chatId, {
      level: assessmentResult.level,
      adaptiveMetrics: updatedMetrics
    });
  }
  
  // Record checkpoint passed
  async recordCheckpoint(chatId: string, checkpointName: string): Promise<TutorSession> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const checkpointsPassed = (session.adaptiveMetrics?.checkpointsPassed || 0) + 1;
    const updatedMetrics = {
      ...session.adaptiveMetrics,
      checkpointsPassed
    };
    
    // Increase progress by 5% for each checkpoint
    const newProgress = Math.min(session.progress + 5, 100);
    
    return await storage.updateTutorSession(chatId, {
      progress: newProgress,
      adaptiveMetrics: updatedMetrics
    });
  }
  
  // Add misconception
  async recordMisconception(chatId: string, misconception: string): Promise<TutorSession> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const misconceptions = session.adaptiveMetrics?.misconceptions || [];
    if (!misconceptions.includes(misconception)) {
      misconceptions.push(misconception);
    }
    
    const updatedMetrics = {
      ...session.adaptiveMetrics,
      misconceptions
    };
    
    return await storage.updateTutorSession(chatId, {
      adaptiveMetrics: updatedMetrics
    });
  }
  
  // Add strong concept
  async recordStrength(chatId: string, concept: string): Promise<TutorSession> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const strongConcepts = session.adaptiveMetrics?.strongConcepts || [];
    if (!strongConcepts.includes(concept)) {
      strongConcepts.push(concept);
    }
    
    const updatedMetrics = {
      ...session.adaptiveMetrics,
      strongConcepts
    };
    
    return await storage.updateTutorSession(chatId, {
      adaptiveMetrics: updatedMetrics
    });
  }
  
  // Generate resume context
  async generateResumeContext(chatId: string): Promise<string> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const persona = TUTOR_PERSONAS[session.personaId];
    const profile = session.profileSnapshot || {};
    const catchphrase = getPersonaCatchphrase(session.personaId);
    
    const resumeText = `${catchphrase} ${profile.firstName}! Aapka session resume kar rahe hain.

Pichli baar hum ruk gaye the: ${session.currentPhase} phase mein
Progress: ${session.progress}%
Topic: ${session.topic}

Checkpoints cleared: ${session.adaptiveMetrics?.checkpointsPassed || 0}
Level: ${session.level}

Chalo wahi se continue karte hain!`;

    return resumeText;
  }
  
  // Check if phase should auto-advance
  shouldAutoAdvance(session: TutorSession, messageCount: number): boolean {
    // Greeting phase: Auto-advance after 1-2 messages
    if (session.currentPhase === 'greeting' && messageCount >= 2) {
      return true;
    }
    
    // Rapport phase: Auto-advance after student responds
    if (session.currentPhase === 'rapport' && messageCount >= 4) {
      return true;
    }
    
    return false;
  }
  
  // Get time of day
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
  
  // Get persona for session
  getPersona(session: TutorSession): PersonaConfig {
    return TUTOR_PERSONAS[session.personaId] || TUTOR_PERSONAS.priya;
  }
  
  // Analyze student response for level assessment
  analyzeResponse(response: string, expectedAnswer?: string): AssessmentResult {
    const normalized = response.toLowerCase().trim();
    
    // Simple heuristic assessment
    let score = 0;
    let level: StudentLevel = 'beginner';
    const misconceptions: string[] = [];
    const strengths: string[] = [];
    
    // Self-assessment patterns
    if (normalized.includes('naya') || normalized.includes('pehli baar')) {
      score = 0;
      level = 'beginner';
    } else if (normalized.includes('thoda') || normalized.includes('yaad nahi')) {
      score = 30;
      level = 'beginner';
    } else if (normalized.includes('basics clear') || normalized.includes('practice')) {
      score = 60;
      level = 'intermediate';
    } else if (normalized.includes('confident') || normalized.includes('tough questions')) {
      score = 90;
      level = 'advanced';
      strengths.push('Strong conceptual foundation');
    }
    
    // If expected answer provided, do simple matching
    if (expectedAnswer) {
      const expectedNorm = expectedAnswer.toLowerCase();
      if (normalized.includes(expectedNorm)) {
        score = Math.max(score, 70);
        level = score >= 70 ? 'intermediate' : 'beginner';
        strengths.push('Correct understanding');
      } else {
        misconceptions.push('Concept clarity needed');
      }
    }
    
    return {
      score,
      level,
      misconceptions,
      strengths
    };
  }

  // ============================================
  // ENHANCED CURRICULUM-ALIGNED METHODS (Nov 2025)
  // ============================================

  /**
   * Determine teaching mode based on student context
   * Uses TeachingModeEngine for intelligent mode selection
   */
  decideTeachingMode(
    session: TutorSession,
    emotion: 'confident' | 'confused' | 'frustrated' | 'bored' | 'neutral',
    requestType: 'doubt' | 'practice' | 'revision' | 'concept' = 'concept'
  ): { mode: TeachingMode; rationale: string; toneModifier: string } {
    const chatId = session.chatId;
    const metrics = this.sessionMetricsCache.get(chatId);
    const hintState = this.hintStateCache.get(chatId);
    
    // Build teaching mode context
    const context: TeachingModeContext = {
      masteryScore: (session.adaptiveMetrics?.diagnosticScore || 50) / 100,
      recentAttempts: metrics?.consecutiveWrongAnswers || 0,
      emotion,
      requestType,
      timePressure: false, // Could be determined from exam date proximity
      prerequisiteStatus: 'complete', // Could be determined from curriculum context
      lastHintLevel: hintState?.level || 1,
      frustrationCount: metrics?.demotivationEvents || 0
    };

    const decision = teachingModeEngine.decide(context);
    
    // Cache the teaching mode
    this.teachingModeCache.set(chatId, decision.mode);
    
    return {
      mode: decision.mode,
      rationale: decision.rationale,
      toneModifier: decision.toneModifier
    };
  }

  /**
   * Get next hint from the hint ladder
   * Uses HintLadderSystem for progressive scaffolding
   */
  getNextHint(
    session: TutorSession,
    topic: string,
    problem: string
  ): { hint: string; level: HintLevel; canEscalate: boolean } {
    const chatId = session.chatId;
    const subject = this.mapSubjectToCode(session.subject);
    const currentMode = this.teachingModeCache.get(chatId) || 'direct';
    
    // Get or initialize hint state
    let hintState = this.hintStateCache.get(chatId);
    if (!hintState) {
      // Entry level depends on teaching mode
      const entryLevel = currentMode === 'socratic' ? 1 
        : currentMode === 'scaffolded_direct' ? 3 
        : currentMode === 'worked_example' ? 5 
        : 1;
      hintState = { level: entryLevel as HintLevel, count: 0 };
    }

    const hint = hintLadderSystem.getHint(
      hintState.level,
      subject,
      topic,
      problem
    );

    const canEscalate = hintLadderSystem.canEscalate(hintState.level, currentMode);

    // Update cache
    this.hintStateCache.set(chatId, {
      level: hintState.level,
      count: hintState.count + 1
    });

    return {
      hint,
      level: hintState.level,
      canEscalate
    };
  }

  /**
   * Escalate to next hint level
   */
  escalateHint(session: TutorSession): HintLevel {
    const chatId = session.chatId;
    const currentMode = this.teachingModeCache.get(chatId) || 'direct';
    const hintState = this.hintStateCache.get(chatId) || { level: 1 as HintLevel, count: 0 };

    const newLevel = hintLadderSystem.escalate(hintState.level, currentMode);
    
    this.hintStateCache.set(chatId, {
      level: newLevel,
      count: hintState.count
    });

    return newLevel;
  }

  /**
   * Check for demotivation signals and get intervention if needed
   */
  checkDemotivation(
    session: TutorSession,
    latestMessage: string,
    responseTimeMs: number
  ): { needsIntervention: boolean; intervention?: string; level?: number } {
    const chatId = session.chatId;
    const subject = this.mapSubjectToCode(session.subject);
    
    // Get or create session metrics
    let metrics = this.sessionMetricsCache.get(chatId);
    if (!metrics) {
      metrics = demotivationMonitor.createInitialMetrics();
    }

    // Update metrics with latest data
    metrics = demotivationMonitor.updateMetrics(
      metrics,
      false, // isCorrect - would need to be determined from answer analysis
      responseTimeMs,
      latestMessage.length
    );
    this.sessionMetricsCache.set(chatId, metrics);

    // Check signals
    const signals = demotivationMonitor.checkSignals(metrics, latestMessage);
    const needsIntervention = demotivationMonitor.needsIntervention(signals);

    if (needsIntervention) {
      const level = demotivationMonitor.determineInterventionLevel(signals, metrics);
      const intervention = demotivationMonitor.getIntervention(level, subject);
      
      // Record the event
      demotivationMonitor.recordDemotivationEvent(metrics);
      
      return { needsIntervention: true, intervention, level };
    }

    return { needsIntervention: false };
  }

  /**
   * Record successful recovery from demotivation
   */
  recordDemotivationRecovery(session: TutorSession): void {
    const chatId = session.chatId;
    const metrics = this.sessionMetricsCache.get(chatId);
    if (metrics) {
      demotivationMonitor.recordRecovery(metrics);
    }
  }

  /**
   * Build enhanced prompt context for the AI
   * Combines all curriculum engines into a single context object
   */
  buildEnhancedPromptContext(
    session: TutorSession,
    emotion: 'confident' | 'confused' | 'frustrated' | 'bored' | 'neutral',
    detectedLanguage: 'english' | 'hindi' | 'hinglish'
  ): EnhancedPromptContext {
    const chatId = session.chatId;
    const profile = session.profileSnapshot || {};
    
    // Get current states
    const teachingMode = this.teachingModeCache.get(chatId) || 'direct';
    const hintState = this.hintStateCache.get(chatId);
    const metrics = this.sessionMetricsCache.get(chatId);

    // Map to ClassLevel
    const classLevel = this.mapClassToLevel(profile.currentClass);
    const subjectCode = this.mapSubjectToCode(session.subject);
    
    // Build enhanced context
    const context: EnhancedPromptContext = {
      // Language context
      detectedLanguage,
      languageConfidence: 0.9,
      preferredLanguage: profile.preferredLanguage as 'english' | 'hindi' | 'hinglish',
      
      // Emotional context
      currentEmotion: emotion,
      emotionConfidence: 0.8,
      
      // Learning context
      subject: session.subject || '',
      topic: session.topic || '',
      level: session.level || 'beginner',
      currentPhase: session.currentPhase || 'greeting',
      
      // User profile
      userProfile: {
        currentClass: profile.currentClass,
        examTarget: profile.examTarget,
        educationBoard: profile.educationBoard,
        firstName: profile.firstName
      },
      
      // Enhanced curriculum context
      teachingMode,
      currentHintLevel: hintState?.level,
      hintsGiven: hintState?.count,
      classLevel,
      subjectCode,
      examTarget: profile.examTarget as any,
      frustrationCount: metrics?.demotivationEvents || 0,
      recentAttempts: metrics?.consecutiveWrongAnswers || 0,
      masteryScore: (session.adaptiveMetrics?.diagnosticScore || 50) / 100
    };

    return context;
  }

  /**
   * Get class adaptation config for a session
   */
  getClassAdaptation(session: TutorSession) {
    const profile = session.profileSnapshot || {};
    const classLevel = this.mapClassToLevel(profile.currentClass);
    const examTarget = profile.examTarget as any;
    
    return getAdaptation(classLevel, examTarget);
  }

  /**
   * Get subject strategy for a session
   */
  getSubjectStrategy(session: TutorSession) {
    const subjectCode = this.mapSubjectToCode(session.subject);
    const profile = session.profileSnapshot || {};
    const examTarget = profile.examTarget as any;
    
    return getStrategy(subjectCode, examTarget);
  }

  /**
   * Get random phrase from AI Mentor personality
   */
  getPersonalityPhrase(
    type: 'encouragement' | 'correction' | 'support' | 'motivation' | 'examTips'
  ): string {
    return getRandomPhrase(type);
  }

  /**
   * Clear session caches when session ends
   */
  clearSessionCaches(chatId: string): void {
    this.sessionMetricsCache.delete(chatId);
    this.hintStateCache.delete(chatId);
    this.teachingModeCache.delete(chatId);
    hintLadderSystem.clearHintHistory(chatId);
  }

  // Helper: Map subject string to SubjectCode
  private mapSubjectToCode(subject?: string): SubjectCode {
    if (!subject) return 'physics';
    const normalized = subject.toLowerCase();
    if (normalized.includes('physics')) return 'physics';
    if (normalized.includes('chemistry')) return 'chemistry';
    if (normalized.includes('math')) return 'math';
    if (normalized.includes('bio')) return 'biology';
    return 'physics';
  }

  // Helper: Map class string to ClassLevel (individual class number)
  private mapClassToLevel(classStr?: string): ClassLevel {
    if (!classStr) return '11'; // Default to Class 11
    
    const normalized = classStr.toLowerCase();
    if (normalized.includes('dropper')) return 'dropper';
    
    const match = normalized.match(/(\d{1,2})/);
    if (match) {
      const classNum = parseInt(match[1]);
      // Ensure we return a valid ClassLevel
      if (classNum >= 6 && classNum <= 12) {
        return classNum.toString() as ClassLevel;
      }
    }
    
    return '11'; // Default to Class 11
  }
}

export const tutorSessionService = new TutorSessionService();
