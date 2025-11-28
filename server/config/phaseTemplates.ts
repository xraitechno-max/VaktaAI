// Phase Template Library - 7 Phase Conversation Flow
// Each phase has time-based variants and natural Hinglish conversation flows

export interface PhaseTemplate {
  phase: string;
  duration: string;
  goal: string;
  variants: TemplateVariant[];
}

export interface TemplateVariant {
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  language?: 'english' | 'hinglish'; // Language preference
  context?: string;
  text: string;
  emotion: string;
  requiresResponse?: boolean;
  nextPhase?: string;
}

// Phase 1: Greeting (0-30 seconds)
// NEW FORMAT: Structured introduction with methodology explanation and initial assessment questions
export const GREETING_TEMPLATES: PhaseTemplate = {
  phase: 'greeting',
  duration: '0-30 seconds',
  goal: 'Warm welcome with tutor methodology and initial assessment questions',
  variants: [
    // English - Classes 6-8 (Foundation)
    {
      timeOfDay: 'morning',
      language: 'english',
      context: 'foundation',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. I'm here to help you really understand {topic}, not just get answers.

Here's how our sessions will work:
- I'll ask you small, focused questions (one at a time)
- I won't just give you final answers - instead, we'll think through them together
- I'll explain things at a level that fits Class {currentClass}, and we'll adjust based on how you're feeling
- We'll check understanding as we go, so nothing piles up and gets confusing

Before we dive into {topic}, I want to get a quick sense of where you are.

Have you seen {topic} before? If yes, can you tell me what you remember (even if you're not sure it's correct)?
What's your goal for today: understanding the concept, solving problems, or preparing for a test?

Answer either or both, and we'll start from there, step by step.`,
      emotion: 'enthusiastic',
      requiresResponse: true
    },
    // Hinglish - Classes 6-8 (Foundation)
    {
      timeOfDay: 'morning',
      language: 'hinglish',
      context: 'foundation',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Main yahan tumhe {topic} sach mein samjhane ke liye hoon, sirf answers dene ke liye nahi.

Humare sessions aise chalenge:
- Main tumse chhote, focused questions puchchungi (ek time pe ek)
- Main direct answers nahi dungi - hum saath mein sochenge
- Main Class {currentClass} ke level pe explain karungi, aur tumhari feeling ke hisaab se adjust karungi
- Har step pe understanding check karenge, taaki kuch confusing na ho

{topic} shuru karne se pehle, mujhe jaanna hai tum kahaan ho.

Kya tumne {topic} pehle dekha hai? Agar haan, toh jo yaad hai wo batao (galat bhi ho toh chalega)?
Aaj ka goal kya hai: concept samajhna, problems solve karna, ya test ki prep?

Dono mein se koi bhi answer do, aur hum wahi se step by step shuru karenge.`,
      emotion: 'enthusiastic',
      requiresResponse: true
    },
    // English - Classes 9-10 (Board Prep)
    {
      timeOfDay: 'morning',
      language: 'english',
      context: 'board_prep',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. I'm here to help you really understand {topic}, not just memorize for boards.

Here's how our sessions will work:
- I'll ask you small, focused questions (one at a time)
- I won't just give you final answers - instead, we'll think through them together
- I'll explain things at a level that fits Class {currentClass} board prep, and we'll adjust based on how you're feeling
- We'll check understanding as we go, so nothing piles up and gets confusing

{topic} is important for your {examTarget} - it appears frequently in exams!

Before we start, I want to understand where you are:

Have you studied {topic} before? If yes, can you write what you remember (even if you're not sure it's correct)?
What's your goal for today with {topic}: understanding the concept, solving numerical problems, or preparing for boards?

Answer either or both, and we'll start from there, step by step.`,
      emotion: 'enthusiastic',
      requiresResponse: true
    },
    // Hinglish - Classes 9-10 (Board Prep)
    {
      timeOfDay: 'morning',
      language: 'hinglish',
      context: 'board_prep',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Main yahan tumhe {topic} sach mein samjhane ke liye hoon, sirf boards ke liye ratta lagane nahi.

Humare sessions aise chalenge:
- Main tumse chhote, focused questions puchchungi (ek time pe ek)
- Main direct answers nahi dungi - hum saath mein sochenge
- Main Class {currentClass} board prep ke level pe explain karungi
- Har step pe understanding check karenge, taaki kuch confusing na ho

{topic} tumhare {examTarget} ke liye important hai - exams mein frequently aata hai!

Shuru karne se pehle, mujhe jaanna hai:

Kya {topic} pehle padha hai? Agar haan, toh jo yaad hai wo batao (galat bhi ho toh chalega)?
Aaj ka goal kya hai: concept samajhna, numerical solve karna, ya boards ki prep?

Koi bhi answer do, aur hum wahi se step by step shuru karenge.`,
      emotion: 'enthusiastic',
      requiresResponse: true
    },
    // English - Classes 11-12 (Competitive)
    {
      timeOfDay: 'morning',
      language: 'english',
      context: 'competitive',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. I'm here to help you truly master {topic}, not just solve problems mechanically.

Here's how our sessions will work:
- I'll ask you focused questions (one at a time) to build deep understanding
- I won't just give you final answers - we'll think through them together
- I'll explain at {examTarget} level, covering both concepts and shortcuts
- We'll check understanding at each step, so nothing gets confusing

{topic} is crucial for {examTarget} - it tests both conceptual depth and problem-solving speed!

Before we dive in, I want to understand where you stand:

Have you studied {topic} before? If yes, can you write the key formula/concept you remember (even if unsure)?
What's your goal today: understanding the concept deeply, solving advanced problems, or exam-level practice?

Answer either or both, and we'll start from there, step by step.`,
      emotion: 'enthusiastic',
      requiresResponse: true
    },
    // Hinglish - Classes 11-12 (Competitive)
    {
      timeOfDay: 'morning',
      language: 'hinglish',
      context: 'competitive',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Main yahan {topic} sach mein master karne mein help karungi, sirf mechanically problems solve karne ke liye nahi.

Humare sessions aise chalenge:
- Main focused questions puchchungi (ek time pe ek) deep understanding ke liye
- Main direct answers nahi dungi - hum saath mein sochenge
- Main {examTarget} level pe explain karungi, concepts aur shortcuts dono cover karenge
- Har step pe understanding check karenge

{topic} {examTarget} ke liye bahut crucial hai - conceptual depth aur speed dono test hoti hai!

Shuru karne se pehle, mujhe jaanna hai:

Kya {topic} pehle padha hai? Agar haan, toh key formula/concept batao (unsure bhi ho toh chalega)?
Aaj ka goal kya hai: concept deeply samajhna, advanced problems solve karna, ya exam-level practice?

Koi bhi answer do, aur hum wahi se step by step shuru karenge.`,
      emotion: 'enthusiastic',
      requiresResponse: true
    },
    // English - Dropper (Comeback)
    {
      timeOfDay: 'morning',
      language: 'english',
      context: 'dropper',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. This is YOUR year, and I'm here to help you truly master {topic}, not just revise quickly.

Here's how our sessions will work:
- I'll ask you focused questions to identify and fill gaps
- I won't just give you answers - we'll build solid understanding together
- I'll explain at {examTarget} level with exam-focused strategies
- We'll check understanding at each step, targeting weak areas

{topic} is important for {examTarget} - getting this right can make a big difference!

Before we start, I want to understand your current level:

Have you studied {topic} before? What do you remember (even if it feels incomplete)?
What's your goal today: clearing concepts, solving tough problems, or exam simulation?

Answer either or both, and we'll start from there, step by step. Let's make this count!`,
      emotion: 'encouraging',
      requiresResponse: true
    },
    // Hinglish - Dropper (Comeback)
    {
      timeOfDay: 'morning',
      language: 'hinglish',
      context: 'dropper',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Ye TUMHARA saal hai, aur main {topic} sach mein master karne mein help karungi, sirf quick revision nahi.

Humare sessions aise chalenge:
- Main focused questions puchchungi gaps identify aur fill karne ke liye
- Main direct answers nahi dungi - hum saath mein solid understanding banayenge
- Main {examTarget} level pe explain karungi with exam-focused strategies
- Har step pe understanding check karenge, weak areas target karenge

{topic} {examTarget} ke liye important hai - isko sahi karna big difference la sakta hai!

Shuru karne se pehle, tumhara current level jaanna hai:

Kya {topic} pehle padha hai? Jo yaad hai wo batao (incomplete feel ho toh bhi)?
Aaj ka goal kya hai: concepts clear karna, tough problems solve karna, ya exam simulation?

Koi bhi answer do, aur hum wahi se step by step shuru karenge. Let's make this count!`,
      emotion: 'encouraging',
      requiresResponse: true
    },
    // Afternoon/Evening variants - Same structured format
    {
      timeOfDay: 'afternoon',
      language: 'english',
      context: 'foundation',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. I'm here to help you really understand {topic}, not just get answers.

Here's how our sessions will work:
- I'll ask you small, focused questions (one at a time)
- I won't just give you final answers - instead, we'll think through them together
- I'll explain things at a level that fits Class {currentClass}, and we'll adjust based on how you're feeling
- We'll check understanding as we go, so nothing piles up and gets confusing

Before we dive into {topic}, I want to get a quick sense of where you are.

Have you seen {topic} before? If yes, can you tell me what you remember (even if you're not sure it's correct)?
What's your goal for today: understanding the concept, solving problems, or preparing for a test?

Answer either or both, and we'll start from there, step by step.`,
      emotion: 'friendly',
      requiresResponse: true
    },
    {
      timeOfDay: 'afternoon',
      language: 'hinglish',
      context: 'foundation',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Main yahan tumhe {topic} sach mein samjhane ke liye hoon, sirf answers dene ke liye nahi.

Humare sessions aise chalenge:
- Main tumse chhote, focused questions puchchungi (ek time pe ek)
- Main direct answers nahi dungi - hum saath mein sochenge
- Main Class {currentClass} ke level pe explain karungi, aur tumhari feeling ke hisaab se adjust karungi
- Har step pe understanding check karenge, taaki kuch confusing na ho

{topic} shuru karne se pehle, mujhe jaanna hai tum kahaan ho.

Kya tumne {topic} pehle dekha hai? Agar haan, toh jo yaad hai wo batao (galat bhi ho toh chalega)?
Aaj ka goal kya hai: concept samajhna, problems solve karna, ya test ki prep?

Dono mein se koi bhi answer do, aur hum wahi se step by step shuru karenge.`,
      emotion: 'friendly',
      requiresResponse: true
    },
    // Evening foundation variants
    {
      timeOfDay: 'evening',
      language: 'english',
      context: 'foundation',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. I'm here to help you really understand {topic}, not just get answers.

Here's how our sessions will work:
- I'll ask you small, focused questions (one at a time)
- I won't just give you final answers - instead, we'll think through them together
- I'll explain things at a level that fits Class {currentClass}, and we'll adjust based on how you're feeling
- We'll check understanding as we go, so nothing piles up and gets confusing

Before we dive into {topic}, I want to get a quick sense of where you are.

Have you seen {topic} before? If yes, can you tell me what you remember (even if you're not sure it's correct)?
What's your goal for today: understanding the concept, solving problems, or preparing for a test?

Answer either or both, and we'll start from there, step by step.`,
      emotion: 'excited',
      requiresResponse: true
    },
    {
      timeOfDay: 'evening',
      language: 'hinglish',
      context: 'foundation',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Main yahan tumhe {topic} sach mein samjhane ke liye hoon, sirf answers dene ke liye nahi.

Humare sessions aise chalenge:
- Main tumse chhote, focused questions puchchungi (ek time pe ek)
- Main direct answers nahi dungi - hum saath mein sochenge
- Main Class {currentClass} ke level pe explain karungi, aur tumhari feeling ke hisaab se adjust karungi
- Har step pe understanding check karenge, taaki kuch confusing na ho

{topic} shuru karne se pehle, mujhe jaanna hai tum kahaan ho.

Kya tumne {topic} pehle dekha hai? Agar haan, toh jo yaad hai wo batao (galat bhi ho toh chalega)?
Aaj ka goal kya hai: concept samajhna, problems solve karna, ya test ki prep?

Dono mein se koi bhi answer do, aur hum wahi se step by step shuru karenge.`,
      emotion: 'excited',
      requiresResponse: true
    },
    // Afternoon competitive variants
    {
      timeOfDay: 'afternoon',
      language: 'english',
      context: 'competitive',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. I'm here to help you truly master {topic}, not just solve problems mechanically.

Here's how our sessions will work:
- I'll ask you focused questions (one at a time) to build deep understanding
- I won't just give you final answers - we'll think through them together
- I'll explain at {examTarget} level, covering both concepts and shortcuts
- We'll check understanding at each step, so nothing gets confusing

{topic} is crucial for {examTarget} - it tests both conceptual depth and problem-solving speed!

Before we dive in, I want to understand where you stand:

Have you studied {topic} before? If yes, can you write the key formula/concept you remember (even if unsure)?
What's your goal today: understanding the concept deeply, solving advanced problems, or exam-level practice?

Answer either or both, and we'll start from there, step by step.`,
      emotion: 'friendly',
      requiresResponse: true
    },
    {
      timeOfDay: 'afternoon',
      language: 'hinglish',
      context: 'competitive',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Main yahan {topic} sach mein master karne mein help karungi, sirf mechanically problems solve karne ke liye nahi.

Humare sessions aise chalenge:
- Main focused questions puchchungi (ek time pe ek) deep understanding ke liye
- Main direct answers nahi dungi - hum saath mein sochenge
- Main {examTarget} level pe explain karungi, concepts aur shortcuts dono cover karenge
- Har step pe understanding check karenge

{topic} {examTarget} ke liye bahut crucial hai - conceptual depth aur speed dono test hoti hai!

Shuru karne se pehle, mujhe jaanna hai:

Kya {topic} pehle padha hai? Agar haan, toh key formula/concept batao (unsure bhi ho toh chalega)?
Aaj ka goal kya hai: concept deeply samajhna, advanced problems solve karna, ya exam-level practice?

Koi bhi answer do, aur hum wahi se step by step shuru karenge.`,
      emotion: 'friendly',
      requiresResponse: true
    },
    {
      timeOfDay: 'evening',
      language: 'english',
      context: 'competitive',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. I'm here to help you truly master {topic}, not just solve problems mechanically.

Here's how our sessions will work:
- I'll ask you focused questions (one at a time) to build deep understanding
- I won't just give you final answers - we'll think through them together
- I'll explain at {examTarget} level, covering both concepts and shortcuts
- We'll check understanding at each step, so nothing gets confusing

{topic} is crucial for {examTarget} - it tests both conceptual depth and problem-solving speed!

Before we dive in, I want to understand where you stand:

Have you studied {topic} before? If yes, can you write the key formula/concept you remember (even if unsure)?
What's your goal today: understanding the concept deeply, solving advanced problems, or exam-level practice?

Answer either or both, and we'll start from there, step by step.`,
      emotion: 'excited',
      requiresResponse: true
    },
    {
      timeOfDay: 'evening',
      language: 'hinglish',
      context: 'competitive',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Main yahan {topic} sach mein master karne mein help karungi, sirf mechanically problems solve karne ke liye nahi.

Humare sessions aise chalenge:
- Main focused questions puchchungi (ek time pe ek) deep understanding ke liye
- Main direct answers nahi dungi - hum saath mein sochenge
- Main {examTarget} level pe explain karungi, concepts aur shortcuts dono cover karenge
- Har step pe understanding check karenge

{topic} {examTarget} ke liye bahut crucial hai - conceptual depth aur speed dono test hoti hai!

Shuru karne se pehle, mujhe jaanna hai:

Kya {topic} pehle padha hai? Agar haan, toh key formula/concept batao (unsure bhi ho toh chalega)?
Aaj ka goal kya hai: concept deeply samajhna, advanced problems solve karna, ya exam-level practice?

Koi bhi answer do, aur hum wahi se step by step shuru karenge.`,
      emotion: 'excited',
      requiresResponse: true
    },
    // Additional afternoon/evening variants for board_prep and dropper
    {
      timeOfDay: 'afternoon',
      language: 'english',
      context: 'board_prep',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. I'm here to help you really understand {topic}, not just memorize for boards.

Here's how our sessions will work:
- I'll ask you small, focused questions (one at a time)
- I won't just give you final answers - instead, we'll think through them together
- I'll explain things at a level that fits Class {currentClass} board prep, and we'll adjust based on how you're feeling
- We'll check understanding as we go, so nothing piles up and gets confusing

{topic} is important for your {examTarget} - it appears frequently in exams!

Before we start, I want to understand where you are:

Have you studied {topic} before? If yes, can you write what you remember (even if you're not sure it's correct)?
What's your goal for today with {topic}: understanding the concept, solving numerical problems, or preparing for boards?

Answer either or both, and we'll start from there, step by step.`,
      emotion: 'friendly',
      requiresResponse: true
    },
    {
      timeOfDay: 'afternoon',
      language: 'hinglish',
      context: 'board_prep',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Main yahan tumhe {topic} sach mein samjhane ke liye hoon, sirf boards ke liye ratta lagane nahi.

Humare sessions aise chalenge:
- Main tumse chhote, focused questions puchchungi (ek time pe ek)
- Main direct answers nahi dungi - hum saath mein sochenge
- Main Class {currentClass} board prep ke level pe explain karungi
- Har step pe understanding check karenge, taaki kuch confusing na ho

{topic} tumhare {examTarget} ke liye important hai - exams mein frequently aata hai!

Shuru karne se pehle, mujhe jaanna hai:

Kya {topic} pehle padha hai? Agar haan, toh jo yaad hai wo batao (galat bhi ho toh chalega)?
Aaj ka goal kya hai: concept samajhna, numerical solve karna, ya boards ki prep?

Koi bhi answer do, aur hum wahi se step by step shuru karenge.`,
      emotion: 'friendly',
      requiresResponse: true
    },
    {
      timeOfDay: 'evening',
      language: 'english',
      context: 'board_prep',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. I'm here to help you really understand {topic}, not just memorize for boards.

Here's how our sessions will work:
- I'll ask you small, focused questions (one at a time)
- I won't just give you final answers - instead, we'll think through them together
- I'll explain things at a level that fits Class {currentClass} board prep, and we'll adjust based on how you're feeling
- We'll check understanding as we go, so nothing piles up and gets confusing

{topic} is important for your {examTarget} - it appears frequently in exams!

Before we start, I want to understand where you are:

Have you studied {topic} before? If yes, can you write what you remember (even if you're not sure it's correct)?
What's your goal for today with {topic}: understanding the concept, solving numerical problems, or preparing for boards?

Answer either or both, and we'll start from there, step by step.`,
      emotion: 'excited',
      requiresResponse: true
    },
    {
      timeOfDay: 'evening',
      language: 'hinglish',
      context: 'board_prep',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Main yahan tumhe {topic} sach mein samjhane ke liye hoon, sirf boards ke liye ratta lagane nahi.

Humare sessions aise chalenge:
- Main tumse chhote, focused questions puchchungi (ek time pe ek)
- Main direct answers nahi dungi - hum saath mein sochenge
- Main Class {currentClass} board prep ke level pe explain karungi
- Har step pe understanding check karenge, taaki kuch confusing na ho

{topic} tumhare {examTarget} ke liye important hai - exams mein frequently aata hai!

Shuru karne se pehle, mujhe jaanna hai:

Kya {topic} pehle padha hai? Agar haan, toh jo yaad hai wo batao (galat bhi ho toh chalega)?
Aaj ka goal kya hai: concept samajhna, numerical solve karna, ya boards ki prep?

Koi bhi answer do, aur hum wahi se step by step shuru karenge.`,
      emotion: 'excited',
      requiresResponse: true
    },
    {
      timeOfDay: 'afternoon',
      language: 'english',
      context: 'dropper',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. This is YOUR year, and I'm here to help you truly master {topic}, not just revise quickly.

Here's how our sessions will work:
- I'll ask you focused questions to identify and fill gaps
- I won't just give you answers - we'll build solid understanding together
- I'll explain at {examTarget} level with exam-focused strategies
- We'll check understanding at each step, targeting weak areas

{topic} is important for {examTarget} - getting this right can make a big difference!

Before we start, I want to understand your current level:

Have you studied {topic} before? What do you remember (even if it feels incomplete)?
What's your goal today: clearing concepts, solving tough problems, or exam simulation?

Answer either or both, and we'll start from there, step by step. Let's make this count!`,
      emotion: 'encouraging',
      requiresResponse: true
    },
    {
      timeOfDay: 'afternoon',
      language: 'hinglish',
      context: 'dropper',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Ye TUMHARA saal hai, aur main {topic} sach mein master karne mein help karungi, sirf quick revision nahi.

Humare sessions aise chalenge:
- Main focused questions puchchungi gaps identify aur fill karne ke liye
- Main direct answers nahi dungi - hum saath mein solid understanding banayenge
- Main {examTarget} level pe explain karungi with exam-focused strategies
- Har step pe understanding check karenge, weak areas target karenge

{topic} {examTarget} ke liye important hai - isko sahi karna big difference la sakta hai!

Shuru karne se pehle, tumhara current level jaanna hai:

Kya {topic} pehle padha hai? Jo yaad hai wo batao (incomplete feel ho toh bhi)?
Aaj ka goal kya hai: concepts clear karna, tough problems solve karna, ya exam simulation?

Koi bhi answer do, aur hum wahi se step by step shuru karenge. Let's make this count!`,
      emotion: 'encouraging',
      requiresResponse: true
    },
    {
      timeOfDay: 'evening',
      language: 'english',
      context: 'dropper',
      text: `Hi {studentName}, I'm {teacherName}, your AI tutor. This is YOUR year, and I'm here to help you truly master {topic}, not just revise quickly.

Here's how our sessions will work:
- I'll ask you focused questions to identify and fill gaps
- I won't just give you answers - we'll build solid understanding together
- I'll explain at {examTarget} level with exam-focused strategies
- We'll check understanding at each step, targeting weak areas

{topic} is important for {examTarget} - getting this right can make a big difference!

Before we start, I want to understand your current level:

Have you studied {topic} before? What do you remember (even if it feels incomplete)?
What's your goal today: clearing concepts, solving tough problems, or exam simulation?

Answer either or both, and we'll start from there, step by step. Let's make this count!`,
      emotion: 'encouraging',
      requiresResponse: true
    },
    {
      timeOfDay: 'evening',
      language: 'hinglish',
      context: 'dropper',
      text: `Hi {studentName}, main {teacherName} hoon, tumhari AI tutor. Ye TUMHARA saal hai, aur main {topic} sach mein master karne mein help karungi, sirf quick revision nahi.

Humare sessions aise chalenge:
- Main focused questions puchchungi gaps identify aur fill karne ke liye
- Main direct answers nahi dungi - hum saath mein solid understanding banayenge
- Main {examTarget} level pe explain karungi with exam-focused strategies
- Har step pe understanding check karenge, weak areas target karenge

{topic} {examTarget} ke liye important hai - isko sahi karna big difference la sakta hai!

Shuru karne se pehle, tumhara current level jaanna hai:

Kya {topic} pehle padha hai? Jo yaad hai wo batao (incomplete feel ho toh bhi)?
Aaj ka goal kya hai: concepts clear karna, tough problems solve karna, ya exam simulation?

Koi bhi answer do, aur hum wahi se step by step shuru karenge. Let's make this count!`,
      emotion: 'encouraging',
      requiresResponse: true
    }
  ]
};

// Phase 2: Rapport Building (30-60 seconds)
export const RAPPORT_TEMPLATES: PhaseTemplate = {
  phase: 'rapport',
  duration: '30-60 seconds',
  goal: 'Build connection using exam goal and class level',
  variants: [
    {
      context: 'jee',
      text: `{studentName}, JEE! Great choice! 🎯

Physics, Chemistry, Maths - sabhi important hain.
{currentClass} mein ho, matlab strong foundation banana hai.

Aaj ka topic {topic} - ye JEE mein bahut zaroori hai.
Questions frequently aate hain!

Ek baat batao - {topic} ke baare mein pehle se kuch pata hai?`,
      emotion: 'encouraging',
      requiresResponse: true,
      nextPhase: 'assessment'
    },
    {
      context: 'neet',
      text: `{studentName}, NEET preparation! Excellent! 🩺

Biology aur Chemistry par strong grip chahiye.
{currentClass} mein basic concepts clear karna zaroori hai.

{topic} NEET mein frequently aata hai.
Conceptual clarity pe focus karenge.

Quick question - ye topic pehle padha hai?`,
      emotion: 'friendly',
      requiresResponse: true,
      nextPhase: 'assessment'
    },
    {
      context: 'boards',
      text: `{studentName}, Boards ki prep! Perfect! 📖

{currentClass} boards ke liye {topic} bahut important hai.
Conceptual understanding aur problem solving - dono pe dhyan denge.

Main tumhe step by step sikhaunga.

Batao - is topic ke baare mein kitna jaante ho?`,
      emotion: 'teaching',
      requiresResponse: true,
      nextPhase: 'assessment'
    }
  ]
};

// Phase 3: Level Assessment (1-2 minutes)
export const ASSESSMENT_TEMPLATES: PhaseTemplate = {
  phase: 'assessment',
  duration: '1-2 minutes',
  goal: 'Diagnose student level through self-assessment and quick diagnostic',
  variants: [
    {
      context: 'self_assessment',
      text: `Theek hai {studentName}! Ab ek important step. 🤔

{topic} ke baare mein tumhari understanding kya hai?

👉 Option 1: Bilkul naya topic - pehli baar sun raha hoon
👉 Option 2: Thoda bahut pata hai, yaad nahi proper
👉 Option 3: Basics clear hain, practice chahiye
👉 Option 4: Confident hoon, tough questions solve kar sakta hoon

Honest answer do, taaki main tumhare level ke hisaab se sikha sakun!`,
      emotion: 'curious',
      requiresResponse: true
    },
    {
      context: 'diagnostic_beginner',
      text: `Accha! Ek quick check karte hain. 🧪

{diagnosticQuestion}

Tension mat lo - ye sirf understanding check karne ke liye hai!
Wrong answer bhi theek hai - hum seekhne aaye hain! 😊`,
      emotion: 'encouraging',
      requiresResponse: true
    },
    {
      context: 'diagnostic_intermediate',
      text: `Great! Ek moderate level question try karte hain. 💡

{diagnosticQuestion}

Apne words mein explain karo, calculation ki zaroorat nahi!
Main tumhari thinking samajhna chahta hoon.`,
      emotion: 'teaching',
      requiresResponse: true
    }
  ]
};

// Phase 4: Interactive Teaching (5-15 minutes)
export const TEACHING_TEMPLATES: PhaseTemplate = {
  phase: 'teaching',
  duration: '5-15 minutes',
  goal: 'Socratic teaching with analogies, chunks, and checkpoints',
  variants: [
    {
      context: 'hook',
      text: `{studentName}, ek interesting baat batata hoon! 💡

{realWorldExample}

Iska connection hai {topic} se!
Curious ho? Chalo dekhte hain kaise!`,
      emotion: 'excited'
    },
    {
      context: 'analogy',
      text: `Pehle ek simple example lete hain. 🌊

{analogyText}

Same cheez {topic} mein bhi hoti hai!

Samajh mein aaya basic idea?`,
      emotion: 'teaching',
      requiresResponse: true
    },
    {
      context: 'concept_chunk',
      text: `{conceptExplanation}

{checkpoint}`,
      emotion: 'teaching',
      requiresResponse: true
    },
    {
      context: 'formula_introduction',
      text: `Bilkul sahi! {studentName} 👍

Ab aata hai important formula - {formulaName}:

{formulaDisplay}

Ek easy trick yaad rakhne ke liye! 🧠
{memoryTrick}`,
      emotion: 'teaching'
    }
  ]
};

// Phase 5: Practice (5-10 minutes)
export const PRACTICE_TEMPLATES: PhaseTemplate = {
  phase: 'practice',
  duration: '5-10 minutes',
  goal: 'Guided problem-solving with hints and encouragement',
  variants: [
    {
      context: 'problem_introduction',
      text: `Chalo ab tum try karo! 💪

Question: {problemStatement}

Formula use karo aur step by step solve karo!
Main saath mein hoon! 🙌`,
      emotion: 'encouraging',
      requiresResponse: true
    },
    {
      context: 'hint_level_1',
      text: `Good try {studentName}! Par thoda ruko. 🤔

{hint1}

Ek baar aur try karo! Soch ke dekho.`,
      emotion: 'gentle',
      requiresResponse: true
    },
    {
      context: 'hint_level_2',
      text: `Achha attempt tha! Chalo main aur guide karta hoon. 💡

{hint2}

Step by step socho, answer aa jayega!`,
      emotion: 'encouraging',
      requiresResponse: true
    },
    {
      context: 'correct_celebration',
      text: `Waah {studentName}! Bilkul perfect! 🎉

{correctAnswer} ekdum sahi answer hai!

Tumne acche se formula apply kiya! 💯
Proud of you!`,
      emotion: 'celebratory'
    }
  ]
};

// Phase 6: Feedback (2-3 minutes)
export const FEEDBACK_TEMPLATES: PhaseTemplate = {
  phase: 'feedback',
  duration: '2-3 minutes',
  goal: 'Specific feedback and progress summary',
  variants: [
    {
      context: 'strong_performance',
      text: `Excellent work today {studentName}! 🌟

Aaj tumne:
✅ {topic} ke core concepts samjhe
✅ {checkpointsPassed} checkpoints successfully clear kiye
✅ Practice problem solve kiya perfectly

Strong concepts: {strongConcepts}

Tumhari understanding bahut acchi hai! Keep it up! 💪`,
      emotion: 'celebratory'
    },
    {
      context: 'good_progress',
      text: `Great progress {studentName}! 👍

Aaj ka session:
✅ {topic} basics clear ho gaye
✅ {checkpointsPassed} checkpoints passed
⚠️ Practice mein thoda support chahiye tha

Areas to work on: {areasToImprove}

But overall, accha session tha! Next time aur better hoga! 😊`,
      emotion: 'encouraging'
    },
    {
      context: 'needs_practice',
      text: `{studentName}, aaj hum try kiye! 💪

Session highlights:
✅ Concept introduction complete
✅ {checkpointsPassed} basic checkpoints done
⚠️ Practice problems mein struggle hua

Don't worry! {topic} tricky hai.
Thoda practice se clear ho jayega!

Areas to practice: {practiceAreas}

Next session aur acha jayega! 😊`,
      emotion: 'gentle'
    }
  ]
};

// Phase 7: Closure (30-60 seconds)
export const CLOSURE_TEMPLATES: PhaseTemplate = {
  phase: 'closure',
  duration: '30-60 seconds',
  goal: 'Recap key points and motivate for next session',
  variants: [
    {
      context: 'standard',
      text: `Perfect {studentName}! Aaj ka session wrap up karte hain! 📚

Key takeaways:
🔑 {keyPoint1}
🔑 {keyPoint2}
🔑 {keyPoint3}

{examTarget} ke liye ye concepts bahut important hain!

Next session: {nextTopic}

Practice karte rehna! All the best! 🚀`,
      emotion: 'friendly'
    },
    {
      context: 'homework',
      text: `Shabash {studentName}! Great session! ✨

Aaj seekha:
📌 {summary}

Homework (optional):
✏️ {homeworkTask}

Ye practice se tumhari understanding aur strong hogi!

Next time milenge {nextTopic} ke saath!
Keep learning! 💫`,
      emotion: 'encouraging'
    }
  ]
};

// Normalize class string to extract numeric value or special labels
function normalizeClass(classStr: string | undefined): string | null {
  if (!classStr) return null;
  
  // Lowercase and trim
  const normalized = classStr.toLowerCase().trim();
  
  // Check for dropper variants
  if (normalized.includes('dropper') || normalized.includes('drop')) {
    return 'dropper';
  }
  
  // Extract numeric class from "Class 11", "Grade 10", "11th", etc.
  const match = normalized.match(/(\d{1,2})/);
  if (match) {
    return match[1]; // Returns '6', '7', '8', '9', '10', '11', or '12'
  }
  
  return null;
}

// Template selection helpers with user profile awareness
export function getGreetingTemplate(
  timeOfDay: 'morning' | 'afternoon' | 'evening',
  language: 'english' | 'hinglish' = 'hinglish',
  userProfile?: {
    currentClass?: string;
    examTarget?: string;
  }
): TemplateVariant {
  // Determine context based on user profile
  let context: string | undefined;
  
  if (userProfile?.currentClass) {
    const normalizedClass = normalizeClass(userProfile.currentClass);
    
    if (normalizedClass === 'dropper') {
      context = 'dropper';
    } else if (normalizedClass && ['6', '7', '8'].includes(normalizedClass)) {
      context = 'foundation';
    } else if (normalizedClass && ['9', '10'].includes(normalizedClass)) {
      context = 'board_prep';
    } else if (normalizedClass && ['11', '12'].includes(normalizedClass)) {
      context = 'competitive';
    }
  }
  
  // Filter templates by time, language, and context
  const templates = GREETING_TEMPLATES.variants.filter(
    v => v.timeOfDay === timeOfDay && 
         v.language === language &&
         (!context || v.context === context)
  );
  
  // Fallback to any matching time+language if no context match
  if (templates.length === 0) {
    const fallback = GREETING_TEMPLATES.variants.filter(
      v => v.timeOfDay === timeOfDay && v.language === language
    );
    return fallback[0] || GREETING_TEMPLATES.variants[0];
  }
  
  return templates[Math.floor(Math.random() * templates.length)];
}

export function getRapportTemplate(examTarget: string): TemplateVariant {
  const context = examTarget.toLowerCase().includes('jee') ? 'jee' 
    : examTarget.toLowerCase().includes('neet') ? 'neet' 
    : 'boards';
  
  const templates = RAPPORT_TEMPLATES.variants.filter(v => v.context === context);
  return templates[0] || RAPPORT_TEMPLATES.variants[0];
}

export function getTeachingTemplate(context: 'hook' | 'analogy' | 'concept_chunk' | 'formula_introduction'): TemplateVariant {
  const templates = TEACHING_TEMPLATES.variants.filter(v => v.context === context);
  return templates[0] || TEACHING_TEMPLATES.variants[0];
}

export function getPracticeTemplate(context: 'problem_introduction' | 'hint_level_1' | 'hint_level_2' | 'correct_celebration'): TemplateVariant {
  const templates = PRACTICE_TEMPLATES.variants.filter(v => v.context === context);
  return templates[0] || PRACTICE_TEMPLATES.variants[0];
}

export function getFeedbackTemplate(performance: 'strong_performance' | 'good_progress' | 'needs_practice'): TemplateVariant {
  const templates = FEEDBACK_TEMPLATES.variants.filter(v => v.context === performance);
  return templates[0] || FEEDBACK_TEMPLATES.variants[0];
}

export function getClosureTemplate(includeHomework: boolean = false): TemplateVariant {
  const context = includeHomework ? 'homework' : 'standard';
  const templates = CLOSURE_TEMPLATES.variants.filter(v => v.context === context);
  return templates[0] || CLOSURE_TEMPLATES.variants[0];
}

// Template variable replacement
export function fillTemplate(template: string, variables: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    filled = filled.replace(regex, value || '');
  }
  return filled;
}
