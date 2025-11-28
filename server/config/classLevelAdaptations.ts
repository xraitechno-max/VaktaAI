import type { ClassLevel, ClassProfile, ExamTarget } from '@shared/schema';

export type ToneStyle = 'playful' | 'friendly' | 'focused' | 'professional' | 'empathetic';
export type ExampleStyle = 'everyday' | 'mixed' | 'competitive' | 'academic';
export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced';
export type ExamFocus = 
  | 'school_tests' 
  | 'olympiad_intro' 
  | 'boards' 
  | 'foundation_competitive'
  | 'jee_main'
  | 'jee_advanced'
  | 'neet'
  | 'ncert_mastery'
  | 'time_management';

export interface LanguageRatio {
  hinglish: number;
  english: number;
}

export interface ClassAdaptation {
  profile: ClassProfile;
  classRange: ClassLevel[];
  displayName: string;
  description: string;
  languageRatio: LanguageRatio;
  tone: ToneStyle;
  exampleStyle: ExampleStyle;
  exampleContexts: string[];
  complexityLevel: ComplexityLevel;
  examFocus: ExamFocus[];
  vocabularyLevel: 'simple' | 'moderate' | 'technical';
  explanationDepth: 'surface' | 'moderate' | 'deep';
  paceGuidance: string;
  encouragementStyle: string;
  specialConsiderations: string[];
}

export const CLASS_LEVEL_ADAPTATIONS: Record<ClassProfile, ClassAdaptation> = {
  foundation_6_7: {
    profile: 'foundation_6_7',
    classRange: ['6', '7'],
    displayName: 'Foundation (Classes 6-7)',
    description: 'Building curiosity and basic concepts with fun, relatable examples',
    languageRatio: { hinglish: 70, english: 30 },
    tone: 'playful',
    exampleStyle: 'everyday',
    exampleContexts: [
      'cricket matches and sports',
      'video games and mobile apps',
      'food and cooking',
      'cartoons and movies',
      'school activities',
      'family situations'
    ],
    complexityLevel: 'basic',
    examFocus: ['school_tests'],
    vocabularyLevel: 'simple',
    explanationDepth: 'surface',
    paceGuidance: 'Slow and steady with lots of visual aids and analogies. Repeat key concepts multiple times.',
    encouragementStyle: 'High praise for every attempt. Use fun expressions. Celebrate small wins enthusiastically.',
    specialConsiderations: [
      'Attention span is short - keep explanations under 2 minutes',
      'Use more visuals and less text',
      'Gamify wherever possible',
      'Connect to their daily life experiences',
      'Build curiosity before teaching'
    ]
  },

  bridge_8_9: {
    profile: 'bridge_8_9',
    classRange: ['8', '9'],
    displayName: 'Bridge (Classes 8-9)',
    description: 'Transitioning from basic to conceptual understanding with increasing rigor',
    languageRatio: { hinglish: 60, english: 40 },
    tone: 'friendly',
    exampleStyle: 'everyday',
    exampleContexts: [
      'sports and fitness',
      'technology and gadgets',
      'social media scenarios',
      'travel and vehicles',
      'nature and environment',
      'everyday physics phenomena'
    ],
    complexityLevel: 'basic',
    examFocus: ['school_tests', 'olympiad_intro'],
    vocabularyLevel: 'moderate',
    explanationDepth: 'moderate',
    paceGuidance: 'Moderate pace. Start introducing why things work, not just what happens.',
    encouragementStyle: 'Supportive but start building self-assessment. Ask them to rate their own understanding.',
    specialConsiderations: [
      'Bridge between rote learning and understanding',
      'Introduce basic problem-solving frameworks',
      'Start building exam temperament',
      'Introduce Olympiad-style thinking for interested students',
      'Balance fun with focus'
    ]
  },

  board_10: {
    profile: 'board_10',
    classRange: ['10'],
    displayName: 'Board Class 10',
    description: 'First major board exam preparation with foundation for competitive exams',
    languageRatio: { hinglish: 50, english: 50 },
    tone: 'focused',
    exampleStyle: 'mixed',
    exampleContexts: [
      'real-world applications',
      'previous year board questions',
      'common exam scenarios',
      'practical lab experiments',
      'career-related examples'
    ],
    complexityLevel: 'intermediate',
    examFocus: ['boards', 'foundation_competitive'],
    vocabularyLevel: 'moderate',
    explanationDepth: 'moderate',
    paceGuidance: 'Focused pace. Cover board syllabus thoroughly while hinting at competitive exam applications.',
    encouragementStyle: 'Balance between support and pushing for excellence. Emphasize board exam importance.',
    specialConsiderations: [
      'First major milestone exam',
      'Build exam writing skills (step marking)',
      'Time management introduction',
      'Reduce exam anxiety',
      'Plant seeds for JEE/NEET preparation'
    ]
  },

  competitive_jee_11_12: {
    profile: 'competitive_jee_11_12',
    classRange: ['11', '12'],
    displayName: 'JEE Track (Classes 11-12)',
    description: 'Intensive JEE Main and Advanced preparation with conceptual depth',
    languageRatio: { hinglish: 40, english: 60 },
    tone: 'professional',
    exampleStyle: 'competitive',
    exampleContexts: [
      'JEE Main previous year questions',
      'JEE Advanced problems',
      'IIT professor insights',
      'engineering applications',
      'research scenarios',
      'competitive exam strategies'
    ],
    complexityLevel: 'advanced',
    examFocus: ['jee_main', 'jee_advanced', 'boards'],
    vocabularyLevel: 'technical',
    explanationDepth: 'deep',
    paceGuidance: 'Fast-paced with deep dives. Focus on multi-concept problems. Time pressure simulation.',
    encouragementStyle: 'Professional acknowledgment. Focus on improvement metrics. Celebrate conceptual breakthroughs.',
    specialConsiderations: [
      'High-pressure environment management',
      'Multi-concept integration is key',
      'Time optimization tricks essential',
      'Previous year pattern analysis',
      'Parallel board preparation needed',
      'Mental health awareness'
    ]
  },

  competitive_neet_11_12: {
    profile: 'competitive_neet_11_12',
    classRange: ['11', '12'],
    displayName: 'NEET Track (Classes 11-12)',
    description: 'NEET-focused preparation with emphasis on NCERT mastery',
    languageRatio: { hinglish: 50, english: 50 },
    tone: 'professional',
    exampleStyle: 'academic',
    exampleContexts: [
      'NCERT exact examples',
      'NEET previous year questions',
      'medical case studies',
      'human body systems',
      'drug and treatment scenarios',
      'biological research'
    ],
    complexityLevel: 'advanced',
    examFocus: ['neet', 'boards', 'ncert_mastery'],
    vocabularyLevel: 'technical',
    explanationDepth: 'deep',
    paceGuidance: 'Thorough coverage with NCERT line-by-line for Biology. Physics and Chemistry need calculation practice.',
    encouragementStyle: 'Steady and supportive. Emphasize NCERT importance. Celebrate accurate recall.',
    specialConsiderations: [
      'NCERT is the ultimate source',
      'Diagram accuracy is crucial',
      'Assertion-Reason practice essential',
      'Biology needs memory techniques',
      'Physics/Chemistry need numerical speed',
      'Long-term retention strategies'
    ]
  },

  dropper: {
    profile: 'dropper',
    classRange: ['dropper'],
    displayName: 'Dropper Year',
    description: 'Intensive preparation with focus on gap-filling and time management',
    languageRatio: { hinglish: 40, english: 60 },
    tone: 'empathetic',
    exampleStyle: 'competitive',
    exampleContexts: [
      'high-yield topics',
      'common weak areas',
      'previous attempt analysis',
      'topper strategies',
      'time-optimized approaches',
      'revision techniques'
    ],
    complexityLevel: 'advanced',
    examFocus: ['jee_main', 'jee_advanced', 'neet', 'time_management'],
    vocabularyLevel: 'technical',
    explanationDepth: 'deep',
    paceGuidance: 'Strategic pace. Focus on weak areas. Emphasize revision over new learning. Mock test heavy.',
    encouragementStyle: 'Empathetic but results-focused. Acknowledge the pressure. Celebrate every improvement.',
    specialConsiderations: [
      'Address previous attempt gaps',
      'Mental health is priority',
      'Time is limited - be strategic',
      'Mock test analysis is crucial',
      'Build exam day confidence',
      'Avoid burnout while maintaining intensity'
    ]
  }
};

export function getClassProfile(classLevel: ClassLevel): ClassProfile {
  switch (classLevel) {
    case '6':
    case '7':
      return 'foundation_6_7';
    case '8':
    case '9':
      return 'bridge_8_9';
    case '10':
      return 'board_10';
    case '11':
    case '12':
      return 'competitive_jee_11_12';
    case 'dropper':
      return 'dropper';
    default:
      return 'foundation_6_7';
  }
}

export function getAdaptation(classLevel: ClassLevel, examTarget?: ExamTarget): ClassAdaptation {
  let profile = getClassProfile(classLevel);
  
  if ((classLevel === '11' || classLevel === '12') && examTarget) {
    if (examTarget === 'board-neet' || examTarget === 'pure-neet') {
      profile = 'competitive_neet_11_12';
    } else if (
      examTarget === 'board-jee-main' || 
      examTarget === 'board-jee-advanced' || 
      examTarget === 'pure-jee'
    ) {
      profile = 'competitive_jee_11_12';
    }
  }
  
  return CLASS_LEVEL_ADAPTATIONS[profile];
}

export function getLanguagePromptModifier(adaptation: ClassAdaptation): string {
  const { languageRatio, vocabularyLevel } = adaptation;
  
  return `
LANGUAGE STYLE:
- Use approximately ${languageRatio.hinglish}% Hinglish and ${languageRatio.english}% pure English
- Vocabulary level: ${vocabularyLevel}
- Tone: ${adaptation.tone}
- Use examples from: ${adaptation.exampleContexts.slice(0, 3).join(', ')}

${adaptation.tone === 'playful' ? 'Use fun expressions and keep it light!' : ''}
${adaptation.tone === 'professional' ? 'Maintain technical precision while being approachable.' : ''}
${adaptation.tone === 'empathetic' ? 'Be supportive and understanding of the pressure they face.' : ''}
`.trim();
}

export function getExamFocusPromptModifier(adaptation: ClassAdaptation): string {
  const focusDescriptions: Record<ExamFocus, string> = {
    'school_tests': 'Focus on school test patterns and basic concept clarity.',
    'olympiad_intro': 'Introduce logical thinking and out-of-box problems gently.',
    'boards': 'Emphasize step-marking, presentation, and board exam patterns.',
    'foundation_competitive': 'Build foundation for future competitive exam preparation.',
    'jee_main': 'Focus on speed, accuracy, and JEE Main question patterns.',
    'jee_advanced': 'Emphasize deep conceptual understanding and multi-concept problems.',
    'neet': 'NCERT mastery is key. Focus on exact wording and diagrams.',
    'ncert_mastery': 'Line-by-line NCERT coverage with exact terminology.',
    'time_management': 'Strategic approach to maximize score in limited time.'
  };

  const focuses = adaptation.examFocus.map(f => focusDescriptions[f]).join('\n- ');
  
  return `
EXAM FOCUS:
- ${focuses}
`.trim();
}
