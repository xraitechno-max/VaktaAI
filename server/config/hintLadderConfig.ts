import type { HintLevel, SubjectCode } from '@shared/schema';

export interface HintTemplate {
  level: HintLevel;
  name: string;
  description: string;
  purpose: string;
  subjectTemplates: Record<SubjectCode, string>;
  genericTemplate: string;
  revealAmount: string;
  nextAction: string;
}

export interface HintLadderConfiguration {
  levels: Record<HintLevel, HintTemplate>;
  progressionRules: {
    minTimeBetweenLevels: number;
    maxHintsPerProblem: number;
    autoProgressAfterAttempts: number;
  };
  emotionalAdjustments: {
    frustrated: string;
    confused: string;
    confident: string;
  };
}

export const HINT_LADDER_CONFIG: HintLadderConfiguration = {
  levels: {
    1: {
      level: 1,
      name: 'Conceptual Question',
      description: 'Ask a broad question to activate relevant thinking',
      purpose: 'Get student to identify the concept area without giving direction',
      subjectTemplates: {
        physics: "Sochiye, is situation mein konsi force kaam kar rahi hai? Ya konsa physical principle apply hoga?",
        chemistry: "Reaction mein electron ka flow kis direction mein hoga? Konsa atom electron dega aur konsa lega?",
        math: "Is equation ka pattern kya hai? Kya ye kisi familiar form jaisa lag raha hai?",
        biology: "Ye process body mein kab aur kyun hoti hai? Iska biological significance kya hai?"
      },
      genericTemplate: "Pehle sochiye - is problem mein main concept kya hai? Kya aapko kuch familiar lag raha hai?",
      revealAmount: 'Concept category only - no specific formulas or methods',
      nextAction: 'Wait for student to identify the concept area before proceeding'
    },

    2: {
      level: 2,
      name: 'Formula/Principle Recall',
      description: 'Guide student to recall the relevant formula or principle',
      purpose: 'Narrow down to specific formula without revealing it',
      subjectTemplates: {
        physics: "Newton's laws mein se kaunsa apply hoga yahan? Ya motion ke konse equations kaam aayenge?",
        chemistry: "Periodic table mein electronegativity ka trend yaad hai? Left to right aur top to bottom kya hota hai?",
        math: "Iske liye kaunsa formula use hoga? Hint: quadratic form ki taraf dekho...",
        biology: "Ye cycle ke kitne steps hain? Key enzymes konse hain jo ye process regulate karte hain?"
      },
      genericTemplate: "Kaunsa formula ya principle yahan apply hoga? Sochiye kaunsi chapter se ye concept hai.",
      revealAmount: 'Hint toward formula family without giving exact formula',
      nextAction: 'Wait for student to recall or attempt to state the formula'
    },

    3: {
      level: 3,
      name: 'First Step Scaffold',
      description: 'Provide the first step to get student started',
      purpose: 'Show how to begin without solving the problem',
      subjectTemplates: {
        physics: "Pehle Free Body Diagram banate hain. Gravity kahan point karegi? Aur kaunsi aur forces hain?",
        chemistry: "Let's start with identifying nucleophile and electrophile. Konsa atom electron-rich hai?",
        math: "First step: Let x = something appropriate. Ab isko equation mein substitute karo aur dekho kya milta hai.",
        biology: "Diagram mein sabse pehle konsa structure banayenge? Central organelle se shuru karte hain."
      },
      genericTemplate: "Chalo first step se shuru karte hain. Sabse pehle hum [action] karenge. Try karo.",
      revealAmount: 'First step of solution approach',
      nextAction: 'Wait for student to complete first step and show their work'
    },

    4: {
      level: 4,
      name: 'Targeted Hint',
      description: 'Provide specific guidance for the current stuck point',
      purpose: 'Address exact point where student is struggling',
      subjectTemplates: {
        physics: "Acceleration nikalne ke baad, v = u + at use karo. Initial velocity u = 0 hai kyunki rest se start hua.",
        chemistry: "Carbocation stability check karo - tertiary vs secondary. Tertiary zyada stable hai due to hyperconjugation.",
        math: "Cross-multiply karne ke baad, left side ko simplify karo. Common factor nikalo pehle.",
        biology: "Krebs cycle mein 2 carbon enter hote hain as Acetyl-CoA. Citrate 6-carbon compound hai."
      },
      genericTemplate: "Is specific step pe focus karo: [specific guidance]. Ye karne ke baad next step clear ho jayega.",
      revealAmount: 'Specific intermediate step with reasoning',
      nextAction: 'Wait for student to apply hint and continue solving'
    },

    5: {
      level: 5,
      name: 'Worked Example',
      description: 'Show a similar problem solved step-by-step',
      purpose: 'Demonstrate solving approach with parallel problem',
      subjectTemplates: {
        physics: "Dekho ek similar problem: A ball is dropped from 20m height. Step 1: u=0, g=10m/s². Step 2: Use h=½gt². Step 3: t=2s. Now your problem has different height - apply same steps.",
        chemistry: "Similar reaction dekho: CH₃Br + OH⁻ → CH₃OH + Br⁻. Step 1: OH⁻ is nucleophile. Step 2: Attacks carbon. Step 3: Br⁻ leaves. Your reaction follows same SN2 pattern.",
        math: "Similar problem: Solve x² + 5x + 6 = 0. Step 1: Factor as (x+2)(x+3)=0. Step 2: x=-2 or x=-3. Now apply to your equation with different coefficients.",
        biology: "Similar diagram: Heart structure - Step 1: Draw 4 chambers. Step 2: Label valves. Step 3: Show blood flow. Your diagram uses same approach for different organ."
      },
      genericTemplate: "Dekho ye similar problem kaise solve hota hai:\n\nProblem: [similar problem]\nStep 1: [first step]\nStep 2: [second step]\nStep 3: [conclusion]\n\nAb tumhara problem same pattern se solve karo.",
      revealAmount: 'Full solution of similar problem, student applies to their problem',
      nextAction: 'Student should now solve their original problem using demonstrated pattern'
    },

    6: {
      level: 6,
      name: 'Direct Explanation',
      description: 'Provide complete solution with detailed explanation',
      purpose: 'Full teaching when student needs complete guidance',
      subjectTemplates: {
        physics: "Complete solution with full explanation. Every step shown with reasoning. Key physics principles highlighted.",
        chemistry: "Complete mechanism with electron flow. Every arrow explained. Key chemistry concepts summarized.",
        math: "Complete step-by-step solution. Every algebraic manipulation shown. Key mathematical techniques highlighted.",
        biology: "Complete answer with diagram. Every part labeled. Key biological concepts summarized."
      },
      genericTemplate: "Chalo main poora solution explain karti hoon:\n\nComplete Solution:\n[Full step-by-step with explanation]\n\nKey Points to Remember:\n[Summary of important concepts]\n\nPractice Problem:\n[Similar problem for student to try independently]",
      revealAmount: 'Complete solution with explanation and practice problem',
      nextAction: 'Provide practice problem to ensure student can apply learning'
    }
  },

  progressionRules: {
    minTimeBetweenLevels: 30000,
    maxHintsPerProblem: 6,
    autoProgressAfterAttempts: 2
  },

  emotionalAdjustments: {
    frustrated: "Take it easy! Ye problem tricky hai. Let me give you a more direct hint this time.",
    confused: "Koi baat nahi, let's break this down more simply. Ek step at a time.",
    confident: "Good thinking! Here's a small nudge to help you finish strong."
  }
};

export function getHintTemplate(level: HintLevel, subject: SubjectCode): string {
  const template = HINT_LADDER_CONFIG.levels[level];
  return template.subjectTemplates[subject] || template.genericTemplate;
}

export function getNextHintLevel(currentLevel: HintLevel): HintLevel | null {
  if (currentLevel >= 6) return null;
  return (currentLevel + 1) as HintLevel;
}

export function getPreviousHintLevel(currentLevel: HintLevel): HintLevel | null {
  if (currentLevel <= 1) return null;
  return (currentLevel - 1) as HintLevel;
}

export function canProgressToNextLevel(
  currentLevel: HintLevel,
  lastHintTimestamp: number,
  totalHintsUsed: number
): { allowed: boolean; reason?: string } {
  const { progressionRules } = HINT_LADDER_CONFIG;
  
  if (currentLevel >= 6) {
    return {
      allowed: false,
      reason: 'Maximum hint level reached. Solution has been fully explained.'
    };
  }

  if (totalHintsUsed >= progressionRules.maxHintsPerProblem) {
    return {
      allowed: false,
      reason: 'Maximum hints for this problem reached. Try solving with what you have!'
    };
  }

  const timeSinceLastHint = Date.now() - lastHintTimestamp;
  if (timeSinceLastHint < progressionRules.minTimeBetweenLevels) {
    const waitSeconds = Math.ceil((progressionRules.minTimeBetweenLevels - timeSinceLastHint) / 1000);
    return {
      allowed: false,
      reason: `Take ${waitSeconds} more seconds to think about the previous hint first!`
    };
  }

  return { allowed: true };
}

export function getHintWithEmotionalAdjustment(
  level: HintLevel,
  subject: SubjectCode,
  emotionalState: 'frustrated' | 'confused' | 'confident' | 'neutral'
): string {
  const baseHint = getHintTemplate(level, subject);
  
  if (emotionalState === 'neutral') {
    return baseHint;
  }

  const adjustment = HINT_LADDER_CONFIG.emotionalAdjustments[emotionalState as keyof typeof HINT_LADDER_CONFIG.emotionalAdjustments];
  
  if (adjustment) {
    return `${adjustment}\n\n${baseHint}`;
  }

  return baseHint;
}

export function buildHintLadderPromptGuidance(currentLevel: HintLevel): string {
  const template = HINT_LADDER_CONFIG.levels[currentLevel];
  
  return `
HINT LADDER - Level ${currentLevel}: ${template.name}

Purpose: ${template.purpose}
Reveal Amount: ${template.revealAmount}

Guidelines:
${template.description}

Next Action: ${template.nextAction}

CRITICAL: Do NOT skip levels or reveal more than specified for this level.
`.trim();
}

export function getHintProgressionSummary(hintsGiven: Array<{ level: HintLevel; content: string }>): string {
  if (hintsGiven.length === 0) {
    return 'No hints given yet. Start with Level 1 (Conceptual Question).';
  }

  const summary = hintsGiven.map((hint, index) => {
    const template = HINT_LADDER_CONFIG.levels[hint.level];
    return `Hint ${index + 1} (L${hint.level} - ${template.name}): ${hint.content.substring(0, 50)}...`;
  }).join('\n');

  const currentLevel = hintsGiven[hintsGiven.length - 1].level;
  const nextLevel = getNextHintLevel(currentLevel);
  
  return `
Hints Given:
${summary}

Current Level: ${currentLevel}
Next Level Available: ${nextLevel || 'Maximum reached'}
`.trim();
}
