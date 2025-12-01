import type {
  HintLevel,
  TeachingMode,
  SubjectCode,
  HintTemplate,
} from '@shared/schema';

interface HintLevelConfig {
  level: HintLevel;
  name: string;
  description: string;
}

const HINT_LEVEL_CONFIGS: HintLevelConfig[] = [
  {
    level: 1,
    name: 'Conceptual Question',
    description: 'Ask guiding question about the core concept',
  },
  {
    level: 2,
    name: 'Formula Recall',
    description: 'Prompt to recall relevant formula/principle',
  },
  {
    level: 3,
    name: 'First Step Scaffold',
    description: "Give first step and ask 'what's next?'",
  },
  {
    level: 4,
    name: 'Targeted Hint',
    description: 'Point to specific part of solution',
  },
  {
    level: 5,
    name: 'Worked Example',
    description: 'Show similar problem with complete solution',
  },
  {
    level: 6,
    name: 'Direct Explanation',
    description: 'Full step-by-step solution with explanation',
  },
  {
    level: 7,
    name: 'Extended Analysis',
    description: 'Deep dive with JEE/NEET exam strategies and common pitfalls',
  },
  {
    level: 8,
    name: 'Comprehensive Mastery',
    description: 'Complete solution with variations, extensions, and exam tips',
  },
];

const HINT_TEMPLATES: Record<HintLevel, Record<SubjectCode, string[]>> = {
  1: {
    physics: [
      'What physical quantity are we trying to find here?',
      'Think about the relationship between the given values - what law connects them?',
      'Can you identify which type of motion/force/energy is involved?',
      'What would happen if we changed one of these variables?',
    ],
    chemistry: [
      'What type of reaction is this? How can you identify it?',
      'Think about the electron configuration - what pattern do you notice?',
      'Which principle governs this chemical behavior?',
      'What bonds are being formed or broken here?',
    ],
    math: [
      'What mathematical concept is at the heart of this problem?',
      'Can you identify the pattern or relationship between the given values?',
      'What properties or theorems might apply here?',
      'How would you approach this if the numbers were simpler?',
    ],
    biology: [
      'What biological process is being described here?',
      'Think about the structure-function relationship - what does this suggest?',
      'Which system or pathway is involved in this process?',
      'How does this connect to what you know about cellular mechanisms?',
    ],
  },
  2: {
    physics: [
      'Remember the formula connecting {topic}? Try to recall it.',
      'What equation relates force, mass, and acceleration?',
      "Newton's laws might help here - can you state the relevant one?",
      'Think about the conservation principle that applies here.',
    ],
    chemistry: [
      'Can you recall the formula for {topic}?',
      "What's the relationship shown in the periodic table for this property?",
      'Remember the equation for calculating moles?',
      'What formula connects pressure, volume, and temperature?',
    ],
    math: [
      'What formula applies to {topic}?',
      'Can you recall the standard form for this type of equation?',
      "What's the general formula for the nth term of this sequence?",
      'Remember the identity or theorem that relates these quantities.',
    ],
    biology: [
      'Can you recall the equation for {topic}?',
      'What formula describes this metabolic process?',
      'Remember the relationship between genotype and phenotype ratios?',
      "What's the equation for calculating population growth?",
    ],
  },
  3: {
    physics: [
      "The first step is to identify all forces acting on the object. What's next?",
      "Start by listing what's given and what we need to find. Now what?",
      "We begin by drawing a free body diagram. What forces should we include?",
      "First, let's convert all units to SI. What's our next move?",
    ],
    chemistry: [
      "Step 1: Write the unbalanced equation. What's next?",
      "First, identify the oxidation states. Now what do we do?",
      "Start by writing the electronic configuration. What pattern emerges?",
      "We begin by calculating moles. What's the next step?",
    ],
    math: [
      "First step: Let's set up our variables. x = {topic}. What equation can we form?",
      "Start by simplifying the left side. What do we get?",
      "The first step is to find the common factor. What is it?",
      "Begin by substituting the given values. What's our next move?",
    ],
    biology: [
      "First, identify the organelles involved. What process connects them?",
      "Start by drawing the pathway. What's the first enzyme?",
      "Step 1: Identify the parent genotypes. What gametes can they produce?",
      "Begin with the stimulus. What's the receptor that detects it?",
    ],
  },
  4: {
    physics: [
      'Look at the energy term - are you accounting for all forms?',
      'Check your sign convention - is the direction consistent?',
      'The key is in the constraint equation - focus there.',
      'Pay attention to the initial conditions given in the problem.',
    ],
    chemistry: [
      'Focus on the limiting reagent - have you identified it correctly?',
      'Check the oxidation numbers in your redox equation.',
      "The key is in the electronegativity difference. What's the bond type?",
      'Look at the molecular geometry - it affects the polarity.',
    ],
    math: [
      'Focus on the discriminant - what does its sign tell you?',
      'Check if you can factor the expression differently.',
      'The key is in the coefficient of the middle term.',
      "Look at the boundary conditions - they'll constrain your solution.",
    ],
    biology: [
      'Focus on the enzyme active site - what type of inhibition?',
      'Check the feedback mechanism - is it positive or negative?',
      'The key is in the chromosome number - count carefully.',
      'Look at the hormonal cascade - which gland is the target?',
    ],
  },
  5: {
    physics: [
      "Here's a similar problem: A ball is thrown upward with velocity 20 m/s. Find max height.\n\nSolution:\n1. At max height, v = 0\n2. Using v² = u² - 2gh\n3. 0 = 400 - 2(10)h\n4. h = 20m\n\nNow apply this approach to your problem.",
      "Example: A 2kg block slides down a frictionless incline of 30°.\n\nSolution:\n1. Component of gravity along incline: mg sin30° = 2(10)(0.5) = 10N\n2. Acceleration = F/m = 10/2 = 5 m/s²\n\nUse this method for your problem.",
    ],
    chemistry: [
      "Here's a similar problem: Balance Fe + O₂ → Fe₂O₃\n\nSolution:\n1. Count atoms: Fe(1), O(2) → Fe(2), O(3)\n2. Balance Fe: 4Fe + O₂ → 2Fe₂O₃\n3. Balance O: 4Fe + 3O₂ → 2Fe₂O₃\n\nApply this to your equation.",
      "Example: Calculate moles in 18g of H₂O\n\nSolution:\n1. Molar mass of H₂O = 2(1) + 16 = 18 g/mol\n2. Moles = mass/molar mass = 18/18 = 1 mol\n\nNow solve yours similarly.",
    ],
    math: [
      "Here's a similar problem: Solve x² - 5x + 6 = 0\n\nSolution:\n1. Factor: (x-2)(x-3) = 0\n2. Set each factor to 0: x-2=0 or x-3=0\n3. Solutions: x = 2 or x = 3\n\nApply this method to your equation.",
      "Example: Find the derivative of f(x) = x³ + 2x\n\nSolution:\n1. Use power rule: d/dx(xⁿ) = nxⁿ⁻¹\n2. f'(x) = 3x² + 2\n\nNow differentiate your function.",
    ],
    biology: [
      "Here's a similar problem: Cross between Tt × Tt pea plants\n\nSolution:\n1. Gametes: T and t from each parent\n2. Punnett square gives: TT, Tt, Tt, tt\n3. Phenotype ratio: 3 tall : 1 short\n4. Genotype ratio: 1 TT : 2 Tt : 1 tt\n\nApply this to your cross.",
      "Example: Trace blood flow through the heart\n\nSolution:\n1. Deoxygenated blood → Right atrium\n2. → Right ventricle → Pulmonary artery → Lungs\n3. Oxygenated blood → Left atrium\n4. → Left ventricle → Aorta → Body\n\nUse this pattern for your question.",
    ],
  },
  6: {
    physics: [
      "Let me solve this step by step for {topic}:\n\n**Given:** {problem}\n\n**Solution:**\n1. First, we identify the relevant principle\n2. Write the governing equation\n3. Substitute the known values\n4. Solve for the unknown\n5. Check units and reasonableness\n\n**Final Answer:** [calculated]",
      "Complete solution for this {topic} problem:\n\n**Analysis:**\n- Identify the system and forces\n- Draw free body diagram\n- Apply Newton's laws\n\n**Calculation:**\n- Set up equations\n- Solve simultaneously\n- Verify answer",
    ],
    chemistry: [
      "Complete solution for this {topic} problem:\n\n**Given:** {problem}\n\n**Step-by-step Solution:**\n1. Write the balanced equation\n2. Calculate molar masses\n3. Convert to moles\n4. Use stoichiometry\n5. Convert back to required units\n\n**Final Answer:** [calculated]",
      "Here's the full explanation for {topic}:\n\n**Concept:** Understanding the underlying principle\n**Application:** How it applies to this problem\n**Calculation:** Detailed working\n**Conclusion:** Final answer with explanation",
    ],
    math: [
      "Complete solution for {topic}:\n\n**Problem:** {problem}\n\n**Solution:**\n1. Understand what's being asked\n2. Identify the method/formula\n3. Set up the equation\n4. Solve step by step\n5. Verify the answer\n\n**Final Answer:** [calculated]",
      "Full worked solution:\n\n**Step 1:** Simplify/rearrange\n**Step 2:** Apply the relevant theorem\n**Step 3:** Calculate\n**Step 4:** Check by substitution\n\n**Answer:** [with explanation]",
    ],
    biology: [
      "Complete explanation for {topic}:\n\n**Given:** {problem}\n\n**Solution:**\n1. Identify the biological process\n2. Explain the mechanism\n3. Apply relevant formulas/ratios\n4. Draw conclusions\n\n**Final Answer:** [with biological significance]",
      "Full solution for this {topic} problem:\n\n**Concept Review:** Key principles involved\n**Step-by-step Analysis:**\n- Break down the process\n- Apply genetic/metabolic principles\n- Calculate ratios/quantities\n\n**Conclusion:** Answer with explanation",
    ],
  },
  7: {
    physics: [
      "**Extended Analysis for {topic}:**\n\n**Solution:** {problem}\n\n**JEE/NEET Exam Strategy:**\n- Common question patterns\n- Time-saving shortcuts\n- Typical numerical values to expect\n\n**Common Pitfalls:**\n- Sign errors in direction\n- Unit conversion mistakes\n- Forgetting constraints\n\n**Quick Check:** Verify dimensions match",
      "**Deep Dive: {topic}**\n\n**Conceptual Understanding:**\n- Why this principle works\n- Physical intuition behind equations\n\n**Problem Variations:**\n- What if friction were present?\n- What if mass changed?\n\n**Exam Tips:** Practice similar problems from past papers",
    ],
    chemistry: [
      "**Extended Analysis for {topic}:**\n\n**Complete Solution:** {problem}\n\n**JEE/NEET Strategy:**\n- Memory tricks for reactions\n- Common exam patterns\n- Numerical shortcuts\n\n**Watch Out For:**\n- Balancing coefficient errors\n- Wrong oxidation states\n- Limiting reagent confusion\n\n**Verification:** Always check atom balance",
      "**Deep Dive: {topic}**\n\n**Conceptual Foundation:**\n- Electronic basis of reactions\n- Energy considerations\n\n**Related Concepts:**\n- How this connects to other chapters\n- Interdisciplinary applications\n\n**Past Year Patterns:** Focus on calculation-heavy variants",
    ],
    math: [
      "**Extended Analysis for {topic}:**\n\n**Full Solution:** {problem}\n\n**JEE Strategy:**\n- Alternative approaches\n- Faster calculation methods\n- Graphical shortcuts\n\n**Common Errors:**\n- Domain restrictions forgotten\n- Sign errors in algebra\n- Missing solutions\n\n**Quick Verify:** Substitute back to check",
      "**Deep Dive: {topic}**\n\n**Mathematical Insight:**\n- Geometric interpretation\n- Connection to other topics\n\n**Variations to Practice:**\n- Parametric forms\n- Boundary conditions\n\n**Exam Focus:** Master the standard forms",
    ],
    biology: [
      "**Extended Analysis for {topic}:**\n\n**Complete Explanation:** {problem}\n\n**NEET Exam Focus:**\n- High-yield facts\n- Diagram-based questions\n- Assertion-reason patterns\n\n**Common Confusions:**\n- Similar-sounding terms\n- Process sequence errors\n- Ratio calculation mistakes\n\n**Memory Aid:** Use mnemonics for pathways",
      "**Deep Dive: {topic}**\n\n**Biological Significance:**\n- Why this process evolved\n- Clinical/ecological relevance\n\n**Connected Concepts:**\n- How systems integrate\n- Feedback mechanisms\n\n**NEET Pattern:** Focus on NCERT diagrams and flowcharts",
    ],
  },
  8: {
    physics: [
      "**Comprehensive Mastery: {topic}**\n\n**Complete Solution:** {problem}\n\n**All Approaches:**\n1. Energy method\n2. Force analysis\n3. Momentum approach\n4. Dimensional analysis\n\n**Variations & Extensions:**\n- Non-ideal conditions\n- Advanced scenarios\n- Numerical problems with twists\n\n**JEE Advanced Level:**\n- Multi-concept integration\n- Assertion-reason type\n\n**Final Tips:** Practice 10+ similar problems for mastery",
      "**Master Level: {topic}**\n\n**Problem:** {problem}\n\n**Expert Solution:**\n- Most elegant approach\n- Time optimization\n- Error prevention\n\n**Advanced Extensions:**\n- Relativistic corrections (if applicable)\n- Real-world deviations\n\n**Competition Prep:**\n- Olympiad-level variations\n- Multi-step problem chains",
    ],
    chemistry: [
      "**Comprehensive Mastery: {topic}**\n\n**Full Solution:** {problem}\n\n**All Methods:**\n1. Ion-electron method\n2. Oxidation number method\n3. Shortcut formulas\n\n**Variations:**\n- Acidic vs basic medium\n- Disproportionation\n- Comproportionation\n\n**JEE Advanced Focus:**\n- Electrochemistry links\n- Thermodynamic coupling\n\n**Practice Plan:** Solve past 10 years JEE questions on this topic",
      "**Master Level: {topic}**\n\n**Problem:** {problem}\n\n**Expert Analysis:**\n- Mechanism understanding\n- Reaction intermediates\n\n**Beyond NCERT:**\n- Inorganic correlations\n- Organic applications\n\n**Competition Edge:**\n- Time-efficient approaches\n- Pattern recognition",
    ],
    math: [
      "**Comprehensive Mastery: {topic}**\n\n**Solution:** {problem}\n\n**All Solution Methods:**\n1. Direct approach\n2. Substitution method\n3. Graphical interpretation\n4. Calculus-based (if applicable)\n\n**Advanced Variations:**\n- General case solutions\n- Special cases\n- Limiting behavior\n\n**JEE Advanced Prep:**\n- Integer-type questions\n- Matrix-match patterns\n\n**Mastery Path:** Build speed with timed practice",
      "**Master Level: {topic}**\n\n**Problem:** {problem}\n\n**Expert Insight:**\n- Underlying theory\n- Proof techniques\n\n**Extensions:**\n- Higher dimensions\n- Complex number analogues\n\n**Competition Tips:**\n- Pattern recognition\n- Elegant solutions",
    ],
    biology: [
      "**Comprehensive Mastery: {topic}**\n\n**Complete Explanation:** {problem}\n\n**Integrated Understanding:**\n1. Molecular level\n2. Cellular level\n3. Organism level\n4. Ecological perspective\n\n**NEET Mastery:**\n- Diagram-based analysis\n- Flow chart questions\n- Match-the-following\n\n**Beyond NCERT:**\n- Research connections\n- Medical applications\n\n**Study Strategy:** Create concept maps linking all related topics",
      "**Master Level: {topic}**\n\n**Topic:** {problem}\n\n**Expert Knowledge:**\n- Latest research findings\n- Clinical significance\n\n**Interdisciplinary Links:**\n- Physics of biology\n- Chemistry of life\n\n**Competition Edge:**\n- Olympiad-level depth\n- Assertion-reason mastery",
    ],
  },
};

const MODE_CONSTRAINTS: Record<TeachingMode, { entryLevel: HintLevel; maxLevel: HintLevel }> = {
  socratic: { entryLevel: 1, maxLevel: 3 },
  direct: { entryLevel: 6, maxLevel: 8 },
  scaffolded_direct: { entryLevel: 3, maxLevel: 8 },
  revision_mode: { entryLevel: 4, maxLevel: 6 },
  worked_example: { entryLevel: 5, maxLevel: 8 },
  analogical: { entryLevel: 2, maxLevel: 5 },
  case_study: { entryLevel: 4, maxLevel: 7 },
  spaced_retrieval: { entryLevel: 2, maxLevel: 5 },
  elaborative: { entryLevel: 1, maxLevel: 4 },
  metacognitive: { entryLevel: 2, maxLevel: 5 },
};

export class HintLadderSystem {
  private hintHistory: Map<string, HintLevel[]> = new Map();

  getHint(
    level: HintLevel,
    subject: SubjectCode,
    topic: string,
    problem: string
  ): string {
    const templates = this.getTemplateForLevel(level, subject);

    if (templates.length === 0) {
      return this.getDefaultHint(level, topic);
    }

    const template = templates[Math.floor(Math.random() * templates.length)];

    return template
      .replace(/\{topic\}/g, topic)
      .replace(/\{problem\}/g, problem);
  }

  escalate(currentLevel: HintLevel, mode: TeachingMode): HintLevel {
    const constraints = MODE_CONSTRAINTS[mode];

    if (!this.canEscalate(currentLevel, mode)) {
      return currentLevel;
    }

    const nextLevel = (currentLevel + 1) as HintLevel;

    if (currentLevel < constraints.entryLevel) {
      return constraints.entryLevel;
    }

    return Math.min(nextLevel, constraints.maxLevel) as HintLevel;
  }

  canEscalate(currentLevel: HintLevel, mode: TeachingMode): boolean {
    const constraints = MODE_CONSTRAINTS[mode];
    return currentLevel < constraints.maxLevel;
  }

  getTemplateForLevel(level: HintLevel, subject: SubjectCode): string[] {
    const levelTemplates = HINT_TEMPLATES[level];
    if (!levelTemplates) {
      return [];
    }

    return levelTemplates[subject] || [];
  }

  getLevelConfig(level: HintLevel): HintLevelConfig | undefined {
    return HINT_LEVEL_CONFIGS.find((config) => config.level === level);
  }

  getAllLevelConfigs(): HintLevelConfig[] {
    return [...HINT_LEVEL_CONFIGS];
  }

  getModeConstraints(mode: TeachingMode): { entryLevel: HintLevel; maxLevel: HintLevel } {
    return MODE_CONSTRAINTS[mode];
  }

  getEntryLevel(mode: TeachingMode): HintLevel {
    return MODE_CONSTRAINTS[mode].entryLevel;
  }

  recordHint(sessionId: string, level: HintLevel): void {
    const history = this.hintHistory.get(sessionId) || [];
    history.push(level);
    this.hintHistory.set(sessionId, history);
  }

  getHintHistory(sessionId: string): HintLevel[] {
    return this.hintHistory.get(sessionId) || [];
  }

  clearHintHistory(sessionId: string): void {
    this.hintHistory.delete(sessionId);
  }

  getHintsUsedCount(sessionId: string): number {
    return this.getHintHistory(sessionId).length;
  }

  getHighestHintUsed(sessionId: string): HintLevel | null {
    const history = this.getHintHistory(sessionId);
    if (history.length === 0) return null;
    return Math.max(...history) as HintLevel;
  }

  shouldOfferNextHint(sessionId: string, mode: TeachingMode): boolean {
    const history = this.getHintHistory(sessionId);
    if (history.length === 0) return true;

    const lastHint = history[history.length - 1];
    return this.canEscalate(lastHint, mode);
  }

  getNextRecommendedHint(sessionId: string, mode: TeachingMode): HintLevel {
    const history = this.getHintHistory(sessionId);

    if (history.length === 0) {
      return this.getEntryLevel(mode);
    }

    const lastHint = history[history.length - 1];
    return this.escalate(lastHint, mode);
  }

  private getDefaultHint(level: HintLevel, topic: string): string {
    const config = this.getLevelConfig(level);
    const name = config?.name || `Level ${level}`;

    switch (level) {
      case 1:
        return `Think about the core concept behind ${topic}. What principle governs this?`;
      case 2:
        return `Can you recall the main formula or equation related to ${topic}?`;
      case 3:
        return `Let's start with the first step. What do we know, and what's our target?`;
      case 4:
        return `Focus on the key relationship in the problem. What's the critical piece?`;
      case 5:
        return `Let me show you a similar solved example for ${topic}...`;
      case 6:
        return `Here's the complete solution with step-by-step explanation for ${topic}...`;
      case 7:
        return `Extended analysis for ${topic} with JEE/NEET exam strategies, common pitfalls, and verification tips...`;
      case 8:
        return `Comprehensive mastery guide for ${topic} with all solution approaches, variations, extensions, and competition-level prep...`;
      default:
        return `${name}: Here's a hint for ${topic}`;
    }
  }

  buildHintTemplate(level: HintLevel, subject: SubjectCode): HintTemplate {
    const config = this.getLevelConfig(level);

    return {
      level,
      name: config?.name || `Level ${level}`,
      description: config?.description || '',
      templates: {
        physics: HINT_TEMPLATES[level]?.physics || [],
        chemistry: HINT_TEMPLATES[level]?.chemistry || [],
        math: HINT_TEMPLATES[level]?.math || [],
        biology: HINT_TEMPLATES[level]?.biology || [],
      },
    };
  }
}

export const hintLadderSystem = new HintLadderSystem();
