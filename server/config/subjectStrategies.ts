import type { SubjectCode, ExamTarget } from '@shared/schema';

export interface SubjectStrategy {
  subject: SubjectCode;
  displayName: string;
  introHook: {
    description: string;
    examples: string[];
  };
  teachingApproach: string;
  commonMisconceptions: string[];
  practiceBlueprint: string[];
  examVariations: {
    jee?: string;
    neet?: string;
    board?: string;
  };
  memoryTechniques: string[];
  visualAids: string[];
  hinglishTerminology: Record<string, string>;
}

export const SUBJECT_STRATEGIES: Record<SubjectCode, SubjectStrategy> = {
  physics: {
    subject: 'physics',
    displayName: 'Physics',
    introHook: {
      description: 'Real-world phenomena that students experience daily',
      examples: [
        'Phone falling from hand - free fall and gravity',
        'Car turning on a curve - circular motion and centripetal force',
        'Charger getting warm - electrical resistance and heat',
        'Echo in empty room - sound reflection',
        'Rainbow after rain - light dispersion',
        'Pressure cooker whistle - pressure and boiling point'
      ]
    },
    teachingApproach: 'Visualization + Free Body Diagrams + Formulas + Numericals',
    commonMisconceptions: [
      'Force causes motion (actually force causes acceleration, not motion)',
      'Heavier objects fall faster (Galileo proved this wrong)',
      'Current is consumed in a circuit (current is conserved)',
      'Cold flows into warm objects (heat flows from hot to cold)',
      'Centrifugal force pushes outward (it is a pseudo force)',
      'Friction always opposes motion (it opposes relative motion)',
      'Voltage is stored in batteries (energy is stored, voltage is potential difference)'
    ],
    practiceBlueprint: [
      'Concept check MCQ - test understanding without calculation',
      'Standard numerical - apply formula with given values',
      'PYQ variant - previous year question with different numbers',
      'Multi-concept problem - combine 2-3 concepts',
      'Diagram-based question - FBD or circuit analysis'
    ],
    examVariations: {
      jee: 'Focus on unusual situations, multiple concept combinations, and tricky scenarios. NTA loves combining mechanics with thermodynamics or electrostatics with magnetism.',
      neet: 'NCERT exact examples and standard numericals. Focus on conceptual clarity over complex calculations. Ray optics and modern physics are high-yield.',
      board: 'Derivations are important - show every step. Diagrams must be neat with proper labeling. Standard numericals with clear formula writing.'
    },
    memoryTechniques: [
      'SUVAT for kinematics equations',
      'Right-hand rule variations for EM',
      'OIL RIG for current direction',
      'VIBGYOR for spectrum order'
    ],
    visualAids: [
      'Free Body Diagrams (FBD)',
      'Circuit diagrams with current flow',
      'Ray diagrams for optics',
      'Potential energy curves',
      'Vector addition diagrams'
    ],
    hinglishTerminology: {
      'velocity': 'velocity ya gati',
      'acceleration': 'acceleration ya twarang',
      'momentum': 'momentum ya sanveg',
      'friction': 'friction ya gharsah',
      'potential': 'potential ya vibhav'
    }
  },

  chemistry: {
    subject: 'chemistry',
    displayName: 'Chemistry',
    introHook: {
      description: 'Daily life connections with cooking, cleaning, and medicines',
      examples: [
        'Baking soda in cooking - acid-base reactions',
        'Soap removing dirt - emulsification and micelles',
        'Rusting of iron - oxidation and electrochemistry',
        'Medicines working in body - organic chemistry',
        'Fertilizers helping plants - ionic compounds',
        'Bleach removing stains - redox reactions'
      ]
    },
    teachingApproach: 'Conceptual reasoning + Periodic trends + Mechanisms + Memory aids',
    commonMisconceptions: [
      'Organic reactions are random (they follow specific mechanisms)',
      'Inorganic is just memorization (trends and logic work here too)',
      'Electrons move instantly (they have specific transition times)',
      'All acids are dangerous (citric acid is in lemon)',
      'Catalysts are consumed (they are regenerated)',
      'Equilibrium means no reaction (dynamic equilibrium has ongoing reactions)'
    ],
    practiceBlueprint: [
      'Concept MCQ - test understanding of why reactions happen',
      'Reaction prediction - give reactants, predict products',
      'PYQ pattern - previous year mechanism or reasoning',
      'Name reactions - identify and apply specific reactions',
      'Trend-based questions - periodic table patterns'
    ],
    examVariations: {
      jee: 'Mechanism-based questions, unusual reactions, and conceptual depth. Focus on GOC (General Organic Chemistry), equilibrium, and electrochemistry.',
      neet: 'NCERT exact wording is critical. Specific line numbers and examples matter. Biomolecules, polymers, and chemistry in everyday life are important.'
    },
    memoryTechniques: [
      'Mnemonics for periodic table groups',
      'Mechanism arrow pushing practice',
      'Color coding for reaction types',
      'Association with daily life examples',
      'Electrochemical series song'
    ],
    visualAids: [
      'Orbital diagrams',
      'Mechanism arrow diagrams',
      'Periodic table trends',
      'Crystal structure models',
      'Energy level diagrams'
    ],
    hinglishTerminology: {
      'oxidation': 'oxidation ya upchayan',
      'reduction': 'reduction ya apchayan',
      'equilibrium': 'equilibrium ya saantulan',
      'catalyst': 'catalyst ya utpreerak',
      'electrolyte': 'electrolyte ya vidyut-apghaty'
    }
  },

  math: {
    subject: 'math',
    displayName: 'Mathematics',
    introHook: {
      description: 'Pattern recognition and puzzle-solving approach',
      examples: [
        'EMI calculation - arithmetic and geometric progressions',
        'Cricket scoring patterns - statistics and probability',
        'Building design - geometry and trigonometry',
        'Stock market predictions - calculus and limits',
        'Game theory in sports - optimization',
        'GPS navigation - coordinate geometry'
      ]
    },
    teachingApproach: 'Formula → Example → Practice → Variations',
    commonMisconceptions: [
      'Algebra is just formula substitution (it is about relationships)',
      'Integration is only reverse differentiation (it is about accumulation)',
      'Zero divided by zero is one (it is indeterminate)',
      'Square root of x² is x (it is |x|)',
      'Probability adds to exactly 1 always (in continuous cases it integrates to 1)',
      'Matrices are just tables of numbers (they represent transformations)'
    ],
    practiceBlueprint: [
      'Direct application - apply formula to standard problem',
      'Twisted version - same concept with a twist',
      'Competition level - JEE Advanced style multi-step',
      'Proof-based - mathematical reasoning',
      'Application problem - real-world scenario'
    ],
    examVariations: {
      jee: 'Multi-concept problems requiring clever approaches. Time-optimization tricks are essential. Calculus, coordinate geometry, and algebra are heavily tested.',
      board: 'Step-by-step solutions with neat presentation. Show all working. Graphs must be accurate with proper labeling.'
    },
    memoryTechniques: [
      'BODMAS/PEMDAS for order of operations',
      'SOH-CAH-TOA for trigonometry',
      'Visualization for geometric proofs',
      'Pattern recognition for sequences',
      'Graph sketching shortcuts'
    ],
    visualAids: [
      'Graph sketches with key points',
      'Geometric constructions',
      'Venn diagrams for sets',
      'Number line representations',
      'Function transformation diagrams'
    ],
    hinglishTerminology: {
      'derivative': 'derivative ya avkalaj',
      'integral': 'integral ya samakal',
      'limit': 'limit ya seema',
      'function': 'function ya falan',
      'equation': 'equation ya samikaran'
    }
  },

  biology: {
    subject: 'biology',
    displayName: 'Biology',
    introHook: {
      description: 'Body and nature examples that students can relate to',
      examples: [
        'Why we feel hungry - digestion and metabolism',
        'Getting tired after running - respiration and ATP',
        'Vaccines protecting us - immune system',
        'How plants make food - photosynthesis',
        'Why we look like parents - genetics and inheritance',
        'Forest ecosystems - ecology and biodiversity'
      ]
    },
    teachingApproach: 'Diagrams + NCERT lines + Mnemonics + Flowcharts',
    commonMisconceptions: [
      'Evolution is linear progression (it is branching)',
      'DNA and RNA are the same (structural and functional differences)',
      'Hormones functions mixing up (each has specific role)',
      'Arteries always carry oxygenated blood (pulmonary artery carries deoxygenated)',
      'Respiration only happens in lungs (cellular respiration in all cells)',
      'All bacteria are harmful (many are beneficial)'
    ],
    practiceBlueprint: [
      'Diagram labeling - identify and name structures',
      'NCERT line match - exact wording questions',
      'Assertion-Reason - logical connection questions',
      'Flowchart completion - process sequences',
      'Compare and contrast - differences between similar concepts'
    ],
    examVariations: {
      neet: 'NCERT is the Bible. Exact line references matter. Diagram labels must be precise. Focus on human physiology, genetics, and ecology.',
      board: 'Diagrams with proper labels are essential. Definitions should use NCERT terminology. Short answer formatting matters.'
    },
    memoryTechniques: [
      'Kingdom classification mnemonics',
      'Krebs cycle song',
      'Hormone function associations',
      'Diagram drawing practice',
      'Flowchart visualization'
    ],
    visualAids: [
      'Anatomical diagrams with labels',
      'Process flowcharts (photosynthesis, respiration)',
      'Phylogenetic trees',
      'Cell structure diagrams',
      'Ecological pyramid representations'
    ],
    hinglishTerminology: {
      'respiration': 'respiration ya shvasan',
      'photosynthesis': 'photosynthesis ya prakash sanshleshan',
      'digestion': 'digestion ya pachan',
      'inheritance': 'inheritance ya vanshagati',
      'evolution': 'evolution ya jaivik vikas'
    }
  }
};

export function getStrategy(subject: SubjectCode, examTarget?: ExamTarget): SubjectStrategy {
  return SUBJECT_STRATEGIES[subject];
}

export function getExamSpecificApproach(subject: SubjectCode, examTarget?: ExamTarget): string {
  const strategy = SUBJECT_STRATEGIES[subject];
  
  if (!examTarget) {
    return strategy.examVariations.board || strategy.teachingApproach;
  }

  if (examTarget.includes('jee') && strategy.examVariations.jee) {
    return strategy.examVariations.jee;
  }
  
  if (examTarget.includes('neet') && strategy.examVariations.neet) {
    return strategy.examVariations.neet;
  }
  
  return strategy.examVariations.board || strategy.teachingApproach;
}

export function getIntroHookExample(subject: SubjectCode): string {
  const strategy = SUBJECT_STRATEGIES[subject];
  const examples = strategy.introHook.examples;
  return examples[Math.floor(Math.random() * examples.length)];
}

export function getRandomMisconception(subject: SubjectCode): string {
  const strategy = SUBJECT_STRATEGIES[subject];
  const misconceptions = strategy.commonMisconceptions;
  return misconceptions[Math.floor(Math.random() * misconceptions.length)];
}

export function getPracticeSequence(subject: SubjectCode, examTarget?: ExamTarget): string[] {
  const strategy = SUBJECT_STRATEGIES[subject];
  const blueprint = [...strategy.practiceBlueprint];
  
  if (examTarget?.includes('jee')) {
    blueprint.push('Time-pressure simulation problem');
  }
  
  if (examTarget?.includes('neet')) {
    blueprint.unshift('NCERT exact line question');
  }
  
  return blueprint;
}

export function getSubjectPromptAdditions(subject: SubjectCode): string {
  const strategy = SUBJECT_STRATEGIES[subject];
  
  return `
SUBJECT-SPECIFIC TEACHING APPROACH for ${strategy.displayName}:

Introduction Style: ${strategy.introHook.description}
Example: "${getIntroHookExample(subject)}"

Teaching Method: ${strategy.teachingApproach}

Common Student Misconceptions to Address:
${strategy.commonMisconceptions.slice(0, 3).map(m => `- ${m}`).join('\n')}

Memory Techniques Available:
${strategy.memoryTechniques.slice(0, 2).map(m => `- ${m}`).join('\n')}

Visual Aids to Use:
${strategy.visualAids.slice(0, 3).map(v => `- ${v}`).join('\n')}
`.trim();
}
