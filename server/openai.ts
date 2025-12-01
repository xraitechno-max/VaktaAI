import OpenAI from "openai";
import { embeddingService } from "./embeddingService";

// Cost-optimized: GPT-4o for core features (tutor, docChat), GPT-4o-mini for simple tasks (quiz, notes, study plans, doc analysis)
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.GROQ_API_KEY ? "https://api.groq.com/openai/v1" : undefined;

    if (!apiKey) {
      throw new Error('Neither GROQ_API_KEY nor OPENAI_API_KEY is configured.');
    }

    openai = new OpenAI({
      apiKey,
      baseURL
    });
  }
  return openai;
}

// Helper to get model name based on provider
function getModel(type: 'high' | 'fast' = 'high'): string {
  if (process.env.GROQ_API_KEY) {
    return type === 'high' ? "llama-3.1-70b-versatile" : "llama-3.1-8b-instant";
  }
  return type === 'high' ? "gpt-4o" : "gpt-4o-mini";
}

export interface TutorResponse {
  explain: string;
  check?: {
    stem: string;
    options: string[];
    answer: string;
    rationale: string;
  };
  meta: {
    step: 'teach' | 'remediate' | 'recap';
    progress?: number;
  };
}

export interface QuizQuestion {
  type: 'mcq_single' | 'mcq_multi' | 'short' | 'long';
  stem: string;
  options?: string[];
  answer: string[];
  rationale: string;
  sourceRef?: string;
}

export interface NoteSummary {
  bigIdea: string;
  keyTerms: { term: string; definition: string }[];
  summary: string;
  sections: { heading: string; content: string; examples?: string[] }[];
  flashcards: { front: string; back: string }[];
  quizableFacts: string[];
}

export interface StudyPlanTask {
  date: string;
  type: 'read' | 'tutor' | 'quiz' | 'flashcards' | 'video';
  duration: number;
  title: string;
  description: string;
}

export class AIService {
  // AI Tutor functionality
  async generateTutorResponse(
    subject: string,
    level: string,
    topic: string,
    language: string,
    conversationHistory: { role: string; content: string }[],
    currentStep: string,
    context?: string
  ): Promise<TutorResponse> {
    const systemPrompt = `You are VaktaAI, an expert AI Tutor dedicated to helping students learn effectively.
Subject: ${subject}. Level: ${level}. Language: ${language}. Topic: ${topic}.

Your Goal: Guide the student to master the topic through Socratic dialogue, clear explanations, and interactive checking.

Guidelines:
1.  **Be Natural & Engaging**: Speak like a friendly, knowledgeable teacher. Avoid robotic or overly rigid structures.
2.  **Teach Step-by-Step**: Break down complex topics into bite-sized chunks. Don't overwhelm the student.
3.  **Check for Understanding**: After explaining a concept, ALWAYS ask a relevant question to verify the student's grasp. This can be a conceptual question, a mini-problem, or a thought experiment.
4.  **Adapt to the Student**:
    -   If they answer correctly: Praise them briefly and move to the next logical step.
    -   If they answer incorrectly: Gently correct them, explain *why* the answer was wrong (addressing the misconception), and try explaining the concept again with a different analogy or example.
5.  **Use Examples**: Concrete examples make abstract concepts stick. Use them liberally.
6.  **Formatting**:
    -   Use **bold** for key terms.
    -   Use bullet points for lists.
    -   Use LaTeX ($...$) for math/science formulas.
7.  **Context**: If "DOCS" are provided below, use them as your primary source of truth. If the answer isn't in the docs, use your general knowledge but mention that it's general info.

Response Format:
You MUST respond in valid JSON with this exact structure:
{
  "explain": "Your main explanation, feedback, and teaching content here. Keep it under 150 words per turn.",
  "check": {
    "stem": "The question to check understanding",
    "options": ["Option A", "Option B", "Option C", "Option D"], // Optional: remove if asking an open-ended question
    "answer": "The correct answer (if MCQ) or key concept to look for",
    "rationale": "Brief explanation of why this is the answer"
  },
  "meta": {
    "step": "teach", // or 'remediate' or 'recap'
    "progress": 0.5 // Estimated progress on the topic (0.0 to 1.0)
  }
}

${context ? `\nDOCS (optional context):\n${context}` : ''}`;

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(msg => ({ role: msg.role as any, content: msg.content }))
    ];

    const response = await getOpenAI().chat.completions.create({
      model: getModel('high'),
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content) as TutorResponse;
  }

  // DocChat functionality
  async generateDocChatResponse(
    question: string,
    context: string,
    language: string = 'en'
  ): Promise<string> {
    const systemPrompt = `You are VaktaAI, a grounded study assistant.
Ground your answer ONLY in CONTEXT below. If unsure, say so.
Return crisp bullets; include citations like [Doc {title}, p.{page} §{heading}].
Language: ${language}. Keep tone friendly and clear.

CONTEXT:
${context}`;

    const response = await getOpenAI().chat.completions.create({
      model: getModel('high'),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_completion_tokens: 4096,
    });

    return response.choices[0].message.content || '';
  }

  // Quiz generation
  async generateQuiz(
    subject: string,
    topic: string,
    difficulty: string,
    questionCount: number,
    questionTypes: string[],
    language: string = 'en',
    context?: string
  ): Promise<QuizQuestion[]> {
    const systemPrompt = `Create ${questionCount} high-quality exam-style questions on ${topic} in ${subject}.
Language: ${language}. Difficulty: ${difficulty}. Types: ${questionTypes.join(', ')}.
For each question return JSON in this exact format:
{ "type":"mcq_single|mcq_multi|short|long",
  "stem":"...",
  "options":["A","B","C","D"], 
  "answer":["B"], 
  "rationale":"Why this is correct and others aren't",
  "sourceRef":"Doc p.12 §3.1" }
Constraints:
- Single unambiguous correct answer (unless multi).
- Plausible distractors. Spread cognitive levels.
- Return a JSON array of questions.
${context ? `\nSOURCE CONTEXT:\n${context}` : ''}`;

    const response = await getOpenAI().chat.completions.create({
      model: getModel('fast'),
      messages: [{ role: "user", content: systemPrompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');

    const result = JSON.parse(content);
    return result.questions || result;
  }

  // Notes summarization
  async summarizeContent(
    content: string,
    language: string = 'en',
    template: string = 'cornell'
  ): Promise<NoteSummary> {
    const systemPrompt = `Produce student notes in ${language}, ${template} style.
Sections:
1) Big Idea (3-5 lines)
2) Key Terms (term: definition) — 10-15 items
3) Summary (≤180 words)
4) Sectioned bullets per heading with examples and formulas ($...$)
5) 8-12 flashcard pairs and 6-10 quizable facts
Include source breadcrumbs (URL title or Doc page). Be concise.
Return valid JSON with structure: {"bigIdea": "...", "keyTerms": [...], "summary": "...", "sections": [...], "flashcards": [...], "quizableFacts": [...]}`;

    const response = await getOpenAI().chat.completions.create({
      model: getModel('fast'),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `SOURCE:\n${content}` }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const responseContent = response.choices[0].message.content;
    if (!responseContent) throw new Error('No response from AI');

    return JSON.parse(responseContent) as NoteSummary;
  }

  // Study plan generation
  async generateStudyPlan(
    subject: string,
    topics: string[],
    level: string,
    language: string,
    examDate?: Date,
    intensity: string = 'regular',
    sessionDuration: number = 30
  ): Promise<StudyPlanTask[]> {
    try {
      const daysToExam = examDate ? Math.max(Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 7) : 28;

      const systemPrompt = `Create a ${daysToExam}-day study plan for Subject: ${subject}, Topics: ${topics.join(', ')}, Level: ${level}, Language: ${language}.
Exam date: ${examDate ? examDate.toISOString().split('T')[0] : "none"}. Intensity: ${intensity}. Session duration: ${sessionDuration} min.
Mix tasks: read/docchat, tutor checkpoints, quizzes (10-20 qs), flashcards with SRS.
Return JSON object with "tasks" array containing tasks with {"date": "YYYY-MM-DD", "type": "read|tutor|quiz|flashcards|video", "duration": minutes, "title": "...", "description": "..."}.`;

      console.log('[generateStudyPlan] Creating study plan with prompt:', systemPrompt);

      const response = await getOpenAI().chat.completions.create({
        model: getModel('fast'),
        messages: [{ role: "user", content: systemPrompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });

      console.log('[generateStudyPlan] Response received:', JSON.stringify(response, null, 2));

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('[generateStudyPlan] No content in response. Full response:', response);
        throw new Error('No response from AI');
      }

      console.log('[generateStudyPlan] Content:', content);

      const result = JSON.parse(content);
      console.log('[generateStudyPlan] Parsed result:', result);

      const tasks = result.tasks || (Array.isArray(result) ? result : []);
      console.log('[generateStudyPlan] Returning tasks:', tasks);

      return tasks;
    } catch (error) {
      console.error('[generateStudyPlan] Error:', error);
      throw error;
    }
  }

  // Document analysis for ingestion
  async analyzeDocument(
    title: string,
    content: string,
    sourceType: string
  ): Promise<{ summary: string; subject?: string; language: string; topics: string[] }> {
    const systemPrompt = `Analyze this document and return JSON with:
{"summary": "Brief description", "subject": "main academic subject", "language": "detected language code", "topics": ["list of main topics"]}`;

    const contentPreview = content.substring(0, 4000);
    console.log('[analyzeDocument] Starting analysis...');
    console.log('[analyzeDocument] Title:', title);
    console.log('[analyzeDocument] Type:', sourceType);
    console.log('[analyzeDocument] Content length:', content.length);
    console.log('[analyzeDocument] Preview length:', contentPreview.length);

    try {
      const response = await getOpenAI().chat.completions.create({
        model: getModel('fast'),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${title}\nType: ${sourceType}\nContent: ${contentPreview}` }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2000,
      });

      console.log('[analyzeDocument] API Response received');
      console.log('[analyzeDocument] Choices:', response.choices?.length || 0);
      console.log('[analyzeDocument] First choice:', JSON.stringify(response.choices[0], null, 2));

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        console.error('[analyzeDocument] No content in response. Full response:', JSON.stringify(response, null, 2));
        throw new Error('No response from AI');
      }

      console.log('[analyzeDocument] Response content:', responseContent);
      const parsed = JSON.parse(responseContent);
      console.log('[analyzeDocument] Parsed successfully:', parsed);
      return parsed;
    } catch (error) {
      console.error('[analyzeDocument] Error:', error);
      if (error instanceof Error) {
        console.error('[analyzeDocument] Error message:', error.message);
        console.error('[analyzeDocument] Error stack:', error.stack);
      }
      throw error;
    }
  }

  // Streaming chat responses
  async *streamChatResponse(
    messages: { role: string; content: string }[],
    systemPrompt: string
  ): AsyncGenerator<string, void, unknown> {
    const stream = await getOpenAI().chat.completions.create({
      model: getModel('high'),
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(msg => ({ role: msg.role as any, content: msg.content }))
      ],
      stream: true,
      max_completion_tokens: 4096,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  // Rerank search results
  async rerankResults(
    query: string,
    results: { text: string; metadata?: any }[],
    topK: number = 8
  ): Promise<{ text: string; metadata?: any; score: number }[]> {
    if (results.length <= topK) {
      return results.map(r => ({ ...r, score: 1.0 }));
    }

    // For now, we'll use a simple approach - in production you'd use a reranking model
    const prompt = `Rank these ${results.length} text passages by relevance to the query: "${query}"\n\nPassages:\n${results.map((r, i) => `${i + 1}. ${r.text.substring(0, 200)}...`).join('\n\n')}\n\nReturn only the numbers of the most relevant ${topK} passages, in order of relevance (most relevant first), separated by commas.`;

    const response = await getOpenAI().chat.completions.create({
      model: getModel('fast'),
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 100,
    });

    const content = response.choices[0].message.content;
    if (!content) return results.slice(0, topK).map(r => ({ ...r, score: 1.0 }));

    try {
      const indices = content.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < results.length);
      const reranked = indices.slice(0, topK).map((i, rank) => ({
        ...results[i],
        score: 1.0 - (rank / topK)
      }));
      return reranked;
    } catch {
      return results.slice(0, topK).map(r => ({ ...r, score: 1.0 }));
    }
  }

  // Generate embeddings for text chunks using Vyakyarth-1-Indic
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await embeddingService.generateEmbedding(text);
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  // Generate embeddings for multiple texts in batch using Vyakyarth-1-Indic
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      return await embeddingService.generateEmbeddings(texts);
    } catch (error) {
      console.error('Batch embedding generation error:', error);
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    return embeddingService.cosineSimilarity(vecA, vecB);
  }
}

export const aiService = new AIService();
